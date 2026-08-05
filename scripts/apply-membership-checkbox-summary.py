from pathlib import Path

backend_path = Path('public/api/membership-v3.php')
frontend_path = Path('src/pages/verein/mitglied-werden.astro')
backend = backend_path.read_text(encoding='utf-8')
frontend = frontend_path.read_text(encoding='utf-8')

# 1) Internal processing email: add a complete checkbox summary.
email_summary_anchor = '''$emailConsentSummary =
    "Allgemeine Vereinsinformationen per E-Mail: " . $yesNo($emailGeneralInfoAccepted) . "\\n" .
    "Newsletter und digitale Vereinszeitschrift per E-Mail: " . $yesNo($emailNewsletterAccepted) . "\\n";
'''
checkbox_summary_block = email_summary_anchor + '''
$checkboxSummary =
    "Unterstützung im Verein angeboten: " . $yesNo($value('supportWilling') === 'yes') . "\\n" .
    "SEPA-Lastschriftmandat bestätigt: " . $yesNo($accepted('sepaAccepted')) . "\\n" .
    "Beitragsordnung gelesen und akzeptiert: " . $yesNo($accepted('contributionAccepted')) . "\\n" .
    "Vereinssatzung gelesen und akzeptiert: " . $yesNo($accepted('statutesAccepted')) . "\\n" .
    "Datenschutzerklärung und Datenverarbeitung akzeptiert: " . $yesNo($accepted('privacyAccepted')) . "\\n" .
    "Allgemeine Vereinsinformationen per E-Mail: " . $yesNo($emailGeneralInfoAccepted) . "\\n" .
    "Newsletter und digitale Vereinszeitschrift per E-Mail: " . $yesNo($emailNewsletterAccepted) . "\\n" .
    ($isFootball
        ? "Spielberichtsdaten für DFBnet und FUSSBALL.DE akzeptiert: " . $yesNo($accepted('playerDataAccepted')) . "\\n" .
          "Marketing durch DFB, Verbände und Partner akzeptiert: " . $yesNo($accepted('marketingAccepted')) . "\\n"
        : "Spielberichtsdaten für DFBnet und FUSSBALL.DE: nicht relevant\\n" .
          "Marketing durch DFB, Verbände und Partner: nicht relevant\\n");
'''
if '$checkboxSummary =' not in backend:
    if email_summary_anchor not in backend:
        raise SystemExit('Backend anchor for checkbox summary not found')
    backend = backend.replace(email_summary_anchor, checkbox_summary_block, 1)

old_internal_section = '''    "Telefon: {$phone}\\n\\n" .
    "Freiwillige E-Mail-Einwilligungen:\\n" . $emailConsentSummary . "\\n" .
    ($isYouthFootball ? "Kontaktperson: {$guardianFirstName} {$guardianLastName}\\nTelefon Kontaktperson: " . ($guardianPhone !== '' ? $guardianPhone : 'nicht angegeben') . "\\n\\n" : '') .
'''
new_internal_section = '''    "Telefon: {$phone}\\n\\n" .
    "ANTWORTEN AUF SÄMTLICHE CHECKBOXEN\\n" .
    $checkboxSummary . "\\n" .
    ($value('supportIdeas') !== '' ? "Hinweise zur angebotenen Unterstützung: " . $value('supportIdeas') . "\\n\\n" : '') .
    ($isYouthFootball ? "Kontaktperson: {$guardianFirstName} {$guardianLastName}\\nTelefon Kontaktperson: " . ($guardianPhone !== '' ? $guardianPhone : 'nicht angegeben') . "\\n\\n" : '') .
'''
if 'ANTWORTEN AUF SÄMTLICHE CHECKBOXEN' not in backend:
    if old_internal_section not in backend:
        raise SystemExit('Backend internal email section not found')
    backend = backend.replace(old_internal_section, new_internal_section, 1)

# 2) Frontend: explanatory notice and initially disabled submit button.
old_submit_markup = '''            <div class="submit-row">
              <button type="submit">Mitgliedsantrag absenden <span>↗</span></button>
              <p id="form-status" role="status" aria-live="polite"></p>
            </div>
'''
new_submit_markup = '''            <div id="membership-requirement" class="membership-requirement" role="note" aria-live="polite">
              <strong>Voraussetzung für die Mitgliedschaft</strong>
              <p id="membership-requirement-text">Ohne die Bestätigung der Beitragsordnung und der Vereinssatzung ist eine Aufnahme als Mitglied nicht möglich. Der Absenden-Button wird erst nach beiden Bestätigungen freigeschaltet.</p>
            </div>

            <div class="submit-row">
              <button type="submit" disabled aria-describedby="membership-requirement-text">Mitgliedsantrag absenden <span>↗</span></button>
              <p id="form-status" role="status" aria-live="polite"></p>
            </div>
'''
if 'id="membership-requirement"' not in frontend:
    if old_submit_markup not in frontend:
        raise SystemExit('Frontend submit markup not found')
    frontend = frontend.replace(old_submit_markup, new_submit_markup, 1)

