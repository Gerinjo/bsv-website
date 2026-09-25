import { loadSponsors, renderNewsletterEmail } from './emails.mjs';
import { processNewsletterJob } from './workflow.mjs';
import { token, hash } from '../_shared/newsletter-tokens.mjs';
export { token, hash } from '../_shared/newsletter-tokens.mjs';

export const CONSENT_VERSION = 'nordstern-post-2026-09-24';
const RECEIVED = 'Danke für deine Anmeldung! Schau bitte in dein Postfach und bestätige deine E-Mail-Adresse über unseren Link. Prüfe auch den Spam-Ordner. Falls du gerade schon einen Link angefordert hast, nutze bitte diese Nachricht.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/;
const rateKey = async (value, secret) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)))].map((n) => n.toString(16).padStart(2, '0')).join('');
};
const authorized = async (header, secret) => {
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const actual = await hash(header.slice(7));
  const expected = await hash(secret);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return difference === 0;
};
async function readBody(request) {
  if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('invalid_body');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid_body');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 4096) { await reader.cancel(); throw new Error('invalid_body'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error('invalid_body');
  return body;
}

export function createNewsletterHandler({ db, config, sendEmail, serviceKey, workerSecret = serviceKey, siteUrl = 'https://bsvnordstern.de', allowedOrigins = ['https://bsvnordstern.de', 'https://www.bsvnordstern.de'], segmentId, contactsApiKey, fetcher = fetch }) {
  const processJob = (jobId = null) => processNewsletterJob({ db, config, sendEmail, fetcher, segmentId, contactsApiKey, jobId });
  const query = async (operation) => {
    const result = await operation;
    if (result.error) throw new Error('database');
    return result.data;
  };
  const link = (action, value) => `${siteUrl.replace(/\/$/, '')}/newsletter/${action}#token=${value}`;
  return async (request) => {
    const origin = request.headers.get('origin');
    const cors = {
      'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', Vary: 'Origin',
    };
    const json = (body, status = 200) => Response.json(body, { status, headers: cors });
    if (origin && !allowedOrigins.includes(origin)) return json({ ok: false, message: 'Diese Herkunft ist nicht zugelassen.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ ok: false, message: 'Bitte nutze das Anmeldeformular oder den Link in deiner E-Mail.' }, 405);
    let body;
    try { body = await readBody(request); } catch { return json({ ok: false, message: 'Die Formulardaten sind ungültig.' }, 400); }
    try {
      if (body.action === 'process') {
        if (!await authorized(request.headers.get('authorization'), workerSecret)) return json({ ok: false }, 401);
        await query(db.rpc('newsletter_cleanup'));
        let processed = 0;
        // Keep invocations comfortably within the Edge Function execution window.
        const started = Date.now();
        while (processed < 5 && Date.now() - started < 40000 && await processJob()) processed++;
        return json({ ok: true, processed });
      }
      if (!config.resendApiKey || !config.mailFrom || !serviceKey) return json({ ok: false, message: 'Die Newsletter-Anmeldung ist momentan nicht verfügbar. Bitte versuche es später erneut.' }, 503);
      if (body.action === 'subscribe') {
        if (typeof body.website === 'string' && body.website.trim()) return json({ ok: true, message: RECEIVED });
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || body.consent !== true) {
          return json({ ok: false, message: 'Bitte gib eine gültige E-Mail-Adresse ein und bestätige die Newsletter-Einwilligung.' }, 422);
        }
        if (!UUID.test(body.captchaToken ?? '') || !Number.isInteger(body.captchaAnswer)) return json({ ok: false, message: 'Bitte löse den Spamschutz.' }, 422);
        const captcha = await query(db.from('contact_captcha_challenges').delete().eq('id', body.captchaToken).select('antwort, expires_at').maybeSingle());
        if (!captcha || Date.parse(captcha.expires_at) <= Date.now() || captcha.antwort !== body.captchaAnswer) return json({ ok: false, message: 'Der Spamschutz ist falsch oder abgelaufen. Bitte löse die neue Aufgabe.' }, 422);
        const confirmationToken = token();
        const message = renderNewsletterEmail({ kind: 'confirmation', email, actionUrl: link('bestaetigen', confirmationToken), sponsors: await loadSponsors(fetcher) });
        const ip = request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown';
        const jobId = await query(db.rpc('newsletter_request', {
          p_email: email, p_mode: config.mode, p_token_hash: await hash(confirmationToken), p_message: message,
          p_consent_version: CONSENT_VERSION, p_rate_key: await rateKey(`${config.mode}:${ip}`, serviceKey),
        }));
        // The durable job remains available to the scheduled worker after any failure.
        if (jobId) await processJob(jobId).catch(() => console.error('Newsletter: Versand zur Wiederholung vorgemerkt.'));
        return json({ ok: true, message: config.testMode ? `Testmodus: Die Nachricht geht an die hinterlegte Testadresse. ${RECEIVED}` : RECEIVED }, 202);
      }
      if (!['confirm', 'unsubscribe'].includes(body.action) || typeof body.token !== 'string' || !TOKEN.test(body.token)) return json({ ok: false, message: 'Dieser Link ist ungültig. Bitte melde dich auf der Startseite erneut an.' }, 400);
      const tokenHash = await hash(body.token);
      let result;
      if (body.action === 'confirm') {
        const sub = await query(db.from('newsletter_subscriptions').select('email, token_consumed, confirmation_expires_at').eq('confirmation_token_hash', tokenHash).eq('mail_mode', config.mode).maybeSingle());
        if (!sub) return json({ ok: false, message: 'Dieser Link ist ungültig. Bitte fordere auf der Startseite einen neuen Link an.' }, 400);
        const unsubscribeToken = token();
        // Avoid fetching sponsors or composing another email for repeated/expired links.
        const message = sub.token_consumed || Date.parse(sub.confirmation_expires_at) <= Date.now() ? null : renderNewsletterEmail({
          kind: 'welcome', email: sub.email, actionUrl: link('abmelden', unsubscribeToken), sponsors: await loadSponsors(fetcher),
        });
        result = await query(db.rpc('newsletter_confirm', { p_token_hash: tokenHash, p_mode: config.mode, p_unsubscribe_hash: await hash(unsubscribeToken), p_message: message }));
      } else {
        result = await query(db.rpc('newsletter_unsubscribe', { p_token_hash: tokenHash, p_mode: config.mode }));
      }
      if (['invalid', 'expired'].includes(result.status)) return json({ ok: false, message: result.status === 'expired'
        ? 'Dein Bestätigungslink ist abgelaufen. Bitte melde dich auf der Startseite erneut an.'
        : 'Dieser Link ist nicht mehr gültig. Bitte melde dich bei Fragen unter info@bsvnordstern.de.' }, 400);
      if (result.job_id) {
        await processJob(result.job_id).catch(() => console.error('Newsletter: Benachrichtigung zur Wiederholung vorgemerkt.'));
        const delivery = await query(db.from('newsletter_jobs').select('status, last_error').eq('id', result.job_id).maybeSingle());
        if (delivery?.last_error === 'resend_global_opt_out') return json({ ok: true, status: 'delivery_blocked', message: 'Deine E-Mail-Adresse ist bestätigt. Beim Versanddienst besteht noch eine frühere Abmeldung für alle BSV-Mails. Bitte melde dich unter info@bsvnordstern.de, damit wir deine Newsletter-Anmeldung klären können.' });
        if (delivery && delivery.status !== 'sent') return json({ ok: true, status: result.status, message: body.action === 'unsubscribe'
          ? 'Deine Abmeldung ist gespeichert. Die Übernahme in den Versandverteiler wird noch abgeschlossen.'
          : 'Deine Anmeldung ist bestätigt. Die Aufnahme in den Versandverteiler und deine Willkommensmail werden noch verarbeitet. Bei Fragen erreichst du uns unter info@bsvnordstern.de.' });
      }
      return json({ ok: true, status: result.status, message: body.action === 'unsubscribe'
        ? 'Du bist von unserem Newsletter abgemeldet. Vielen Dank, dass du dabei warst!'
        : config.testMode ? 'Deine Testanmeldung ist bestätigt. Die Willkommensmail geht an die Testadresse; du wirst nicht in den echten Newsletter-Verteiler aufgenommen.'
        : 'Deine Anmeldung ist bestätigt. Schön, dass du dabei bist! Du erhältst jetzt unseren Newsletter. Eine Willkommensmail ist auf dem Weg zu dir.' });
    } catch {
      console.error('Newsletter: Verarbeitung fehlgeschlagen.');
      return json({ ok: false, message: 'Das hat gerade nicht geklappt. Bitte versuche es in wenigen Minuten erneut.' }, 503);
    }
  };
}
