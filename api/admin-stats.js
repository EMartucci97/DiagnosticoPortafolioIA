const { Pool } = require('pg');
const { requireRole, corsHeaders } = require('./_auth');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 1 });

module.exports = async function handler(req, res) {
    corsHeaders(res);
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const user = requireRole(req, res, 'admin');
    if (!user) return;

    try {
        const [visitsRes, eventsRes] = await Promise.all([
            pool.query(`SELECT COUNT(DISTINCT ip_hash) AS unique_visits FROM visits`),
            pool.query(`
                SELECT event, COUNT(*) AS cnt FROM events
                WHERE event IN ('cta_start', 'portfolio_submitted', 'email_submitted', 'diag_completed')
                GROUP BY event
            `)
        ]);
        const unique_visits = parseInt(visitsRes.rows[0].unique_visits);
        const ev = {};
        eventsRes.rows.forEach(r => { ev[r.event] = parseInt(r.cnt); });
        const cta_start           = ev['cta_start']           || 0;
        const portfolio_submitted  = ev['portfolio_submitted']  || 0;
        const email_submitted      = ev['email_submitted']      || 0;
        const diagnosticos         = ev['diag_completed']       || 0;

        const pct = (num, den) => den > 0 ? ((num / den) * 100).toFixed(1) : '0.0';

        res.status(200).json({
            unique_visits,
            cta_start,           ctr_cta:       pct(cta_start,           unique_visits),
            portfolio_submitted,  ctr_portfolio: pct(portfolio_submitted,  cta_start),
            email_submitted,      ctr_email:     pct(email_submitted,      portfolio_submitted),
            diagnosticos,         ctr_diag:      pct(diagnosticos,         email_submitted),
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};
