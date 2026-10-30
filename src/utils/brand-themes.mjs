// Shared with the Club Suite: src/brand-themes.mjs. Keep motif definitions in sync.
// Seasonal photographic artwork follows the Club Suite theme selection.
export const BSV_THEMES = [
  {key:'football',label:'Fußball',description:'Unser Standard · das ganze Jahr'},
  {key:'christmas',label:'Weihnachten',description:'Weihnachtsbaum mit Krippe & Geschenken'},
  {key:'easter',label:'Ostern',description:'Osterhase mit Ostereiern & Glocken'},
  {key:'summer',label:'Sommerferien',description:'Surferboy · Sommer am See'},
];
export function suiteBrandTheme(value = 'football') {
  if (!BSV_THEMES.some(theme => theme.key === value)) throw new Error('Bitte ein gültiges BSV-Theme auswählen.');
  return value;
}
export function brandThemeArtwork(key = 'football') {
  suiteBrandTheme(key);
  const alt = {football:'KI-generierter Fußballer in grünem Trikot beim Schuss',summer:'KI-generierter Surfer in grüner Badehose mit Surfbrett',christmas:'KI-generierter Weihnachtsbaum mit Lichterkette, Krippe und Geschenken',easter:'KI-generierter Osterhase mit vielen dekorierten Ostereiern, Nest und goldenen Glocken'}[key];
  const version=['christmas','easter'].includes(key)?3:2;
  return {src:`/images/brand-themes/${key}-v${version}.webp`,alt,width:1024,height:version===3?1024:1536};
}
