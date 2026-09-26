// Shared by the published training plan, team pages and the alert worker.
export type Pitch = 'Hauptplatz' | 'Nebenplatz' | 'Gleisdreieck' | 'Käfig';
export type Allocation = {
  pitch: Pitch;
  share: number;
  shareLabel: string;
  tone: 'active' | 'girls' | 'youth' | 'kids' | 'other';
};


export type TrainingSlot = { day: string; time: string; place: string };
export const teamTraining: Record<string, TrainingSlot[]> = {
  'fussball/herren/bezirksliga': [{day:'Dienstag',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Radolfzell'},{day:'Donnerstag',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Radolfzell'}],
  'fussball/herren/kreisliga-2': [{day:'Dienstag',time:'19:00 – 20:30 Uhr',place:'SV Markelfingen'},{day:'Donnerstag',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Nebenplatz'}],
  'fussball/frauen/bezirksliga': [{day:'Dienstag',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Radolfzell'},{day:'Donnerstag',time:'19:00 – 20:30 Uhr',place:'SC Bankholzen-Moos'}],
  'fussball/frauen/kreisliga': [{day:'Dienstag',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Radolfzell'},{day:'Donnerstag',time:'19:00 – 20:30 Uhr',place:'SC Bankholzen-Moos'}],
  'fussball/alte-herren': [{day:'Mittwoch',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Hauptplatz'}],
  'jugend/u11-e1': [{day:'Dienstag',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern'},{day:'Donnerstag',time:'17:00 – 19:00 Uhr',place:'Käfig am Friedrich-Hecker-Gymnasium Radolfzell'}],
  'jugend/u11-e2': [{day:'Montag',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern Hauptplatz'},{day:'Mittwoch',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern Hauptplatz'}],
  'jugend/u11-e3': [{day:'Dienstag',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern'},{day:'Donnerstag',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern'}],
  'jugend/u9-f': [{day:'Montag',time:'16:00 – 17:30 Uhr',place:'BSV Nordstern'},{day:'Mittwoch',time:'16:00 – 17:30 Uhr',place:'BSV Nordstern Nebenplatz'}],
  'jugend/u8-f': [{day:'Dienstag',time:'17:00 – 18:30 Uhr',place:'BSV Nordstern Hauptplatz'},{day:'Donnerstag',time:'17:00 – 18:30 Uhr',place:'BSV Nordstern Hauptplatz'}],
  'jugend/u7-g': [{day:'Mittwoch',time:'16:30 – 17:30 Uhr',place:'BSV Nordstern Sportplatz'}],
  'jugend/u6-g': [{day:'Mittwoch',time:'16:30 – 17:30 Uhr',place:'BSV Nordstern Sportplatz'}],
  'jugend/u19': [{day:'Dienstag',time:'19:30 – 21:00 Uhr',place:'BSV Nordstern Radolfzell'},{day:'Donnerstag',time:'19:00 – 20:30 Uhr',place:'SV Markelfingen'}],
  'jugend/u17': [{day:'Dienstag',time:'19:00 – 20:30 Uhr',place:'SV Markelfingen'},{day:'Donnerstag',time:'18:30 – 20:00 Uhr',place:'BSV Nordstern Radolfzell'}],
  'jugend/u15-c1': [{day:'Dienstag',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Hauptplatz'},{day:'Donnerstag',time:'18:30 – 20:00 Uhr',place:'BSV Nordstern'}],
  'jugend/u15-c2': [{day:'Mittwoch',time:'19:00 – 20:30 Uhr',place:'BSV Nordstern Hauptplatz'},{day:'Freitag',time:'18:30 – 20:00 Uhr',place:'BSV Nordstern'}],
  'jugend/u13-d1': [{day:'Dienstag',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern'},{day:'Donnerstag',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern'}],
  'jugend/u13-d2': [{day:'Mittwoch',time:'17:30 – 19:00 Uhr',place:'BSV Nordstern'},{day:'Freitag',time:'16:30 – 18:00 Uhr',place:'BSV Nordstern'}],
  'jugend/u13-d3': [{day:'Montag',time:'17:00 – 18:30 Uhr',place:'BSV Nordstern'},{day:'Freitag',time:'16:30 – 18:00 Uhr',place:'BSV Nordstern'}],
  'jugend/juniorinnen/u17': [{day:'Montag',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Sportplatz'},{day:'Mittwoch',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Sportplatz'}],
  'jugend/juniorinnen/u15': [{day:'Montag',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Sportplatz'},{day:'Mittwoch',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Sportplatz'}],
  'jugend/juniorinnen/u13': [{day:'Montag',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Sportplatz'},{day:'Mittwoch',time:'18:00 – 19:30 Uhr',place:'BSV Nordstern Sportplatz'}],
};

export const teamNames: Record<string, string> = {
  'fussball/herren/bezirksliga': 'Herren 1',
  'fussball/herren/kreisliga-2': 'Herren 2',
  'fussball/frauen/bezirksliga': 'Frauen 1',
  'fussball/frauen/kreisliga': 'Frauen 2',
  'fussball/alte-herren': 'Alte Herren',
  'jugend/u11-e1': 'E1-Junioren',
  'jugend/u11-e2': 'E2-Junioren',
  'jugend/u11-e3': 'E3-Junioren',
  'jugend/u9-f': 'U9 F-Junioren',
  'jugend/u8-f': 'F2 + F3-Junioren',
  'jugend/u7-g': 'U7 G-Junioren',
  'jugend/u6-g': 'U6 Spielgruppe',
  'jugend/u19': 'A-Junioren',
  'jugend/u17': 'B-Junioren',
  'jugend/u15-c1': 'C1-Junioren',
  'jugend/u15-c2': 'C2-Junioren',
  'jugend/u13-d1': 'D1-Junioren',
  'jugend/u13-d2': 'D2-Junioren',
  'jugend/u13-d3': 'D3-Junioren',
  'jugend/juniorinnen/u17': 'B-Juniorinnen',
  'jugend/juniorinnen/u15': 'C-Juniorinnen',
  'jugend/juniorinnen/u13': 'D-Juniorinnen',
};

export const allocationByTeam: Record<string, Allocation> = {
  'fussball/herren/bezirksliga': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'active' },
  'fussball/herren/kreisliga-2': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'active' },
  'fussball/frauen/bezirksliga': { pitch: 'Nebenplatz', share: .5, shareLabel: '½ Platz', tone: 'girls' },
  'fussball/frauen/kreisliga': { pitch: 'Nebenplatz', share: .5, shareLabel: '½ Platz', tone: 'girls' },
  'fussball/alte-herren': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'active' },
  'jugend/u11-e1': { pitch: 'Nebenplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'kids' },
  'jugend/u11-e2': { pitch: 'Hauptplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'kids' },
  'jugend/u11-e3': { pitch: 'Nebenplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'kids' },
  'jugend/u9-f': { pitch: 'Hauptplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'kids' },
  'jugend/u8-f': { pitch: 'Hauptplatz', share: 1, shareLabel: 'je ½ Platz', tone: 'kids' },
  'jugend/u7-g': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'kids' },
  'jugend/u6-g': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'kids' },
  'jugend/u19': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'youth' },
  'jugend/u17': { pitch: 'Nebenplatz', share: .5, shareLabel: '½ Platz', tone: 'youth' },
  'jugend/u15-c1': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'youth' },
  'jugend/u15-c2': { pitch: 'Hauptplatz', share: .5, shareLabel: '½ Platz', tone: 'youth' },
  'jugend/u13-d1': { pitch: 'Nebenplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'youth' },
  'jugend/u13-d2': { pitch: 'Hauptplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'youth' },
  'jugend/u13-d3': { pitch: 'Hauptplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'youth' },
  'jugend/juniorinnen/u17': { pitch: 'Nebenplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'girls' },
  'jugend/juniorinnen/u15': { pitch: 'Nebenplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'girls' },
  'jugend/juniorinnen/u13': { pitch: 'Nebenplatz', share: 1 / 3, shareLabel: '⅓ Platz', tone: 'girls' },
};

export const allocationByTeamAndDay: Record<string, Partial<Allocation>> = {
  'jugend/u11-e1|Donnerstag': { pitch: 'Käfig', share: 1, shareLabel: 'Käfig belegt' },
  'fussball/herren/kreisliga-2|Donnerstag': { pitch: 'Nebenplatz' },
  'jugend/u9-f|Mittwoch': { pitch: 'Nebenplatz' },
};
