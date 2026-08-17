const { Pool } = require('pg');
const { createHash } = require('crypto');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1
});

const ALLOWED_EVENTS = ['cta_start', 'portfolio_submitted', 'email_submitted', 'diag_completed'];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { event, id, error_message, status_code, attempt } = req.body || {};

    // error logging: guarda fallas del diagnóstico en Supabase
    if (event === 'diag_error') {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS error_logs (
                id SERIAL PRIMARY KEY,
                error_message TEXT,
                status_code INT,
                attempt INT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `).catch(() => {});
        try {
            await pool.query(
                `INSERT INTO error_logs (error_message, status_code, attempt) VALUES ($1, $2, $3)`,
                [error_message || 'unknown', status_code || null, attempt || null]
            );
            res.status(200).json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    // wa-click: actualiza registro de diagnóstico
    if (event === 'wa_click') {
        if (!id) { res.status(400).json({ error: 'Falta id' }); return; }
        try {
            await pool.query(`UPDATE diagnosticos SET wa_click_at = NOW() WHERE id = $1`, [id]);
            res.status(200).json({ ok: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
        return;
    }

    if (!ALLOWED_EVENTS.includes(event)) { res.status(400).json({ error: 'Evento no permitido' }); return; }

    const rawIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || 'unknown';
    const ip_hash = createHash('sha256').update(rawIp).digest('hex');

    try {
        await pool.query(
            `INSERT INTO events (event, ip_hash) VALUES ($1, $2)`,
            [event, ip_hash]
        );
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
