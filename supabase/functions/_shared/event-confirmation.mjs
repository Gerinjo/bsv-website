import { getOtherTournaments } from './tournament-announcements.mjs';
import { buildYouthSponsorFooter } from './youth-sponsors.mjs';

export const EVENT_CONTACT_URL = 'https://bsvnordstern.de/kontakt/?thema=person-jerome-ernsberger';
export const CLUB_ADDRESS = 'Schlesierstraße 43, 78315 Radolfzell am Bodensee';

const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const lines = (value) => escapeHtml(value).replaceAll('\n', '<br>');
const cleanSubject = (value) => String(value).replace(/[\r\n]/g, ' ');

// Event facts and details come from the server's validated registration, never client-supplied fees or URLs.
export function buildEventConfirmation({ event, firstName, lastName, email, phone, details, notes = '', reference, replyTo, now = new Date(), sponsors = [], payment = null }) {
  const sponsorFooter = buildYouthSponsorFooter(sponsors);
  const nextSteps = event.nextSteps ?? 'Wir berücksichtigen eure Wunschzeiten bei der Einteilung. Die endgültige Startzeit und alle weiteren Informationen zum Ablauf schicken wir euch rechtzeitig vor dem Spieltag zu.';
  const rows = [
    ['Veranstaltung', event.title], ['Termin', event.date], ['Spielort', event.venue],
    ['Adresse', event.address], ...details,
    ['Kontaktperson eurer Anmeldung', `${firstName} ${lastName}`], ['E-Mail', email], ['Telefon', phone],
    ['Anmerkungen', notes || 'Keine'], ['Anmeldenummer', reference],
  ];
  const rowHtml = rows.map(([label, value]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #dde5de;line-height:1.6;overflow-wrap:anywhere;"><strong style="color:#164f32;">${escapeHtml(label)}</strong><br>${lines(value)}</td></tr>`).join('');
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.address}`)}`;
  const button = (label, url) => `<a href="${escapeHtml(url)}" style="display:inline-block;margin:8px 8px 0 0;padding:13px 18px;background:#164f32;color:#ffffff;text-decoration:none;font-weight:700;border-radius:4px;">${escapeHtml(label)}</a>`;
  const headerBackground = 'https://bsvnordstern.de/images/onboarding/email-header-organic.png';
  const paymentRows = payment ? [
    ['Startgebühr', payment.amount], ['Kontoinhaber', payment.accountHolder], ['Bank', payment.bank],
    ['IBAN', payment.iban.replace(/(.{4})(?=.)/g, '$1 ')], ['BIC', payment.bic], ['Verwendungszweck', payment.purpose],
  ] : [];
  const paymentHtml = payment ? `<tr><td style="padding:28px 24px;background:#f3f6f3;"><h2 style="margin:0 0 12px;color:#164f32;font-size:23px;">Eure Startgebühr</h2>
<p style="margin:0 0 18px;line-height:1.7;color:#3f5146;">Ihr könnt die Startgebühr entweder <strong>bar vor Ort bei der Turnierleitung</strong> bezahlen oder direkt an unsere <strong>Jugendkasse überweisen</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border-left:4px solid #f4d638;"><tr><td style="padding:12px 18px;line-height:1.7;overflow-wrap:anywhere;">${paymentRows.map(([label, value]) => `<p style="margin:6px 0;"><strong style="color:#164f32;">${escapeHtml(label)}</strong><br>${escapeHtml(value)}</p>`).join('')}</td></tr></table></td></tr>` : '';
  const paymentText = payment ? `\n\nEure Startgebühr\nIhr könnt die Startgebühr entweder bar vor Ort bei der Turnierleitung bezahlen oder direkt an unsere Jugendkasse überweisen.\n${paymentRows.map(([label, value]) => `${label}: ${value}`).join('\n')}` : '';
  const otherTournaments = getOtherTournaments(event.url, now);
  const tournamentHtml = otherTournaments.length ? `<tr><td style="padding:28px 24px;background:#f3f6f3;">
<p style="margin:0 0 8px;color:#164f32;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Noch mehr Fußball beim BSV</p>
<h2 style="margin:0 0 12px;color:#164f32;font-size:23px;">Unsere weiteren Turniere</h2>
<p style="margin:0 0 20px;line-height:1.7;color:#3f5146;">Vielleicht ist auch für eure anderen Mannschaften etwas dabei. Gebt die Termine gerne in eurem Verein weiter!</p>
${otherTournaments.map(tournament => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;background:#ffffff;border-left:4px solid #f4d638;"><tr><td style="padding:18px;line-height:1.6;overflow-wrap:anywhere;">
<p style="margin:0 0 6px;color:#164f32;font-size:13px;font-weight:700;">${escapeHtml(tournament.date)}</p>
<h3 style="margin:0 0 8px;color:#17251b;font-size:18px;line-height:1.35;">${escapeHtml(tournament.title)}</h3>
<p style="margin:0 0 6px;color:#3f5146;font-size:14px;">${escapeHtml(tournament.audience)}<br>${escapeHtml(tournament.venue)}</p>
<p style="margin:0 0 10px;color:#52665a;font-size:13px;">${escapeHtml(tournament.note)}</p>
${tournament.image ? `<img src="${escapeHtml(tournament.image.src)}" width="584" height="${Math.round(584 * tournament.image.height / tournament.image.width)}" alt="${escapeHtml(tournament.image.alt)}" style="display:block;width:100%;max-width:584px;height:auto;margin:16px 0 6px;border:0;">
<p style="margin:0 0 14px;color:#687b6e;font-size:12px;line-height:1.5;">${escapeHtml(tournament.image.caption)}</p>` : ''}
<a href="${escapeHtml(tournament.url)}" style="color:#164f32;font-size:14px;font-weight:700;">Infos &amp; Anmeldung →</a></td></tr></table>`).join('')}
</td></tr>` : '';
  const tournamentText = otherTournaments.length ? `\n\nUnsere weiteren BSV-Turniere\nGebt die Termine gerne in eurem Verein weiter!\n\n${otherTournaments.map(tournament => `${tournament.title}\n${tournament.date}\n${tournament.audience}\n${tournament.venue}\n${tournament.note}\nInfos & Anmeldung: ${tournament.url}`).join('\n\n')}` : '';
  return {
    to: email,
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: `Eure Anmeldung ist bestätigt – ${cleanSubject(event.title)}`,
    html: `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Anmeldebestätigung</title><style>@media only screen and (max-width:480px){.event-header-gutter{padding:26px 20px 32px!important}.event-header-title{font-size:27px!important}.event-header-logo{width:82px!important;height:auto!important}.event-header-logo-cell{width:96px!important;padding-left:12px!important}}</style></head>
