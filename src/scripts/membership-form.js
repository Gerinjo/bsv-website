import { berlinToday, parseGermanDate, formatGermanDate } from '../../supabase/functions/_shared/form-dates.mjs';

const form = document.querySelector('#membership-form');
const endpoint = form.action;
const status = document.querySelector('#form-status');
const submitButton = form.querySelector('button[type="submit"]');
const contributionAccepted = form.querySelector('input[name="contributionAccepted"]');
const statutesAccepted = form.querySelector('input[name="statutesAccepted"]');
const membershipRequirement = document.querySelector('#membership-requirement');
const membershipRequirementText = document.querySelector('#membership-requirement-text');

const teamSection = document.querySelector('#team-section');
const teamKnownInputs = [...form.querySelectorAll('input[name="teamKnown"]')];
const teamSelectionBlock = document.querySelector('#team-selection-block');
const teamSelection = document.querySelector('#teamSelection');
const gender = document.querySelector('#gender');

const youthTeams = [
  { value: 'bambini-u6', label: 'U6 G-Junioren Spielgruppe', trainers: 'M. Ernsberger, N. Friedrich, M.-L. Bulander, E. Arfa' },
  { value: 'bambini-u7', label: 'U7 G-Junioren Bambinis', trainers: 'M. Meiss, M. Tassone, L. Gastaudo' },
  { value: 'f-u8', label: 'U8 F2 + F3-Junioren', trainers: 'F. Keller, P. Dieterle' },
  { value: 'f-u9', label: 'U9 F-Junioren', trainers: 'A. Wolfmüller, S. Rauch, M. Rüth' },
  { value: 'e1-junioren', label: 'U11 E1-Junioren', trainers: 'N. Pourheidari, C. Pabst' },
  { value: 'e2-junioren', label: 'U11 E2-Junioren', trainers: 'M. Rüth, M. Mahmoudi' },
  { value: 'e3-junioren', label: 'U11 E3-Junioren', trainers: 'S. Sulger, M. Sick' },
  { value: 'd1-junioren', label: 'U13 D1-Junioren', trainers: 'S. Hellmann, H. Ho' },
  { value: 'd2-junioren', label: 'U13 D2-Junioren', trainers: 'J. Boreatti, M. Eisner' },
  { value: 'd3-junioren', label: 'U13 D3-Junioren', trainers: 'J. Ernsberger' },
  { value: 'c1-junioren', label: 'U15 C1-Junioren', trainers: 'A. Schäuble, S. Bühler, T. Parthenschlager' },
  { value: 'c2-junioren', label: 'U15 C2-Junioren', trainers: 'S. Bäuerle' },
  { value: 'b-junioren', label: 'U17 B-Junioren', trainers: 'M. Geismann, A. Basile' },
  { value: 'a-junioren', label: 'U19 A-Junioren', trainers: 'M. Jentsch, O. Schmal, F. Demmer' },
  { value: 'b-juniorinnen', label: 'U17 B-Juniorinnen', trainers: 'S. Goldhagen, S. Thomen' },
  { value: 'c-juniorinnen', label: 'U15 C-Juniorinnen', trainers: 'A. Kramer' },
  { value: 'd-juniorinnen', label: 'U13 D-Juniorinnen', trainers: 'D. Bulander' },
];

const adultMaleTeams = [
  { value: 'herren-1', label: 'BSV Nordstern Radolfzell · Kreisliga B Staffel 1', trainers: 'T. Parzich, T. Altenburg' },
  { value: 'herren-2', label: 'SG Herren 2 · Kreisliga C Staffel 1', trainers: 'A. Kaiser' },
];

