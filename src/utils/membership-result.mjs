const euro = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value));

// Describe confirmed delivery, without treating an application as an approved membership.
export function membershipSuccess(result, selection) {
  const notes = [];
  const applications = [{
    label: 'Hauptverein · BSV Nordstern',
    person: selection.memberName,
    detail: `${selection.department}${selection.team ? ` · ${selection.team}` : ''}`,
    status: `Erfolgreich übermittelt · Antrag ${result.applicationNumber}`,
  }];
  if (selection.foerderverein) {
    const sent = result.foerdervereinStatus === 'sent';
    applications.push({
      label: 'Förderverein', person: selection.foerderverein.name,
      detail: `${euro(selection.foerderverein.contribution)} jährlich`,
      status: sent
        ? `Erfolgreich übermittelt · Antrag ${result.foerdervereinApplicationNumber}`
        : 'Liegt der Mitgliederverwaltung vor; die Weiterleitung an den Förderverein ist noch nicht bestätigt.',
    });
    if (!sent) notes.push('Dein Fördervereinsantrag liegt bereits der Mitgliederverwaltung vor. Bitte keinen zweiten Antrag absenden. Bei Rückfragen hilft info@bsvnordstern.de.');
  }
  let emailText;
  if (result.confirmationEmailSent === true) {
    emailText = `Bitte prüfe jetzt dein E-Mail-Postfach (${selection.email}) und den Spam-Ordner. Die Eingangsbestätigung mit ${selection.foerderverein ? 'beiden unterschriebenen Anträgen' : 'deinem unterschriebenen Antrag'} als PDF wurde versendet.`;
  } else {
    emailText = `Der Versand der Eingangsbestätigung an ${selection.email} ${result.confirmationEmailSent === false ? 'ist fehlgeschlagen' : 'konnte nicht bestätigt werden'}. Bitte prüfe dein Postfach und den Spam-Ordner. Falls die E-Mail fehlt, wende dich mit der Antragsnummer an info@bsvnordstern.de. Bitte keinen zweiten Antrag absenden.`;
    notes.push('Dein Mitgliedsantrag wurde übermittelt. Nur der Versand deiner Bestätigungs-E-Mail ist nicht bestätigt.');
  }
  if (selection.emailOffers.length) {
    if (result.newsletterStatus === 'requested') {
      emailText += ` Zusätzlich ausgewählt: ${selection.emailOffers.join(' und ')}. Falls diese Auswahl noch nicht bestätigt ist, aktiviere sie über den Link in der zusätzlichen Verifizierungsmail.`;
    } else {
      notes.push(`Die Anmeldung für ${selection.emailOffers.join(' und ')} konnte nicht gestartet werden. Deine Mitgliedsanträge bleiben übermittelt. Bitte nutze dafür die Newsletter-Seite unter bsvnordstern.de/newsletter.`);
    }
  }
  const kind = notes.length ? 'warning' : 'success';
  return {
    kind, delivered: true,
    title: kind === 'warning' ? 'Antrag übermittelt – bitte Hinweis beachten' : selection.foerderverein ? 'Beide Anträge erfolgreich übermittelt!' : 'Antrag erfolgreich übermittelt!',
    intro: `Vielen Dank! ${selection.foerderverein ? 'Folgende Mitgliedschaften wurden' : 'Folgende Mitgliedschaft wurde'} beantragt. Der Verein prüft die Aufnahme.`,
    applications, emailTitle: kind === 'success' ? 'Jetzt bitte E-Mails prüfen' : 'Hinweis zum weiteren Ablauf',
    emailText, notes,
  };
}

export function membershipFailure(message, confirmed = false) {
  return {
    kind: 'error', delivered: false,
    title: confirmed ? 'Antrag nicht übermittelt' : 'Übermittlung nicht bestätigt',
    intro: confirmed ? message : 'Wir konnten keine eindeutige Antwort vom Server erhalten. Ob dein Antrag angekommen ist, ist deshalb noch unklar.',
    applications: [], notes: [],
    emailTitle: confirmed ? 'Deine Eingaben bleiben erhalten' : 'Bitte zuerst E-Mails prüfen',
    emailText: confirmed
      ? 'Bitte prüfe den Hinweis und versuche es anschließend erneut. Deine Angaben und Unterschrift bleiben im Formular erhalten. Bei Fragen hilft info@bsvnordstern.de.'
      : 'Bitte prüfe dein Postfach und den Spam-Ordner, bevor du erneut absendest. Wenn du eine Eingangsbestätigung erhalten hast, ist kein zweiter Antrag nötig. Bei Unsicherheit wende dich an info@bsvnordstern.de. Deine Eingaben bleiben im Formular erhalten.',
  };
}

export const membershipResultText = (result) => [
  result.title, result.intro,
  ...result.applications.map(item => `${item.label}: ${item.person}. ${item.detail}. ${item.status}`),
  result.emailText, ...result.notes,
].join(' ');
