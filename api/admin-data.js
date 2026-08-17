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
            `SELECT id, created_at, email, portfolio, quiz_answers, diagnostico,
                    nota_interna, score, clasificacion, wa_click_at,
                    nombre, apellido, celular, canal
             FROM diagnosticos ORDER BY created_at DESC`
        );
        res.status(200).json({ rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
