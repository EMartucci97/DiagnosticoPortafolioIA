const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const id = parseInt(req.query.id, 10);
    if (!id) { res.status(400).json({ error: 'Falta id' }); return; }

    try {
        const { rows } = await pool.query(
            `SELECT id, created_at, email, nombre, apellido, score, clasificacion, diagnostico, plan_accion
             FROM diagnosticos WHERE id = $1`,
            [id]
        );
        if (!rows.length) { res.status(404).json({ error: 'No encontrado' }); return; }
        res.status(200).json(rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
