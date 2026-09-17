const { Pool } = require('pg');
const { requireRole, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { action, id } = req.body || {};

    try {
        if (action === 'clasificacion') {
            const user = requireRole(req, res, 'sales');
            if (!user) return;
            const { clasificacion } = req.body || {};
            const allowed = [null, 'calificado', 'no_calificado', 'en_proceso'];
            if (!allowed.includes(clasificacion)) { res.status(400).json({ error: 'Clasificación inválida' }); return; }
            await pool.query(`UPDATE diagnosticos SET clasificacion = $1 WHERE id = $2`, [clasificacion, id]);
            res.status(200).json({ ok: true });
        } else if (action === 'delete') {
            const user = requireRole(req, res, 'admin');
            if (!user) return;
            if (!id) { res.status(400).json({ error: 'id requerido' }); return; }
            await pool.query(`DELETE FROM diagnosticos WHERE id = $1`, [id]);
            res.status(200).json({ ok: true });
        } else {
            res.status(400).json({ error: 'Acción inválida' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
