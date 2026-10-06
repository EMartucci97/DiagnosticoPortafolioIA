// Sanitiza el origen del lead (UTMs, fbclid, referrer) que manda la landing.
// Compartido entre api/save.js y proxy-diagnostico.mjs para que no se desincronicen.
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'referrer', 'landing_at'];

function sanitizeOrigen(origen) {
    if (!origen || typeof origen !== 'object') return null;
    const out = {};
    for (const k of KEYS) {
        const v = origen[k];
        if (typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 300);
    }
    return Object.keys(out).length ? JSON.stringify(out) : null;
}

module.exports = { sanitizeOrigen };
