from pathlib import Path

frontend_path = Path('src/pages/verein/mitglied-werden.astro')
backend_path = Path('public/api/membership-v3.php')
frontend = frontend_path.read_text(encoding='utf-8')
backend = backend_path.read_text(encoding='utf-8')

team_section = '''

          <section id="team-section" class="form-section conditional" hidden>
            <div class="section-heading compact"><span>03</span><div><small>Mannschaft</small><h2>Ist deine Mannschaft schon bekannt?</h2></div></div>
            <p class="section-copy">Die Angabe erleichtert uns die interne Zuordnung. Sie wird zunächst ausschließlich an die zuständige Bearbeitung beim BSV übermittelt und noch nicht automatisch an Trainerinnen oder Trainer weitergeleitet.</p>
            <fieldset id="team-known-options" class="stacked-options">
              <legend>Weißt du bereits, in welcher Mannschaft du beziehungsweise dein Kind aktiv sein wird? *</legend>
              <label><input type="radio" name="teamKnown" value="yes" /><span>Ja, die Mannschaft ist bereits bekannt.</span></label>
              <label><input type="radio" name="teamKnown" value="no" /><span>Nein, die Zuordnung ist noch offen.</span></label>
            </fieldset>
            <div id="team-selection-block" class="conditional-block" hidden>
              <div class="field full">
                <label for="teamSelection">Mannschaft *</label>
                <select id="teamSelection" name="teamSelection">
                  <option value="">Bitte Mannschaft auswählen …</option>
                </select>
                <small class="team-meta">Zur Orientierung werden die aktuell hinterlegten Trainer mit abgekürztem Vornamen angezeigt.</small>
              </div>
            </div>
          </section>'''

if 'id="team-section"' not in frontend:
    anchor = '''            </fieldset>
          </section>

          <section id="guardian-section" class="form-section conditional" hidden>'''
    replacement = '''            </fieldset>
          </section>''' + team_section + '''

          <section id="guardian-section" class="form-section conditional" hidden>'''
    if anchor not in frontend:
        raise SystemExit('Frontend team-section anchor not found')
    frontend = frontend.replace(anchor, replacement, 1)

number_updates = {
    '<div class="section-heading compact"><span>03</span><div><small>Jugendmitglied</small>': '<div class="section-heading compact"><span>04</span><div><small>Jugendmitglied</small>',
    '<div class="section-heading compact"><span>04</span><div><small>Gemeinsam stark</small>': '<div class="section-heading compact"><span>05</span><div><small>Gemeinsam stark</small>',
    '<div class="section-heading"><span>05</span><div><small>SEPA-Lastschrift</small>': '<div class="section-heading"><span>06</span><div><small>SEPA-Lastschrift</small>',
    '<div class="section-heading compact"><span>06</span><div><small>Bestätigungen</small>': '<div class="section-heading compact"><span>07</span><div><small>Bestätigungen</small>',
    '<div class="section-heading"><span>07</span><div><small>Nur für Fußball</small>': '<div class="section-heading"><span>08</span><div><small>Nur für Fußball</small>',
    '<div class="section-heading"><span>08</span><div><small>Abschluss</small>': '<div class="section-heading"><span>09</span><div><small>Abschluss</small>',
}
for old, new in number_updates.items():
    frontend = frontend.replace(old, new, 1)

js_team_setup = '''
  const teamSection = document.querySelector('#team-section');
  const teamKnownInputs = [...form.querySelectorAll('input[name="teamKnown"]')];
  const teamSelectionBlock = document.querySelector('#team-selection-block');
  const teamSelection = document.querySelector('#teamSelection');
  const gender = document.querySelector('#gender');

  const youthTeams = [
    { value: 'bambini-u6', label: 'Bambini U6', trainers: 'M. Ernsberger, N. Friedrich, M.-L. Bulander, E. Arfa' },
    { value: 'bambini-u7', label: 'Bambini U7', trainers: 'M. Meiss, M. Tassone, L. Gastaudo' },
    { value: 'f-u8', label: 'F-Junioren U8', trainers: 'F. Keller, P. Dieterle' },
    { value: 'f-u9', label: 'F-Junioren U9', trainers: 'A. Wolfmüller, S. Rauch, M. Rüth' },
    { value: 'e1-junioren', label: 'E1-Junioren', trainers: 'N. Pourheidari, C. Pabst' },
    { value: 'e2-junioren', label: 'E2-Junioren', trainers: 'M. Sick, S. Sulger, H. Ho' },
    { value: 'e3-junioren', label: 'E3-Junioren', trainers: 'M. Rüth, M. Mahmoudi' },
    { value: 'd1-junioren', label: 'D1-Junioren', trainers: 'S. Hellmann' },
    { value: 'd2-junioren', label: 'D2-Junioren', trainers: 'J. Boreatti, M. Eisner' },
    { value: 'd3-junioren', label: 'D3-Junioren', trainers: 'H. Ho' },
    { value: 'c1-junioren', label: 'C1-Junioren', trainers: 'A. Scholpre, S. Bühler, T. Parthenschlager' },
    { value: 'c2-junioren', label: 'C2-Junioren', trainers: 'S. Bäuerle' },
    { value: 'b-junioren', label: 'B-Junioren', trainers: 'M. Geissmann, A. Basile' },
    { value: 'a-junioren', label: 'A-Junioren', trainers: 'M. Jentsch, O. Schmal, F. Demmer' },
    { value: 'e-juniorinnen', label: 'E-Juniorinnen', trainers: 'S. Thomen' },
    { value: 'd-juniorinnen', label: 'D-Juniorinnen', trainers: 'D.-S. Bulander' },
    { value: 'c-juniorinnen', label: 'C-Juniorinnen', trainers: 'A. Kramer' },
  ];

  const adultMaleTeams = [
    { value: 'herren-1', label: '1. Mannschaft', trainers: 'T. Parzich, T. Altenburg' },
    { value: 'herren-2', label: '2. Mannschaft', trainers: 'A. Kaiser' },
  ];
'''

