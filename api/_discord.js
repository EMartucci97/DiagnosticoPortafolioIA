// Notificaciones al canal de Discord vía webhook (env DISCORD_WEBHOOK_DIAGNOSTICOS).
// Compartido entre api/save-email.js y proxy-diagnostico.mjs para que no se desincronicen.
// Nunca tira: si Discord falla, el guardado del lead sigue igual.

async function notificarDiscord(mensaje) {
    const url = process.env.DISCORD_WEBHOOK_DIAGNOSTICOS;
    if (!url) return false; // webhook sin configurar, no romper el flujo
    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: mensaje.slice(0, 2000), allowed_mentions: { parse: [] } }),
            signal: AbortSignal.timeout(5000),
        });
        if (!r.ok) { console.error('[discord]', r.status, await r.text()); return false; }
        return true;
    } catch (e) {
        console.error('[discord]', e);
        return false;
    }
}

// Misma lógica que extractCapital() en admin.html
function extractCapital(portfolioText) {
    if (!portfolioText) return null;
    const m = String(portfolioText).match(/Capital total:\s*USD\s*([\d.,]+)/i);
    if (!m) return null;
    return parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
}

const CANAL_LABEL = { inbound: 'inbound', outbound: 'outbound', agendado: 'agendado' };

function armarMensajeDiagnostico(row) {
    const capital = extractCapital(row.portfolio);
    const clasif = row.clasificacion
        || (capital === null ? null : capital >= 10000 ? 'calificado' : 'no_calificado');
    const clasifLabel = { calificado: 'Calificado', no_calificado: 'No calificado' }[clasif];
    // los datos los escribe el lead: escapamos el markdown para que se vean literales
    const limpio = s => (s || '').toString().trim().replace(/([\\`*_~|>])/g, '\\$1');

    const titulo = ['**Nuevo diagnóstico**'];
    if (row.score !== null && row.score !== undefined) titulo.push('`score ' + row.score + '`');
    if (clasifLabel) titulo.push(clasifLabel);

    const nombre = limpio([row.nombre, row.apellido].filter(Boolean).join(' '));
    const detalle = [];
    if (row.canal) detalle.push('Canal: ' + (CANAL_LABEL[row.canal] || row.canal));
    if (capital !== null) detalle.push('Capital: `USD ' + capital.toLocaleString('es-AR') + '`');
    const utm = row.origen && row.origen.utm_campaign;
    if (utm) detalle.push('Campaña: ' + limpio(utm));

    const lineas = [titulo.join(' · '), ''];
    if (nombre) lineas.push(nombre);
    if (row.celular) lineas.push(limpio(row.celular));
    if (row.email) lineas.push(limpio(row.email));
    if (detalle.length) lineas.push('', detalle.join(' · '));
    lineas.push('', '<https://diagnostico.ruartereports.org/reporte/' + row.id + '>');
    return lineas.join('\n');
}

// Dedup: marca notificado_discord = true de forma atómica; solo el primer request
// que gana el UPDATE manda el mensaje. Si Discord falla, se libera el flag.
async function notificarDiagnosticoCompletado(pool, id) {
    try {
        const { rows } = await pool.query(
            `UPDATE diagnosticos SET notificado_discord = true
             WHERE id = $1 AND notificado_discord IS NOT TRUE
             RETURNING id, nombre, apellido, celular, email, score, clasificacion, canal, portfolio, origen`,
            [id]
        );
        if (!rows.length) return; // ya notificado
        const ok = await notificarDiscord(armarMensajeDiagnostico(rows[0]));
        if (!ok) await pool.query(`UPDATE diagnosticos SET notificado_discord = false WHERE id = $1`, [id]);
    } catch (e) {
        console.error('[discord]', e);
    }
}

module.exports = { notificarDiscord, notificarDiagnosticoCompletado, armarMensajeDiagnostico };
