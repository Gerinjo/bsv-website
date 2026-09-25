import { menu } from './navigation';
import { teamProfiles } from './teamPages';
import { contactPeople } from './contactPeople.server.mjs';

export const personContactTopics = contactPeople.map(({ id, label, description }) => ({ id, label, description }))
  .sort((a, b) => a.label.localeCompare(b.label, 'de'));

export type ContactTopic = {
  id: string;
  label: string;
  description: string;
};

export const fixedContactTopics: ContactTopic[] = [
  { id: 'goalkeeping', label: 'Torwarttraining · Stefan Gastaudo', description: 'Fragen zum Torwarttraining oder Lust, mitzumachen? Deine Nachricht geht direkt an Stefan Gastaudo. Nenne bitte Mannschaft, Alter und Körpergröße, damit Stefan die passende Trainingsgruppe mit dir abstimmen kann.' },
  { id: 'finance', label: 'Vereinskasse', description: 'Für Fragen an die Kasse des Vereins.' },
  { id: 'passwesen', label: 'Passwesen', description: 'Für Fragen zur Spielgenehmigung und zum Spielerpass. Deine Nachricht geht an das Passwesen.' },
  { id: 'match-operations', label: 'Spielbetrieb', description: 'Für organisatorische Fragen zum Spielbetrieb. Deine Nachricht geht an Oliver Schillinger.' },
  { id: 'general', label: 'Allgemeine Themen (Vorstandschaft)', description: 'Nutze diese Auswahl für allgemeine Fragen zum Verein, die keiner Abteilung direkt zugeordnet werden können. Die Nachricht geht an die Vorstandschaft. Bei Fragen zu einer Mitgliedschaft oder einer Mannschaft wähle bitte den passenderen Eintrag aus.' },
  { id: 'membership', label: 'Mitgliederverwaltung', description: 'Hier bist du richtig bei Fragen zu Mitgliedsdaten, Beiträgen oder Änderungen deiner persönlichen Angaben. Auch Rückfragen zu einem bestehenden Mitgliedsantrag gehören hierher. Eine Kündigung muss weiterhin über den dafür vorgesehenen Weg eingereicht werden.' },
  { id: 'youth', label: 'Jugendabteilung', description: 'Wähle im nächsten Schritt Jugendleitung, Elternvertretung oder Jugendkasse aus. Probetrainings und Freundschaftsspiele fragst du bitte direkt beim jeweiligen Team an.' },
  { id: 'sponsoring', label: 'Sponsoring', description: 'Diese Auswahl ist für Unternehmen und Unterstützer gedacht, die sich beim BSV Nordstern engagieren möchten. Wir informieren gerne über Partnerschaften, Werbemöglichkeiten und individuelle Sponsoringleistungen. Nenne uns am besten schon kurz deine Vorstellungen.' },
  { id: 'foerderverein', label: 'Förderverein', description: 'Nutze diese Auswahl für Fragen, Ideen oder Angebote zur Unterstützung des Fördervereins. Einen vollständigen Mitgliedsantrag kannst du direkt auf der Seite „Mitglied im Förderverein werden“ ausfüllen.' },
  { id: 'social', label: 'Social Media', description: 'Nutze diesen Kontakt für Beiträge, Bilder, Hinweise oder Kooperationen rund um unsere Social-Media-Kanäle. Bitte beschreibe kurz, worum es geht und für welchen Kanal der Inhalt gedacht ist. Sende keine sensiblen personenbezogenen Daten über das Formular.' },
  { id: 'referees', label: 'Schiedsrichterwesen', description: 'Diese Auswahl ist für Fragen zur Schiedsrichterausbildung, zum Einstieg als Schiedsrichter:in und zur Begleitung unserer Jugendschiedsrichter vorgesehen.' },
  { id: 'archery', label: 'Bogensport', description: 'Nutze diesen Kontakt für Fragen zum Bogensport, zur Warteliste, zum Training oder zum Einstieg in die Abteilung.' },
  { id: 'gymnastics', label: 'Gymnastik', description: 'Nutze diesen Kontakt für Fragen zu Trainingszeiten, Teilnahme und Einstieg in unsere Gymnastikangebote.' },
  { id: 'hiking', label: 'Wandergruppe', description: 'Nutze diesen Kontakt für Fragen zu Terminen, Strecken, Treffpunkten und zur Teilnahme an den Wanderungen.' },
];

export const youthContactTopics: ContactTopic[] = [
  { id: 'youth-leadership', label: 'Jugendleitung', description: 'Für organisatorische Fragen, das Jugendkonzept und Anliegen, die nicht nur eine bestimmte Mannschaft betreffen.' },
  { id: 'youth-parents', label: 'Elternvertretung', description: 'Für Anliegen aus der Elternschaft und den Austausch zwischen Eltern und Jugendabteilung.' },
  { id: 'youth-finance', label: 'Jugendkasse (Wiebke)', description: 'Für Fragen zu Zahlungen, Abrechnungen und finanziellen Themen der Jugendabteilung.' },
];

const labelsByPath = new Map(
  menu.flatMap((item) => item.groups.flatMap((group) => group.links))
    .map((link) => [link.href.replace(/^\//, ''), link.label.replace(/ · .*$/, '')]),
);

export const contactTeams = Object.values(teamProfiles).map((team) => {
  const name = labelsByPath.get(team.path) ?? team.kicker.split(' · ')[0];
  const key = team.path.replaceAll('/', '--');
  return { key, name, group: team.path.startsWith('jugend/') ? 'youth-team' : 'active-team' };
});

export const contactTopics = fixedContactTopics;

// Keep familiar destinations together instead of mixing departments and people.
const topicById = new Map(fixedContactTopics.map((topic) => [topic.id, topic]));
const topic = (id: string) => topicById.get(id)!;
export const contactTopicGroups = [
  { label: 'Verein & Mitgliedschaft', topics: ['general', 'membership', 'finance'].map(topic) },
  { label: 'Fußball & Junge Sterne', topics: [
    { id: 'active-team', label: 'Aktive Mannschaft' },
    { id: 'youth-team', label: 'Jugendmannschaft' },
    ...['youth', 'goalkeeping', 'passwesen', 'match-operations', 'referees'].map(topic),
  ] },
  { label: 'Weitere Sportangebote', topics: ['archery', 'gymnastics', 'hiking'].map(topic) },
  { label: 'Unterstützen & Mitgestalten', topics: ['foerderverein', 'sponsoring', 'social'].map(topic) },
  { label: 'Persönlicher Kontakt', topics: [{ id: 'person', label: 'Eine bestimmte Ansprechperson' }] },
];
