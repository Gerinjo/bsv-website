const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const dateLabel = (date) => new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(new Date(date + 'T12:00:00Z'));

export function footballAlertEmail(alert, recipients) {
  const date = dateLabel(alert.date);
  const conflict = alert.kind === 'training_conflict';
  const subject = conflict ? `Platzbelegung: ${alert.team} am ${date}` : `Schiedsrichter fehlt: ${alert.team} am ${date}`;
  const intro = conflict
    ? `Auf dem ${alert.pitch} ist ein Spiel eingeplant, dessen Platzbelegung sich mit eurem Training überschneidet.`
    : 'Für euer Heimspiel in zwei Tagen ist auf FUSSBALL.DE derzeit kein Schiedsrichter eingetragen.';
  const details = [
    ['Mannschaft', alert.team], ['Spiel', alert.matchLabel], ['Termin', `${date}, Anstoß ${alert.kickoff}${alert.kickoff === 'noch offen' ? '' : ' Uhr'}`],
    ...(conflict ? [['Platz', alert.pitch], ['Euer Training', alert.trainingTime], ['Platzbelegung des Spiels', alert.bookingTime]] : [['Wettbewerb', alert.competition]]),
  ];
  const action = conflict
    ? 'Bitte prüft die Platzbelegung und organisiert euer Training gegebenenfalls um. Stimmt eine andere Trainingszeit, einen anderen Platz oder eine mögliche gemeinsame Nutzung mit den Verantwortlichen ab.'
    : 'Bitte prüft den aktuellen Stand auf FUSSBALL.DE und klärt rechtzeitig mit dem Spielbetrieb beziehungsweise dem Schiedsrichterwesen, wie das Spiel geleitet wird.';
  const note = conflict
    ? 'Die angegebene Spielbelegung berücksichtigt auch Vorbereitung und Nachlauf. Diese Nachricht ändert keine Buchung und sagt kein Training ab.'
    : 'Die Prüfung bezieht sich auf den öffentlich sichtbaren Eintrag. Eine spätere Ansetzung oder eine intern bereits geklärte Besetzung ist möglich.';
  const url = /^https:\/\/www\.fussball\.de\/(spiel|spieltag)\//.test(alert.url) ? alert.url
    : /^\/jugend\/[a-z0-9/-]+(?:#[a-z0-9-]+)?$/.test(alert.url) ? 'https://bsvnordstern.de' + alert.url
    : 'https://bsvnordstern.de/fussball/spieltagsbelegung';
  const text = `Hallo Trainerteam ${alert.team},\n\n${intro}\n\n${details.map(([name, value]) => `${name}: ${value}`).join('\n')}\n\n${action}\n\n${note}\n\nSpieldetails: ${url}\nBelegungsplan: https://bsvnordstern.de/fussball/belegungsplan\n\nSportliche Grüße\nBSV Nordstern Radolfzell\nAutomatischer Hinweis zum Spielbetrieb`;
  const html = `<div style="max-width:640px;margin:auto;font-family:Arial,sans-serif;color:#183024;line-height:1.6"><div style="padding:24px;background:#092f20;color:white"><strong>BSV Nordstern Radolfzell</strong><h1 style="font-size:24px;margin:12px 0 0">${conflict ? 'Spiel und Training überschneiden sich' : 'Schiedsrichter noch nicht eingetragen'}</h1></div><div style="padding:24px;background:#f4f6f3"><p>Hallo Trainerteam ${escapeHtml(alert.team)},</p><p>${escapeHtml(intro)}</p><table style="width:100%;border-collapse:collapse">${details.map(([name, value]) => `<tr><th style="padding:8px;text-align:left;vertical-align:top;border-bottom:1px solid #d4ddd6">${escapeHtml(name)}</th><td style="padding:8px;border-bottom:1px solid #d4ddd6">${escapeHtml(value)}</td></tr>`).join('')}</table><p><strong>${escapeHtml(action)}</strong></p><p>${escapeHtml(note)}</p><p><a href="${escapeHtml(url)}" style="color:#164f32">Spieldetails öffnen</a> · <a href="https://bsvnordstern.de/fussball/belegungsplan" style="color:#164f32">Belegungsplan</a></p><p>Sportliche Grüße<br>BSV Nordstern Radolfzell</p><small>Automatischer Hinweis zum Spielbetrieb</small></div></div>`;
  return { to: recipients, subject, text, html };
}