const adultFemaleTeams = [
  { value: 'frauen-1', label: 'SG Frauen 1 · Bezirksliga Bodensee', trainers: 'M. Becht' },
  { value: 'frauen-2', label: 'SG Frauen 2 · Kreisliga A', trainers: 'M. Lipp, E. Bayram' },
];
const departmentInputs = [...form.querySelectorAll('input[name="department"]')];
const guardianSection = document.querySelector('#guardian-section');
const footballSection = document.querySelector('#football-section');
const supportWilling = document.querySelector('#supportWilling');
const supportDetails = document.querySelector('#support-details');
const foerdervereinMembership = document.querySelector('#foerdervereinMembership');
const foerdervereinDetails = document.querySelector('#foerderverein-details');
const foerdervereinAvailability = document.querySelector('#foerderverein-availability');
let foerdervereinAvailable = false;
const updateFoerderverein = () => {
  const selected = foerdervereinMembership.checked;
  foerdervereinMembership.disabled = !foerdervereinAvailable && !selected;
  foerdervereinMembership.setAttribute('aria-expanded', String(selected));
  foerdervereinMembership.setCustomValidity(selected && !foerdervereinAvailable ? 'Der gemeinsame Fördervereinsantrag ist momentan nicht verfügbar. Bitte versuche es später erneut oder nutze den separaten Antrag.' : '');
  foerdervereinDetails.hidden = !selected;
  document.querySelector('#foerderverein-signature-hint').hidden = !selected;
  foerdervereinDetails.querySelectorAll('input, textarea').forEach((control) => {
    control.disabled = !selected;
    control.required = selected && control.hasAttribute('data-fv-required');
    if (!selected && control.type === 'checkbox') control.checked = false;
  });
  submitButton.firstChild.textContent = selected ? 'Beide Mitgliedsanträge absenden ' : 'Mitgliedsantrag absenden ';
};
foerdervereinMembership.addEventListener('change', updateFoerderverein);
const birthDate = document.querySelector('#birthDate');
const nationality = document.querySelector('#nationality');
const internationalSection = document.querySelector('#international-section');
const identityProofInputs = [...form.querySelectorAll('input[name="identityProofType"]')];
const birthDocuments = document.querySelector('#birth-documents');
const identityCardDocuments = document.querySelector('#identity-card-documents');
const registrationTypeInputs = [...form.querySelectorAll('input[name="registrationType"]')];
const clubChangeSection = document.querySelector('#club-change-section');
const currentlySuspended = document.querySelector('#currentlySuspended');
const suspensionDates = document.querySelector('#suspension-dates');
let formIsSending = false;

const updateMembershipEligibility = () => {
  const eligible = contributionAccepted.checked && statutesAccepted.checked;
  submitButton.disabled = formIsSending || !eligible;
  membershipRequirement.classList.toggle('is-complete', eligible);
  membershipRequirementText.textContent = eligible
    ? 'Beitragsordnung und Vereinssatzung wurden bestätigt. Der Mitgliedsantrag kann abgesendet werden.'
    : 'Ohne die Bestätigung der Beitragsordnung und der Vereinssatzung ist eine Aufnahme als Mitglied nicht möglich. Der Absenden-Button wird erst nach beiden Bestätigungen freigeschaltet.';
};

const setRequired = (root, required, selector = 'input, select, textarea') => {
  root.querySelectorAll(selector).forEach((control) => {
    if (control.type === 'checkbox' || control.type === 'radio' || control.name === 'marketingAccepted' || control.name === 'additionalDocuments[]') return;
    control.required = required;
  });
};

const selectedDepartment = () => departmentInputs.find((input) => input.checked)?.value ?? '';
const isFootball = () => ['youth-football', 'adult-football'].includes(selectedDepartment());

const teamAudience = () => {
  if (selectedDepartment() === 'youth-football') return 'youth';
  if (selectedDepartment() === 'adult-football' && gender.value === 'männlich') return 'adult-men';
  if (selectedDepartment() === 'adult-football' && gender.value === 'weiblich') return 'adult-women';
  return '';
};

const availableTeams = () => {
  if (teamAudience() === 'youth') return youthTeams;
  if (teamAudience() === 'adult-men') return adultMaleTeams;
  if (teamAudience() === 'adult-women') return adultFemaleTeams;
  return [];
};

const populateTeamOptions = (audience) => {
  const previousValue = teamSelection.value;
  teamSelection.replaceChildren(new Option('Bitte Mannschaft auswählen …', ''));
  for (const team of availableTeams()) {
    teamSelection.add(new Option(`${team.label} / Trainer ${team.trainers}`, team.value));
  }
  if ([...teamSelection.options].some((option) => option.value === previousValue)) teamSelection.value = previousValue;
  teamSection.dataset.audience = audience;
};

const updateTeamSection = () => {
  const audience = teamAudience();
  const visible = audience !== '';
  teamSection.hidden = !visible;

  if (teamSection.dataset.audience !== audience) {
    teamKnownInputs.forEach((input) => input.checked = false);
    teamSelection.value = '';
    populateTeamOptions(audience);
  }

  teamKnownInputs.forEach((input) => input.required = visible);
  const teamIsKnown = visible && teamKnownInputs.some((input) => input.checked && input.value === 'yes');
  teamSelectionBlock.hidden = !teamIsKnown;
  teamSelection.required = teamIsKnown;

  if (!visible || !teamIsKnown) teamSelection.value = '';
};

const updateDepartment = () => {
  const youth = selectedDepartment() === 'youth-football';
  guardianSection.hidden = !youth;
  setRequired(guardianSection, youth);
  footballSection.hidden = !isFootball();

  identityProofInputs.forEach((input) => input.required = isFootball());
  registrationTypeInputs.forEach((input) => input.required = isFootball());
  document.querySelector('input[name="playerDataAccepted"]').required = isFootball();

  if (!isFootball()) {
    identityProofInputs.forEach((input) => input.checked = false);
    registrationTypeInputs.forEach((input) => input.checked = false);
  }
  updateTeamSection();
  updateIdentityProof();
  updateRegistrationType();
  updateInternational();
};

