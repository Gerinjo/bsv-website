import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';

const root = new URL('../', import.meta.url).pathname;
const output = process.env.BSV_PDF_PREVIEW_DIR || mkdtempSync(join(tmpdir(), 'bsv-pdf-'));
mkdirSync(output, { recursive: true });
after(() => { if (!process.env.BSV_PDF_PREVIEW_DIR) rmSync(output, { recursive: true, force: true }); });

const signature = spawnSync('php', ['-r', `
  $im = imagecreatetruecolor(640, 190);
  imagealphablending($im, false);
  imagesavealpha($im, true);
  imagefill($im, 0, 0, imagecolorallocatealpha($im, 255, 255, 255, 127));
  imagealphablending($im, true);
  $ink = imagecolorallocate($im, 9, 47, 32);
  imagettftext($im, 36, 3, 30, 120, $ink, 'public/api/vendor/tfpdf/font/unifont/DejaVuSans.ttf', 'M. Muster');
  imagesetthickness($im, 2);
  imageline($im, 25, 133, 360, 120, $ink);
  imagepng($im);
`], { cwd: root });
assert.equal(signature.status, 0, signature.stderr.toString());

const sampleApplication = {
  applicationNumber: 'BSV-MUSTER-20260913', receivedAt: '13.09.2026 10:15:00 CEST',
  lastName: 'Muster-Łukasz', firstName: 'Mila', gender: 'weiblich', birthDate: '2014-03-18',
  birthPlace: 'Radolfzell', nationality: 'polnisch', street: 'Musterstraße 12',
  postalCode: '78315', city: 'Radolfzell', phone: '+49 170 1234567', email: 'mila.muster@example.invalid',
  department: 'youth-football', departmentLabel: 'Fußball Jugend', isFootball: true, isYouthFootball: true,
  teamQuestionApplies: true, teamKnown: 'yes', teamLabel: 'U13 D2-Junioren', teamTrainers: 'M. Rüth',
  guardianLastName: 'Muster-Łukasz', guardianFirstName: 'Maria', guardianRelation: 'Mutter', guardianPhone: '+49 170 7654321',
  supportWilling: true, supportIdeas: 'Ich unterstütze gerne bei Turnieren und bei der Betreuung.\nAuch beim Sommerfest kann ich helfen.',
  bankName: 'Musterbank', bic: 'COBADEFFXXX', iban: 'DE89370400440532013000', accountHolder: 'Maria Muster-Łukasz',
  sepaAccepted: true, contributionAccepted: true, statutesAccepted: true, privacyAccepted: true,
  emailGeneralInfoAccepted: true, emailNewsletterAccepted: false, playerDataAccepted: true, marketingAccepted: false,
  identityProofType: 'identity-card', registrationType: 'club-change', previousClub: 'FC Beispielstadt',
  currentlySuspended: 'yes', suspensionPeriod: '01.09.2026 bis 30.09.2026',
  needsInternationalDocuments: true, lastForeignResidence: 'Łódź, Polen', parentsNames: 'Maria Muster-Łukasz und Jan Muster',
  signingPlace: 'Radolfzell', signingDate: '2026-09-13',
  uploads: [
    { label: 'Personalausweis-Vorderseite', originalName: 'Ausweis-Mila-vorne.png' },
    { label: 'Personalausweis-Rueckseite', originalName: 'Ausweis-Mila-hinten.png' },
    { label: 'DFB-Zusatzerklaerung', originalName: 'DFB-Erklärung.pdf' },
    { label: 'Ausweise-Eltern', originalName: 'Ausweise-Eltern.pdf' },
  ],
};

function render(data, name) {
  const result = spawnSync('php', ['tests/fixtures/membership-pdf.php'], {
    cwd: root, input: JSON.stringify({ data, signature: signature.stdout.toString('base64') }), maxBuffer: 10 * 1024 * 1024,
  });
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(result.stdout.subarray(0, 5).toString(), '%PDF-');
  const path = join(output, name + '.pdf');
  writeFileSync(path, result.stdout);
  const extracted = spawnSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  const info = spawnSync('pdfinfo', [path], { encoding: 'utf8' });
  assert.equal(info.status, 0, info.stderr);
  return { text: extracted.stdout, info: info.stdout, binary: result.stdout.toString('latin1'), path };
}