if 'const teamSection = document.querySelector' not in frontend:
    anchor = "  const membershipRequirementText = document.querySelector('#membership-requirement-text');\n"
    if anchor not in frontend:
        raise SystemExit('Frontend JS setup anchor not found')
    frontend = frontend.replace(anchor, anchor + js_team_setup, 1)

js_team_functions = '''
  const teamAudience = () => {
    if (selectedDepartment() === 'youth-football') return 'youth';
    if (selectedDepartment() === 'adult-football' && gender.value === 'männlich') return 'adult-men';
    return '';
  };

  const availableTeams = () => teamAudience() === 'youth' ? youthTeams : (teamAudience() === 'adult-men' ? adultMaleTeams : []);

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
'''

if 'const teamAudience = () =>' not in frontend:
    anchor = "  const selectedDepartment = () => departmentInputs.find((input) => input.checked)?.value ?? '';\n  const isFootball = () => ['youth-football', 'adult-football'].includes(selectedDepartment());\n"
    if anchor not in frontend:
        raise SystemExit('Frontend team functions anchor not found')
    frontend = frontend.replace(anchor, anchor + js_team_functions, 1)

if '    updateTeamSection();\n    updateIdentityProof();' not in frontend:
    anchor = '    updateIdentityProof();\n    updateRegistrationType();\n    updateInternational();\n  };'
    replacement = '    updateTeamSection();\n    updateIdentityProof();\n    updateRegistrationType();\n    updateInternational();\n  };'
    if anchor not in frontend:
        raise SystemExit('Frontend department update anchor not found')
    frontend = frontend.replace(anchor, replacement, 1)

if "teamKnownInputs.forEach((input) => input.addEventListener('change', updateTeamSection));" not in frontend:
    anchor = "  departmentInputs.forEach((input) => input.addEventListener('change', updateDepartment));\n"
    replacement = anchor + "  gender.addEventListener('change', updateTeamSection);\n  teamKnownInputs.forEach((input) => input.addEventListener('change', updateTeamSection));\n"
    frontend = frontend.replace(anchor, replacement, 1)

if '    updateTeamSection();\n\n    if (!contributionAccepted.checked' not in frontend:
    anchor = '    updateRegistrationType();\n\n    if (!contributionAccepted.checked'
    replacement = '    updateRegistrationType();\n    updateTeamSection();\n\n    if (!contributionAccepted.checked'
    if anchor not in frontend:
        raise SystemExit('Frontend submit update anchor not found')
    frontend = frontend.replace(anchor, replacement, 1)

frontend = frontend.replace(
    '''      form.reset();
      guardianSection.hidden = true;
      footballSection.hidden = true;
      supportDetails.hidden = true;''',
    '''      form.reset();
      updateDepartment();
      supportDetails.hidden = true;''',
    1,
)
frontend = frontend.replace(
    '''    } finally {
      submitButton.disabled = false;
    }''',
    '''    } finally {
      formIsSending = false;
      updateMembershipEligibility();
    }''',
    1,
)

if '.team-meta{' not in frontend:
    anchor = '  .conditional-block h3{margin:0 0 8px;font-size:1.15rem}.conditional-block>p{margin:0 0 20px;color:#607067;line-height:1.55}\n'
    replacement = anchor + '  .team-meta{display:block;margin-top:8px;color:#697970;font-size:.72rem;line-height:1.5}\n'
    if anchor not in frontend:
        raise SystemExit('Frontend CSS anchor not found')
    frontend = frontend.replace(anchor, replacement, 1)

