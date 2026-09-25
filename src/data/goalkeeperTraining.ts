export const goalkeeperTraining = [
  {
    day: 'Mittwoch', time: '17:30 – 18:30 Uhr',
    team: 'Torwarttraining · 5-m-Tor', path: 'jugend/torwarttraining', filterKey: 'goalkeeping',
    place: 'BSV Nordstern Gleisdreieck', location: 'Gleisdreieck · zwischen Haupt- und Nebenplatz',
    allocation: { pitch: 'Gleisdreieck', share: 0, shareLabel: '1 5-m-Tor', goalCount: 1, tone: 'other' },
  },
  {
    day: 'Mittwoch', time: '18:45 – 19:45 Uhr',
    team: 'Torwarttraining · großes Tor', path: 'jugend/torwarttraining', filterKey: 'goalkeeping',
    place: 'BSV Nordstern Nebenplatz', location: 'Nebenplatz · ein großes Tor (7,32 m)',
    allocation: { pitch: 'Nebenplatz', share: 0, shareLabel: '1 großes Tor', goalCount: 1, tone: 'other' },
  },
] as const;
