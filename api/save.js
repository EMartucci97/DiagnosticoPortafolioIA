const { Pool } = require('pg');
const { generatePlanAccion } = require('./_plan-accion');

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
        const { portfolio, quizAnswers, diagnostico, notaInterna, score, canal } = req.body;

        let planAccion = '';
        if (diagnostico) {
            try {
                planAccion = await generatePlanAccion(diagnostico, notaInterna);
            } catch (e) {
                // fallo silencioso — el lead y el diagnóstico se guardan igual sin plan de acción
            }
        }

        const { rows } = await pool.query(
            `INSERT INTO diagnosticos (portfolio, quiz_answers, diagnostico, nota_interna, score, canal, plan_accion)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [
                typeof portfolio === 'object' ? JSON.stringify(portfolio) : (portfolio || ''),
                typeof quizAnswers === 'object' ? JSON.stringify(quizAnswers) : (quizAnswers || ''),
                diagnostico || '',
                notaInterna || '',
                score ?? null,
                (canal === 'outbound' || canal === 'agendado') ? canal : 'inbound',
                planAccion
            ]
        );
        res.status(200).json({ ok: true, id: rows[0].id });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
};
