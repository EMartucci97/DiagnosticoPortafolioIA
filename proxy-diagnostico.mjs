import http from 'http';
import https from 'https';
import pg from 'pg';

const { Pool } = pg;
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
const PORT = 3031;

// ── DATABASE (Supabase / PostgreSQL) ──────────────────
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5
});

// Crear tabla si no existe (idempotente)
await pool.query(`
    CREATE TABLE IF NOT EXISTS diagnosticos (
        id           SERIAL PRIMARY KEY,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        email        TEXT,
        portfolio    TEXT,
        quiz_answers TEXT,
        diagnostico  TEXT,
        nota_interna TEXT,
        score        INTEGER
    )
`);
console.log('✓ Tabla diagnosticos lista en Supabase');

// ── NASDAQ / CRYPTO HELPERS ───────────────────────────
const NASDAQ_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.nasdaq.com',
    'Referer': 'https://www.nasdaq.com/'
};

function fetchJSON(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'GET',
            headers: { 'Accept': 'application/json', ...headers }
        }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('JSON parse error')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error('timeout')); });
        req.end();
    });
}

function isCrypto(name) {
    return /\b(bitcoin|btc|ethereum|eth|solana|sol|bnb|xrp|ripple|cardano|ada|dogecoin|doge|litecoin|ltc|polkadot|dot|avalanche|avax|chainlink|link|uniswap|uni|matic|polygon|usdc|usdt|tether|crypto|token|coin|defi|nft)\b/i.test(name);
}

async function getCryptoInfo(name) {
    try {
        const search = await fetchJSON(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(name)}`, { 'User-Agent': 'Mozilla/5.0' });
        const coin = (search.coins || [])[0];
        if (!coin) return null;
        const price = await fetchJSON(`https://api.coingecko.com/api/v3/simple/price?ids=${coin.id}&vs_currencies=usd&include_24hr_change=true`, { 'User-Agent': 'Mozilla/5.0' });
        const d = price[coin.id];
        if (!d) return null;
        return { name, symbol: coin.symbol.toUpperCase(), type: 'Criptomoneda', exchange: 'Crypto', price: d.usd, change24h: d.usd_24h_change?.toFixed(2) };
    } catch { return null; }
}

async function getStockInfo(name) {
    try {
        const search = await fetchJSON(`https://api.nasdaq.com/api/autocomplete/slookup/5?search=${encodeURIComponent(name)}`, NASDAQ_HEADERS);
        const results = search.data || [];
        if (!results.length) return null;
        const best = results.find(r => r.asset === 'STOCKS') || results[0];
        const info = await fetchJSON(`https://api.nasdaq.com/api/quote/${best.symbol}/info?assetclass=${best.asset === 'ETF' ? 'etf' : 'stocks'}`, NASDAQ_HEADERS);
        const pd = info.data?.primaryData;
        if (!pd?.lastSalePrice) return null;
        return { name, symbol: best.symbol, type: best.asset === 'ETF' ? 'ETF' : 'Acción', exchange: best.exchange || 'NASDAQ/NYSE', price: pd.lastSalePrice, change: pd.percentageChange };
    } catch { return null; }
}

async function getAssetInfo(name) {
    if (isCrypto(name)) return await getCryptoInfo(name) || await getStockInfo(name);
    return await getStockInfo(name) || null;
}

// ── HELPERS ───────────────────────────────────────────
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', d => body += d);
        req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
}