<body style="margin:0;padding:0;background:#eef2ee;font-family:Arial,Helvetica,sans-serif;color:#17251b;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ee;"><tr><td align="center" style="padding:24px 12px;">
<!--[if mso]><table role="presentation" width="680" align="center" cellspacing="0" cellpadding="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-collapse:collapse;box-shadow:0 10px 35px rgba(9,47,32,.10);">
<tr><td bgcolor="#092f20" background="${headerBackground}" style="background-color:#092f20;background-image:url('${headerBackground}');background-size:cover;background-position:center;background-repeat:no-repeat;border-bottom:7px solid #f4d638;color:#ffffff;">
<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:680px"><v:fill type="frame" src="${headerBackground}" color="#092f20"/><v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true"><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="event-header-gutter" style="padding:34px 28px 40px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;"><tr><td valign="middle" style="vertical-align:middle;">
<p style="margin:0 0 14px;font-size:11px;line-height:1.6;letter-spacing:1.5px;text-transform:uppercase;color:#f4d638;font-weight:700;">BSV Nordstern e.V.<br>Radolfzell · Seit 1956</p>
<h1 class="event-header-title" style="margin:0 0 14px;font-size:34px;line-height:1.15;color:#ffffff;">Danke für eure Anmeldung!</h1>
<p style="margin:0;color:#d7e5dc;font-size:15px;line-height:1.6;overflow-wrap:anywhere;">${escapeHtml(event.title)}</p></td>
<td class="event-header-logo-cell" width="132" align="center" valign="middle" style="width:132px;padding-left:20px;text-align:center;vertical-align:middle;"><a href="https://bsvnordstern.de/" style="text-decoration:none;"><img class="event-header-logo" src="https://bsvnordstern.de/images/verein/wappen/bsv-nordstern.png" width="112" height="106" alt="BSV Nordstern Radolfzell" style="display:block;width:112px;max-width:100%;height:auto;margin:0 auto;border:0;"></a></td>
</tr></table></td></tr></table>
<!--[if gte mso 9]></v:textbox></v:rect><![endif]--></td></tr>
<tr><td style="padding:32px 24px 24px;">
<p style="margin:0 0 18px;font-size:18px;font-weight:700;">Hallo ${escapeHtml(firstName)},</p>
<p style="margin:0 0 18px;line-height:1.7;color:#3f5146;">vielen Dank für eure Anmeldung! Eure Teilnahme ist hiermit bestätigt. Wir freuen uns darauf, euch beim BSV Nordstern zu begrüßen. Hier findet ihr alle Angaben auf einen Blick.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6f3;border-left:4px solid #f4d638;"><tr><td style="padding:12px 18px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rowHtml}</table></td></tr></table>
</td></tr>
<tr><td style="padding:28px 24px;background:#f8faf8;"><h2 style="margin:0 0 12px;color:#164f32;font-size:23px;">Schön, dass ihr dabei seid!</h2>
<p style="margin:0;line-height:1.7;color:#3f5146;">${escapeHtml(nextSteps)}</p>
</td></tr>
${paymentHtml}
<tr><td style="padding:28px 24px;"><h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Euer Ansprechpartner</h2>
<p style="margin:0 0 12px;line-height:1.7;color:#3f5146;"><a href="${EVENT_CONTACT_URL}" style="color:#164f32;font-weight:700;">Jérôme Ernsberger</a><br>Jugendleiter · BSV Nordstern Radolfzell<br>Fragen zur Anmeldung, zum Ablauf oder zur Anreise? Meldet euch gerne über unsere Homepage${replyTo ? ' oder antwortet direkt auf diese E-Mail' : ''}.</p>
${button('Jérôme kontaktieren', EVENT_CONTACT_URL)}${button('Veranstaltung ansehen', event.url)}${button('Anfahrt zum Spielort', mapUrl)}</td></tr>
${tournamentHtml}
${sponsorFooter.html}
<tr><td style="padding:24px;background:#092f20;color:#d3dfd7;font-size:13px;line-height:1.7;"><strong style="color:#f4d638;">Gemeinsam auf und neben dem Platz.</strong><br>BSV Nordstern e.V. Radolfzell<br>Vereinsanschrift: ${CLUB_ADDRESS}<br><a href="https://bsvnordstern.de/" style="color:#ffffff;">bsvnordstern.de</a> · <a href="https://bsvnordstern.de/datenschutz/" style="color:#ffffff;">Datenschutz</a></td></tr>
</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`,
    text: `Hallo ${firstName},\n\nvielen Dank für eure Anmeldung! Eure Teilnahme ist hiermit bestätigt. Wir freuen uns darauf, euch beim BSV Nordstern zu begrüßen.\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nSchön, dass ihr dabei seid!\n${nextSteps}${paymentText}\n\nJérôme Ernsberger – Jugendleiter\n${EVENT_CONTACT_URL}${replyTo ? '\nIhr könnt auch direkt auf diese E-Mail antworten.' : ''}\n\nVeranstaltung: ${event.url}\nAnfahrt: ${mapUrl}${tournamentText}${sponsorFooter.text}\n\nBSV Nordstern e.V. Radolfzell\nVereinsanschrift: ${CLUB_ADDRESS}\nhttps://bsvnordstern.de/\nDatenschutz: https://bsvnordstern.de/datenschutz/`,
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
