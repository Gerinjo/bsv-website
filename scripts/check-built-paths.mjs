import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const distRoot = join(projectRoot, 'dist');
const publicRoot = join(projectRoot, 'public');
const base = '/bsv-website/';

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = join(directory, entry.name);
  return entry.isDirectory() ? walk(entryPath) : [entryPath];
});

const files = walk(distRoot);
const issues = [];
let checkedReferences = 0;
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

const findCaseMismatch = (target) => {
  const parts = relative(distRoot, target).split(sep).filter(Boolean);
  let current = distRoot;

  for (const part of parts) {
    if (!existsSync(current) || !statSync(current).isDirectory()) return undefined;
    const match = readdirSync(current).find((entry) => entry.toLocaleLowerCase('en-US') === part.toLocaleLowerCase('en-US'));
    if (!match) return undefined;
    if (match !== part) return join(current, match);
    current = join(current, match);
  }

  return undefined;
};

const validateReference = (sourceFile, rawReference) => {
  const reference = rawReference.trim();
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return;

  checkedReferences += 1;

  if (reference.startsWith('/') && !reference.startsWith(base)) {
    issues.push(`${relative(projectRoot, sourceFile)}: Basis-Pfad fehlt: ${reference}`);
    return;
  }

  const withoutBase = reference.startsWith(base) ? reference.slice(base.length) : reference;
  const withoutQuery = withoutBase.split(/[?#]/, 1)[0];
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(withoutQuery);
  } catch {
    issues.push(`${relative(projectRoot, sourceFile)}: Ungültig codierter Pfad: ${reference}`);
    return;
  }

  const target = reference.startsWith(base)
    ? join(distRoot, decodedPath)
    : resolve(dirname(sourceFile), decodedPath);
  const candidates = extname(target) ? [target] : [target, join(target, 'index.html'), `${target}.html`];

  if (candidates.some((candidate) => existsSync(candidate))) return;

  const mismatch = candidates.map(findCaseMismatch).find(Boolean);
  issues.push(mismatch
    ? `${relative(projectRoot, sourceFile)}: Groß-/Kleinschreibung stimmt nicht: ${reference} (gefunden: ${relative(distRoot, mismatch)})`
    : `${relative(projectRoot, sourceFile)}: Ziel fehlt: ${reference}`);
};

for (const file of files) {
  const extension = extname(file).toLowerCase();
  if (!['.html', '.css', '.js'].includes(extension)) continue;
  const content = readFileSync(file, 'utf8');

  for (const match of content.matchAll(/\b(?:href|src|poster|action|data-(?:menu|default|gallery)-image)=(['"])(.*?)\1/gi)) {
    validateReference(file, match[2]);
  }

  for (const match of content.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    validateReference(file, match[2]);
  }
}

const publicImages = walk(publicRoot).filter((file) => imageExtensions.has(extname(file).toLowerCase()));
const caseGroups = new Map();
for (const image of publicImages) {
  const projectPath = relative(projectRoot, image).split(sep).join('/');
  const caseKey = projectPath.toLocaleLowerCase('en-US');
  caseGroups.set(caseKey, [...(caseGroups.get(caseKey) ?? []), projectPath]);
}
for (const paths of caseGroups.values()) {
  if (paths.length > 1) issues.push(`Dateinamen unterscheiden sich nur in der Groß-/Kleinschreibung: ${paths.join(', ')}`);
}

if (issues.length) {
  console.error(`Pfadprüfung fehlgeschlagen (${issues.length} Probleme):`);
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(`Pfadprüfung erfolgreich: ${checkedReferences} lokale Referenzen in ${files.length} Build-Dateien geprüft.`);
console.log(`Dateinamenprüfung erfolgreich: ${publicImages.length} Bilddateien ohne Konflikte bei der Groß-/Kleinschreibung.`);
