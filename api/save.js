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
        const { portfolio, quizAnswers, diagnostico, notaInterna, score } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO diagnosticos (portfolio, quiz_answers, diagnostico, nota_interna, score)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
                typeof portfolio === 'object' ? JSON.stringify(portfolio) : (portfolio || ''),
                typeof quizAnswers === 'object' ? JSON.stringify(quizAnswers) : (quizAnswers || ''),
                diagnostico || '',
                notaInterna || '',
                score ?? null
            ]
        );
        res.status(200).json({ ok: true, id: rows[0].id });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
};
