const { Pool } = require('pg');
const { verifyPassword, signToken, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).end(); return; }

    const { username, password } = req.body || {};
    if (!username || !password) { res.status(400).json({ error: 'Faltan datos' }); return; }

    try {
        const { rows } = await pool.query(
            'SELECT id, username, password_hash, role FROM admin_users WHERE username = $1',
            [username.toLowerCase().trim()]
        );
        const user = rows[0];
        if (!user || !verifyPassword(password, user.password_hash)) {
            res.status(401).json({ error: 'Credenciales incorrectas' });
            return;
        }
        const token = signToken({ username: user.username, role: user.role, exp: Date.now() + 8 * 3600 * 1000 });
        res.status(200).json({ token, role: user.role, username: user.username });
    } catch (e) {
        if (e.code === '42P01') {
            res.status(401).json({ error: 'setup_required' });
        } else {
            res.status(500).json({ error: e.message });
        }
    }
};
