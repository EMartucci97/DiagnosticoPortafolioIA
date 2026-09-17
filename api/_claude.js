const https = require('https');

function callClaude({ systemPrompt, messages, maxTokens = 1500 }) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages
        });
        const req = https.request({
            hostname: 'api.anthropic.com',
            path: '/v1/messages',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01'
            }
        }, res => {
            let data = '';
            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.error || parsed.type === 'error') {
                        reject(new Error(parsed.error?.message || 'Error de Anthropic'));
                        return;
                    }
                    resolve(parsed.content?.[0]?.text ?? '');
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

module.exports = { callClaude };
