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
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const normalizeIban = (value: string) => value.replaceAll(/\s/g, '').toUpperCase();

const isValidIban = (value: string) => {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const digits = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
};

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const formatDate = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
};

const getSupabase = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
};

const makeApplicationNumber = () => {
  const date = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replaceAll('-', '');
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  const suffix = [...bytes].map((byte) => byte.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 6);
  return `FV-${date}-${suffix}`;
};

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return json({ ok: false, message: 'Diese Herkunft ist nicht zugelassen.' }, 403, origin);
  }

  const supabase = getSupabase();
  if (!supabase) return json({ ok: false, message: 'Das Antragsformular ist momentan nicht verfügbar.' }, 500, origin);

  if (request.method === 'GET') {
    const a = crypto.getRandomValues(new Uint8Array(1))[0] % 8 + 2;
    const b = crypto.getRandomValues(new Uint8Array(1))[0] % 9 + 1;
    const { data: challenge, error } = await supabase
      .from('contact_captcha_challenges')
      .insert({ antwort: a + b })
      .select('id')
      .single();
    if (error || !challenge?.id) return json({ ok: false, message: 'Der Spamschutz konnte nicht geladen werden.' }, 500, origin);
    await supabase.from('contact_captcha_challenges').delete().lt('expires_at', new Date().toISOString());
    return json({ ok: true, a, b, token: challenge.id }, 200, origin);
  }

  if (request.method !== 'POST') return json({ ok: false, message: 'Diese Anfrage wird nicht unterstützt.' }, 405, origin);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Die Formulardaten sind ungültig.' }, 400, origin);
  }

  if (text(body.website, 200)) {
    return json({ ok: true, message: 'Vielen Dank! Dein Förderantrag wurde erfolgreich übermittelt.' }, 200, origin);
  }

  const firstName = text(body.firstName, 80);
  const lastName = text(body.lastName, 80);
  const birthDate = text(body.birthDate, 10);
  const phone = text(body.phone, 40);
  const email = text(body.email, 160).toLowerCase();
  const street = text(body.street, 160);
  const postalCode = text(body.postalCode, 5);
  const city = text(body.city, 100);
  const bsvMember = body.bsvMember === true;
  const annualContribution = Number(body.annualContribution);
  const supportWilling = body.supportWilling === true;
  const supportIdeas = text(body.supportIdeas, 1500);
  const bankName = text(body.bankName, 120);
  const accountHolder = text(body.accountHolder, 160);
  const bic = text(body.bic, 11).replaceAll(/\s/g, '').toUpperCase();
  const iban = normalizeIban(text(body.iban, 34));
  const signatureCity = text(body.signatureCity, 100);
  const signatureDate = text(body.signatureDate, 10);
  const signatureData = text(body.signatureData, 1_000_000);
  const notes = text(body.notes, 2000);
  const captchaToken = text(body.captchaToken, 80);
  const captchaAnswer = typeof body.captchaAnswer === 'number' ? body.captchaAnswer : Number.parseInt(text(body.captchaAnswer, 4), 10);
  const sepaAccepted = body.sepaAccepted === true;
  const statutesAccepted = body.statutesAccepted === true;
  const privacyAccepted = body.privacyAccepted === true;

  const minimumContribution = bsvMember ? 11 : 25;
  if (
    firstName.length < 2 || lastName.length < 2 || !isValidDate(birthDate) ||
    street.length < 3 || !/^\d{5}$/.test(postalCode) || city.length < 2 ||
    !/^[0-9+() /-]{6,40}$/.test(phone) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !Number.isFinite(annualContribution) || annualContribution < minimumContribution || annualContribution > 10000
  ) {
    return json({ ok: false, message: 'Bitte prüfe deine persönlichen Angaben und den Förderbetrag.' }, 422, origin);
  }
  if (bankName.length < 2 || accountHolder.length < 2 || !isValidIban(iban) || (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic))) {
    return json({ ok: false, message: 'Bitte prüfe die Bankverbindung. Die IBAN muss vollständig und gültig sein.' }, 422, origin);
  }
  if (!sepaAccepted || !statutesAccepted || !privacyAccepted || signatureCity.length < 2 || !isValidDate(signatureDate)) {
    return json({ ok: false, message: 'Bitte bestätige SEPA-Mandat, Satzung und Datenschutz und ergänze Ort und Datum.' }, 422, origin);
  }

  const signatureMatch = signatureData.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!signatureMatch || signatureMatch[1].length < 140 || signatureMatch[1].length > 900_000) {
    return json({ ok: false, message: 'Bitte unterschreibe den Antrag im Unterschriftenfeld.' }, 422, origin);
  }
  if (!captchaToken || !Number.isInteger(captchaAnswer)) return json({ ok: false, message: 'Bitte löse den Spamschutz.' }, 422, origin);

  const { data: captcha, error: captchaError } = await supabase
    .from('contact_captcha_challenges')
    .delete()
    .eq('id', captchaToken)
    .select('antwort, expires_at')
    .maybeSingle();
  if (captchaError || !captcha || new Date(captcha.expires_at).getTime() < Date.now() || captcha.antwort !== captchaAnswer) {
    return json({ ok: false, message: 'Die Antwort beim Spamschutz ist nicht richtig oder abgelaufen.' }, 422, origin);
  }

  const { data: recipient, error: recipientError } = await supabase
    .from('contact_empfaenger')
    .select('email, weitere_emails, bezeichnung')
    .eq('schluessel', 'foerderverein')
    .eq('aktiv', true)
    .maybeSingle();
  if (recipientError || !recipient?.email) {
    console.error('Förderverein-Empfänger fehlt:', recipientError);
    return json({ ok: false, message: 'Der Förderantrag kann momentan nicht zugestellt werden.' }, 500, origin);
  }

  const applicationNumber = makeApplicationNumber();
  const { data: application, error: insertError } = await supabase
    .from('foerderverein_antraege')
    .insert({
      antragsnummer: applicationNumber,
      vorname: firstName,
      nachname: lastName,
      email,
      bsv_mitglied: bsvMember,
      foerderbetrag: annualContribution,
      empfaenger_email: recipient.email,
    })
    .select('id')
    .single();
  if (insertError || !application?.id) {
    console.error('Förderantrag konnte nicht protokolliert werden:', insertError);
    return json({ ok: false, message: 'Der Förderantrag konnte nicht gespeichert werden.' }, 500, origin);
  }

  const recipients = [recipient.email, ...(Array.isArray(recipient.weitere_emails) ? recipient.weitere_emails : [])];
  const safeNotes = notes ? escapeHtml(notes).replaceAll('\n', '<br>') : 'keine';
  const safeSupportIdeas = supportIdeas ? escapeHtml(supportIdeas).replaceAll('\n', '<br>') : 'keine';
  const contributionLabel = annualContribution.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const emailConfig = getEmailRuntimeConfig();

  try {
    const internalResult = await sendEmail({
      to: recipients,
      reply_to: email,
      subject: `Fördervereinsantrag ${applicationNumber}: ${firstName.replace(/[\r\n]/g, ' ')} ${lastName.replace(/[\r\n]/g, ' ')}`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
          <h2>Neuer Online-Antrag für den Förderverein</h2>
          <p><strong>Antragsnummer:</strong> ${applicationNumber}</p>
          <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
            <tr><td><strong>Name</strong></td><td>${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
            <tr><td><strong>Geburtsdatum</strong></td><td>${formatDate(birthDate)}</td></tr>
            <tr><td><strong>Anschrift</strong></td><td>${escapeHtml(street)}, ${escapeHtml(postalCode)} ${escapeHtml(city)}</td></tr>
            <tr><td><strong>E-Mail</strong></td><td>${escapeHtml(email)}</td></tr>
            <tr><td><strong>Telefon</strong></td><td>${escapeHtml(phone)}</td></tr>
            <tr><td><strong>Bereits BSV-Mitglied</strong></td><td>${bsvMember ? 'Ja' : 'Nein'}</td></tr>
            <tr><td><strong>Jahresbeitrag</strong></td><td>${contributionLabel} €</td></tr>
            <tr><td><strong>Persönliche Unterstützung</strong></td><td>${supportWilling ? 'Ja' : 'Nein'}</td></tr>
            <tr><td><strong>Ideen</strong></td><td>${safeSupportIdeas}</td></tr>
          </table>
          <h3>SEPA-Lastschriftmandat</h3>
          <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">
            <tr><td><strong>Kreditinstitut</strong></td><td>${escapeHtml(bankName)}</td></tr>
            <tr><td><strong>Kontoinhaber:in</strong></td><td>${escapeHtml(accountHolder)}</td></tr>
            <tr><td><strong>IBAN</strong></td><td>${escapeHtml(iban.replace(/(.{4})/g, '$1 ').trim())}</td></tr>
            <tr><td><strong>BIC</strong></td><td>${bic ? escapeHtml(bic) : 'nicht angegeben'}</td></tr>
            <tr><td><strong>Mandat bestätigt</strong></td><td>Ja</td></tr>
          </table>
          <h3>Abschluss</h3>
          <p>Satzung und Datenschutz wurden bestätigt.<br>Unterschrieben in ${escapeHtml(signatureCity)} am ${formatDate(signatureDate)}.</p>
          <p><strong>Weitere Informationen:</strong><br>${safeNotes}</p>
          <p>Die digitale Unterschrift ist als Anlage beigefügt.</p>
        </div>`,
      attachments: [{ filename: `Unterschrift-${applicationNumber}.png`, content: signatureMatch[1], content_type: 'image/png' }],
    });

    await supabase.from('foerderverein_antraege').update({
      benachrichtigung_status: 'versendet',
      mail_modus: internalResult.mode,
      resend_id: internalResult.id,
      benachrichtigung_fehler: null,
    }).eq('id', application.id);

    try {
      const confirmationResult = await sendEmail({
        to: email,
        subject: `Eingangsbestätigung Fördervereinsantrag ${applicationNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#173b29">
            <h2>Vielen Dank für deine Unterstützung!</h2>
            <p>Hallo ${escapeHtml(firstName)},</p>
            <p>dein Antrag auf Mitgliedschaft im Förderverein des BSV Nordstern ist bei uns eingegangen.</p>
            <p><strong>Antragsnummer:</strong> ${applicationNumber}<br><strong>Jährlicher Förderbetrag:</strong> ${contributionLabel} €</p>
            <p>Der Förderverein prüft die Angaben und meldet sich bei Rückfragen bei dir. Aus Sicherheitsgründen enthält diese Bestätigung keine Bankdaten.</p>
            <p>Sportliche Grüße<br>Förderverein des BSV Nordstern Radolfzell</p>
          </div>`,
      });
      await supabase.from('foerderverein_antraege').update({
        bestaetigung_status: 'versendet',
        bestaetigung_resend_id: confirmationResult.id,
      }).eq('id', application.id);
    } catch (confirmationError) {
      console.error('Eingangsbestätigung konnte nicht versendet werden:', confirmationError);
      await supabase.from('foerderverein_antraege').update({ bestaetigung_status: 'fehler' }).eq('id', application.id);
    }

    return json({
      ok: true,
      applicationNumber,
      mailMode: internalResult.mode,
      message: `Vielen Dank! Dein Förderantrag ${applicationNumber} wurde erfolgreich übermittelt.`,
    }, 201, origin);
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 2000) : 'Unbekannter E-Mail-Fehler';
    console.error('Förderantrag konnte nicht zugestellt werden:', error);
    await supabase.from('foerderverein_antraege').update({
      benachrichtigung_status: 'fehler',
      mail_modus: emailConfig.mode,
      benachrichtigung_fehler: detail,
    }).eq('id', application.id);
    return json({ ok: false, saved: true, message: 'Der Antrag wurde gespeichert, konnte aber noch nicht zugestellt werden. Bitte versuche es später erneut.' }, 503, origin);
  }
});
