import { GIRLS_CUP_EVENT, GIRLS_CUP_FEE_LABEL, calculateGirlsCupFee } from '../_shared/girls-cup-event.mjs';

export const GIRLS_CUP_ROUTING = Object.freeze({
  routingKey: 'person-jerome-ernsberger',
  requestType: 'kontakt',
  inquiryLabel: `${GIRLS_CUP_EVENT.title} · Mannschaftsanmeldung`,
});

export const GIRLS_CUP_SUCCESS_MESSAGE = 'Vielen Dank! Eure Anmeldung zum Bodensee Indoor Girls Cup ist eingegangen. Wir melden uns bei eurer Trainerin oder eurem Trainer und bestätigen die Teilnahme der angemeldeten Teams und die Startzeiten persönlich.';

/** @param {Record<string, unknown>} body */
export function prepareGirlsCupRegistration(body) {
  const club = typeof body.clubName === 'string' ? body.clubName.trim() : '';
  const notes = typeof body.message === 'string' ? body.message.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (club.length < 2 || club.length > 160 || /[\r\n\u0000-\u001f]/.test(club)) {
    return { error: 'Bitte gib euren Vereinsnamen an (2 bis 160 Zeichen).' };
  }
  if (!/^[0-9+() /-]{6,40}$/.test(phone)) return { error: 'Bitte gib eine Telefonnummer für Rückfragen an.' };
  if (notes.length > 2000 || (body.message != null && typeof body.message !== 'string')) {
    return { error: 'Deine Anmerkungen dürfen höchstens 2.000 Zeichen lang sein.' };
  }
  const days = body.days;
  if (!Array.isArray(days) || days.length < 1 || days.length > GIRLS_CUP_EVENT.days.length
    || new Set(days).size !== days.length || days.some((date) => !GIRLS_CUP_EVENT.days.some((day) => day.isoDate === date))) {
    return { error: 'Bitte wähle mindestens einen der beiden Turniertage aus.' };
  }
  const teams = body.teams;
  const divisions = GIRLS_CUP_EVENT.days.flatMap((day) => day.divisionKeys);
  if (!Array.isArray(teams) || teams.length < 1 || teams.length > divisions.length
    || teams.some((team) => !team || typeof team !== 'object' || !divisions.includes(team.division)
      || !Number.isSafeInteger(team.count) || team.count < 1 || team.count > 99)
    || new Set(teams.map((team) => team.division)).size !== teams.length) {
    return { error: 'Bitte gib für jede gewünschte Altersklasse eine ganze Teamanzahl zwischen 1 und 99 an.' };
  }
  // Every selected day needs teams, and teams may only belong to selected days.
  if (GIRLS_CUP_EVENT.days.some((day) => days.includes(day.isoDate) !== teams.some((team) => day.divisionKeys.includes(team.division)))) {
    return { error: 'Bitte melde für jeden ausgewählten Tag mindestens ein Team in der passenden Altersklasse an.' };
  }
  if (body.registrationAccepted !== true) return { error: 'Bitte bestätige den Hinweis zu Startgebühren und persönlicher Teilnahmebestätigung.' };

  const teamCount = teams.reduce((sum, team) => sum + team.count, 0);
  const totalFee = calculateGirlsCupFee(teamCount);
  const selectedDays = GIRLS_CUP_EVENT.days.filter((day) => days.includes(day.isoDate));
  return {
    teamCount,
    totalFee,
    message: [
      GIRLS_CUP_EVENT.title,
      'Mannschaftsanmeldung',
      '',
      `Verein: ${club}`,
      ...selectedDays.flatMap((day) => [
        `${day.weekday}, ${day.date}:`,
        ...day.divisionKeys.flatMap((division) => {
          const team = teams.find((item) => item.division === division);
          return team ? [`  ${division}-Juniorinnen: ${team.count} ${team.count === 1 ? 'Team' : 'Teams'}`] : [];
        }),
      ]),
      '',
      `Teams insgesamt: ${teamCount}`,
      `Startgebühren insgesamt: ${totalFee} €`,
      `Staffelung: ${GIRLS_CUP_FEE_LABEL} (gemeinsam für beide Tage dieser Anmeldung).`,
      `Spielort: ${GIRLS_CUP_EVENT.venue}`,
      `Adresse: ${GIRLS_CUP_EVENT.address}`,
      'Kontaktperson: Trainerin oder Trainer der Mannschaften',
      'Hinweis zu Gebühren und persönlicher Teilnahme- und Startzeitbestätigung: bestätigt',
      '',
      `Anmerkungen: ${notes || 'Keine'}`,
    ].join('\n'),
  };
}
