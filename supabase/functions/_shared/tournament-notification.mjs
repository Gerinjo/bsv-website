import { bsvEmailDocument } from './club-email.mjs';
import { buildYouthSponsorFooter } from './youth-sponsors.mjs';

export const TOURNAMENT_NOTIFICATION_RECIPIENT = 'jerome.ernsberger@bsvnordstern.de';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]);
const lines = value => escapeHtml(value).replaceAll('\n', '<br>');

export function buildTournamentNotification({ event, firstName, lastName, email, phone, message, reference, subject, sponsors = [] }) {
  const rows = [
    ['Veranstaltung', event.title], ['Termin', event.date], ['Spielort', event.venue],
    ['Name', `${firstName} ${lastName}`], ['E-Mail', email], ['Telefon', phone || 'nicht angegeben'],
    ['Anmeldenummer', reference],
  ];
  const footer = buildYouthSponsorFooter(sponsors);
  return {
    to: [TOURNAMENT_NOTIFICATION_RECIPIENT],
    reply_to: email,
    subject: (subject || `BSV Nordstern Turnieranmeldung: ${event.title} von ${firstName} ${lastName}`).replace(/[\r\n]/g, ' '),
    // Complete youth template, like the applicant receipt. No sponsor-snapshot RPC
    // is needed to send this operational notification, even when that RPC is down.
    html: bsvEmailDocument({
      title: 'Neue Mannschaftsanmeldung', subtitle: event.title,
      bodyRows: `<tr><td class="bsv-email-content" style="padding:28px 24px;line-height:1.7;">
<p>Eine Mannschaft wurde für das Turnier angemeldet.</p>
<table width="100%" cellspacing="0" cellpadding="6" style="border-collapse:collapse;background:#f3f6f3;border-left:4px solid #f4d638;">${rows.map(([label, value]) => `<tr><th scope="row" align="left" valign="top">${escapeHtml(label)}</th><td>${lines(value)}</td></tr>`).join('')}</table>
<h2 style="color:#164f32;">Angaben zur Anmeldung</h2><p>${lines(message)}</p>
<p>Antworte auf diese E-Mail, um die Kontaktperson der Mannschaft zu erreichen.</p></td></tr>${footer.html}`,
    }),
    text: `Neue Mannschaftsanmeldung\n\n${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nAngaben zur Anmeldung\n${message}\n\nAntworte auf diese E-Mail, um die Kontaktperson der Mannschaft zu erreichen.${footer.text}`,
  };
}

export async function deliverTournamentNotification({ db, table, id, message, mode, sendEmail, idempotencyKey = `tournament-notification/${mode}/${table}/${id}`, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  let result, failure;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await sendEmail(message, { idempotencyKey, timeoutMs: 15000 });
      failure = undefined;
      break;
    } catch (error) {
      failure = error;
      if (attempt === 2 || !/\(429\)|\(5\d\d\)|fetch|network|timeout|timed out|aborted/i.test(String(error))) break;
      await delay(1000 * (attempt + 1));
    }
  }
  const status = result ? 'versendet' : 'fehler';
  if (failure) console.error('Turnier-Info konnte nicht versendet werden:', { table, id, error: String(failure).slice(0, 2000) });
  try {
    const { error } = await db.from(table).update({
      benachrichtigung_status: status, mail_modus: result?.mode ?? mode,
      ...(result ? { resend_id: result.id } : {}),
      benachrichtigung_fehler: failure ? String(failure).slice(0, 2000) : null,
    }).eq('id', id);
    if (error) console.error('Turnier-Infostatus konnte nicht gespeichert werden:', { table, id, error });
  } catch (error) {
    console.error('Turnier-Infostatus konnte nicht gespeichert werden:', { table, id, error });
  }
  return status;
}
