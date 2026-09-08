import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const phpAvailable = spawnSync('php', ['-v']).status === 0;
const sourcePath = fileURLToPath(new URL('../public/api/membership-v3.php', import.meta.url));
const php = `
$source = file_get_contents($argv[1]);
$start = strpos($source, '$buildSponsorFooter =');
$end = strpos($source, '$sponsorFooter =', $start);
$siteBase = 'https://bsvnordstern.de';
$htmlEscape = function ($text) { return htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
eval(substr($source, $start, $end - $start));
$input = json_decode(stream_get_contents(STDIN), true);
echo json_encode($buildSponsorFooter($input['records'], $input['youth']));
`;
const render = (records, youth) => {
  const result = spawnSync('php', ['-r', php, sourcePath], {
    input: JSON.stringify({ records, youth }), encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
};
const partner = (id, youth = true) => ({
  id, name: `Sponsor ${id}`, website: `https://example.org/${id}`,
  logo: `https://bsvnordstern.de/images/sponsors/${id}.png`, width: 112, height: 48, youth,
});
const idsIn = (html) => [...html.matchAll(/images\/sponsors\/([^"/]+)\.png/g)].map((match) => match[1]);
const runtimeTest = (name, fn) => test(name, { skip: !phpAvailable && 'PHP CLI is required to render the email footer' }, fn);

runtimeTest('youth emails select four distinct youth sponsors and link each logo', () => {
  const records = [...Array.from({ length: 6 }, (_, i) => partner(`youth-${i}`)), partner('adult', false)];
  const footer = render([...records, records[0]], true);
  const selected = idsIn(footer.html);
  assert.equal(selected.length, 4);
  assert.equal(new Set(selected).size, 4);
  assert.ok(selected.every((id) => id.startsWith('youth-')));
  for (const id of selected) {
    assert.ok(footer.html.includes(`href="https://example.org/${id}"`));
    assert.ok(footer.text.includes(`Sponsor ${id}: https://example.org/${id}`));
  }
  assert.match(footer.html, /Danke an unsere Jugendsponsoren/);
  assert.match(footer.html, /href="https:\/\/bsvnordstern.de\/werbepartner"/);
});

runtimeTest('adult emails use the entire approved pool, including club and team sponsors', () => {
  const records = [partner('youth'), partner('club', false), partner('men', false), partner('women', false)];
  const footer = render(records, false);
  assert.deepEqual(idsIn(footer.html).sort(), records.map((s) => s.id).sort());
  assert.match(footer.html, /Danke an unsere Sponsoren/);
  assert.doesNotMatch(footer.html, /Jugendsponsoren/);
});

runtimeTest('each email draws a fresh random selection instead of keeping a fixed four', () => {
  const records = Array.from({ length: 12 }, (_, i) => partner(`partner-${i}`));
  const selections = new Set(Array.from({ length: 12 }, () => idsIn(render(records, true).html).sort().join(',')));
  assert.ok(selections.size > 1);
});

runtimeTest('missing sponsor data retains the thank-you and overview without blocking the email', () => {
  const footer = render([], true);
  assert.deepEqual(idsIn(footer.html), []);
  assert.match(footer.html, /Danke/);
  assert.match(footer.text, /https:\/\/bsvnordstern.de\/werbepartner/);
  assert.equal(idsIn(render([partner('only')], true).html).length, 1);
});

runtimeTest('invalid links and dimensions are excluded, and partner names are escaped', () => {
  const safe = { ...partner('safe'), name: 'Sponsor <script>alert(1)</script> & Co.' };
  const footer = render([
    safe,
    { ...partner('script-link'), website: 'javascript:alert(1)' },
    { ...partner('external-image'), logo: 'https://example.org/tracker.png' },
    { ...partner('oversized'), width: 999 },
  ], true);
  assert.deepEqual(idsIn(footer.html), ['safe']);
  assert.doesNotMatch(footer.html, /<script>/);
  assert.match(footer.html, /&lt;script&gt;/);
  assert.match(footer.html, /&amp; Co/);
});
