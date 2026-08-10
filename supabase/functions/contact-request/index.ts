import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEmailRuntimeConfig, sendEmail } from '../_shared/email-service.ts';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const getRouting = (topic: string) => {
  if (!topic.startsWith('team--')) {
    return { routingKey: topic, requestType: 'kontakt', inquiryLabel: 'Kontaktanfrage' } as const;
  }

  const parts = topic.split('--');
  const type = parts.at(-1);
  if (!type || !['trial', 'friendly', 'general'].includes(type) || parts.length < 4) return null;

  return {
    routingKey: parts.slice(0, -1).join('--'),
    requestType: type === 'trial' ? 'probetraining' : type === 'friendly' ? 'freundschaftsspiel' : 'kontakt',
    inquiryLabel: type === 'trial' ? 'Probetraining' : type === 'friendly' ? 'Freundschaftsspiel' : 'Kontaktanfrage',
  } as const;
};

const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return json({ ok: false, message: 'Diese Herkunft ist nicht zugelassen.' }, 403, origin);
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase-Konfiguration fehlt.');
    return json({ ok: false, message: 'Das Kontaktformular ist momentan nicht verfügbar.' }, 500, origin);
  }

  if (request.method === 'GET') {
    const a = crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2;
    const b = crypto.getRandomValues(new Uint8Array(1))[0] % 9 + 1;

    const { data: challenge, error } = await supabase
      .from('contact_captcha_challenges')
      .insert({ antwort: a + b })
      .select('id')
      .single();

    if (error || !challenge?.id) {
      console.error('Captcha konnte nicht erstellt werden:', error);
      return json({ ok: false, message: 'Der Spamschutz konnte nicht geladen werden.' }, 500, origin);
    }

    // Abgelaufene Aufgaben werden nebenbei entfernt; die aktuelle Aufgabe bleibt zehn Minuten gültig.
    const { error: cleanupError } = await supabase
      .from('contact_captcha_challenges')
      .delete()
      .lt('expires_at', new Date().toISOString());
    if (cleanupError) console.error('Abgelaufene Captchas konnten nicht entfernt werden:', cleanupError);

    return json({ ok: true, a, b, token: challenge.id }, 200, origin);
  }

  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Diese Anfrage wird nicht unterstützt.' }, 405, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Die Formulardaten sind ungültig.' }, 400, origin);
  }

  // Das unsichtbare Feld lässt einfache Bots ohne weitere Verarbeitung ins Leere laufen.
  if (text(body.website, 200)) {
    return json({ ok: true, message: 'Vielen Dank! Deine Nachricht wurde erfolgreich gesendet.' }, 200, origin);
  }

  const topic = text(body.topic, 200);
  const firstName = text(body.firstName, 80);
  const lastName = text(body.lastName, 80);
  const email = text(body.email, 160).toLowerCase();
  const phone = text(body.phone, 40);
  const clubName = text(body.clubName, 160);
  const opponentTeam = text(body.opponentTeam, 100);
  const message = text(body.message, 5000);
  const captchaToken = text(body.captchaToken, 80);
  const captchaAnswer = typeof body.captchaAnswer === 'number'
    ? body.captchaAnswer
    : Number.parseInt(text(body.captchaAnswer, 4), 10);
  const privacyAccepted = body.privacyAccepted === true;
  const routing = getRouting(topic);

  if (!routing || firstName.length < 2 || lastName.length < 2 || message.length < 10) {
    return json({ ok: false, message: 'Bitte prüfe deine Eingaben.' }, 422, origin);
  }

  if (routing.requestType === 'freundschaftsspiel' && (clubName.length < 2 || opponentTeam.length < 1)) {
    return json({ ok: false, message: 'Bitte gib den Vereinsnamen und die Mannschaftsbezeichnung an.' }, 422, origin);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, 422, origin);
  }

  if (phone && !/^[0-9+() /-]{6,40}$/.test(phone)) {
    return json({ ok: false, message: 'Bitte gib eine gültige Telefonnummer ein.' }, 422, origin);
  }

  if (!privacyAccepted) {
    return json({ ok: false, message: 'Bitte bestätige die Datenschutzerklärung.' }, 422, origin);
  }

  if (!captchaToken || !Number.isInteger(captchaAnswer)) {
    return json({ ok: false, message: 'Bitte löse den Spamschutz.' }, 422, origin);
  }

  // Löschen und Zurückgeben macht die Aufgabe auch bei parallelen Requests einmalig nutzbar.
  const { data: captcha, error: captchaError } = await supabase
    .from('contact_captcha_challenges')
    .delete()
    .eq('id', captchaToken)
    .select('antwort, expires_at')
    .maybeSingle();

  if (
    captchaError ||
    !captcha ||
    new Date(captcha.expires_at).getTime() < Date.now() ||
    captcha.antwort !== captchaAnswer
  ) {
    return json({ ok: false, message: 'Die Antwort beim Spamschutz ist nicht richtig oder abgelaufen.' }, 422, origin);
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('contact_empfaenger')
    .select('email, bezeichnung')
    .eq('schluessel', routing.routingKey)
    .eq('aktiv', true)
    .maybeSingle();

  if (recipientError || !recipient?.email) {
    console.error('Kontakt-Empfänger nicht gefunden:', routing.routingKey, recipientError);
    return json({ ok: false, message: 'Für dieses Anliegen ist momentan keine Kontaktadresse hinterlegt.' }, 422, origin);
  }

  const { data: inquiry, error: insertError } = await supabase
    .from('contact_anfragen')
    .insert({
      thema: topic,
      routing_schluessel: routing.routingKey,
      anfrageart: routing.requestType,
      empfaenger_email: recipient.email,
      vorname: firstName,
      nachname: lastName,
      email,
      telefon: phone || null,
      gegner_verein: routing.requestType === 'freundschaftsspiel' ? clubName : null,
      gegner_mannschaft: routing.requestType === 'freundschaftsspiel' ? opponentTeam : null,
      nachricht: message,
      datenschutz_bestaetigt: true,
    })
    .select('id')
    .single();

  if (insertError || !inquiry?.id) {
    console.error('Kontaktanfrage konnte nicht gespeichert werden:', insertError);
    return json({ ok: false, message: 'Die Anfrage konnte nicht gespeichert werden.' }, 500, origin);
  }

  const inquiryId = inquiry.id as string;
  const emailConfig = getEmailRuntimeConfig();
  const safeMessage = escapeHtml(message).replaceAll('\n', '<br>');
  const safeFullName = `${escapeHtml(firstName)} ${escapeHtml(lastName)}`;
  const friendlyMatchRows = routing.requestType === 'freundschaftsspiel'
    ? `
            <tr><td><strong>Verein</strong></td><td>${escapeHtml(clubName)}</td></tr>
            <tr><td><strong>Mannschaft</strong></td><td>${escapeHtml(opponentTeam)}</td></tr>`
    : '';

  try {
    const emailResult = await sendEmail({
      to: recipient.email,
      reply_to: email,
      subject: `BSV Nordstern Kontaktanfrage: ${routing.inquiryLabel} von ${firstName.replace(/[\r\n]/g, ' ')} ${lastName.replace(/[\r\n]/g, ' ')}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
          <h2>Neue Anfrage über bsvnordstern.de</h2>
          <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
            <tr><td><strong>Anliegen</strong></td><td>${escapeHtml(routing.inquiryLabel)}</td></tr>
            <tr><td><strong>Zuordnung</strong></td><td>${escapeHtml(recipient.bezeichnung)}</td></tr>
            ${friendlyMatchRows}
            <tr><td><strong>Name</strong></td><td>${safeFullName}</td></tr>
            <tr><td><strong>E-Mail</strong></td><td>${escapeHtml(email)}</td></tr>
            <tr><td><strong>Telefon</strong></td><td>${phone ? escapeHtml(phone) : 'nicht angegeben'}</td></tr>
          </table>
          <h3>Nachricht</h3>
          <p>${safeMessage}</p>
        </div>`,
    });

    const { error: updateError } = await supabase
      .from('contact_anfragen')
      .update({
        benachrichtigung_status: 'versendet',
        mail_modus: emailResult.mode,
        resend_id: emailResult.id,
        benachrichtigung_fehler: null,
      })
      .eq('id', inquiryId);
    if (updateError) console.error('Kontaktstatus konnte nicht aktualisiert werden:', updateError);

    return json({
      ok: true,
      saved: true,
      mailMode: emailResult.mode,
      notificationStatus: 'versendet',
      inquiryId,
      message: 'Vielen Dank! Deine Nachricht wurde erfolgreich gesendet.',
    }, 201, origin);
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 2000) : 'Unbekannter E-Mail-Fehler';
    console.error('Kontakt-E-Mail konnte nicht versendet werden:', error);

    const { error: updateError } = await supabase
      .from('contact_anfragen')
      .update({
        benachrichtigung_status: 'fehler',
        mail_modus: emailConfig.mode,
        benachrichtigung_fehler: detail,
      })
      .eq('id', inquiryId);
    if (updateError) console.error('Kontaktstatus konnte nicht aktualisiert werden:', updateError);

    return json({
      ok: false,
      saved: true,
      notificationStatus: 'fehler',
      message: 'Deine Anfrage wurde gespeichert, die E-Mail konnte aber noch nicht versendet werden. Bitte versuche es später erneut.',
    }, 503, origin);
  }
});
