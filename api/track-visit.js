const { Pool } = require('pg');
const { createHash } = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1
});

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || 'unknown';

    const ip_hash = createHash('sha256').update(rawIp).digest('hex');

    try {
        await pool.query(
            `INSERT INTO visits (ip_hash, visited_at) VALUES ($1, NOW())`,
            [ip_hash]
        );
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
