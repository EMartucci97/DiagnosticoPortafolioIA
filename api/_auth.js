const { scryptSync, randomBytes, timingSafeEqual, createHmac } = require('crypto');

function hashPassword(password) {
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password, salt, 64).toString('hex');
    return salt + ':' + hash;
}

function verifyPassword(password, stored) {
    try {
        const [salt, hash] = stored.split(':');
        const derived = scryptSync(password, salt, 64);
        return timingSafeEqual(derived, Buffer.from(hash, 'hex'));
    } catch { return false; }
}

function signToken(data) {
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const secret = process.env.ADMIN_JWT_SECRET || 'dev-change-in-prod';
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    return payload + '.' + sig;
}

function verifyToken(token) {
    if (!token) return null;
    try {
        const i = token.lastIndexOf('.');
        const payload = token.slice(0, i);
        const sig = token.slice(i + 1);
        const secret = process.env.ADMIN_JWT_SECRET || 'dev-change-in-prod';
        const expected = createHmac('sha256', secret).update(payload).digest('hex');
        const a = Buffer.from(sig, 'hex');
        const b = Buffer.from(expected, 'hex');
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (data.exp < Date.now()) return null;
        return data;
    } catch { return null; }
}

function getAuth(req) {
    return (req.headers['authorization'] || '').replace(/^bearer\s+/i, '').trim();
}

const LEVELS = { readonly: 0, sales: 1, admin: 2, superadmin: 3 };

function requireRole(req, res, minRole) {
    const user = verifyToken(getAuth(req));
    if (!user) { res.status(401).json({ error: 'No autenticado' }); return null; }
    if ((LEVELS[user.role] ?? -1) < (LEVELS[minRole] ?? 99)) {
        res.status(403).json({ error: 'Sin permisos' }); return null;
    }
    return user;
}

function corsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, getAuth, requireRole, corsHeaders };
