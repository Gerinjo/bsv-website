// Shared by the page, registration form and server-side fee calculation.
export const GIRLS_CUP_EVENT = Object.freeze({
  topic: 'event-bodensee-indoor-girls-cup',
  title: 'Bodensee Indoor Girls Cup 2027',
  date: '20.02.2027 & 21.02.2027',
  venue: 'Unterseesporthalle Radolfzell',
  address: 'Markelfinger Str. 12, 78315 Radolfzell am Bodensee',
  firstTeamFee: 40,
  additionalTeamFee: 30,
  divisions: {
    E: { capacity: 8, waitingCapacity: 2 },
    D: { capacity: 10, waitingCapacity: 2 },
    C: { capacity: 8, waitingCapacity: 2 },
    B: { capacity: 8, waitingCapacity: 2 },
  },
  days: [
    { isoDate: '2027-02-20', date: '20.02.2027', weekday: 'Samstag', day: '20', divisions: ['E-Juniorinnen', 'D-Juniorinnen'], divisionKeys: ['E', 'D'] },
    { isoDate: '2027-02-21', date: '21.02.2027', weekday: 'Sonntag', day: '21', divisions: ['C-Juniorinnen', 'B-Juniorinnen'], divisionKeys: ['C', 'B'] },
  ],
});

export const GIRLS_CUP_FEE_LABEL = `${GIRLS_CUP_EVENT.firstTeamFee} € für das erste Team, jedes weitere ${GIRLS_CUP_EVENT.additionalTeamFee} €`;
export const GIRLS_CUP_CAPACITY_NOTICE = 'Für die D-Juniorinnen gibt es zehn Turnierplätze, für E-, C- und B-Juniorinnen jeweils acht. Je Altersklasse sind höchstens zwei Teams auf der Warteliste möglich. Die BSV-Mannschaften zählen zu den Turnierplätzen.';

export function calculateGirlsCupFee(teamCount) {
  if (!Number.isSafeInteger(teamCount) || teamCount < 0) throw new RangeError('Invalid team count');
  return teamCount === 0 ? 0 : GIRLS_CUP_EVENT.firstTeamFee + (teamCount - 1) * GIRLS_CUP_EVENT.additionalTeamFee;
}
