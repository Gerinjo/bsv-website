import type { ManualTournamentSchedule } from '../utils/manualTournamentPlan.ts';

type Group = {
  team: 'F1' | 'F2' | 'F3'; group: number; checkedAt: string; participants: string[];
  dates: { date: string; time: string; host: string; venue: string; home?: boolean }[];
};

function schedule({ team, group, checkedAt, participants, dates }: Group): ManualTournamentSchedule {
  const teams = participants.map((name, index) => ({ id: `${team.toLowerCase()}-group-${group}-${index}`, name }));
  const ownTeamId = teams.find((entry) => entry.name.startsWith('BSV Nordstern'))!.id;
  return {
    id: `${team.toLowerCase()}-gruppe-${group}-herbst-2026`, teamId: ownTeamId, ownTeamIds: [ownTeamId],
    label: team, category: 'F-Junioren', season: '2026-2027', checkedAt: checkedAt + 'T12:00:00+02:00',
    sourceLabel: `Gruppenplan · Gruppe ${group} · Herbstrunde`,
    notice: 'Termine laut Gruppenplan; Änderungen vorbehalten. Noch nicht angegebene Uhrzeiten werden ergänzt.',
    homePitch: null, halves: 2, pagePath: team === 'F1' ? '/jugend/u9-f' : '/jugend/u8-f',
    sectionId: 'spieltage-' + team.toLowerCase(),
    days: dates.map(({ time, venue, home = false, ...day }) => ({
      ...day, firstTeamKickoff: time, home, title: 'Fair-Play-Spieltag', url: '', teams,
      venues: [{ name: venue, matchUrl: '' }], preliminary: true,
    })),
  };
}

export const fTournamentSchedules = [
  schedule({ team: 'F1', group: 9, checkedAt: '2026-09-15',
    participants: ['FC 03 Radolfzell', 'SV Gaienhofen', 'SV Markelfingen', 'SV Bohlingen', 'FC 03 Radolfzell 2', 'BSV Nordstern Radolfzell', 'FC Öhningen'],
    dates: [
      { date: '2026-09-27', time: '10:00', host: 'FC Öhningen', venue: 'Öhningen' },
      { date: '2026-10-04', time: '13:30', host: 'FC 03 Radolfzell', venue: 'Mettnau-Stadion' },
      { date: '2026-10-10', time: '09:00', host: 'BSV Nordstern Radolfzell', venue: 'Radolfzell · BSV-Sportgelände', home: true },
      { date: '2026-10-18', time: '', host: 'SV Bohlingen', venue: 'Bohlingen' },
      { date: '2026-10-24', time: '12:00', host: 'SV Gaienhofen', venue: 'Gaienhofen' },
    ],
  }),
  schedule({ team: 'F2', group: 10, checkedAt: '2026-09-13',
    participants: ['SC Bankholzen-Moos', 'SV Böhringen', 'SG Stahringen', 'TSV Überlingen/Ried', 'SC Bankholzen-Moos 2', 'BSV Nordstern Radolfzell 2', 'SG Liggeringen/Güttingen', 'TSV Überlingen/Ried 2'],
    dates: [
      { date: '2026-09-19', time: '15:30', host: 'TSV Überlingen/Ried', venue: 'Waldsportplatz' },
      { date: '2026-09-27', time: '12:30', host: 'FC Böhringen', venue: 'Böhringen' },
      { date: '2026-10-10', time: '12:00', host: 'BSV Nordstern Radolfzell', venue: 'Radolfzell · BSV-Sportgelände', home: true },
      { date: '2026-10-25', time: '13:30', host: 'SG Liggeringen/Güttingen', venue: 'Güttingen' },
    ],
  }),
  schedule({ team: 'F3', group: 5, checkedAt: '2026-09-10',
    participants: ['SG Aach-Eigeltingen', 'VfR Stockach 2', 'FC Steißlingen', 'BSV Nordstern Radolfzell 3', 'SG Aach-Eigeltingen 2', 'SV Orsingen-Nenzingen', 'FSG Zizenhausen-Hi.-Ho.'],
    dates: [
      { date: '2026-09-27', time: '11:00', host: 'FC Steißlingen', venue: 'Steißlingen' },
      { date: '2026-10-04', time: '13:00', host: 'SG Aach-Eigeltingen', venue: 'Honstetten' },
      { date: '2026-10-10', time: '15:00', host: 'BSV Nordstern Radolfzell', venue: 'Radolfzell · BSV-Sportgelände', home: true },
      { date: '2026-10-17', time: '10:00', host: 'SV Orsingen-Nenzingen', venue: 'Nenzingen' },
      { date: '2026-10-31', time: '', host: 'FSG Zizenhausen-Hi.-Ho.', venue: 'Zizenhausen' },
    ],
  }),
];
