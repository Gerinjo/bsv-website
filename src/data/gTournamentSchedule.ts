import type { ManualTournamentSchedule } from '../utils/manualTournamentPlan.ts';

const teams = [
  { id: 'g-steisslingen', name: 'FC Steißlingen' },
  { id: 'g-radolfzell-1', name: 'FC 03 Radolfzell' },
  { id: 'g-oehningen', name: 'FC Öhningen' },
  { id: 'g-gaienhofen', name: 'SV Gaienhofen' },
  { id: 'g-bsv-1', name: 'BSV Nordstern Radolfzell' },
  { id: 'g-bsv-2', name: 'BSV Nordstern Radolfzell 2' },
  { id: 'g-boehringen', name: 'FC Böhringen' },
  { id: 'g-radolfzell-2', name: 'FC 03 Radolfzell 2' },
];

export const gTournamentSchedule: ManualTournamentSchedule = {
  id: 'g-gruppe-7-herbst-2026', teamId: 'g-bsv-1', ownTeamIds: ['g-bsv-1', 'g-bsv-2'],
  label: 'G1 + G2', category: 'G-Junioren', season: '2026-2027',
  checkedAt: '2026-09-15T12:00:00+02:00', sourceLabel: 'Gruppenplan · Gruppe 7 · Herbstrunde',
  notice: 'Gemeinsame Fair-Play-Spieltage für BSV Team 1 und 2. Termine laut Gruppenplan; Änderungen vorbehalten. FC Steißlingen richtet erst im Frühjahr einen Spieltag aus.',
  homePitch: 'Hauptplatz', halves: 1, pagePath: '/jugend/u7-g',
  days: [
    { date: '2026-09-27', firstTeamKickoff: '09:30', host: 'FC Böhringen', venue: 'Böhringen', home: false },
    { date: '2026-10-04', firstTeamKickoff: '10:00', host: 'FC 03 Radolfzell', venue: 'Mettnau-Stadion', home: false },
    { date: '2026-10-11', firstTeamKickoff: '09:00', host: 'BSV Nordstern Radolfzell', venue: 'Radolfzell · BSV-Hauptplatz', home: true },
    { date: '2026-10-18', firstTeamKickoff: '11:00', host: 'FC Öhningen', venue: 'Öhningen', home: false },
    { date: '2026-10-24', firstTeamKickoff: '09:00', host: 'SV Gaienhofen', venue: 'Gaienhofen', home: false },
  ].map(({ venue, ...day }) => ({
    ...day, title: 'Fair-Play-Spieltag', url: '', teams,
    venues: [{ name: venue, matchUrl: '' }], preliminary: true,
  })),
};
