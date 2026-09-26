// Shared by the homepage and its public feed so every visible team is refreshed.
export const homeMatchGroups = [
  { id: 'first', label: 'Erste', teams: [
    { path: 'fussball/herren/bezirksliga', label: 'Herren 1', playingMinutes: 90, widgetId: 'af96d999-a7ba-432a-87c5-439ab401516d', teamId: '011MICLVK0000000VTVG0001VTR8C1K7' },
    { path: 'fussball/frauen/bezirksliga', label: 'Frauen 1', playingMinutes: 90, widgetId: 'a7855cb2-0226-49a3-98ca-b106b3786afb', teamId: '01A2FGUHDO000000VV0AG80NVSEJ47CH' },
  ] },
  { id: 'reserve', label: 'Reserve', teams: [
    { path: 'fussball/herren/kreisliga-2', label: 'Herren 2', playingMinutes: 90, widgetId: '48130047-3237-4579-8f2e-a581bbb98097', teamId: '011MIBT808000000VTVG0001VTR8C1K7' },
    { path: 'fussball/frauen/kreisliga', label: 'Frauen 2', playingMinutes: 90, widgetId: '48107d01-3242-45df-8f09-55a20a959688', teamId: '03163NI9R0000000VS5489BSVSCPI5U4' },
  ] },
  { id: 'boys', label: 'Junioren', teams: [
    { path: 'jugend/u19', label: 'A-Junioren', playingMinutes: 90, widgetId: 'c3b6acd7-2482-4c95-8777-b5260146fafc', teamId: '02ENGA3D98000000VS5489B1VU24SJ9U' },
    { path: 'jugend/u17', label: 'B-Junioren', playingMinutes: 80, widgetId: '67008554-b3ee-4cfd-b0f7-55d498330d56', teamId: '02BBS8A0MK000000VS5489B1VU20GQ5T' },
    { path: 'jugend/u15-c1', label: 'C1-Junioren', playingMinutes: 70, widgetId: 'd684d289-c114-4b76-bb2d-333d477416fc', teamId: '0276T1CNK8000000VS5489B2VVRTHQ8E' },
    { path: 'jugend/u15-c2', label: 'C2-Junioren', playingMinutes: 70, widgetId: '9be73063-4394-4705-a49c-7627536742b8', teamId: '031AUPODRC000000VS5489BRVVNAT1LG' },
    { path: 'jugend/u13-d1', label: 'D1-Junioren', playingMinutes: 60, widgetId: '52344c96-823b-47c2-9eb7-caa3630ef628', teamId: '011MICT8J8000000VTVG0001VTR8C1K7' },
    { path: 'jugend/u13-d2', label: 'D2-Junioren', playingMinutes: 60, widgetId: 'be8f058e-f417-41f1-bcd7-badf526aa5a4', teamId: '027LQ5OTKO000000VS5489B1VTUKARPV' },
    { path: 'jugend/u13-d3', label: 'D3-Junioren', playingMinutes: 60, widgetId: 'e1533c60-6426-41ec-83fe-15675870ed93', teamId: '02PPN4UQA0000000VS5489B1VU7RM1AE' },
  ] },
  { id: 'girls', label: 'Juniorinnen', teams: [
    { path: 'jugend/juniorinnen/u17', label: 'B-Juniorinnen', playingMinutes: 80, widgetId: 'f2a25edd-6dea-42fe-a4a5-13b9f10ae342', teamId: '02EK6R3IFK000000VS5489B2VVOABD77' },
    { path: 'jugend/juniorinnen/u15', label: 'C-Juniorinnen', playingMinutes: 70, widgetId: '46b5ce41-4781-47a4-9584-bb5dc5062e54', teamId: '0314RN90R8000000VS5489BRVVV10ESU' },
    { path: 'jugend/juniorinnen/u13', label: 'D-Juniorinnen', playingMinutes: 60, widgetId: '5ba007c5-a744-478b-a885-9defb0561c8c', teamId: '01SE05SKMO000000VS548985VTSAFDL4' },
  ] },
];

export const homeMatchWidgets = homeMatchGroups.flatMap((group) => group.teams.map((team) => team.widgetId));
