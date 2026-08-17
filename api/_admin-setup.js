const { Pool } = require('pg');
const { hashPassword, signToken, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).end(); return; }

    const { bootstrapKey, username, password } = req.body || {};

    if (!bootstrapKey || bootstrapKey !== process.env.ADMIN_PASSWORD) {
        res.status(401).json({ error: 'Clave incorrecta' }); return;
    }
    if (!username || !password) { res.status(400).json({ error: 'Faltan usuario y contraseña' }); return; }

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL CHECK (role IN ('superadmin','admin','sales','readonly')),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM admin_users');
        if (parseInt(rows[0].cnt) > 0) {
            res.status(403).json({ error: 'Ya hay usuarios. Usá el panel de usuarios para agregar más.' });
            return;
        }

        const uname = username.toLowerCase().trim();
        await pool.query(
            'INSERT INTO admin_users (username, password_hash, role) VALUES ($1, $2, $3)',
            [uname, hashPassword(password), 'superadmin']
        );

        const token = signToken({ username: uname, role: 'superadmin', exp: Date.now() + 8 * 3600 * 1000 });
        res.status(200).json({ ok: true, token, role: 'superadmin', username: uname });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