test('complete youth application includes Unicode, all relevant data, consent decisions and signature', () => {
  const result = render(sampleApplication, 'Mitgliedsantrag-Beispiel');
  for (const key of ['lastName', 'firstName', 'birthPlace', 'nationality', 'street', 'postalCode', 'city', 'phone', 'email',
    'departmentLabel', 'teamLabel', 'teamTrainers', 'guardianRelation', 'guardianPhone', 'bankName', 'bic', 'iban',
    'accountHolder', 'previousClub', 'suspensionPeriod', 'lastForeignResidence', 'parentsNames']) {
    assert.ok(result.text.includes(sampleApplication[key]), key);
  }
  assert.match(result.text, /18\.03\.2014/);
  assert.match(result.text, /13\.09\.2026/);
  assert.match(result.text, /Newsletter und die Vereinszeitschrift digital per E-Mail erhalten\.\s+Nein/);
  assert.match(result.text, /Marketingzwecke des DFB, seiner Verbände und\s+Nein/);
  assert.match(result.text, /Ich habe die Vereinssatzung gelesen und akzeptiert\.\s+Ja/);
  for (const upload of sampleApplication.uploads) assert.ok(result.text.includes(upload.originalName));
  assert.match(result.info, /Pages:\s+3/);
  assert.match(result.binary, /\/SMask/);
  assert.match(result.binary, /\/Width 640/);
  assert.match(result.text, /Ort, Datum und Unterschrift/);
});

test('non-football application marks football consents not applicable and omits stale hidden inputs', () => {
  const result = render({ ...sampleApplication, department: 'passive', departmentLabel: 'Passiv',
    isFootball: false, isYouthFootball: false, teamQuestionApplies: false, teamKnown: 'not-applicable', supportWilling: false,
  }, 'Mitgliedsantrag-Passiv');
  assert.match(result.text, /DFBnet und FUSSBALL.DE ein\.\s+Entfällt/);
  assert.match(result.text, /Ja, ich kann mir eine Unterstützung vorstellen\.\s+Nein/);
  assert.doesNotMatch(result.text, /FC Beispielstadt|Ausweis-Mila|Turnieren|Mutter|U13 D2-Junioren/);
  assert.match(result.info, /Pages:\s+2/);
  assert.match(result.binary, /\/Width 640/);
});

test('long values and maximum support text wrap onto more pages without losing content', () => {
  const ideas = 'Hilfe bei Turnieren, Betreuung und Veranstaltungen. '.repeat(37) + 'ENDE-DER-IDEEN';
  const result = render({ ...sampleApplication,
    firstName: 'Ä'.repeat(100), email: 'lang'.repeat(35) + '@example.invalid', supportIdeas: ideas,
    parentsNames: 'Maria und Jan '.repeat(17) + 'ENDE-ELTERN',
  }, 'Mitgliedsantrag-Lange-Angaben');
  assert.match(result.text, /ENDE-DER-IDEEN/);
  assert.match(result.text, /ENDE-ELTERN/);
  assert.match(result.text, /Im Onlineformular erfasste Unterschrift/);
  const characters = result.text.match(/Ä/g) || [];
  assert.equal(characters.length, 100);
  assert.ok(Number(result.info.match(/Pages:\s+(\d+)/)[1]) > 3);
});

test('every business field in the online form is represented in the PDF generator or endpoint snapshot', () => {
  const form = readFileSync(new URL('../src/pages/verein/mitglied-werden.astro', import.meta.url), 'utf8');
  const source = readFileSync(new URL('../public/api/membership-pdf.php', import.meta.url), 'utf8');
  const endpoint = readFileSync(new URL('../public/api/membership-v3.php', import.meta.url), 'utf8');
  const uploads = ['birthCertificate', 'registrationCertificate', 'idFront', 'idBack', 'dfbDeclaration', 'parentIds', 'additionalDocuments'];
  const technical = ['website', 'captchaAnswer', 'signatureData'];
  for (const [, field] of form.matchAll(/name="([A-Za-z]+)(?:\[\])?"/g)) {
    if (technical.includes(field) || uploads.includes(field)) continue;
    assert.ok((source + endpoint).includes("'" + field + "'"), field);
  }
});