const updateIdentityProof = () => {
  const selected = identityProofInputs.find((input) => input.checked)?.value ?? '';
  const needsBirth = isFootball() && selected === 'birth-documents';
  const needsId = isFootball() && selected === 'identity-card';
  birthDocuments.hidden = !needsBirth;
  identityCardDocuments.hidden = !needsId;
  setRequired(birthDocuments, needsBirth, 'input[type="file"]');
  setRequired(identityCardDocuments, needsId, 'input[type="file"]');
};

const calculateAge = () => {
  if (!birthDate.value) return null;
  const born = new Date(`${parseGermanDate(birthDate.value)}T12:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date(`${berlinToday()}T12:00:00`);
  let age = today.getFullYear() - born.getFullYear();
  const monthDifference = today.getMonth() - born.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
};

const updateInternational = () => {
  const normalized = nationality.value.trim().toLocaleLowerCase('de-DE');
  const nonGerman = normalized !== '' && !['deutsch', 'deutsche', 'deutschland', 'german'].includes(normalized);
  const age = calculateAge();
  const visible = isFootball() && nonGerman && age !== null && age >= 10 && age < 18;
  internationalSection.hidden = !visible;
  setRequired(internationalSection, visible);
};

const updateRegistrationType = () => {
  const clubChange = isFootball() && registrationTypeInputs.some((input) => input.checked && input.value === 'club-change');
  clubChangeSection.hidden = !clubChange;
  document.querySelector('#previousClub').required = clubChange;
  currentlySuspended.required = clubChange;
  if (!clubChange) currentlySuspended.value = '';
  updateSuspension();
};

const updateSuspension = () => {
  const visible = !clubChangeSection.hidden && currentlySuspended.value === 'yes';
  suspensionDates.hidden = !visible;
  document.querySelector('#suspensionPeriod').required = visible;
};

supportWilling.addEventListener('change', () => {
  supportDetails.hidden = !supportWilling.checked;
});
departmentInputs.forEach((input) => input.addEventListener('change', updateDepartment));
gender.addEventListener('change', updateTeamSection);
teamKnownInputs.forEach((input) => input.addEventListener('change', updateTeamSection));
identityProofInputs.forEach((input) => input.addEventListener('change', updateIdentityProof));
registrationTypeInputs.forEach((input) => input.addEventListener('change', updateRegistrationType));
currentlySuspended.addEventListener('change', updateSuspension);
const dateInputs = [birthDate, document.querySelector('#signingDate')];
const validateDates = (normalize = false) => {
  dateInputs.forEach((input) => {
    const iso = parseGermanDate(input.value);
    input.setCustomValidity(input.value && !iso ? 'Bitte ein gültiges Datum im Format TT.MM.JJJJ angeben.' : '');
    if (iso && iso > berlinToday()) input.setCustomValidity('Das Datum darf nicht in der Zukunft liegen.');
    if (normalize && iso) input.value = formatGermanDate(iso);
  });
};
dateInputs.forEach((input) => {
  input.addEventListener('input', () => { validateDates(); updateInternational(); });
  input.addEventListener('change', () => { validateDates(true); updateInternational(); });
});
nationality.addEventListener('input', updateInternational);
contributionAccepted.addEventListener('change', updateMembershipEligibility);
statutesAccepted.addEventListener('change', updateMembershipEligibility);

const canvas = document.querySelector('#signature-pad');
const signatureData = document.querySelector('#signature-data');
const clearSignature = document.querySelector('#clear-signature');
const context = canvas.getContext('2d');
let drawing = false;
let signed = false;

const resizeCanvas = () => {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.lineWidth = 2.2;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#092f20';
};

const point = (event) => {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
};

canvas.addEventListener('pointerdown', (event) => {
  event.preventDefault();
  drawing = true;
  signed = true;
  canvas.setPointerCapture(event.pointerId);
  const current = point(event);
  context.beginPath();
  context.moveTo(current.x, current.y);
});
canvas.addEventListener('pointermove', (event) => {
  if (!drawing) return;
  event.preventDefault();
  const current = point(event);
  context.lineTo(current.x, current.y);
  context.stroke();
});
const stopDrawing = (event) => {
  if (!drawing) return;
  drawing = false;
  try { canvas.releasePointerCapture(event.pointerId); } catch {}
  signatureData.value = canvas.toDataURL('image/png');
};
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointercancel', stopDrawing);
canvas.addEventListener('pointerleave', (event) => {
  if (drawing && event.buttons === 0) stopDrawing(event);
});
clearSignature.addEventListener('click', () => {
  context.clearRect(0, 0, canvas.width, canvas.height);
  signatureData.value = '';
  signed = false;
});
window.addEventListener('resize', () => {
  if (!signed) resizeCanvas();
});

const createCaptcha = async () => {
  document.querySelector('#captchaAnswer').value = '';
  try {
    const response = await fetch(endpoint, { credentials: 'include', headers: { Accept: 'application/json' } });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error();
    foerdervereinAvailable = result.features?.foerdervereinMembership === true;
    foerdervereinAvailability.hidden = foerdervereinAvailable;
    foerdervereinAvailability.textContent = 'Der gemeinsame Fördervereinsantrag ist momentan nicht verfügbar. Du kannst den oben verlinkten separaten Antrag nutzen.';
    updateFoerderverein();
    document.querySelector('#captcha-question').textContent = `${result.a} + ${result.b}`;
  } catch {
    document.querySelector('#captcha-question').textContent = '? + ?';
    status.textContent = 'Der Spamschutz konnte nicht geladen werden. Bitte lade die Seite neu.';
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  updateDepartment();
  updateIdentityProof();
  updateInternational();
  updateRegistrationType();
  updateTeamSection();
  updateFoerderverein();

  if (!contributionAccepted.checked || !statutesAccepted.checked) {
    status.textContent = 'Ohne die Bestätigung der Beitragsordnung und der Vereinssatzung ist keine Mitgliedschaft möglich.';
    membershipRequirement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!signed || !signatureData.value) {
    status.textContent = 'Bitte unterschreibe im Unterschriftenfeld.';
    canvas.focus();
    return;
  }
  validateDates(true);
  if (!form.reportValidity()) {
    status.textContent = 'Bitte prüfe die markierten Pflichtfelder.';
    return;
  }

  formIsSending = true;
  updateMembershipEligibility();
  status.textContent = 'Antrag und Anlagen werden vorbereitet und versendet …';
  const newsletterRequested = form.querySelector('input[name="emailNewsletterAccepted"]').checked || form.querySelector('input[name="emailGeneralInfoAccepted"]').checked;
  const foerdervereinRequested = foerdervereinMembership.checked;

  const data = new FormData(form);
  dateInputs.forEach((input) => data.set(input.name, parseGermanDate(input.value)));
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      body: data,
      headers: { Accept: 'application/json' },
    });
    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(`Der Server konnte die Anfrage nicht verarbeiten (HTTP ${response.status}).`);
    }
    if (!response.ok || !result.ok) throw new Error(result.message || 'Der Antrag konnte nicht versendet werden.');

    form.reset();
    updateDepartment();
    updateFoerderverein();
    supportDetails.hidden = true;
    clearSignature.click();
    document.querySelector('#signingDate').value = formatGermanDate(berlinToday());
    await createCaptcha();
    status.textContent = `Vielen Dank! Dein Hauptvereinsantrag wurde unter der Nummer ${result.applicationNumber} versendet.`;
    if (foerdervereinRequested) {
      status.textContent += result.foerdervereinStatus === 'sent'
        ? ` Auch dein Fördervereinsantrag ${result.foerdervereinApplicationNumber} wurde versendet.`
        : ' Die direkte Weiterleitung an den Förderverein konnte nicht bestätigt werden. Dein Fördervereinsantrag liegt der Mitgliederverwaltung vor. Bitte sende keinen zweiten Antrag; wende dich bei Rückfragen an info@bsvnordstern.de.';
    }
    status.textContent += result.confirmationEmailSent === false
      ? ' Deine Eingangsbestätigung konnte leider nicht versendet werden. Bitte wende dich mit der Antragsnummer an info@bsvnordstern.de; sende den Antrag nicht erneut.'
      : ` Du erhältst ${foerdervereinRequested ? 'beide unterschriebenen Anträge' : 'deinen unterschriebenen Antrag'} als PDF per E-Mail.`;
    if (newsletterRequested) {
      status.textContent += result.newsletterStatus === 'requested'
        ? ' Für deine ausgewählten E-Mail-Angebote erhältst du zusätzlich eine gemeinsame Verifizierungsmail, sofern sie noch nicht bestätigt sind. Ein Klick auf den Link bestätigt deine Auswahl. Prüfe auch den Spam-Ordner.'
        : ' Die Anmeldung für deine E-Mail-Auswahl konnte gerade nicht gestartet werden. Dein Mitgliedsantrag ist versendet. Bitte nutze für die gewünschte E-Mail-Auswahl das Formular auf unserer Newsletter-Seite unter /newsletter.';
    }
    window.scrollTo({ top: form.offsetTop - 90, behavior: 'smooth' });
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Der Antrag konnte nicht versendet werden.';
    await createCaptcha();
  } finally {
    formIsSending = false;
    updateMembershipEligibility();
  }
});

document.querySelector('#signingDate').value = formatGermanDate(berlinToday());
resizeCanvas();
updateDepartment();
updateFoerderverein();
updateMembershipEligibility();
createCaptcha();
