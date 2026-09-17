import type { Pitch } from '../utils/matchdayPlan.ts';

export const matchdayPitchOverrides: { date: string; teamId: string; pitch: Pitch; reason: string }[] = [
  { date: '2026-10-10', teamId: '027LQ5OTKO000000VS5489B1VTUKARPV', pitch: 'Hauptplatz',
    reason: 'D2 auf dem Hauptplatz: 2 vorhandene 5er-Tore nutzen, ohne Tortransport zwischen den Plätzen.' },
  { date: '2026-10-10', teamId: '0276SUOJAS000000VS5489B2VVRTHQ8E', pitch: 'Hauptplatz',
    reason: 'E3 auf dem Hauptplatz: 4 vorhandene 5er-Tore nutzen; 1 Std. Spieltag, anschließend Platzwechsel für C1.' },
];
