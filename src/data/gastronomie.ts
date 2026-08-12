const gastronomyPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAwIDk2MCI+CjxkZWZzPgogIDxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgogICAgPHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjMDcxZjE2Ii8+CiAgICA8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMxNjRmMzIiLz4KICA8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+CjxyZWN0IHdpZHRoPSIxNjAwIiBoZWlnaHQ9Ijk2MCIgZmlsbD0idXJsKCNnKSIvPgo8Y2lyY2xlIGN4PSIxMzAwIiBjeT0iMTgwIiByPSIyODAiIGZpbGw9IiNmNGQ2MzgiIG9wYWNpdHk9Ii4xNCIvPgo8Y2lyY2xlIGN4PSIxNDAwIiBjeT0iODUwIiByPSI0MjAiIGZpbGw9IiM5MWM4MmYiIG9wYWNpdHk9Ii4xMCIvPgo8cGF0aCBkPSJNMjE1IDc0MCBDNDQwIDUxMCA2MTAgNDcwIDg0MCA2MDAgUzEyMjAgNzYwIDE0MjAgNTAwIiBmaWxsPSJub25lIiBzdHJva2U9IiNmNGQ2MzgiIHN0cm9rZS13aWR0aD0iMTgiIG9wYWNpdHk9Ii41NSIvPgo8dGV4dCB4PSIxMjAiIHk9IjE1MCIgZmlsbD0iI2Y0ZDYzOCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjM0IiBmb250LXdlaWdodD0iNzAwIiBsZXR0ZXItc3BhY2luZz0iOCI+S0ktUExBVFpIQUxURVI8L3RleHQ+Cjx0ZXh0IHg9IjEyMCIgeT0iNzYwIiBmaWxsPSIjZmZmZmZmIiBmb250LWZhbWlseT0iR2VvcmdpYSwgc2VyaWYiIGZvbnQtc2l6ZT0iMTA0IiBmb250LXdlaWdodD0iNzAwIj5WZXJlaW5zZ2FzdHN0w6R0dGU8L3RleHQ+Cjx0ZXh0IHg9IjEyNSIgeT0iODM1IiBmaWxsPSIjY2ZkZGQ0IiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMzgiPkJTViBOb3Jkc3Rlcm4gUmFkb2xmemVsbDwvdGV4dD4KPC9zdmc+';

export const gastronomyLinks = [
  { label: 'Über uns', href: '/gastronomie/ueber-uns', description: 'Küche, Atmosphäre und Feiern' },
  { label: 'Öffnungszeiten', href: '/gastronomie/oeffnungszeiten', description: 'Aktuelle Zeiten und Urlaub' },
  { label: 'Speisekarte', href: '/gastronomie/speisekarte', description: 'Noch etwas Geduld' },
  { label: 'Events', href: '/gastronomie/events', description: 'Termine und Rückblicke' },
] as const;

export const gastronomy = {
  title: 'Vereinsgaststätte BSV Nordstern',
  shortTitle: 'BSV Gaststätte',
  address: 'Schlesierstraße 43, 78315 Radolfzell',
  phone: '+49 7732 910080',
  phoneHref: 'tel:+497732910080',
  reservationPhone: '+49 160 92658131',
  reservationPhoneHref: 'tel:+4916092658131',
  vacation: {
    from: '17. August 2026',
    through: '7. September 2026',
    reopens: '8. September 2026',
  },
  menuPdf: 'https://bsvnordstern.de/j4/images/bsv/gastro/speisekarte/Speisekarte_BSV_JAN_2024.pdf',
  lieferandoImage: 'https://bsvnordstern.de/j4/images/bsv/gastro/lieferando.jpg',
  karaokeImage: 'https://bsvnordstern.de/j4/images/bsv/gastro/events/karaoke.jpg',
  gallery: [
    gastronomyPlaceholder,
    gastronomyPlaceholder,
    gastronomyPlaceholder,
    gastronomyPlaceholder,
    gastronomyPlaceholder,
  ],
  openingHours: [
    { days: 'Montag', hours: 'Ruhetag' },
    { days: 'Dienstag bis Samstag', hours: '16:00 bis 21:30 Uhr' },
    { days: 'Sonntag', hours: '16:00 bis 21:00 Uhr' },
  ],
} as const;
