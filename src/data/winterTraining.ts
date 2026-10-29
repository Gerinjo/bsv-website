import type { TrainingSlot } from './trainingPlan';

export type WinterTrainingSlot = TrainingSlot & { note?: string };

// Agreed winter plan, including the final C2/C1 split on Friday.
export const winterTrainingPeriod = {
  season: '2026/27',
  start: '2026-11-02',
  end: '2027-04-04',
  startLabel: '02.11.2026',
  endLabel: '04.04.2027',
};

const kr1 = 'Kunstrasen 1 (alt), Radolfzell';
const kr2 = 'Kunstrasen 2 (neu), Radolfzell';
const bambinis: WinterTrainingSlot[] = [
  { day: 'Dienstag', time: '15:30 – 16:30 Uhr', place: 'Sonnenrainhalle', note: 'Optionaler Zusatztermin nach Absprache.' },
  { day: 'Mittwoch', time: '16:00 – 17:00 Uhr', place: 'Teggingerhalle' },
  { day: 'Donnerstag', time: '16:15 – 17:15 Uhr', place: 'Sonnenrainhalle' },
];

export const youthWinterTraining: Record<string, WinterTrainingSlot[]> = {
  'jugend/u19': [
    { day: 'Dienstag', time: '18:30 – 20:00 Uhr', place: kr1, note: 'Gemeinsam mit FC03 C1.' },
    { day: 'Donnerstag', time: '20:00 – 21:30 Uhr', place: kr1 },
  ],
  'jugend/u17': [
    { day: 'Montag', time: '18:30 – 20:00 Uhr', place: kr2 },
    { day: 'Mittwoch', time: '18:30 – 20:00 Uhr', place: kr2 },
  ],
  'jugend/u15-c1': [
    { day: 'Donnerstag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Freitag', time: '17:15 – 18:30 Uhr', place: kr2, note: 'Gemeinsam mit FC03 B1.' },
  ],
  'jugend/u15-c2': [
    { day: 'Montag', time: '17:00 – 18:30 Uhr', place: kr1 },
    { day: 'Freitag', time: '16:00 – 17:15 Uhr', place: kr2 },
  ],
  'jugend/u13-d1': [
    { day: 'Donnerstag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Freitag', time: '16:00 – 17:30 Uhr', place: 'BSZ-Halle', note: 'Gemeinsam mit D2.' },
  ],
  'jugend/u13-d2': [
    { day: 'Donnerstag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Freitag', time: '16:00 – 17:30 Uhr', place: 'BSZ-Halle', note: 'Gemeinsam mit D1.' },
  ],
  'jugend/u13-d3': [
    { day: 'Montag', time: '15:30 – 17:00 Uhr', place: 'Sonnenrainhalle' },
  ],
  'jugend/u11-e1': [
    { day: 'Dienstag', time: '16:00 – 17:30 Uhr', place: 'Ratoldushalle' },
    { day: 'Freitag', time: '16:00 – 17:00 Uhr', place: kr2 },
  ],
  'jugend/u11-e2': [
    { day: 'Montag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Mittwoch', time: '17:00 – 18:00 Uhr', place: 'Sonnenrainhalle' },
  ],
  'jugend/u11-e3': [
    { day: 'Montag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Donnerstag', time: '17:15 – 18:30 Uhr', place: 'Sonnenrainhalle' },
  ],
  'jugend/u9-f': [
    { day: 'Montag', time: '16:00 – 17:00 Uhr', place: kr2 },
    { day: 'Mittwoch', time: '16:00 – 17:00 Uhr', place: 'Sonnenrainhalle' },
  ],
  'jugend/u8-f': [
    { day: 'Montag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Freitag', time: '16:30 – 18:00 Uhr', place: 'Sonnenrainhalle' },
  ],
  'jugend/u7-g': bambinis,
  'jugend/u6-g': bambinis,
  'jugend/juniorinnen/u17': [
    { day: 'Montag', time: '18:30 – 20:00 Uhr', place: kr1 },
    { day: 'Mittwoch', time: '17:00 – 18:30 Uhr', place: kr2 },
  ],
  'jugend/juniorinnen/u15': [
    { day: 'Montag', time: '18:30 – 20:00 Uhr', place: kr1 },
    { day: 'Mittwoch', time: '17:00 – 18:30 Uhr', place: kr2 },
  ],
  'jugend/juniorinnen/u13': [
    { day: 'Montag', time: '17:00 – 18:30 Uhr', place: kr2 },
    { day: 'Mittwoch', time: '17:00 – 18:30 Uhr', place: kr2 },
  ],
};
