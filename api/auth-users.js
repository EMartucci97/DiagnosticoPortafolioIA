const { Pool } = require('pg');
const { hashPassword, signToken, requireRole, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

const VALID_ROLES = ['superadmin', 'admin', 'sales', 'readonly'];

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).end(); return; }

    const { action, username, password, role, id, bootstrapKey } = req.body || {};

    // setup: first-time superadmin creation — no auth required, bootstrapKey used instead
    if (action === 'setup') {
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
                res.status(403).json({ error: 'Ya hay usuarios. Usá el panel de usuarios para agregar más.' }); return;
            }
            const uname = username.toLowerCase().trim();
            await pool.query(
                'INSERT INTO admin_users (username, password_hash, role) VALUES ($1, $2, $3)',
                [uname, hashPassword(password), 'superadmin']
            );
            const token = signToken({ username: uname, role: 'superadmin', exp: Date.now() + 8 * 3600 * 1000 });
            res.status(200).json({ ok: true, token, role: 'superadmin', username: uname });
        } catch (e) { res.status(500).json({ error: e.message }); }
        return;
    }

    const user = requireRole(req, res, 'superadmin');
    if (!user) return;

    try {
        if (action === 'list') {
            const { rows } = await pool.query(
                'SELECT id, username, role, created_at FROM admin_users ORDER BY created_at'
            );
            res.status(200).json({ users: rows });

        } else if (action === 'create') {
            if (!username || !password || !VALID_ROLES.includes(role)) {
                res.status(400).json({ error: 'Datos inválidos' }); return;
            }
            await pool.query(
                'INSERT INTO admin_users (username, password_hash, role) VALUES ($1, $2, $3)',
                [username.toLowerCase().trim(), hashPassword(password), role]
            );
            res.status(200).json({ ok: true });

        } else if (action === 'update') {
            if (!id) { res.status(400).json({ error: 'id requerido' }); return; }
            const sets = [], params = [];
            if (role && VALID_ROLES.includes(role)) sets.push(`role = $${params.push(role)}`);
            if (password) sets.push(`password_hash = $${params.push(hashPassword(password))}`);
            if (!sets.length) { res.status(400).json({ error: 'Nada para actualizar' }); return; }
            params.push(id);
            await pool.query(`UPDATE admin_users SET ${sets.join(', ')} WHERE id = $${params.length}`, params);
            res.status(200).json({ ok: true });

        } else if (action === 'delete') {
            if (!id) { res.status(400).json({ error: 'id requerido' }); return; }
            const { rows } = await pool.query('SELECT username FROM admin_users WHERE id = $1', [id]);
            if (rows[0]?.username === user.username) {
                res.status(400).json({ error: 'No podés eliminarte a vos mismo' }); return;
            }
            await pool.query('DELETE FROM admin_users WHERE id = $1', [id]);
            res.status(200).json({ ok: true });

        } else {
            res.status(400).json({ error: 'Acción inválida' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
