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
    slug: '2026-27-ausgabe-1',
    issue: 1,
    season: '2026/27',
    date: '2026-09-26',
    dateLabel: '26. September 2026',
    pages: 24,
    pdf: '/dokumente/stadionheft/bsv-nordstern-stadionheft-2026-27-ausgabe-1.pdf',
    cover: '/images/stadionheft/2026-27-ausgabe-1.jpg',
  },
].sort((a, b) => b.date.localeCompare(a.date) || b.issue - a.issue);
