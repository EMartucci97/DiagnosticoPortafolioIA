const https = require('https');

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
        }, r => {
            let data = '';
            r.on('data', d => data += d);
            r.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
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

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
        const { messages, systemPrompt, assetNames } = req.body;
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

        const text = await new Promise((resolve, reject) => {
            const apiReq = https.request({
                hostname: 'api.anthropic.com',
                path: '/v1/messages',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.ANTHROPIC_KEY,
                    'anthropic-version': '2023-06-01'
                }
            }, apiRes => {
                let data = '';
                apiRes.on('data', d => data += d);
                apiRes.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.error || parsed.type === 'error') {
                            reject(new Error(parsed.error?.message || 'Error de Anthropic'));
                            return;
                        }
                        resolve(parsed.content?.[0]?.text ?? '');
                    } catch(e) { reject(e); }
                });
            });
            apiReq.on('error', reject);
            apiReq.write(payload);
            apiReq.end();
        });

        res.status(200).json({ text });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
};
