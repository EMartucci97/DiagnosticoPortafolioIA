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
            const allowed = [null, 'calificado', 'no_calificado'];
            if (!allowed.includes(clasificacion)) { res.status(400).json({ error: 'Clasificación inválida' }); return; }
            await pool.query(`UPDATE diagnosticos SET clasificacion = $1 WHERE id = $2`, [clasificacion, id]);
            res.status(200).json({ ok: true });
        } else if (action === 'estado') {
            const user = requireRole(req, res, 'sales');
            if (!user) return;
            const { estado } = req.body || {};
            const allowed = ['nuevo', 'contactado', 'agendado', 'cerrado', 'perdido'];
            if (!allowed.includes(estado)) { res.status(400).json({ error: 'Estado inválido' }); return; }
            await pool.query(`UPDATE diagnosticos SET estado_comercial = $1 WHERE id = $2`, [estado, id]);
            res.status(200).json({ ok: true });
        } else if (action === 'asignar') {
            const user = requireRole(req, res, 'sales');
            if (!user) return;
            const asignado = (req.body || {}).asignado || null;
            if (asignado) {
                const { rows } = await pool.query(
                    `SELECT 1 FROM admin_users WHERE username = $1 AND role IN ('superadmin','admin','sales')`, [asignado]
                );
                if (!rows.length) { res.status(400).json({ error: 'Consultor inválido' }); return; }
            }
            await pool.query(`UPDATE diagnosticos SET asignado_a = $1 WHERE id = $2`, [asignado, id]);
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