test('real PHP submission sends the same complete PDF to both recipients and keeps trainer mail attachment-free', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bsv-membership-mail-'));
  const api = join(directory, 'api');
  mkdirSync(api);
  for (const name of ['membership.php', 'membership-v3.php', 'membership-pdf.php', 'vendor', 'assets']) {
    cpSync(join(root, 'public/api', name), join(api, name), {
      recursive: true, filter: source => !/\.(?:mtx\.php|cw\.dat|cw127\.php)$/.test(source),
    });
  }
  writeFileSync(join(api, 'membership-sponsors-cache.json'), JSON.stringify({ version: 1, sponsors: [] }));
  const messages = [];
  const bridge = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    messages.push(JSON.parse(Buffer.concat(chunks).toString()));
    response.writeHead(201, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ ok: true }));
  });
  bridge.listen(0, '127.0.0.1');
  await once(bridge, 'listening');
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const php = spawn('php', ['-S', '127.0.0.1:' + port, '-t', directory], {
    env: { ...process.env, BSV_MEMBERSHIP_EMAIL_ENDPOINT: 'http://127.0.0.1:' + bridge.address().port,
      BSV_MEMBERSHIP_EMAIL_SECRET: 'local-test-only' }, stdio: ['ignore', 'ignore', 'pipe'],
  });
  let phpErrors = '';
  php.stderr.on('data', chunk => { phpErrors += chunk; });
  t.after(async () => {
    php.kill();
    if (php.exitCode === null) await once(php, 'exit');
    await new Promise(resolve => bridge.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  const endpoint = 'http://127.0.0.1:' + port + '/api/membership.php';
  let captcha;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { captcha = await fetch(endpoint); break; } catch { await delay(50); }
  }
  assert.ok(captcha?.ok, phpErrors);

  async function submit(overrides = {}, uploadCount = 0) {
    const challenge = await fetch(endpoint);
    const cookie = challenge.headers.get('set-cookie').split(';')[0];
    const { a, b } = await challenge.json();
    const form = new FormData();
    const values = { ...sampleApplication, nationality: 'deutsch', registrationType: 'first-registration',
      identityProofType: 'send-separately', teamSelection: 'd2-junioren',
      signatureData: 'data:image/png;base64,' + signature.stdout.toString('base64'), captchaAnswer: String(a + b),
      ...overrides };
    for (const [key, value] of Object.entries(values)) {
      if (key === 'uploads') continue;
      if (typeof value === 'boolean') {
        if (value) form.set(key, key === 'supportWilling' ? 'yes' : 'accepted');
      } else form.set(key, value);
    }
    for (let i = 0; i < uploadCount; i++) form.append('additionalDocuments[]', new Blob([signature.stdout], { type: 'image/png' }), 'Nachweis-' + i + '.png');
    return fetch(endpoint, { method: 'POST', headers: { Cookie: cookie }, body: form });
  }

  for (const department of ['youth-football', 'archery']) {
    messages.length = 0;
    const response = await submit({ department }, department === 'youth-football' ? 1 : 0);
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal((await response.json()).confirmationEmailSent, true);
    const internal = messages.find(message => message.messageType === 'internal');
    const applicant = messages.find(message => message.messageType === 'applicant');
    const document = message => message.attachments.find(file => file.filename.startsWith('BSV-Mitgliedsantrag-'));
    assert.ok(document(internal));
    assert.deepEqual(document(internal), document(applicant));
    const pdfPath = join(directory, department + '.pdf');
    writeFileSync(pdfPath, Buffer.from(document(internal).content, 'base64'));
    const text = spawnSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
    assert.equal(text.status, 0, text.stderr);
    assert.match(text.stdout, /Muster-Łukasz/);
    assert.match(text.stdout, /DE89370400440532013000/);
    assert.match(text.stdout, /Im Onlineformular erfasste Unterschrift/);
    assert.equal(applicant.attachments.filter(file => file.filename.startsWith('SBFV-')).length, department === 'youth-football' ? 1 : 0);
    if (department === 'youth-football') {
      const team = messages.find(message => message.messageType === 'team');
      assert.deepEqual(team.attachments, []);
      assert.ok(!team.text.includes(sampleApplication.iban));
      assert.match(text.stdout, /Nachweis-0\.png/);
      assert.equal(internal.attachments.length, applicant.attachments.length + 1);
      assert.ok(internal.attachments.some(file => file.filename === 'Weitere-Unterlage-1.png'));
    }
  }
  messages.length = 0;
  const tooLong = await submit({ supportIdeas: 'a'.repeat(2001) });
  assert.equal(tooLong.status, 422);
  assert.equal(messages.length, 0);
  const oversized = await submit({}, 10);
  assert.equal(oversized.status, 422);
  assert.equal(messages.length, 0, 'Oversized attachment lists must not be silently truncated by the bridge');
  const invalidSignature = await submit({ signatureData: 'data:image/png;base64,' + Buffer.alloc(300, 65).toString('base64') });
  assert.equal(invalidSignature.status, 500);
  assert.equal(messages.length, 0, 'No incomplete application may be sent when the PDF cannot be rendered');
});
