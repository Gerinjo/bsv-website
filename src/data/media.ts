// PDF-Ausgaben werden separat hochgeladen. Das digitale Stadionheft ist noch nicht freigegeben.
export const mediaChannels = [
  {
    label: 'Stadionheft',
    eyebrow: 'Geschichten rund um den Spieltag',
    href: '/media/stadionheft',
    description: 'Mannschaften, Geschichten und Einblicke rund um den BSV. Entdecke unsere Ausgaben, blättere direkt im Heft oder öffne das PDF.',
    action: 'Zu den Ausgaben',
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
