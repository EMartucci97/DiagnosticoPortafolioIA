const { Pool } = require('pg');
const { requireRole, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const user = requireRole(req, res, 'sales');
    if (!user) return;

    const { id, clasificacion } = req.body || {};
    const allowed = [null, 'calificado', 'no_calificado', 'en_proceso'];
    if (!allowed.includes(clasificacion)) { res.status(400).json({ error: 'Clasificación inválida' }); return; }

    try {
        await pool.query(`UPDATE diagnosticos SET clasificacion = $1 WHERE id = $2`, [clasificacion, id]);
        res.status(200).json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