backend_team_data = '''
$youthTeamOptions = array(
    'bambini-u6' => array('label' => 'Bambini U6', 'trainers' => 'M. Ernsberger, N. Friedrich, M.-L. Bulander, E. Arfa'),
    'bambini-u7' => array('label' => 'Bambini U7', 'trainers' => 'M. Meiss, M. Tassone, L. Gastaudo'),
    'f-u8' => array('label' => 'F-Junioren U8', 'trainers' => 'F. Keller, P. Dieterle'),
    'f-u9' => array('label' => 'F-Junioren U9', 'trainers' => 'A. Wolfmüller, S. Rauch, M. Rüth'),
    'e1-junioren' => array('label' => 'E1-Junioren', 'trainers' => 'N. Pourheidari, C. Pabst'),
    'e2-junioren' => array('label' => 'E2-Junioren', 'trainers' => 'M. Sick, S. Sulger, H. Ho'),
    'e3-junioren' => array('label' => 'E3-Junioren', 'trainers' => 'M. Rüth, M. Mahmoudi'),
    'd1-junioren' => array('label' => 'D1-Junioren', 'trainers' => 'S. Hellmann'),
    'd2-junioren' => array('label' => 'D2-Junioren', 'trainers' => 'J. Boreatti, M. Eisner'),
    'd3-junioren' => array('label' => 'D3-Junioren', 'trainers' => 'H. Ho'),
    'c1-junioren' => array('label' => 'C1-Junioren', 'trainers' => 'A. Scholpre, S. Bühler, T. Parthenschlager'),
    'c2-junioren' => array('label' => 'C2-Junioren', 'trainers' => 'S. Bäuerle'),
    'b-junioren' => array('label' => 'B-Junioren', 'trainers' => 'M. Geissmann, A. Basile'),
    'a-junioren' => array('label' => 'A-Junioren', 'trainers' => 'M. Jentsch, O. Schmal, F. Demmer'),
    'e-juniorinnen' => array('label' => 'E-Juniorinnen', 'trainers' => 'S. Thomen'),
    'd-juniorinnen' => array('label' => 'D-Juniorinnen', 'trainers' => 'D.-S. Bulander'),
    'c-juniorinnen' => array('label' => 'C-Juniorinnen', 'trainers' => 'A. Kramer'),
);
$adultMaleTeamOptions = array(
    'herren-1' => array('label' => '1. Mannschaft', 'trainers' => 'T. Parzich, T. Altenburg'),
    'herren-2' => array('label' => '2. Mannschaft', 'trainers' => 'A. Kaiser'),
);

$teamQuestionApplies = $isYouthFootball || ($department === 'adult-football' && $gender === 'männlich');
$teamKnown = $value('teamKnown');
$teamSelection = $value('teamSelection');
$availableTeamOptions = $isYouthFootball ? $youthTeamOptions : (($department === 'adult-football' && $gender === 'männlich') ? $adultMaleTeamOptions : array());

if ($teamQuestionApplies) {
    if (!in_array($teamKnown, array('yes', 'no'), true)) {
        $fail('Bitte gib an, ob die Mannschaft bereits bekannt ist.');
    }
    if ($teamKnown === 'yes' && !isset($availableTeamOptions[$teamSelection])) {
        $fail('Bitte wähle die bekannte Mannschaft aus der Liste aus.');
    }
    if ($teamKnown === 'no') $teamSelection = '';
} else {
    $teamKnown = 'not-applicable';
    $teamSelection = '';
}

$selectedTeamLabel = $teamSelection !== '' ? $availableTeamOptions[$teamSelection]['label'] : '';
$selectedTeamTrainers = $teamSelection !== '' ? $availableTeamOptions[$teamSelection]['trainers'] : '';
'''

if '$youthTeamOptions = array(' not in backend:
    anchor = "$age = $birth->diff(new DateTime('today'))->y;\n"
    if anchor not in backend:
        raise SystemExit('Backend team data anchor not found')
    backend = backend.replace(anchor, anchor + backend_team_data, 1)

if 'Mannschaft bereits bekannt:' not in backend:
    anchor = '''    "Abteilung: {$departments[$department]}\\n" .
    "Anschrift: {$street}, {$postalCode} {$city}\\n" .'''
    replacement = '''    "Abteilung: {$departments[$department]}\\n" .
    ($teamQuestionApplies
        ? "Mannschaft bereits bekannt: " . $yesNo($teamKnown === 'yes') . "\\n" .
          ($teamKnown === 'yes'
              ? "Ausgewählte Mannschaft: {$selectedTeamLabel}\\nAktuelles Trainerteam: {$selectedTeamTrainers}\\n"
              : "Ausgewählte Mannschaft: noch nicht bekannt\\n")
        : "Mannschaftsauswahl: nicht relevant\\n") .
    "Anschrift: {$street}, {$postalCode} {$city}\\n" .'''
    if anchor not in backend:
        raise SystemExit('Backend internal mail anchor not found')
    backend = backend.replace(anchor, replacement, 1)

frontend_path.write_text(frontend, encoding='utf-8')
backend_path.write_text(backend, encoding='utf-8')
print('Membership team selection added.')
