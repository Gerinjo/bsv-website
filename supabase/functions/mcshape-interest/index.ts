import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MCSHAPE_MINIMUM_AGE, MCSHAPE_TEST_RECIPIENT_EMAIL } from '../_shared/mcshape-config.ts';

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });

const text = (value: unknown, maxLength: number) =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const ageOnDate = (birthDate: string, now = new Date()) => {
  const [year, month, day] = birthDate.split('-').map(Number);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (
    !year || !month || !day ||
    birth.getUTCFullYear() !== year ||
    birth.getUTCMonth() !== month - 1 ||
    birth.getUTCDate() !== day
  ) return null;

  let age = now.getUTCFullYear() - year;
  const currentMonth = now.getUTCMonth() + 1;
  const currentDay = now.getUTCDate();
  if (currentMonth < month || (currentMonth === month && currentDay < day)) age -= 1;
  return age;
};

const sendResendMail = async (payload: Record<string, unknown>) => {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) throw new Error('RESEND_API_KEY fehlt.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`E-Mail-Versand fehlgeschlagen (${response.status}): ${detail}`);
  }
};

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Diese Anfrage wird nicht unterstützt.' }, 405, origin);
  }

  if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) {
    return json({ ok: false, message: 'Diese Herkunft ist nicht zugelassen.' }, 403, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: 'Die Formulardaten sind ungültig.' }, 400, origin);
  }

  // Unsichtbares Feld für einfache Bots – identisch zum GST-Prinzip.
  if (text(body.website, 200)) {
    return json({ ok: true, saved: true, message: 'Vielen Dank! Die Anfrage wurde gespeichert.' }, 201, origin);
  }

  const firstName = text(body.firstName, 80);
  const lastName = text(body.lastName, 80);
  const birthDate = text(body.birthDate, 10);
  const email = text(body.email, 160).toLowerCase();
  const phone = text(body.phone, 40);
  const interest = text(body.interest, 160);
  const preferredContactTime = text(body.preferredContactTime, 80);
  const clubMember = body.clubMember === true;
  const callbackConsent = body.callbackConsent === true;
  const privacyAccepted = body.privacyAccepted === true;

  if (!firstName || !lastName || !birthDate || !email || !phone || !interest || !preferredContactTime) {
    return json({ ok: false, message: 'Bitte fülle alle Pflichtfelder aus.' }, 400, origin);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ ok: false, message: 'Bitte gib eine gültige E-Mail-Adresse ein.' }, 400, origin);
  }

  if (!/^[0-9+() /-]{6,40}$/.test(phone)) {
    return json({ ok: false, message: 'Bitte gib eine gültige Telefonnummer ein.' }, 400, origin);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return json({ ok: false, message: 'Bitte gib ein gültiges Geburtsdatum ein.' }, 400, origin);
  }

  const age = ageOnDate(birthDate);
  if (age === null || age < 0) {
    return json({ ok: false, message: 'Bitte gib ein gültiges Geburtsdatum ein.' }, 400, origin);
  }

  if (age < MCSHAPE_MINIMUM_AGE) {
    return json({
      ok: false,
      code: 'minimum_age',
      message: `Für die Online-Anfrage ist aktuell ein Mindestalter von ${MCSHAPE_MINIMUM_AGE} Jahren hinterlegt.`,
    }, 400, origin);
  }

  if (!clubMember || !callbackConsent || !privacyAccepted) {
    return json({ ok: false, message: 'Bitte bestätige Mitgliedschaft, Rückruf und Datenschutz.' }, 400, origin);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase-Konfiguration fehlt.');
    return json({ ok: false, message: 'Die Anfrage ist momentan nicht verfügbar.' }, 500, origin);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: registration, error: insertError } = await supabase
    .from('mcshape_anmeldungen')
    .insert({
      vorname: firstName,
      nachname: lastName,
      geburtsdatum: birthDate,
      alter_bei_anfrage: age,
      email,
      telefon: phone,
      interesse: interest,
      bevorzugte_kontaktzeit: preferredContactTime,
      bsv_mitglied_bestaetigt: true,
      rueckruf_einwilligung: true,
      datenschutz_bestaetigt: true,
    })
    .select('id')
    .single();

  if (insertError || !registration?.id) {
    console.error('MC-Shape-Anfrage konnte nicht gespeichert werden:', insertError);
    return json({ ok: false, message: 'Die Anfrage konnte nicht gespeichert werden.' }, 500, origin);
  }

  const registrationId = registration.id as string;

  const setNotificationStatus = async (
    status: 'fehler' | 'teilweise' | 'versendet',
    requesterConfirmationSent = false,
  ) => {
    const { error } = await supabase
      .from('mcshape_anmeldungen')
      .update({
        benachrichtigung_status: status,
        bestaetigung_anfragende_person_versendet: requesterConfirmationSent,
      })
      .eq('id', registrationId);

    if (error) console.error('Benachrichtigungsstatus konnte nicht aktualisiert werden:', error);
  };

  const mcShapeRecipient = Deno.env.get('MCSHAPE_RECIPIENT_EMAIL') ?? MCSHAPE_TEST_RECIPIENT_EMAIL;
  const bsvConfirmationRecipient = Deno.env.get('BSV_CONFIRMATION_EMAIL') ?? MCSHAPE_TEST_RECIPIENT_EMAIL;
  const mailFrom = Deno.env.get('MAIL_FROM');

  if (!mcShapeRecipient || !bsvConfirmationRecipient || !mailFrom) {
    console.error('E-Mail-Konfiguration fehlt; Anfrage wurde trotzdem gespeichert.');
    await setNotificationStatus('fehler');
    return json({
      ok: true,
      saved: true,
      notificationStatus: 'fehler',
      requesterConfirmationSent: false,
      registrationId,
      message: 'Die Anfrage wurde gespeichert.',
    }, 201, origin);
  }

  const safeName = `${escapeHtml(firstName)} ${escapeHtml(lastName)}`;
  const interestLabel = escapeHtml(interest);
  const contactTimeLabel = escapeHtml(preferredContactTime);

  const detailsHtml = `
    <h2>Neue BSV-Anfrage für MC Shape Radolfzell</h2>
    <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">
      <tr><td><strong>Name</strong></td><td>${safeName}</td></tr>
      <tr><td><strong>Geburtsdatum</strong></td><td>${escapeHtml(birthDate)}</td></tr>
      <tr><td><strong>Alter bei Anfrage</strong></td><td>${age} Jahre</td></tr>
      <tr><td><strong>E-Mail</strong></td><td>${escapeHtml(email)}</td></tr>
      <tr><td><strong>Telefon</strong></td><td>${escapeHtml(phone)}</td></tr>
      <tr><td><strong>Interesse</strong></td><td>${interestLabel}</td></tr>
      <tr><td><strong>Bevorzugte Kontaktzeit</strong></td><td>${contactTimeLabel}</td></tr>
      <tr><td><strong>BSV-Mitgliedschaft bestätigt</strong></td><td>Ja</td></tr>
      <tr><td><strong>Rückruf ausdrücklich gewünscht</strong></td><td>Ja</td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;font-size:13px;color:#666">Die Person hat der Verarbeitung und Weitergabe der Angaben zur Terminvereinbarung an MC Shape Radolfzell zugestimmt.</p>`;

  const mainMail: Record<string, unknown> = {
    from: mailFrom,
    to: [mcShapeRecipient],
    reply_to: email,
    subject: `BSV Nordstern · MC-Shape-Anfrage von ${firstName} ${lastName}`,
    html: detailsHtml,
  };

  if (bsvConfirmationRecipient.toLowerCase() !== mcShapeRecipient.toLowerCase()) {
    mainMail.bcc = [bsvConfirmationRecipient];
  }

  try {
    await sendResendMail(mainMail);
  } catch (error) {
    console.error('Hauptbenachrichtigung konnte nicht versendet werden:', error);
    await setNotificationStatus('fehler');
    return json({
      ok: true,
      saved: true,
      notificationStatus: 'fehler',
      requesterConfirmationSent: false,
      registrationId,
      message: 'Die Anfrage wurde gespeichert.',
    }, 201, origin);
  }

  let requesterConfirmationSent = true;
  try {
    await sendResendMail({
      from: mailFrom,
      to: [email],
      subject: 'Deine Anfrage zu den BSV-Konditionen bei MC Shape',
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#222">
          <h2>Danke für deine Anfrage, ${escapeHtml(firstName)}.</h2>
          <p>Wir haben deine Anfrage zu den BSV-Konditionen bei MC Shape Radolfzell erhalten und an die zuständige Kontaktperson weitergegeben.</p>
          <p><strong>Telefon:</strong> ${escapeHtml(phone)}<br><strong>Gewünschte Kontaktzeit:</strong> ${contactTimeLabel}</p>
          <p>MC Shape kann dich nun zur persönlichen Terminabsprache anrufen.</p>
          <p>Viele Grüße<br>BSV Nordstern Radolfzell</p>
        </div>`,
    });
  } catch (error) {
    requesterConfirmationSent = false;
    console.error('Bestätigung an anfragende Person konnte nicht gesendet werden:', error);
  }

  const notificationStatus = requesterConfirmationSent ? 'versendet' : 'teilweise';
  await setNotificationStatus(notificationStatus, requesterConfirmationSent);

  return json({
    ok: true,
    saved: true,
    notificationStatus,
    requesterConfirmationSent,
    registrationId,
    message: 'Die Anfrage wurde erfolgreich gespeichert.',
  }, 201, origin);
});
