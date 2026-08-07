import { MCSHAPE_MINIMUM_AGE, MCSHAPE_TEST_RECIPIENT_EMAIL } from '../_shared/mcshape-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? 'https://bsvnordstern.de,https://gerinjo.github.io,http://localhost:4321')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const getCorsHeaders = (origin: string | null) => ({
  ...corsHeaders,
  'Access-Control-Allow-Origin': origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*',
  Vary: 'Origin',
});

const json = (body: Record<string, unknown>, status: number, headers: Record<string, string>) => new Response(
  JSON.stringify(body),
  { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } },
);

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

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return json({ ok: false, message: 'Methode nicht erlaubt.' }, 405, headers);

  try {
    const body = await request.json();
    const firstName = String(body.firstName ?? '').trim();
    const lastName = String(body.lastName ?? '').trim();
    const birthDate = String(body.birthDate ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const interest = String(body.interest ?? '').trim();
    const preferredContactTime = String(body.preferredContactTime ?? '').trim();
    const clubMember = body.clubMember === true;
    const callbackConsent = body.callbackConsent === true;
    const privacyAccepted = body.privacyAccepted === true;
    const website = String(body.website ?? '').trim();

    if (website) return json({ ok: true }, 200, headers);

    if (!firstName || firstName.length < 2 || firstName.length > 80 || !lastName || lastName.length < 2 || lastName.length > 80) {
      return json({ ok: false, message: 'Bitte Vor- und Nachname prüfen.' }, 400, headers);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return json({ ok: false, message: 'Bitte ein gültiges Geburtsdatum angeben.' }, 400, headers);
    }

    const age = ageOnDate(birthDate);
    if (age === null || age < 0) {
      return json({ ok: false, message: 'Bitte ein gültiges Geburtsdatum angeben.' }, 400, headers);
    }
    if (age < MCSHAPE_MINIMUM_AGE) {
      return json({
        ok: false,
        code: 'minimum_age',
        message: `Für die Online-Anfrage ist aktuell ein Mindestalter von ${MCSHAPE_MINIMUM_AGE} Jahren hinterlegt.`,
      }, 400, headers);
    }

    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) {
      return json({ ok: false, message: 'Bitte eine gültige E-Mail-Adresse angeben.' }, 400, headers);
    }
    if (!/^[0-9+() /-]{6,40}$/.test(phone)) {
      return json({ ok: false, message: 'Bitte eine gültige Telefonnummer angeben.' }, 400, headers);
    }
    if (!interest) {
      return json({ ok: false, message: 'Bitte den gewünschten Tarif oder Beratungsbedarf auswählen.' }, 400, headers);
    }
    if (!preferredContactTime) {
      return json({ ok: false, message: 'Bitte eine bevorzugte Kontaktzeit auswählen.' }, 400, headers);
    }
    if (!clubMember) {
      return json({ ok: false, message: 'Die Kooperationskonditionen gelten für BSV-Mitglieder.' }, 400, headers);
    }
    if (!callbackConsent || !privacyAccepted) {
      return json({ ok: false, message: 'Bitte die erforderlichen Einwilligungen bestätigen.' }, 400, headers);
    }

    const mcShapeRecipient = Deno.env.get('MCSHAPE_RECIPIENT_EMAIL') ?? MCSHAPE_TEST_RECIPIENT_EMAIL;
    const bsvConfirmationRecipient = Deno.env.get('BSV_CONFIRMATION_EMAIL') ?? MCSHAPE_TEST_RECIPIENT_EMAIL;
    const mailFrom = Deno.env.get('MAIL_FROM');

    if (!mcShapeRecipient || !bsvConfirmationRecipient || !mailFrom) {
      throw new Error('Empfänger oder MAIL_FROM sind nicht vollständig konfiguriert.');
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
    await sendResendMail(mainMail);

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

    return json({ ok: true, requesterConfirmationSent }, 200, headers);
  } catch (error) {
    console.error(error);
    return json({ ok: false, message: 'Die Anfrage konnte momentan nicht gesendet werden. Bitte versuche es später erneut.' }, 500, headers);
  }
});
