// PDF-Ausgaben werden separat hochgeladen. Das digitale Stadionheft ist noch nicht freigegeben.
export const mediaChannels = [
  {
    label: 'Stadionheft PDF',
    eyebrow: 'Ausgabe 1 · Saison 2026/27',
    href: '/dokumente/stadionheft/bsv-nordstern-stadionheft-2026-27-ausgabe-1.pdf',
    description: 'Unser Stadionheft vom 26. September 2026: 24 Seiten mit Mannschaften, Geschichten und Einblicken rund um den BSV – als PDF.',
    action: 'Heft 1 als PDF öffnen',
    symbol: 'book',
  },
  {
    label: 'Newsletter',
    eyebrow: 'Der BSV in deinem Postfach',
    href: '/newsletter',
    description: 'Unseren Newsletter kennenlernen oder nur allgemeine Informations-E-Mails abonnieren. Du entscheidest.',
    action: 'Mehr erfahren & anmelden',
    symbol: 'mail',
  },
] as const;
