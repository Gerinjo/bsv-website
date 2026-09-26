// Shared by the page, registration form and server-side fee calculation.
export const GIRLS_CUP_EVENT = Object.freeze({
  topic: 'event-bodensee-indoor-girls-cup',
  title: 'Bodensee Indoor Girls Cup 2027',
  date: '20. & 21. Februar 2027',
  venue: 'Unterseesporthalle Radolfzell',
  address: 'Markelfinger Str. 12, 78315 Radolfzell am Bodensee',
  firstTeamFee: 40,
  additionalTeamFee: 30,
  days: [
    { isoDate: '2027-02-20', date: '20. Februar 2027', weekday: 'Samstag', day: '20', divisions: ['E-Juniorinnen', 'D-Juniorinnen'], divisionKeys: ['E', 'D'] },
    { isoDate: '2027-02-21', date: '21. Februar 2027', weekday: 'Sonntag', day: '21', divisions: ['C-Juniorinnen', 'B-Juniorinnen'], divisionKeys: ['C', 'B'] },
  ],
});

export const GIRLS_CUP_FEE_LABEL = `${GIRLS_CUP_EVENT.firstTeamFee} € für das erste Team, jedes weitere ${GIRLS_CUP_EVENT.additionalTeamFee} €`;

export function calculateGirlsCupFee(teamCount) {
  if (!Number.isSafeInteger(teamCount) || teamCount < 0) throw new RangeError('Invalid team count');
  return teamCount === 0 ? 0 : GIRLS_CUP_EVENT.firstTeamFee + (teamCount - 1) * GIRLS_CUP_EVENT.additionalTeamFee;
}
