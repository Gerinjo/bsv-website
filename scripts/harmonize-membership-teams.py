from pathlib import Path
import re

frontend_path = Path('src/pages/verein/mitglied-werden.astro')
backend_path = Path('public/api/membership-v3.php')

frontend = frontend_path.read_text(encoding='utf-8')
backend = backend_path.read_text(encoding='utf-8')

frontend_teams = """  const youthTeams = [
    { value: 'bambini-u6', label: 'U6 G-Junioren Spielgruppe', trainers: 'M. Ernsberger, N. Friedrich, M.-L. Bulander, E. Arfa' },
    { value: 'bambini-u7', label: 'U7 G-Junioren Bambinis', trainers: 'M. Meiss, M. Tassone, L. Gastaudo' },
    { value: 'f-u8', label: 'U8 F-Junioren', trainers: 'F. Keller, P. Dieterle' },
    { value: 'f-u9', label: 'U9 F-Junioren', trainers: 'A. Wolfmüller, S. Rauch, M. Rüth' },
    { value: 'e1-junioren', label: 'U11 E1-Junioren', trainers: 'N. Pourheidari, C. Pabst' },
    { value: 'e2-junioren', label: 'U11 E2-Junioren', trainers: 'M. Rüth, M. Mahmoudi' },
    { value: 'e3-junioren', label: 'U11 E3-Junioren', trainers: 'S. Sulger, M. Sick' },
    { value: 'd1-junioren', label: 'U13 D1-Junioren', trainers: 'S. Hellmann' },
    { value: 'd2-junioren', label: 'U13 D2-Junioren', trainers: 'J. Boreatti, M. Eisner' },
    { value: 'd3-junioren', label: 'U13 D3-Junioren', trainers: 'H. Ho' },
    { value: 'c1-junioren', label: 'U15 C1-Junioren', trainers: 'A. Scholpre, S. Bühler, T. Parthenschlager' },
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
  ];"""

frontend, count = re.subn(
    r"  const youthTeams = \[.*?\n  \];\n\n  const adultMaleTeams = \[.*?\n  \];",
    frontend_teams,
    frontend,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('Frontend team arrays were not found exactly once.')

frontend = frontend.replace(
    "    if (selectedDepartment() === 'adult-football' && gender.value === 'männlich') return 'adult-men';\n    return '';",
    "    if (selectedDepartment() === 'adult-football' && gender.value === 'männlich') return 'adult-men';\n    if (selectedDepartment() === 'adult-football' && gender.value === 'weiblich') return 'adult-women';\n    return '';",
)
frontend = frontend.replace(
    "  const availableTeams = () => teamAudience() === 'youth' ? youthTeams : (teamAudience() === 'adult-men' ? adultMaleTeams : []);",
    "  const availableTeams = () => {\n    if (teamAudience() === 'youth') return youthTeams;\n    if (teamAudience() === 'adult-men') return adultMaleTeams;\n    if (teamAudience() === 'adult-women') return adultFemaleTeams;\n    return [];\n  };",
)

backend_teams = """$youthTeamOptions = array(
    'bambini-u6' => array('label' => 'U6 G-Junioren Spielgruppe', 'trainers' => 'M. Ernsberger, N. Friedrich, M.-L. Bulander, E. Arfa'),
    'bambini-u7' => array('label' => 'U7 G-Junioren Bambinis', 'trainers' => 'M. Meiss, M. Tassone, L. Gastaudo'),
    'f-u8' => array('label' => 'U8 F-Junioren', 'trainers' => 'F. Keller, P. Dieterle'),
    'f-u9' => array('label' => 'U9 F-Junioren', 'trainers' => 'A. Wolfmüller, S. Rauch, M. Rüth'),
    'e1-junioren' => array('label' => 'U11 E1-Junioren', 'trainers' => 'N. Pourheidari, C. Pabst'),
    'e2-junioren' => array('label' => 'U11 E2-Junioren', 'trainers' => 'M. Rüth, M. Mahmoudi'),
    'e3-junioren' => array('label' => 'U11 E3-Junioren', 'trainers' => 'S. Sulger, M. Sick'),
    'd1-junioren' => array('label' => 'U13 D1-Junioren', 'trainers' => 'S. Hellmann'),
    'd2-junioren' => array('label' => 'U13 D2-Junioren', 'trainers' => 'J. Boreatti, M. Eisner'),
    'd3-junioren' => array('label' => 'U13 D3-Junioren', 'trainers' => 'H. Ho'),
    'c1-junioren' => array('label' => 'U15 C1-Junioren', 'trainers' => 'A. Scholpre, S. Bühler, T. Parthenschlager'),
    'c2-junioren' => array('label' => 'U15 C2-Junioren', 'trainers' => 'S. Bäuerle'),
    'b-junioren' => array('label' => 'U17 B-Junioren', 'trainers' => 'M. Geismann, A. Basile'),
    'a-junioren' => array('label' => 'U19 A-Junioren', 'trainers' => 'M. Jentsch, O. Schmal, F. Demmer'),
    'b-juniorinnen' => array('label' => 'U17 B-Juniorinnen', 'trainers' => 'S. Goldhagen, S. Thomen'),
    'c-juniorinnen' => array('label' => 'U15 C-Juniorinnen', 'trainers' => 'A. Kramer'),
    'd-juniorinnen' => array('label' => 'U13 D-Juniorinnen', 'trainers' => 'D. Bulander'),
);
$adultMaleTeamOptions = array(
    'herren-1' => array('label' => 'BSV Nordstern Radolfzell · Kreisliga B Staffel 1', 'trainers' => 'T. Parzich, T. Altenburg'),
    'herren-2' => array('label' => 'SG Herren 2 · Kreisliga C Staffel 1', 'trainers' => 'A. Kaiser'),
);
$adultFemaleTeamOptions = array(
    'frauen-1' => array('label' => 'SG Frauen 1 · Bezirksliga Bodensee', 'trainers' => 'M. Becht'),
    'frauen-2' => array('label' => 'SG Frauen 2 · Kreisliga A', 'trainers' => 'M. Lipp, E. Bayram'),
);"""

backend, count = re.subn(
    r"\$youthTeamOptions = array\(.*?\n\);\n\$adultMaleTeamOptions = array\(.*?\n\);",
    backend_teams,
    backend,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('Backend team arrays were not found exactly once.')

backend = backend.replace(
    "$teamQuestionApplies = $isYouthFootball || ($department === 'adult-football' && $gender === 'männlich');",
    "$teamQuestionApplies = $isYouthFootball || ($department === 'adult-football' && in_array($gender, array('männlich', 'weiblich'), true));",
)
backend = backend.replace(
    "$availableTeamOptions = $isYouthFootball ? $youthTeamOptions : (($department === 'adult-football' && $gender === 'männlich') ? $adultMaleTeamOptions : array());",
    "$availableTeamOptions = $isYouthFootball\n    ? $youthTeamOptions\n    : (($department === 'adult-football' && $gender === 'männlich')\n        ? $adultMaleTeamOptions\n        : (($department === 'adult-football' && $gender === 'weiblich') ? $adultFemaleTeamOptions : array()));",
)

frontend_path.write_text(frontend, encoding='utf-8')
backend_path.write_text(backend, encoding='utf-8')
print('Harmonized team labels, trainers and adult gender options.')
