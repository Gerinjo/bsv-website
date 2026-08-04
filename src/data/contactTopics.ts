import { menu } from './navigation';
import { teamProfiles } from './teamPages';

export type ContactTopic = {
  id: string;
  label: string;
  description: string;
};

export const fixedContactTopics: ContactTopic[] = [
  { id: 'general', label: 'Allgemeine Themen (Vorstandschaft)', description: 'Nutze diese Auswahl für allgemeine Fragen zum Verein, die keiner Abteilung direkt zugeordnet werden können. Die Nachricht geht an die Vorstandschaft. Bei Fragen zu einer Mitgliedschaft oder einer Mannschaft wähle bitte den passenderen Eintrag aus.' },
  { id: 'membership', label: 'Mitgliederverwaltung', description: 'Hier bist du richtig bei Fragen zu Mitgliedsdaten, Beiträgen oder Änderungen deiner persönlichen Angaben. Auch Rückfragen zu einem bestehenden Mitgliedsantrag gehören hierher. Eine Kündigung muss weiterhin über den dafür vorgesehenen Weg eingereicht werden.' },
  { id: 'youth', label: 'Jugendleitung', description: 'Wähle diesen Kontakt für übergreifende Themen rund um unsere Jugendabteilung. Dazu gehören organisatorische Fragen, Jugendkonzept und Anliegen, die nicht nur eine bestimmte Mannschaft betreffen. Probetrainings und Freundschaftsspiele fragst du bitte direkt beim jeweiligen Team an.' },
  { id: 'sponsoring', label: 'Sponsoring', description: 'Diese Auswahl ist für Unternehmen und Unterstützer gedacht, die sich beim BSV Nordstern engagieren möchten. Wir informieren gerne über Partnerschaften, Werbemöglichkeiten und individuelle Sponsoringleistungen. Nenne uns am besten schon kurz deine Vorstellungen.' },
  { id: 'social', label: 'Social Media', description: 'Nutze diesen Kontakt für Beiträge, Bilder, Hinweise oder Kooperationen rund um unsere Social-Media-Kanäle. Bitte beschreibe kurz, worum es geht und für welchen Kanal der Inhalt gedacht ist. Sende keine sensiblen personenbezogenen Daten über das Formular.' },
  { id: 'referees', label: 'Schiedsrichterwesen', description: 'Diese Auswahl ist für Fragen zur Schiedsrichterausbildung, zum Einstieg als Schiedsrichter:in und zur Begleitung unserer Jugendschiedsrichter vorgesehen.' },
  { id: 'archery', label: 'Bogensport', description: 'Nutze diesen Kontakt für Fragen zum Bogensport, zur Warteliste, zum Training oder zum Einstieg in die Abteilung.' },
  { id: 'gymnastics', label: 'Gymnastik', description: 'Nutze diesen Kontakt für Fragen zu Trainingszeiten, Teilnahme und Einstieg in unsere Gymnastikangebote.' },
  { id: 'hiking', label: 'Wandergruppe', description: 'Nutze diesen Kontakt für Fragen zu Terminen, Strecken, Treffpunkten und zur Teilnahme an den Wanderungen.' },
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
