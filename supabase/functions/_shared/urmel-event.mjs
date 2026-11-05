// Shared event details for the website and registration emails.
const name = 'Urmel Bambini Cup 2027';
const motto = 'Kinder spielen für Kinder';
const teamFee = 25;
export const URMEL_EVENT = Object.freeze({
  topic: 'event-urmel-cup',
  name,
  motto,
  title: `${name} – ${motto}`,
  period: 'Mai 2027',
  date: '01.05.2027',
  isoDate: '2027-05-01',
  timeSlots: ['09:00', '12:00', '15:00'],
  venue: 'BSV-Sportgelände Radolfzell',
  address: 'Schlesierstraße 43, 78315 Radolfzell am Bodensee',
  teamFee,
  fee: `${teamFee} €`,
  charityNote: 'Die gesamten Turniergebühren und die Einnahmen der Tombola gehen an die Urmel Kinder-Krebshilfe e.V. aus Friedrichshafen.',
});
