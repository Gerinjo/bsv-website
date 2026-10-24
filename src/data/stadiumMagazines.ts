export interface StadiumMagazine {
  slug: string;
  issue: number;
  season: string;
  date: string;
  dateLabel: string;
  pages: number;
  pdf: string;
  cover: string;
}

// Neue PDF-Ausgaben hier ergänzen; Übersicht und Leseansicht entstehen automatisch.
export const stadiumMagazines: StadiumMagazine[] = [
  {
    slug: '2026-27-ausgabe-3',
    issue: 3,
    season: '2026/27',
    date: '2026-10-24',
    dateLabel: '24.10.2026',
    pages: 24,
    pdf: '/dokumente/stadionheft/bsv-nordstern-stadionheft-2026-27-ausgabe-3.pdf',
    cover: '/images/stadionheft/2026-27-ausgabe-3.jpg',
  },
  {
    slug: '2026-27-ausgabe-2',
    issue: 2,
    season: '2026/27',
    date: '2026-10-10',
    dateLabel: '10.10.2026',
    pages: 24,
    pdf: '/dokumente/stadionheft/bsv-nordstern-stadionheft-2026-27-ausgabe-2.pdf',
    cover: '/images/stadionheft/2026-27-ausgabe-2.jpg',
  },
  {
    slug: '2026-27-ausgabe-1',
    issue: 1,
    season: '2026/27',
    date: '2026-09-26',
    dateLabel: '26.09.2026',
    pages: 24,
    pdf: '/dokumente/stadionheft/bsv-nordstern-stadionheft-2026-27-ausgabe-1.pdf',
    cover: '/images/stadionheft/2026-27-ausgabe-1.jpg',
  },
].sort((a, b) => b.date.localeCompare(a.date) || b.issue - a.issue);