# 3) Frontend JavaScript: references and state management.
js_refs_anchor = '''  const status = document.querySelector('#form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const departmentInputs = [...form.querySelectorAll('input[name="department"]')];
'''
js_refs_replacement = '''  const status = document.querySelector('#form-status');
  const submitButton = form.querySelector('button[type="submit"]');
  const contributionAccepted = form.querySelector('input[name="contributionAccepted"]');
  const statutesAccepted = form.querySelector('input[name="statutesAccepted"]');
  const membershipRequirement = document.querySelector('#membership-requirement');
  const membershipRequirementText = document.querySelector('#membership-requirement-text');
  const departmentInputs = [...form.querySelectorAll('input[name="department"]')];
'''
if 'const contributionAccepted =' not in frontend:
    if js_refs_anchor not in frontend:
        raise SystemExit('Frontend JS references anchor not found')
    frontend = frontend.replace(js_refs_anchor, js_refs_replacement, 1)

state_anchor = '''  const suspensionDates = document.querySelector('#suspension-dates');

  const setRequired = (root, required, selector = 'input, select, textarea') => {
'''
state_replacement = '''  const suspensionDates = document.querySelector('#suspension-dates');
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
'''
if 'const updateMembershipEligibility =' not in frontend:
    if state_anchor not in frontend:
        raise SystemExit('Frontend state anchor not found')
    frontend = frontend.replace(state_anchor, state_replacement, 1)

listener_anchor = '''  birthDate.addEventListener('change', updateInternational);
  nationality.addEventListener('input', updateInternational);

  const canvas = document.querySelector('#signature-pad');
'''
listener_replacement = '''  birthDate.addEventListener('change', updateInternational);
  nationality.addEventListener('input', updateInternational);
  contributionAccepted.addEventListener('change', updateMembershipEligibility);
  statutesAccepted.addEventListener('change', updateMembershipEligibility);

  const canvas = document.querySelector('#signature-pad');
'''
if "contributionAccepted.addEventListener('change'" not in frontend:
    if listener_anchor not in frontend:
        raise SystemExit('Frontend listener anchor not found')
    frontend = frontend.replace(listener_anchor, listener_replacement, 1)

# Explicit submit guard for keyboard/programmatic submissions.
submit_guard_anchor = '''    updateInternational();
    updateRegistrationType();

    if (!signed || !signatureData.value) {
'''
submit_guard_replacement = '''    updateInternational();
    updateRegistrationType();

    if (!contributionAccepted.checked || !statutesAccepted.checked) {
      status.textContent = 'Ohne die Bestätigung der Beitragsordnung und der Vereinssatzung ist keine Mitgliedschaft möglich.';
      membershipRequirement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!signed || !signatureData.value) {
'''
if 'membershipRequirement.scrollIntoView' not in frontend:
    if submit_guard_anchor not in frontend:
        raise SystemExit('Frontend submit guard anchor not found')
    frontend = frontend.replace(submit_guard_anchor, submit_guard_replacement, 1)

sending_anchor = '''    submitButton.disabled = true;
    status.textContent = 'Antrag und Anlagen werden vorbereitet und versendet …';
'''
sending_replacement = '''    formIsSending = true;
    updateMembershipEligibility();
    status.textContent = 'Antrag und Anlagen werden vorbereitet und versendet …';
'''
if 'formIsSending = true;' not in frontend:
    if sending_anchor not in frontend:
        raise SystemExit('Frontend sending anchor not found')
    frontend = frontend.replace(sending_anchor, sending_replacement, 1)

finally_anchor = '''    } finally {
      submitButton.disabled = false;
    }
'''
finally_replacement = '''    } finally {
      formIsSending = false;
      updateMembershipEligibility();
    }
'''
if 'formIsSending = false;' not in frontend:
    if finally_anchor not in frontend:
        raise SystemExit('Frontend finally anchor not found')
    frontend = frontend.replace(finally_anchor, finally_replacement, 1)

init_anchor = '''  resizeCanvas();
  updateDepartment();
  createCaptcha();
'''
init_replacement = '''  resizeCanvas();
  updateDepartment();
  updateMembershipEligibility();
  createCaptcha();
'''
if '  updateMembershipEligibility();\n  createCaptcha();' not in frontend:
    if init_anchor not in frontend:
        raise SystemExit('Frontend init anchor not found')
    frontend = frontend.replace(init_anchor, init_replacement, 1)

# 4) Styling for the membership prerequisite notice and disabled state.
css_anchor = '''  .honeypot{position:absolute;left:-10000px}
  .submit-row{margin-top:28px;display:flex;align-items:center;gap:20px}
'''
css_replacement = '''  .honeypot{position:absolute;left:-10000px}
  .membership-requirement{margin-top:28px;padding:17px 18px;border-left:4px solid #d59324;background:#fff4dc;color:#69440e}
  .membership-requirement strong{display:block;margin-bottom:5px;color:#593708;font-size:.82rem}
  .membership-requirement p{margin:0;font-size:.76rem;line-height:1.6}
  .membership-requirement.is-complete{border-left-color:#4f8a32;background:#eff7eb;color:#315722}
  .membership-requirement.is-complete strong{color:#27481b}
  .submit-row{margin-top:20px;display:flex;align-items:center;gap:20px}
'''
if '.membership-requirement{' not in frontend:
    if css_anchor not in frontend:
        raise SystemExit('Frontend CSS anchor not found')
    frontend = frontend.replace(css_anchor, css_replacement, 1)

frontend = frontend.replace(
    '.submit-row button:hover{background:var(--yellow)}.submit-row button:disabled{opacity:.55;cursor:wait}',
    '.submit-row button:hover:not(:disabled){background:var(--yellow)}.submit-row button:disabled{opacity:.5;cursor:not-allowed}',
    1,
)

backend_path.write_text(backend, encoding='utf-8')
frontend_path.write_text(frontend, encoding='utf-8')
print('Membership checkbox summary and submit eligibility updated.')
