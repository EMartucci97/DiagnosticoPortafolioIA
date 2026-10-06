const { Pool } = require('pg');
const { requireRole, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const user = requireRole(req, res, 'readonly');
    if (!user) return;

    try {
        const { rows } = await pool.query(
            `SELECT id, created_at, email, portfolio, quiz_answers, diagnostico, plan_accion,
                    nota_interna, score, clasificacion, wa_click_at,
                    nombre, apellido, celular, canal, estado_comercial, asignado_a, origen
             FROM diagnosticos ORDER BY created_at DESC`
        );
        const { rows: users } = await pool.query(
            `SELECT username FROM admin_users WHERE role IN ('superadmin','admin','sales') ORDER BY username`
        );
        res.status(200).json({ rows, consultores: users.map(u => u.username) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