function jsonRes(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

// ── SERVER ────────────────────────────────────────────
http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    try {
        const body = await readBody(req);

        // ── GUARDAR DIAGNÓSTICO ───────────────────────
        if (req.url === '/save') {
            const { portfolio, quizAnswers, diagnostico, notaInterna, score, canal } = body;
            const { rows } = await pool.query(
                `INSERT INTO diagnosticos (portfolio, quiz_answers, diagnostico, nota_interna, score, canal)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [
                    typeof portfolio === 'object' ? JSON.stringify(portfolio) : (portfolio || ''),
                    typeof quizAnswers === 'object' ? JSON.stringify(quizAnswers) : (quizAnswers || ''),
                    diagnostico || '',
                    notaInterna || '',
                    score ?? null,
                    (canal === 'outbound' || canal === 'agendado') ? canal : 'inbound'
                ]
            );
            const id = rows[0].id;
            console.log(`[DB] Guardado id=${id}`);
            return jsonRes(res, 200, { ok: true, id });
        }

        // ── GUARDAR EMAIL ─────────────────────────────
        if (req.url === '/save-email') {
            const { id, email, nombre, apellido, celular, canal } = body;
            if (!id || !email) return jsonRes(res, 400, { error: 'id y email requeridos' });
            await pool.query(
                `UPDATE diagnosticos SET email = $1, nombre = $2, apellido = $3, celular = $4, canal = COALESCE($5, canal) WHERE id = $6`,
                [email.trim(), (nombre || '').trim(), (apellido || '').trim(), (celular || '').trim(), ['outbound', 'inbound', 'agendado'].includes(canal) ? canal : null, id]
            );
            console.log(`[DB] Datos id=${id} → ${email}`);
            return jsonRes(res, 200, { ok: true });
        }

        // ── PROXY ANTHROPIC ───────────────────────────
        const { messages, systemPrompt, assetNames } = body;
        const today = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

        let marketBlock = '';
        if (assetNames?.length) {
            const results = await Promise.all(assetNames.map(getAssetInfo));
            const found = results.filter(Boolean);
            if (found.length) {
                marketBlock = `\n\n## DATOS DE MERCADO EN TIEMPO REAL (${today})\nActivos que COTIZAN PÚBLICAMENTE:\n`;
                found.forEach(a => {
                    const chg = a.change24h ? ` | 24h: ${parseFloat(a.change24h) >= 0 ? '+' : ''}${a.change24h}%` : a.change ? ` | cambio: ${a.change}` : '';
                    marketBlock += `- **${a.name}** → ${a.symbol} (${a.exchange}) | ${a.type} | USD ${a.price}${chg}\n`;
                });
                marketBlock += `\nNO clasifiques estos activos como privados.\n`;
                const notFound = assetNames.filter((_, i) => !results[i]);
                if (notFound.length) marketBlock += `\nActivos no encontrados en bolsa: ${notFound.join(', ')}.\n`;
            }
        }

        const systemFinal = `FECHA ACTUAL: ${today}. Tu knowledge cutoff puede no reflejar IPOs recientes. Usá los datos de mercado en tiempo real para clasificar activos.${marketBlock}\n\n${systemPrompt}`;

        const payload = JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 3000,
            system: systemFinal,
            messages
        });

        const apiReq = https.request({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01'
            }
        }, apiRes => {
            let data = '';
            apiRes.on('data', d => data += d);
            apiRes.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error || parsed.type === 'error') {
                        console.error('[Anthropic error]', JSON.stringify(parsed.error || parsed));
                        return jsonRes(res, 500, { error: parsed.error?.message || 'Error de Anthropic' });
                    }
                    const text = parsed.content?.[0]?.text ?? '';
                    if (!text) console.warn('[Anthropic] Respuesta vacía. Parsed:', JSON.stringify(parsed).slice(0, 200));
                    jsonRes(res, 200, { text });
                } catch (e) { jsonRes(res, 500, { error: e.message }); }
            });
        });
        apiReq.on('error', e => jsonRes(res, 500, { error: e.message }));
        apiReq.write(payload);
        apiReq.end();

    } catch (e) {
        jsonRes(res, 400, { error: e.message });
    }
}).listen(PORT, () => {
    console.log(`✓ Proxy en http://localhost:${PORT}`);
    console.log(`✓ Base de datos: Supabase PostgreSQL`);
});
