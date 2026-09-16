const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1
});

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { id, email, nombre, apellido, celular, canal } = req.body;
        if (!id || !email) { res.status(400).json({ error: 'id y email requeridos' }); return; }
        await pool.query(
            `UPDATE diagnosticos SET email = $1, nombre = $2, apellido = $3, celular = $4, canal = COALESCE($5, canal) WHERE id = $6`,
            [email.trim(), (nombre || '').trim(), (apellido || '').trim(), (celular || '').trim(), ['outbound', 'inbound', 'agendado'].includes(canal) ? canal : null, id]
        );
        res.status(200).json({ ok: true });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
};
