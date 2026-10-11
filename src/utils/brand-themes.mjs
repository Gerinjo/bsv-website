// Shared with the Club Suite: src/brand-themes.mjs. Keep motif definitions in sync.
// Seasonal photographic artwork follows the Club Suite theme selection.
export const BSV_THEMES = [
  {key:'football',label:'Fußball',description:'Unser Standard · das ganze Jahr'},
  {key:'christmas',label:'Weihnachten',description:'Weihnachtsbaum · Advent & Festtage'},
  {key:'easter',label:'Ostern',description:'Osterhase · Frühlingszeit'},
  {key:'summer',label:'Sommerferien',description:'Surferboy · Sommer am See'},
];
export function suiteBrandTheme(value = 'football') {
  if (!BSV_THEMES.some(theme => theme.key === value)) throw new Error('Bitte ein gültiges BSV-Theme auswählen.');
  return value;
}
export function brandThemeArtwork(key = 'football') {
  suiteBrandTheme(key);
  const alt = {football:'KI-generierter Fußballer in grünem Trikot beim Schuss',summer:'KI-generierter Surfer in grüner Badehose mit Surfbrett',christmas:'KI-generierter Weihnachtsbaum mit Lichterkette und Christbaumschmuck',easter:'KI-generierter Osterhase mit dekorierten Ostereiern'}[key];
  return {src:`/images/brand-themes/${key}-v2.webp`,alt};
}
