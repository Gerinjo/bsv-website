import { BAMBINI_EVENT } from '../_shared/bambini-event.mjs';

export const BAMBINI_ROUTING = Object.freeze({
  routingKey: 'person-jerome-ernsberger',
  requestType: 'kontakt',
  inquiryLabel: `${BAMBINI_EVENT.title} · Mannschaftsanmeldung`,
});

export const BAMBINI_SUCCESS_MESSAGE = 'Vielen Dank! Eure Anmeldung mit euren Wunschzeiten ist eingegangen. Wir melden uns bei eurer Trainerin oder eurem Trainer und bestätigen die Teilnahme sowie die zugeteilte Startzeit persönlich.';

export function prepareBambiniRegistration(body) {
  const club = typeof body.clubName === 'string' ? body.clubName.trim() : '';
  const notes = typeof body.message === 'string' ? body.message.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (club.length < 2 || club.length > 160 || /[\r\n\u0000-\u001f]/.test(club)) {
    return { error: 'Bitte gib euren Vereinsnamen an (2 bis 160 Zeichen).' };
  }
  if (!Array.isArray(body.timeSlots) || body.timeSlots.length < 1 || body.timeSlots.length > BAMBINI_EVENT.timeSlots.length
    || body.timeSlots.some((slot) => !BAMBINI_EVENT.timeSlots.includes(slot)) || new Set(body.timeSlots).size !== body.timeSlots.length) {
    return { error: 'Bitte wähle mindestens eine Wunschzeit aus: 9:00, 12:00 oder 15:00 Uhr.' };
  }
  if (!/^[0-9+() /-]{6,40}$/.test(phone)) return { error: 'Bitte gib eine Telefonnummer für Rückfragen an.' };
  if (notes.length > 2000 || (body.message != null && typeof body.message !== 'string')) {
    return { error: 'Deine Anmerkungen dürfen höchstens 2.000 Zeichen lang sein.' };
  }
  if (body.registrationAccepted !== true) return { error: 'Bitte bestätige den Hinweis zur persönlichen Teilnahme- und Startzeitbestätigung.' };

  // Build the complete registration on the server; clients cannot change event or recipient.
  return {
    message: [
      `${BAMBINI_EVENT.title} · ${BAMBINI_EVENT.date}`,
      'Mannschaftsanmeldung mit Wunschzeiten',
      '',
      `Verein: ${club}`,
      `Priorisierte Zeitfenster: ${BAMBINI_EVENT.timeSlots.filter((slot) => body.timeSlots.includes(slot)).map((slot) => `${slot} Uhr`).join(', ')}`,
      '',
      `Termin: ${BAMBINI_EVENT.date}`,
      `Spielort: ${BAMBINI_EVENT.venue}`,
      `Startgebühr: ${BAMBINI_EVENT.fee}`,
      'Kontaktperson: Trainerin oder Trainer der Mannschaft',
      'Hinweis zur persönlichen Teilnahme- und Startzeitbestätigung: bestätigt',
      '',
      `Anmerkungen: ${notes || 'Keine'}`,
    ].join('\n'),
  };
}
