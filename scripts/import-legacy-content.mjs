import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const routes = {
  'verein': 'verein',
  'verein-vorstand': 'verein/vorstandschaft',
  'verein-geschichte': 'verein/geschichte',
  'verein-organigramm': 'verein/organigramm',
  'verein-satzung': 'verein/satzung',
  'verein-beitraege': 'verein/beitragsordnung',
  'verein-mitglied': 'verein/mitglied-werden',
  'verein-kuendigung': 'verein/kuendigung',
  'verein-termine': 'verein/termine',
  'fv-vorstand': 'foerderverein/vorstandschaft',
  'fv-mitglied': 'foerderverein/mitglied-werden',
  'abt-gymnastik': 'abteilungen/gymnastik',
  'abt-bogensport': 'abteilungen/bogensport',
  'abt-wandern': 'abteilungen/wandergruppe',
  'fussball-sportplaetze': 'fussball/sportplaetze',
  'fussball-belegung': 'fussball/belegungsplan',
  'fussball-herren1': 'fussball/herren/kreisliga-b',
  'fussball-berichte1': 'fussball/herren/spielberichte',
  'fussball-herren2': 'fussball/herren/kreisliga-c',
  'fussball-berichte2': 'fussball/herren/spielberichte-reserve',
  'fussball-frauen': 'fussball/frauen/bezirksliga',
  'fussball-berichte-frauen': 'fussball/frauen/spielberichte',
  'fussball-ah': 'fussball/alte-herren',
  'jugend-vorstand': 'jugend/vorstandschaft',
  'jugend-news': 'jugend/neuigkeiten',
  'jugend-pass': 'jugend/spielgenehmigung',
  'jugend-konzept': 'jugend/jugendkonzept',
  'jugend-schiri': 'jugend/jugendschiedsrichter',
  'jugend-u11e1': 'jugend/u11-e1',
  'jugend-u11e2': 'jugend/u11-e2',
  'jugend-u11e3': 'jugend/u11-e3',
  'jugend-u9f': 'jugend/u9-f',
  'jugend-u8f': 'jugend/u8-f',
  'jugend-u7g': 'jugend/u7-g',
  'jugend-u6g': 'jugend/u6-g',
  'jugend-u19': 'jugend/u19',
  'jugend-u17': 'jugend/u17',
  'jugend-u15c1': 'jugend/u15-c1',
  'jugend-u15c2': 'jugend/u15-c2',
  'jugend-u13d1': 'jugend/u13-d1',
  'jugend-u13d2': 'jugend/u13-d2',
  'jugend-u13d3': 'jugend/u13-d3',
  'jugend-girls-reports': 'jugend/juniorinnen/spielberichte',
  'jugend-girls-u17': 'jugend/juniorinnen/u17',
  'jugend-girls-u13': 'jugend/juniorinnen/u13',
};

function extractArticle(html) {
  const opening = /<div\b[^>]*itemprop=["']articleBody["'][^>]*>/i.exec(html);
  if (!opening) return '';
  const start = opening.index + opening[0].length;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = start;
  let depth = 1;
  let match;
  while ((match = tags.exec(html))) {
    depth += /^<\/div/i.test(match[0]) ? -1 : 1;
    if (depth === 0) return html.slice(start, match.index);
  }
  return '';
}

function cleanHtml(html) {
  return html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<div\b[^>]*class=["'][^"']*fussballde_widget[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '<aside class="data-widget">Spielplan und Tabelle werden über fussball.de bereitgestellt.</aside>')
    .replace(/\s(?:uk-[\w-]+|data-uk-[\w-]+)(?:=["'][^"']*["'])?/gi, '')
    .replace(/\sstyle=["'][^"']*["']/gi, '')
    .replace(/\ssrcset=["'][^"']*["']/gi, '')
    .replace(/\sloading=["'][^"']*["']/gi, '')
    .replace(/<p>\s*(?:&nbsp;)?\s*<\/p>/gi, '')
    .replace(/<p>\s*<\/p>/gi, '')
    .trim();
}

function updateYouthBoard(html) {
  const formerSupporters = ['Stefan Gaustaudo', 'Stefan Gastaudo', 'Marcus Peglau', 'Markus Peglau'];

  return html
    .replace(/<li\b[^>]*>(?:(?!<\/li>)[\s\S])*?<\/li>/gi, (card) =>
      formerSupporters.some((name) => card.includes(name)) ? '' : card,
    )
    .replace(/\s*<div>\(aktuell in Pause\)<\/div>/gi, '')
    .replace(/Stellv\. Jugendleiter \(kommissarisch Jugendleiter\)/gi, 'Stellvertretender Jugendleiter');
}

const content = {};
const imageMap = new Map();

for (const [file, route] of Object.entries(routes)) {
  const source = await readFile(`/tmp/bsv-import/${file}.html`, 'utf8');
  let article = cleanHtml(extractArticle(source));

  const urls = [...article.matchAll(/(?:src|href)=["']([^"']*\/j4\/images\/[^"'#?]+)(?:#[^"']*)?["']/gi)];
  for (const match of urls) {
    const raw = match[1].startsWith('http') ? match[1] : `https://bsvnordstern.de${match[1]}`;
    const decodedName = decodeURIComponent(basename(new URL(raw).pathname)).replace(/[^a-zA-Z0-9._-]+/g, '-');
    const hash = createHash('sha1').update(raw).digest('hex').slice(0, 10);
    const extension = extname(decodedName) || '.jpg';
    const local = `/images/migration/${hash}-${decodedName || `bild${extension}`}`;
    imageMap.set(raw, local);
    article = article.split(match[1]).join(local);
    article = article.replace(new RegExp(`${local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#[^"']*`, 'g'), local);
  }

  article = article
    .replace(/href=["']\/j4\/index\.php\/([^"']+)["']/gi, 'href="/$1"')
    .replace(/href=["']\/j4\/images\/([^"']+)["']/gi, 'href="https://bsvnordstern.de/j4/images/$1"')
    .replaceAll('/j4/docs/BSV%20Nordstern%20Vereinssatzung%20Stand%2031.01.2023.pdf', '/dokumente/bsv-nordstern-satzung-2023.pdf')
    // Three files are already missing on the former site. Use the current equivalent instead.
    .replaceAll('/images/migration/58ca5255c3-bsv_beitragsordnung_240101.pdf', '/images/migration/7bdd8e83ca-BSV_Beitragsordnung_260101.pdf')
    .replaceAll('/images/migration/2b523be8d9-297-Herren-mit-Arztkoffer-Cropped.jpg', '/images/migration/cf63f0ccb1-BSV-Herren-2526-Trikotsatz-gruen.jpeg')
    .replaceAll('/images/migration/70a1a31a66-Neues-Trikot.JPG', '/images/migration/598a03eb56-BSV-Frauen-25-26-Mannschaftsbild.jpg');

  if (route === 'jugend/vorstandschaft') article = updateYouthBoard(article);

  content[route] = article;
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/legacyContent.ts', `// Generated from the former Joomla site.\nexport const legacyContent: Record<string, string> = ${JSON.stringify(content, null, 2)};\n`);

const downloads = [...imageMap].map(([url, local]) => ({ url, output: `public${local}` }));
await writeFile('/tmp/bsv-image-manifest.json', JSON.stringify(downloads, null, 2));
console.log(JSON.stringify({ pages: Object.keys(content).length, images: downloads.length }));
