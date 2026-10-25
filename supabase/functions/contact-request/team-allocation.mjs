import { calculateGirlsCupFee } from '../_shared/girls-cup-event.mjs';

export function applyTeamAllocation(registration, allocations) {
  const confirmed = allocations.filter(team => team.status === 'confirmed');
  const waiting = allocations.filter(team => team.status === 'waiting');
  const allocationText = allocations.map(team => `${team.category}-Juniorinnen · ${team.clubName} ${team.teamNumber}: ${team.status === 'confirmed' ? 'Teilnahme bestätigt' : `Warteliste, Platz ${team.position - 8}`}`).join('\n');
  const fee = calculateGirlsCupFee(confirmed.length);
  const feeNote = waiting.length ? 'Die Startgebühr gilt nur für bestätigte Teams. Für Teams auf der Warteliste bitte noch nichts bezahlen.' : '';
  const outcome = waiting.length ? {
    subjectPrefix: confirmed.length ? 'Eure Anmeldung – bestätigte Teams und Warteliste' : 'Warteliste',
    intro: confirmed.length
      ? `Vielen Dank für eure Anmeldung! Für ${confirmed.length} ${confirmed.length === 1 ? 'Team ist die Teilnahme' : 'Teams ist die Teilnahme'} bestätigt. ${waiting.length} ${waiting.length === 1 ? 'weiteres Team steht' : 'weitere Teams stehen'} auf der Warteliste. Die genaue Zuordnung findet ihr unten.`
      : 'Vielen Dank für eure Anmeldung! Eure Teams stehen auf der Warteliste. Die Teilnahme ist noch nicht bestätigt. Wir melden uns persönlich, sobald ein Platz frei wird.',
    heading: confirmed.length ? 'Eure Plätze im Überblick' : 'Eure Teams auf der Warteliste',
    nextSteps: `${confirmed.length ? 'Für die bestätigten Teams schicken wir euch Startzeiten und Spielplan rechtzeitig vor dem Turnier zu. ' : ''}Bei einem freien Platz melden wir uns persönlich bei den Teams auf der Warteliste. ${feeNote}`,
  } : null;
  return {
    ...registration, outcome, confirmedCount: confirmed.length, waitingCount: waiting.length,
    paymentAmount: confirmed.length ? `${fee} € insgesamt` : null,
    confirmationDetails: [
      ...registration.confirmationDetails.map(([label, value]) => [label, label === 'Startgebühren insgesamt' ? `${fee} €${waiting.length ? ' für bestätigte Teams' : ''}` : value]),
      ['Platzvergabe', allocationText], ...(feeNote ? [['Zahlungshinweis', feeNote]] : []),
    ],
    message: `${registration.message.replace(/Startgebühren insgesamt: \d+ €/, `Startgebühren insgesamt: ${fee} €`)}\n\nPlatzvergabe:\n${allocationText}${feeNote ? `\n${feeNote}` : ''}`,
    successMessage: waiting.length
      ? `${confirmed.length} ${confirmed.length === 1 ? 'Team bestätigt' : 'Teams bestätigt'}, ${waiting.length} ${waiting.length === 1 ? 'Team auf der Warteliste' : 'Teams auf der Warteliste'}. Die genaue Zuordnung erhaltet ihr per E-Mail. Für Wartelistenteams bitte noch keine Startgebühr bezahlen.`
      : null,
  };
}
