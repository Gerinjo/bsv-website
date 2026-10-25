export const EVENT_CONTACT_URL = 'https://bsvnordstern.de/kontakt/?thema=person-jerome-ernsberger';
export const CLUB_ADDRESS = 'Schlesierstraße 43, 78315 Radolfzell am Bodensee';

const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const lines = (value) => escapeHtml(value).replaceAll('\n', '<br>');
const cleanSubject = (value) => String(value).replace(/[\r\n]/g, ' ');

// Event facts and details come from the server's validated registration, never client-supplied fees or URLs.
export function buildEventConfirmation({ event, firstName, lastName, email, phone, details, notes = '', reference, replyTo }) {
  const nextSteps = event.nextSteps ?? 'Wir prüfen eure Anmeldung und bestätigen euch die Teilnahme und die endgültigen Startzeiten persönlich. Eure angegebenen Wunschzeiten sind noch keine feste Zuteilung.';
  const rows = [
    ['Veranstaltung', event.title], ['Termin', event.date], ['Spielort', event.venue],
    ['Adresse', event.address], ...details,
    ['Kontaktperson eurer Anmeldung', `${firstName} ${lastName}`], ['E-Mail', email], ['Telefon', phone],
    ['Anmerkungen', notes || 'Keine'], ['Anmeldenummer', reference],
  ];
  const rowHtml = rows.map(([label, value]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #dde5de;line-height:1.6;overflow-wrap:anywhere;"><strong style="color:#164f32;">${escapeHtml(label)}</strong><br>${lines(value)}</td></tr>`).join('');
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.address}`)}`;
  const button = (label, url) => `<a href="${escapeHtml(url)}" style="display:inline-block;margin:8px 8px 0 0;padding:13px 18px;background:#164f32;color:#ffffff;text-decoration:none;font-weight:700;border-radius:4px;">${escapeHtml(label)}</a>`;
  return {
    to: email,
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: `Eure Anmeldung ist eingegangen – ${cleanSubject(event.title)}`,
    html: `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Anmeldebestätigung</title></head>
<body style="margin:0;padding:0;background:#eef2ee;font-family:Arial,Helvetica,sans-serif;color:#17251b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ee;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-collapse:collapse;box-shadow:0 10px 35px rgba(9,47,32,.10);">
<tr><td style="padding:34px 24px;background:#092f20;border-bottom:7px solid #f4d638;color:#ffffff;">
<div style="font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#f4d638;font-weight:700;">BSV Nordstern e.V. Radolfzell</div>
<h1 style="margin:10px 0 8px;font-size:32px;line-height:1.15;">Danke für eure Anmeldung!</h1>
<p style="margin:0;color:#c9d9cf;line-height:1.6;">${escapeHtml(event.title)}</p></td></tr>
<tr><td style="padding:32px 24px 24px;">
<p style="margin:0 0 18px;font-size:18px;font-weight:700;">Hallo ${escapeHtml(firstName)},</p>
<p style="margin:0 0 18px;line-height:1.7;color:#3f5146;">eure Anmeldung ist erfolgreich beim BSV Nordstern eingegangen. Schön, dass ihr dabei sein möchtet! Hier findet ihr alle Angaben auf einen Blick.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f3;border-left:4px solid #f4d638;"><tr><td style="padding:12px 18px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowHtml}</table></td></tr></table>
</td></tr>
<tr><td style="padding:28px 24px;background:#f8faf8;"><h2 style="margin:0 0 12px;color:#164f32;font-size:23px;">Wie geht es weiter?</h2>
<p style="margin:0;line-height:1.7;color:#3f5146;">${escapeHtml(nextSteps)}</p>
<p style="margin:12px 0 0;line-height:1.7;color:#3f5146;">Diese E-Mail bestätigt den Eingang eurer Anmeldung. Bei Änderungen oder Rückfragen nennt uns bitte eure Anmeldenummer und sendet keine zweite Anmeldung.</p></td></tr>
<tr><td style="padding:28px 24px;"><h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Euer Ansprechpartner</h2>
<p style="margin:0 0 12px;line-height:1.7;color:#3f5146;"><a href="${EVENT_CONTACT_URL}" style="color:#164f32;font-weight:700;">Jérôme Ernsberger</a><br>Jugendleiter · BSV Nordstern Radolfzell<br>Fragen zur Anmeldung, zum Ablauf oder zur Anreise? Meldet euch gerne über unsere Homepage${replyTo ? ' oder antwortet direkt auf diese E-Mail' : ''}.</p>
${button('Jérôme kontaktieren', EVENT_CONTACT_URL)}${button('Veranstaltung ansehen', event.url)}${button('Anfahrt zum Spielort', mapUrl)}</td></tr>
<tr><td style="padding:24px;background:#092f20;color:#d3dfd7;font-size:13px;line-height:1.7;"><strong style="color:#f4d638;">Gemeinsam auf und neben dem Platz.</strong><br>BSV Nordstern e.V. Radolfzell<br>Vereinsanschrift: ${CLUB_ADDRESS}<br><a href="https://bsvnordstern.de/" style="color:#ffffff;">bsvnordstern.de</a> · <a href="https://bsvnordstern.de/datenschutz/" style="color:#ffffff;">Datenschutz</a></td></tr>
</table></td></tr></table></body></html>`,
    text: `Hallo ${firstName},\n\neure Anmeldung ist erfolgreich beim BSV Nordstern eingegangen. Schön, dass ihr dabei sein möchtet!\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nWie geht es weiter?\n${nextSteps}\nDiese E-Mail bestätigt den Eingang eurer Anmeldung. Bei Änderungen oder Rückfragen nennt uns bitte eure Anmeldenummer und sendet keine zweite Anmeldung.\n\nJérôme Ernsberger – Jugendleiter\n${EVENT_CONTACT_URL}${replyTo ? '\nIhr könnt auch direkt auf diese E-Mail antworten.' : ''}\n\nVeranstaltung: ${event.url}\nAnfahrt: ${mapUrl}\n\nBSV Nordstern e.V. Radolfzell\nVereinsanschrift: ${CLUB_ADDRESS}\nhttps://bsvnordstern.de/\nDatenschutz: https://bsvnordstern.de/datenschutz/`,
  };
}

// Track applicant delivery separately from the internal notification. A mail failure never undoes the saved registration.
export async function deliverEventConfirmation({ db, table, id, message, mode, sendEmail, delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) }) {
  let result, failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await sendEmail(message, { idempotencyKey: `event-confirmation/${mode}/${table}/${id}`, timeoutMs: 10000 });
      failure = undefined;
      break;
    } catch (error) {
      failure = error;
      // Retry transient provider/network failures with the same key; configuration and validation errors need intervention.
      if (attempt === 2 || !/\(429\)|\(5\d\d\)|fetch|network|timeout|timed out|aborted/i.test(String(error))) break;
      await delay(1000 * (attempt + 1));
    }
  }
  const status = result ? 'versendet' : 'fehler';
  if (failure) console.error('Event-Bestätigung konnte nicht versendet werden:', { table, id, error: String(failure).slice(0, 2000) });
  try {
    const { error } = await db.from(table).update({
      bestaetigung_status: status,
      bestaetigung_mail_modus: result?.mode ?? mode,
      bestaetigung_resend_id: result?.id ?? null,
      bestaetigung_fehler: failure ? String(failure).slice(0, 2000) : null,
    }).eq('id', id);
    if (error) console.error('Event-Bestätigungsstatus konnte nicht gespeichert werden:', { table, id, error });
  } catch (error) {
    console.error('Event-Bestätigungsstatus konnte nicht gespeichert werden:', { table, id, error });
  }
  return status;
}
