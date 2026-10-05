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

function render(data, name, kind = 'membership') {
  const result = spawnSync('php', ['tests/fixtures/membership-pdf.php'], {
    cwd: root, input: JSON.stringify({ data, kind, signature: signature.stdout.toString('base64') }), maxBuffer: 10 * 1024 * 1024,
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

const supporters = {
  foerdervereinMembership: 'yes', foerdervereinAnnualContribution: '35', foerdervereinApplicationNumber: 'FV-20260913-ABC123',
  foerdervereinApplicant: 'guardian', foerdervereinGuardianBirthDate: '1985-06-21', foerdervereinGuardianBsvMember: 'no',
  foerdervereinGuardianStreet: 'Elternstraße 24', foerdervereinGuardianPostalCode: '78462', foerdervereinGuardianCity: 'Konstanz',
  foerdervereinGuardianEmail: 'maria.muster@example.invalid',
  foerdervereinSepaAccepted: true, foerdervereinStatutesAccepted: true, foerdervereinPrivacyAccepted: true,
  foerdervereinNotes: 'Ich unterstütze die Jugendarbeit. Grüße von Łukasz!',
};

test('separate Förderverein PDF includes transferred data, own mandate, annual contribution and the shared signature', () => {
  const member = { firstName: 'Maria', lastName: sampleApplication.guardianLastName, birthDate: supporters.foerdervereinGuardianBirthDate,
    street: supporters.foerdervereinGuardianStreet, postalCode: supporters.foerdervereinGuardianPostalCode,
    city: supporters.foerdervereinGuardianCity, email: supporters.foerdervereinGuardianEmail, phone: sampleApplication.guardianPhone };
  const result = render({ ...sampleApplication, ...supporters, foerdervereinForGuardian: true, foerdervereinBsvMember: false,
    foerdervereinBsvStatus: 'Kontaktperson ist selbst kein BSV-Mitglied', foerdervereinMember: member }, 'Foerdervereinsantrag-Beispiel', 'foerderverein');
  for (const key of ['firstName', 'lastName', 'street', 'city', 'email', 'phone']) assert.ok(result.text.includes(member[key]), key);
  for (const key of ['iban', 'accountHolder']) assert.ok(result.text.includes(sampleApplication[key]), key);
  assert.match(result.text, /FÖRDERVEREIN DES BSV NORDSTERN/);
  assert.match(result.text, /35,00 EUR/);
  assert.match(result.text, /21\.06\.1985/);
  assert.doesNotMatch(result.text, /18\.03\.2014|Mila|mila\.muster|Musterstraße 12/);
  assert.match(result.text, /Mindestbeitrag: 25 EUR/);
  assert.match(result.text, /eigene Mitgliedschaft/);
  assert.match(result.text, /13\.09\.2026/);
  assert.match(result.text, /Ich ermächtige den Förderverein/);
  assert.match(result.text, /Satzung und\s+Vorstandsbeschlüsse/);
  assert.match(result.text, /Personen- und\s+(?:Ja\s+)?Kontodaten/);
  assert.match(result.text, /Unterschrift bestätigt beide Mitgliedsanträge/);
  assert.match(result.binary, /\/Width 640/);
  assert.match(result.info, /Pages:\s+2/);
  assert.doesNotMatch(result.text, /FC Beispielstadt|DFBnet|Ausweis-Mila|Ausweise-Eltern/);
});

test('adult Förderverein PDF uses the adult applicant and the BSV member contribution', () => {
  const member = { ...sampleApplication, birthDate: '1980-03-18' };
  const result = render({ ...sampleApplication, ...supporters, foerdervereinForGuardian: false, foerdervereinBsvMember: true,
    foerdervereinBsvStatus: 'gleichzeitig für dieselbe Person beantragt', foerdervereinMember: member }, 'Foerdervereinsantrag-Erwachsen', 'foerderverein');
  assert.match(result.text, /Mila/);
  assert.match(result.text, /18\.03\.1980/);
  assert.match(result.text, /Mindestbeitrag: 11 EUR/);
  assert.doesNotMatch(result.text, /21\.06\.1985|Elternstraße|Kontaktperson unterschreibt/);
});

test('real PHP submission sends the same complete PDF to both recipients and keeps trainer mail attachment-free', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'bsv-membership-mail-'));
  const api = join(directory, 'api');
  mkdirSync(api);
  for (const name of ['membership.php', 'membership-v3.php', 'membership-pdf.php', 'foerderverein-pdf.php', 'vendor', 'assets']) {
    cpSync(join(root, 'public/api', name), join(api, name), {
      recursive: true, filter: source => !/\.(?:mtx\.php|cw\.dat|cw127\.php)$/.test(source),
    });
  }
  writeFileSync(join(api, 'membership-sponsors-cache.json'), JSON.stringify({ version: 1, sponsors: [] }));
  const messages = [];
  let failMessageType = '';
  const bridge = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const message = JSON.parse(Buffer.concat(chunks).toString());
    messages.push(message);
    const fail = message.messageType === failMessageType;
    response.writeHead(fail ? 502 : 201, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(fail ? { error: 'email_failed' } : { ok: true }));
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
    assert.ok(!messages.some(message => message.messageType === 'foerderverein'));
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

  for (const failure of ['', 'foerderverein', 'applicant', 'internal']) {
    messages.length = 0;
    failMessageType = failure;
    const response = await submit(supporters, 1);
    const result = await response.json();
    if (failure === 'internal') {
      assert.equal(response.status, 500);
      assert.deepEqual(messages.map(m => m.messageType), ['internal']);
      continue;
    }
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.foerdervereinStatus, failure === 'foerderverein' ? 'failed' : 'sent');
    assert.equal(result.confirmationEmailSent, failure !== 'applicant');
    assert.match(result.foerdervereinApplicationNumber, /^FV-\d{8}-[A-Z0-9]{6}$/);
    const internal = messages.find(m => m.messageType === 'internal');
    const fv = messages.find(m => m.messageType === 'foerderverein');
    const applicant = messages.find(m => m.messageType === 'applicant');
    assert.match(fv.subject, /Maria Muster-Łukasz/);
    assert.match(fv.text, /21\.06\.1985/);
    assert.doesNotMatch(fv.text, /Mila|18\.03\.2014/);
    assert.equal(fv.replyTo, supporters.foerdervereinGuardianEmail);
    assert.equal(applicant.to, supporters.foerdervereinGuardianEmail);
    assert.match(applicant.text, /für Maria Muster-Łukasz/);
    assert.equal(fv.attachments.length, 1);
    const attachment = fv.attachments[0];
    assert.match(attachment.filename, /^Foerdervereinsantrag-FV-/);
    assert.deepEqual(attachment, applicant.attachments.find(a => a.filename === attachment.filename));
    assert.deepEqual(attachment, internal.attachments.find(a => a.filename === attachment.filename));
    assert.deepEqual(messages.find(m => m.messageType === 'team').attachments, []);
    assert.match(applicant.text, /35,00 EUR jährlich/);
    if (failure === 'foerderverein') {
      assert.match(applicant.text, /Bitte sende keinen zweiten Antrag/);
      assert.equal(messages.filter(m => m.messageType === 'internal').length, 2);
    }
  }
  failMessageType = '';
  // Birth date, not sport/department or client flags, determines whose application it is.
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const eighteenthBirthday = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
  for (const scenario of [
    { department: 'archery', birthDate: '2014-03-18', guardian: true, existing: 'no', amount: '25' },
    { department: 'passive', birthDate: '2014-03-18', guardian: true, existing: 'yes', amount: '11' },
    { department: 'adult-football', birthDate: '2014-03-18', guardian: true, existing: 'no', amount: '25', teamSelection: 'frauen-1' },
    { department: 'youth-football', birthDate: eighteenthBirthday, guardian: false, existing: 'no', amount: '11' },
    { department: 'passive', birthDate: '1980-03-18', guardian: false, existing: 'no', amount: '11' },
  ]) {
    messages.length = 0;
    const response = await submit({ ...supporters, ...scenario, foerdervereinApplicant: scenario.guardian ? 'guardian' : 'self',
      foerdervereinAnnualContribution: scenario.amount, foerdervereinGuardianBsvMember: scenario.existing });
    assert.equal(response.status, 200, await response.clone().text());
    const fv = messages.find(m => m.messageType === 'foerderverein');
    const applicant = messages.find(m => m.messageType === 'applicant');
    assert.equal(applicant.to, scenario.guardian ? supporters.foerdervereinGuardianEmail : sampleApplication.email);
    const path = join(directory, 'fv-person.pdf');
    writeFileSync(path, Buffer.from(fv.attachments[0].content, 'base64'));
    const text = spawnSync('pdftotext', ['-layout', path, '-'], { encoding: 'utf8' }).stdout;
    if (scenario.guardian) {
      assert.match(text, /Maria/);
      assert.match(text, /21\.06\.1985/);
      assert.match(text, /Elternstraße 24/);
      assert.doesNotMatch(text, /Mila|18\.03\.2014|mila\.muster/);
      assert.match(fv.text, scenario.existing === 'yes' ? /bereits selbst BSV-Mitglied/ : /selbst kein BSV-Mitglied/);
    } else {
      assert.match(text, /Mila/);
      assert.doesNotMatch(text, /21\.06\.1985|Elternstraße 24/);
      assert.match(fv.text, /gleichzeitig für dieselbe Person beantragt/);
    }
    const mainPath = join(directory, 'main-person.pdf');
    const main = applicant.attachments.find(a => a.filename.startsWith('BSV-Mitgliedsantrag-'));
    writeFileSync(mainPath, Buffer.from(main.content, 'base64'));
    const mainText = spawnSync('pdftotext', ['-layout', mainPath, '-'], { encoding: 'utf8' }).stdout;
    assert.match(mainText, /Mila/);
    assert.match(mainText, scenario.guardian ? /Fördermitglied: Maria/ : /Fördermitglied: Mila/);
  }
  for (const overrides of [
    { foerdervereinAnnualContribution: '10' }, { foerdervereinAnnualContribution: '10001' },
    { foerdervereinAnnualContribution: '11.5' }, { foerdervereinAnnualContribution: '11e2' },
    { foerdervereinSepaAccepted: false }, { foerdervereinStatutesAccepted: false }, { foerdervereinPrivacyAccepted: false },
    { foerdervereinNotes: 'a'.repeat(2001) }, { signingDate: '2026-02-31' },
    { foerdervereinApplicant: '' }, { foerdervereinApplicant: 'self' },
    { guardianFirstName: '' }, { guardianLastName: '' }, { guardianPhone: '' },
    { foerdervereinGuardianBirthDate: '' }, { foerdervereinGuardianBirthDate: '2014-03-18' },
    { foerdervereinGuardianBirthDate: '1985-02-31' }, { foerdervereinGuardianBirthDate: '21.06.1985' },
    { foerdervereinGuardianBirthDate: '2099-01-01' }, { foerdervereinGuardianBsvMember: '' },
    { foerdervereinGuardianBsvMember: 'no', foerdervereinAnnualContribution: '11' },
    { foerdervereinGuardianEmail: 'invalid' }, { foerdervereinGuardianStreet: '' },
    { foerdervereinGuardianCity: 'a'.repeat(121) }, { foerdervereinGuardianPostalCode: '' },
    { birthDate: '1980-03-18', foerdervereinApplicant: 'guardian' },
  ]) {
    messages.length = 0;
    const response = await submit({ ...supporters, ...overrides });
    assert.equal(response.status, 422, JSON.stringify(overrides));
    assert.equal(messages.length, 0, 'Invalid extra application must prevent either application being sent');
  }
  messages.length = 0;
  const optedOut = await submit({ ...supporters, foerdervereinMembership: '', foerdervereinAnnualContribution: '10' });
  assert.equal(optedOut.status, 200);
  assert.equal((await optedOut.json()).foerdervereinStatus, 'not_requested');
  assert.ok(!messages.some(m => m.messageType === 'foerderverein'));
  assert.ok(messages.every(m => m.attachments.every(a => !a.filename.startsWith('Foerdervereinsantrag-'))));
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
