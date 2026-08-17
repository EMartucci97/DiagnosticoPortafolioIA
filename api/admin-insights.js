const { Pool } = require('pg');
const https = require('https');
const { requireRole, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

const QUESTIONS = [
    { q: '¿En qué plazo esperás ver resultados?', opts: { A: 'Menos de 3 meses', B: '3 a 12 meses', C: '1 a 3 años', D: '3 a 5 años', E: 'Más de 5 años', F: 'No definido' } },
    { q: '¿Cuánta caída tolerarías?', opts: { A: '<5%', B: '5-10%', C: '10-20%', D: '20-35%', E: '>35%', F: 'No sé' } },
    { q: '¿Cuánto tiempo llevás invirtiendo?', opts: { A: '<6 meses', B: '6m-2 años', C: '2-5 años', D: '+5 años', E: 'Irregular' } },
    { q: '¿Tenés criterio de entrada/salida?', opts: { A: 'Siempre', B: 'A veces', C: 'Generalmente no', D: 'No, sobre la marcha' } },
    { q: 'Cuando una posición cae, ¿qué hacés?', opts: { A: 'Respeto el plan', B: 'Promedio sin análisis', C: 'Espero', D: 'Vendo por miedo', E: 'Me paralizo' } },
    { q: '¿Cómo tomás decisiones?', opts: { A: 'Solo', B: 'Redes/YouTube', C: 'Banco/broker', D: 'Formación propia', E: 'Mentoría' } },
    { q: '¿Comparás contra benchmark?', opts: { A: 'S&P 500', B: 'Inflación', C: 'Dólar', D: 'Otro índice', E: 'No comparo', F: 'No sé cuál usar' } },
    { q: '¿Cuál es tu mayor preocupación?', opts: { A: 'No sé si está bien armado', B: 'Demasiado riesgo', C: 'Rinde menos', D: 'Pérdidas sin saber qué hacer', E: 'No sé cuándo entrar/salir', F: 'Sin estrategia clara' } },
    { q: '¿Qué frase describe tu situación?', opts: { A: 'Estrategia clara', B: 'Ideas sin estructura', C: 'Buenos activos, sin cartera', D: 'No entiendo mi riesgo', E: 'Buenos trades, sin consistencia', F: 'Pérdidas, quiero ordenarme' } },
];

function callClaude(prompt) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1200,
            messages: [{ role: 'user', content: prompt }]
        });
        const req = https.request({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, r => {
            let data = '';
            r.on('data', d => data += d);
            r.on('end', () => {
                try { resolve(JSON.parse(data).content?.[0]?.text ?? ''); }
                catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const user = requireRole(req, res, 'admin');
    if (!user) return;

    try {
        const { rows } = await pool.query(
            `SELECT quiz_answers, portfolio, nota_interna, score FROM diagnosticos WHERE quiz_answers IS NOT NULL ORDER BY id DESC`
        );

        if (rows.length === 0) {
            res.status(200).json({ quiz_stats: [], open_answers: [], ai_summary: null, total: 0 });
            return;
        }

        const counts = QUESTIONS.map(() => ({}));
        const openAnswers = [];

        rows.forEach(row => {
            let answers;
            try { answers = typeof row.quiz_answers === 'string' ? JSON.parse(row.quiz_answers) : row.quiz_answers; }
            catch { return; }
            if (!Array.isArray(answers)) return;

            answers.forEach((a, i) => {
                if (i === 9) { if (a?.answer?.trim()) openAnswers.push(a.answer.trim()); return; }
                if (!a?.letter || i >= QUESTIONS.length) return;
                a.letter.split(', ').forEach(l => {
                    if (l) counts[i][l] = (counts[i][l] || 0) + 1;
                });
            });
        });

        const quiz_stats = QUESTIONS.map((q, i) => {
            const total = Object.values(counts[i]).reduce((s, v) => s + v, 0);
            const opts = Object.entries(counts[i])
                .sort((a, b) => b[1] - a[1])
                .map(([letter, cnt]) => ({
                    letter, label: q.opts[letter] || letter, count: cnt,
                    pct: total > 0 ? Math.round((cnt / total) * 100) : 0
                }));
            return { question: q.q, opts, total };
        });

        const openBlock = openAnswers.length
            ? openAnswers.map((a, i) => `${i + 1}. "${a}"`).join('\n')
            : '(sin respuestas abiertas)';

        const notasBlock = rows
            .filter(r => r.nota_interna).slice(0, 20)
            .map((r, i) => `${i + 1}. ${r.nota_interna}`).join('\n');

        const prompt = `Analizá ${rows.length} leads que hicieron un diagnóstico de portafolio de inversión.\n\nRESPUESTAS ABIERTAS ("¿Qué es lo que más te preocupa?"):\n${openBlock}\n\nNOTAS DEL ANÁLISIS PREVIO DE CADA LEAD:\n${notasBlock || '(sin notas)'}\n\nGenerá un resumen en español. Devolvé SOLO este JSON sin markdown:\n{"dolores":["dolor 1","dolor 2","dolor 3","dolor 4","dolor 5"],"patrones":["patrón 1","patrón 2","patrón 3"],"citas":["cita 1","cita 2","cita 3"],"perfil_tipo":"2-3 líneas describiendo al lead promedio"}`;

        const aiRaw = await callClaude(prompt);
        let ai_summary = null;
        try {
            const m = aiRaw.match(/\{[\s\S]*\}/);
            ai_summary = m ? JSON.parse(m[0]) : { raw: aiRaw };
        } catch { ai_summary = { raw: aiRaw }; }

        res.status(200).json({ quiz_stats, open_answers: openAnswers, ai_summary, total: rows.length, generated_at: new Date().toISOString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
