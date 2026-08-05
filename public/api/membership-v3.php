<?php
header('Content-Type: application/json; charset=utf-8');

$allowedOrigins = array(
    'https://gerinjo.github.io',
    'https://bsvnordstern.de',
    'https://www.bsvnordstern.de',
);
$requestOrigin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type');
    header('Access-Control-Max-Age: 86400');
    exit;
}

session_name('bsv_membership');
session_set_cookie_params(array(
    'lifetime' => 0,
    'path' => '/api/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None',
));
session_start();

$respond = function ($status, $payload) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
};

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $a = random_int(2, 12);
    $b = random_int(1, 10);
    $_SESSION['membership_captcha'] = $a + $b;
    header('Cache-Control: no-store');
    $respond(200, array('ok' => true, 'a' => $a, 'b' => $b));
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    $respond(405, array('ok' => false, 'message' => 'Diese Anfrage ist nicht erlaubt.'));
}

$contentLength = isset($_SERVER['CONTENT_LENGTH']) ? (int)$_SERVER['CONTENT_LENGTH'] : 0;
if ($contentLength > 25 * 1024 * 1024) {
    $respond(413, array('ok' => false, 'message' => 'Die hochgeladenen Dateien sind insgesamt zu groß. Bitte reduziere die Dateigröße.'));
}

$value = function ($key) {
    return trim((string)(isset($_POST[$key]) ? $_POST[$key] : ''));
};
$accepted = function ($key) use ($value) {
    return $value($key) === 'accepted';
};
$fail = function ($message) use ($respond) {
    $respond(422, array('ok' => false, 'message' => $message));
};
$length = function ($text) {
    return function_exists('mb_strlen') ? mb_strlen((string)$text, 'UTF-8') : strlen((string)$text);
};
$substring = function ($text, $start, $length = null) {
    if (function_exists('mb_substr')) {
        return $length === null ? mb_substr((string)$text, $start, null, 'UTF-8') : mb_substr((string)$text, $start, $length, 'UTF-8');
    }
    return $length === null ? substr((string)$text, $start) : substr((string)$text, $start, $length);
};

if ($value('website') !== '') {
    $respond(200, array('ok' => true, 'applicationNumber' => 'BSV-OK'));
}

$expectedCaptcha = isset($_SESSION['membership_captcha']) ? $_SESSION['membership_captcha'] : null;
unset($_SESSION['membership_captcha']);
$captchaAnswer = filter_var($value('captchaAnswer'), FILTER_VALIDATE_INT);
if ($captchaAnswer === false || !is_int($expectedCaptcha) || $expectedCaptcha !== $captchaAnswer) {
    $fail('Die Antwort beim Spamschutz ist nicht richtig.');
}
if (isset($_SESSION['membership_last_submit']) && time() - (int)$_SESSION['membership_last_submit'] < 30) {
    $respond(429, array('ok' => false, 'message' => 'Bitte warte kurz, bevor du einen weiteren Antrag sendest.'));
}

$departments = array(
    'youth-football' => 'Fußball Jugend',
    'adult-football' => 'Fußball Aktive',
    'archery' => 'Bogensport',
    'gymnastics' => 'Gymnastik',
    'hiking' => 'Wandergruppe',
    'passive' => 'Passiv',
);
$genderValues = array('weiblich', 'männlich', 'divers', 'keine-angabe');
$department = $value('department');
$isFootball = in_array($department, array('youth-football', 'adult-football'), true);
$isYouthFootball = $department === 'youth-football';

$lastName = $value('lastName');
$firstName = $value('firstName');
$gender = $value('gender');
$birthDate = $value('birthDate');
$birthPlace = $value('birthPlace');
$nationality = $value('nationality');
$street = $value('street');
$postalCode = $value('postalCode');
$city = $value('city');
$phone = $value('phone');
$email = filter_var($value('email'), FILTER_VALIDATE_EMAIL);
$emailGeneralInfoAccepted = $accepted('emailGeneralInfoAccepted');
$emailNewsletterAccepted = $accepted('emailNewsletterAccepted');

if (
    $length($lastName) < 2 || $length($firstName) < 2 ||
    !in_array($gender, $genderValues, true) || !isset($departments[$department]) ||
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate) ||
    $length($birthPlace) < 2 || $length($nationality) < 2 ||
    $length($street) < 4 || $length($postalCode) < 4 || $length($city) < 2 ||
    $length($phone) < 6 || !$email
) {
    $fail('Bitte prüfe die persönlichen Angaben.');
}

$birth = DateTime::createFromFormat('!Y-m-d', $birthDate);
$birthErrors = DateTime::getLastErrors();
if (!$birth || ($birthErrors !== false && ($birthErrors['warning_count'] > 0 || $birthErrors['error_count'] > 0)) || $birth > new DateTime('today')) {
    $fail('Bitte gib ein gültiges Geburtsdatum an.');
}
$age = $birth->diff(new DateTime('today'))->y;

$guardianLastName = $value('guardianLastName');
$guardianFirstName = $value('guardianFirstName');
$guardianRelation = $value('guardianRelation');
$guardianPhone = $value('guardianPhone');
if ($isYouthFootball && ($length($guardianLastName) < 2 || $length($guardianFirstName) < 2)) {
    $fail('Bitte gib die Kontaktperson für das Jugendmitglied vollständig an.');
}

$bankName = $value('bankName');
$bic = strtoupper(preg_replace('/\s+/', '', $value('bic')));
$iban = strtoupper(preg_replace('/\s+/', '', $value('iban')));
$accountHolder = $value('accountHolder');
$ibanValid = function ($candidate) {
    if (!preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $candidate)) return false;
    $rearranged = substr($candidate, 4) . substr($candidate, 0, 4);
    $numeric = '';
    for ($i = 0, $n = strlen($rearranged); $i < $n; $i++) {
        $character = $rearranged[$i];
        $numeric .= ctype_alpha($character) ? (string)(ord($character) - 55) : $character;
    }
    $remainder = 0;
    for ($i = 0, $n = strlen($numeric); $i < $n; $i++) {
        $remainder = ($remainder * 10 + (int)$numeric[$i]) % 97;
    }
    return $remainder === 1;
};
if ($length($bankName) < 2 || !preg_match('/^[A-Z0-9]{8}([A-Z0-9]{3})?$/', $bic) || !$ibanValid($iban) || $length($accountHolder) < 2) {
    $fail('Bitte prüfe die Bankverbindung. IBAN und BIC müssen vollständig und gültig sein.');
}
if (!$accepted('sepaAccepted') || !$accepted('contributionAccepted') || !$accepted('statutesAccepted') || !$accepted('privacyAccepted')) {
    $fail('Bitte bestätige SEPA-Mandat, Beitragsordnung, Satzung und Datenschutz.');
}

$signingPlace = $value('signingPlace');
$signingDate = $value('signingDate');
if ($length($signingPlace) < 2 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $signingDate)) {
    $fail('Bitte gib Ort und Datum der Unterschrift an.');
}
$signatureData = $value('signatureData');
if (!preg_match('#^data:image/png;base64,([A-Za-z0-9+/=\r\n]+)$#', $signatureData, $signatureMatch)) {
    $fail('Bitte unterschreibe den Antrag im Unterschriftenfeld.');
}
$signatureBinary = base64_decode($signatureMatch[1], true);
if ($signatureBinary === false || strlen($signatureBinary) < 100 || strlen($signatureBinary) > 2 * 1024 * 1024) {
    $fail('Die Unterschrift konnte nicht verarbeitet werden.');
}

$identityProofType = $value('identityProofType');
$registrationType = $value('registrationType');
$currentlySuspended = $value('currentlySuspended');
if ($isFootball) {
    if (!in_array($identityProofType, array('birth-documents', 'identity-card', 'send-separately'), true)) {
        $fail('Bitte wähle aus, wie die Identitätsunterlagen eingereicht werden.');
    }
    if (!in_array($registrationType, array('first-registration', 'club-change', 're-registration'), true)) {
        $fail('Bitte wähle die Art des Spielberechtigungsantrags.');
    }
    if (!$accepted('playerDataAccepted')) {
        $fail('Für die Spielberechtigung muss die Verarbeitung der Spielberichtsdaten bestätigt werden.');
    }
    if ($registrationType === 'club-change') {
        if ($length($value('previousClub')) < 2 || !in_array($currentlySuspended, array('yes', 'no'), true)) {
            $fail('Bitte vervollständige die Angaben zum Vereinswechsel.');
        }
        if ($currentlySuspended === 'yes' && $length($value('suspensionPeriod')) < 5) {
            $fail('Bitte gib den Zeitraum der Sperre an.');
        }
    }
}

$normalizedNationality = function_exists('mb_strtolower') ? mb_strtolower($nationality, 'UTF-8') : strtolower($nationality);
$isGerman = in_array($normalizedNationality, array('deutsch', 'deutsche', 'deutschland', 'german'), true);
$needsInternationalDocuments = $isFootball && !$isGerman && $age >= 10 && $age < 18;
if ($needsInternationalDocuments && ($length($value('lastForeignResidence')) < 2 || $length($value('parentsNames')) < 5)) {
    $fail('Bitte vervollständige die Angaben für die internationale Freigabe.');
}

$allowedMimes = array(
    'application/pdf' => 'pdf',
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/heic' => 'heic',
    'image/heif' => 'heif',
);
$totalUploadBytes = 0;
$attachments = array();
$cleanFilename = function ($name) {
    $name = preg_replace('/[^A-Za-z0-9._-]+/', '-', (string)$name);
    $name = trim($name, '-.');
    return $name !== '' ? $name : 'datei';
};
$normalizeFiles = function ($field) {
    if (!isset($_FILES[$field])) return array();
    $file = $_FILES[$field];
    if (!is_array($file['name'])) return array($file);
    $normalized = array();
    foreach ($file['name'] as $index => $name) {
        $normalized[] = array(
            'name' => $name,
            'type' => isset($file['type'][$index]) ? $file['type'][$index] : '',
            'tmp_name' => isset($file['tmp_name'][$index]) ? $file['tmp_name'][$index] : '',
            'error' => isset($file['error'][$index]) ? $file['error'][$index] : UPLOAD_ERR_NO_FILE,
            'size' => isset($file['size'][$index]) ? $file['size'][$index] : 0,
        );
    }
    return $normalized;
};
$readUploads = function ($field, $label, $required, $multiple = false) use (
    &$totalUploadBytes, &$attachments, $allowedMimes, $cleanFilename, $normalizeFiles, $fail
) {
    $files = $normalizeFiles($field);
    $usableFiles = array_values(array_filter($files, function ($file) {
        return isset($file['error']) && $file['error'] !== UPLOAD_ERR_NO_FILE;
    }));
    if ($required && count($usableFiles) === 0) $fail('Bitte lade die erforderliche Datei „' . $label . '“ hoch.');
    if (!$multiple && count($usableFiles) > 1) $fail('Für „' . $label . '“ darf nur eine Datei hochgeladen werden.');
    $number = 0;
    foreach ($usableFiles as $file) {
        $number++;
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) $fail('Die Datei „' . $label . '“ konnte nicht hochgeladen werden.');
        if ((int)$file['size'] <= 0 || (int)$file['size'] > 5 * 1024 * 1024) $fail('Die Datei „' . $label . '“ darf maximal 5 MB groß sein.');
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
        $mime = $finfo ? finfo_file($finfo, $file['tmp_name']) : mime_content_type($file['tmp_name']);
        if ($finfo) finfo_close($finfo);
        if ($mime === 'application/octet-stream' && in_array($extension, array('heic', 'heif'), true)) $mime = $extension === 'heic' ? 'image/heic' : 'image/heif';
        if (!isset($allowedMimes[$mime])) $fail('Die Datei „' . $label . '“ hat ein nicht unterstütztes Format.');
        $data = file_get_contents($file['tmp_name']);
        if ($data === false) $fail('Die Datei „' . $label . '“ konnte nicht gelesen werden.');
        $totalUploadBytes += strlen($data);
        if ($totalUploadBytes > 15 * 1024 * 1024) $fail('Die Anhänge sind insgesamt zu groß. Bitte reduziere die Dateigröße auf zusammen höchstens 15 MB.');
        $suffix = $multiple ? '-' . $number : '';
        $attachments[] = array(
            'name' => $cleanFilename($label . $suffix . '.' . $allowedMimes[$mime]),
            'mime' => $mime,
            'data' => $data,
            'label' => $label,
        );
    }
};

if ($isFootball) {
    if ($identityProofType === 'birth-documents') {
        $readUploads('birthCertificate', 'Geburtsurkunde', true);
        $readUploads('registrationCertificate', 'Meldebestaetigung', true);
    } elseif ($identityProofType === 'identity-card') {
        $readUploads('idFront', 'Personalausweis-Vorderseite', true);
        $readUploads('idBack', 'Personalausweis-Rueckseite', true);
    }
    if ($needsInternationalDocuments) {
        $readUploads('dfbDeclaration', 'DFB-Zusatzerklaerung', true);
        $readUploads('parentIds', 'Ausweise-Eltern', true, true);
    }
    $readUploads('additionalDocuments', 'Weitere-Unterlage', false, true);
}

$applicationNumber = 'BSV-' . date('Ymd-His') . '-' . strtoupper(bin2hex(random_bytes(2)));
$displayDate = function ($date) {
    $parsed = DateTime::createFromFormat('!Y-m-d', $date);
    return $parsed ? $parsed->format('d.m.Y') : $date;
};
$yesNo = function ($condition) { return $condition ? 'Ja' : 'Nein'; };
$pdfEscape = function ($text) {
    $encoded = function_exists('iconv') ? iconv('UTF-8', 'Windows-1252//TRANSLIT', (string)$text) : (string)$text;
    if ($encoded === false) $encoded = preg_replace('/[^\x20-\x7E]/', '?', (string)$text);
    return str_replace(array('\\', '(', ')'), array('\\\\', '\\(', '\\)'), $encoded);
};

$buildSimplePdf = function ($lines) use ($pdfEscape) {
    $wrapped = array();
    foreach ($lines as $line) {
        if ($line === '') { $wrapped[] = ''; continue; }
        foreach (explode("\n", wordwrap($line, 88, "\n", true)) as $part) $wrapped[] = $part;
    }
    $pages = array_chunk($wrapped, 48);
    if (count($pages) === 0) $pages = array(array(''));
    $objects = array(1 => '<< /Type /Catalog /Pages 2 0 R >>', 3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    $pageIds = array();
    foreach ($pages as $index => $pageLines) {
        $contentId = 4 + ($index * 2); $pageId = 5 + ($index * 2); $pageIds[] = $pageId . ' 0 R';
        $stream = "BT\n/F1 10 Tf\n48 790 Td\n14 TL\n";
        foreach ($pageLines as $line) $stream .= '(' . $pdfEscape($line) . ") Tj\nT*\n";
        $stream .= "ET";
        $objects[$contentId] = '<< /Length ' . strlen($stream) . " >>\nstream\n" . $stream . "\nendstream";
        $objects[$pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' . $contentId . ' 0 R >>';
    }
    $objects[2] = '<< /Type /Pages /Kids [' . implode(' ', $pageIds) . '] /Count ' . count($pageIds) . ' >>';
    ksort($objects);
    $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; $offsets = array(0 => 0);
    foreach ($objects as $id => $object) { $offsets[$id] = strlen($pdf); $pdf .= $id . " 0 obj\n" . $object . "\nendobj\n"; }
    $xrefOffset = strlen($pdf); $maxId = max(array_keys($objects));
    $pdf .= "xref\n0 " . ($maxId + 1) . "\n0000000000 65535 f \n";
    for ($id = 1; $id <= $maxId; $id++) $pdf .= sprintf('%010d 00000 n ', isset($offsets[$id]) ? $offsets[$id] : 0) . "\n";
    $pdf .= "trailer\n<< /Size " . ($maxId + 1) . " /Root 1 0 R >>\nstartxref\n" . $xrefOffset . "\n%%EOF";
    return $pdf;
};

$buildSpielgenehmigungsPdf = function ($data, $signaturePng) use ($pdfEscape, $length, $substring) {
    $pageWidth = 595.28; $pageHeight = 841.89; $pages = array('', '', '');
    $fit = function ($text, $max) use ($length, $substring) {
        return $length($text) <= $max ? $text : rtrim($substring($text, 0, $max - 1)) . '…';
    };
    $text = function (&$stream, $x, $y, $content, $size = 9, $font = 'F1') use ($pdfEscape) {
        $stream .= 'BT /' . $font . ' ' . $size . ' Tf 1 0 0 1 ' . round($x, 2) . ' ' . round($y, 2) . ' Tm (' . $pdfEscape($content) . ") Tj ET\n";
    };
    $line = function (&$stream, $x1, $y1, $x2, $y2, $width = 0.7) {
        $stream .= round($width, 2) . ' w ' . round($x1, 2) . ' ' . round($y1, 2) . ' m ' . round($x2, 2) . ' ' . round($y2, 2) . " l S\n";
    };
    $rect = function (&$stream, $x, $y, $width, $height, $lineWidth = 0.7) {
        $stream .= round($lineWidth, 2) . ' w ' . round($x, 2) . ' ' . round($y, 2) . ' ' . round($width, 2) . ' ' . round($height, 2) . " re S\n";
    };
    $checkbox = function (&$stream, $x, $y, $checked) use ($rect, $line) {
        $rect($stream, $x, $y, 10, 10, 0.6);
        if ($checked) { $line($stream, $x + 2, $y + 2, $x + 8, $y + 8, 1.2); $line($stream, $x + 8, $y + 2, $x + 2, $y + 8, 1.2); }
    };
    $wrap = function ($content, $maxChars) use ($length) {
        $words = preg_split('/\s+/', trim($content)); $lines = array(); $current = '';
        foreach ($words as $word) {
            $candidate = $current === '' ? $word : $current . ' ' . $word;
            if ($length($candidate) > $maxChars && $current !== '') { $lines[] = $current; $current = $word; }
            else $current = $candidate;
        }
        if ($current !== '') $lines[] = $current;
        return $lines;
    };
    $paragraph = function (&$stream, $x, &$y, $content, $maxChars = 112, $size = 8.6, $leading = 12, $font = 'F1') use ($text, $wrap) {
        foreach ($wrap($content, $maxChars) as $row) { $text($stream, $x, $y, $row, $size, $font); $y -= $leading; }
    };
    $logo = function (&$stream) use ($text) {
        $stream .= "1 0.79 0 rg 34 796 m 87 796 l 87 763 l 60.5 746 l 34 763 l h f\n0 0 0 rg\n";
        $text($stream, 41, 772, 'SBFV', 17, 'F2');
        $stream .= "0.9 0 0 rg 43 760 36 4 re f\n0 0 0 rg\n";
        $text($stream, 94, 779, 'Südbadischer', 13, 'F2');
        $text($stream, 94, 765, 'Fußballverband', 13, 'F2');
    };

    $p =& $pages[0]; $logo($p);
    $text($p, 34, 712, 'Spielgenehmigungsantrag', 10.5, 'F2');
    $text($p, 34, 676, '1) Vereinsnummer:  4780', 9.5);
    $text($p, 265, 676, 'Pass-Nr.: _______________________________________________', 9.5);
    $text($p, 34, 657, '2) Vereins-Name: BSV Nordstern Radolfzell', 9.5);
    $text($p, 34, 638, '3) Name, Vorname:  ' . $fit($data['lastName'] . ', ' . $data['firstName'], 57), 9.5);
    $text($p, 34, 619, '4) Geburtsdatum:  ' . $data['birthDate'] . '   Geburtsort: ' . $fit($data['birthPlace'], 38), 9.5);
    $text($p, 34, 600, '5) Staatsangehörigkeit: ' . $fit($data['nationality'], 28) . '   Geschlecht: ' . $data['gender'], 9.5);
    $text($p, 34, 581, '6) Anschrift Spieler/in:  ' . $fit($data['street'] . ',  ' . $data['postalCode'] . '  ' . $data['city'], 71), 9.5);
    $text($p, 34, 562, 'E-Mail-Adresse:  ' . $fit($data['email'], 72), 9.5);
    $line($p, 34, 545, 561, 545, 1.2);

    $checkbox($p, 34, 519, $data['registrationType'] === 'first-registration');
    $text($p, 66, 522, 'Erstmalige Spielerlaubnis:', 9.4, 'F2');
    $y = 505;
    $paragraph($p, 34, $y, 'Wir beantragen die erstmalige Spielerlaubnis für o. g. Spieler/in und bestätigen, dass noch keine Spielberechtigung bestanden hat, auch nicht ausserhalb der Bundesrepublik Deutschland.', 112, 8.6, 14);
    $paragraph($p, 34, $y, 'Das angegebene Geburtsdatum und die Namensschreibweise werden nachgewiesen durch:', 112, 8.6, 14);
    $checkbox($p, 34, $y - 2, $data['identityProofType'] === 'birth-documents'); $text($p, 66, $y, 'Geburtsurkunde', 8.8); $y -= 18;
    $checkbox($p, 34, $y - 2, $data['identityProofType'] === 'identity-card'); $text($p, 66, $y, 'Kopie eines anderen amtlichen Dokumentes', 8.8); $y -= 18;
    $checkbox($p, 34, $y - 2, $data['identityProofType'] === 'send-separately'); $text($p, 66, $y, 'Bestätigung einer Behörde auf dem Antrag', 8.8); $y -= 20;
    $line($p, 34, $y, 561, $y, 1.1); $y -= 25;

    $checkbox($p, 34, $y - 2, $data['international']);
    $text($p, 66, $y, 'Bei erstmaliger Spielerlaubnis für aus dem Ausland kommende Spieler/-in ist zusätzlich anzugeben:', 8.8, 'F2'); $y -= 18;
    $text($p, 34, $y, 'Letzter Wohnort im Ausland: ' . $fit($data['lastForeignResidence'], 68), 8.8); $y -= 18;
    $text($p, 34, $y, 'Name und Vorname beider Eltern: ' . $fit($data['parentsNames'], 65), 8.8); $y -= 18;
    $text($p, 34, $y, 'Kopie Personalausweise oder Reisepass: ' . ($data['international'] ? 'beigefügt' : ''), 8.8); $y -= 18;
    $text($p, 34, $y, 'Für einige Länder und Nationalitäten sind eventuell weitere persönliche Angaben bzw. Formulare erforderlich (siehe sbfv.de).', 8.3); $y -= 20;
    $line($p, 34, $y, 561, $y, 1.1); $y -= 25;

    $checkbox($p, 34, $y - 2, $data['registrationType'] === 'club-change'); $text($p, 66, $y, 'Vereinswechsel', 9.2, 'F2'); $y -= 18;
    $text($p, 34, $y, 'Wir beantragen für o. g. Spieler/in Spielerlaubnis.', 8.8); $y -= 34;
    $text($p, 34, $y, 'Bisheriger Verein: ' . $fit($data['previousClub'], 75), 8.8); $y -= 18;
    $paragraph($p, 34, $y, 'Beizufügen ist bei einem Wohnsitzwechsel von Jugendlichen (§ 8 Ziffer 1 d Jugendordnung) amtliche Bescheinigung, wann der Wohnsitzwechsel erfolgte (Dieser darf nicht länger als 3 Monate zurückliegen).', 112, 8.1, 12); $y -= 10;
    $paragraph($p, 34, $y, 'Der Spieler erklärt mit seiner Unterschrift, dass er sich beim bisherigen Verein als aktiver Spieler abmeldet oder online stellvertretend abgemeldet werden darf.', 112, 8.3, 13); $y -= 5;
    $text($p, 34, $y, 'Ist der Spieler zurzeit gesperrt? ' . ($data['currentlySuspended'] === 'yes' ? 'Ja' : ($data['currentlySuspended'] === 'no' ? 'Nein' : '')), 8.6); $y -= 18;
    $text($p, 34, $y, 'Wenn ja, von wann bis wann? ' . $fit($data['suspensionPeriod'], 65), 8.6); $y -= 26;
    $checkbox($p, 34, $y - 2, false); $text($p, 66, $y, 'Ausbildungs- und Förderungsentschädigung wurde bezahlt.', 8.6); $y -= 20;
    $line($p, 34, $y, 561, $y, 1.1); $y -= 25;
    $checkbox($p, 34, $y - 2, $data['registrationType'] === 're-registration'); $text($p, 66, $y, 'Wiederanmeldung', 9.2, 'F2'); $y -= 20;
    $line($p, 34, $y, 561, $y, 1.1);

    $p =& $pages[1]; $y = 800;
    $text($p, 34, $y, 'Erklärungen zum Spielerfoto', 9.2, 'F2'); $y -= 18;
    $paragraph($p, 34, $y, 'Für die ordnungsgemäße Durchführung des Spielbetriebs, insbesondere zur Prüfung der Spielberechtigung (sog. digitaler Spielerpass) ist ein Lichtbild der Spielerin bzw. des Spielers zwingend erforderlich. Das Lichtbild wird durch den Verein an den Verband übermittelt und im Auftrag des Verbands in einem von der DFB GmbH für den gesamten deutschen Fußball betriebenen IT-System (DFBnet) gespeichert.', 112, 8.3, 12); $y -= 18;
    $paragraph($p, 34, $y, 'Die Spielerin bzw. der Spieler räumt dem Verein sowie dem Verband das einfache, räumlich unbegrenzte und auf die Dauer der rechtmäßigen Verarbeitung begrenzte Nutzungsrecht an diesem Foto ein, damit diese das Foto zum vorgenannten Zwecke verwenden können. Die Spielerin bzw. der Spieler erklärt, über die dafür erforderlichen Nutzungsrechte zu verfügen, soweit er das Foto nicht selbst hergestellt hat.', 112, 8.3, 12); $y -= 18;
    $checkbox($p, 34, $y - 3, false);
    $paragraph($p, 66, $y, 'Hiermit willigt der Spieler - im Fall von Minderjährigen zusätzlich der/die gesetzliche/n Vertreter - ein, dass das für den Spielerpass zur Verfügung gestellte Lichtbild auch zur Veröffentlichung auf den Internet-Seiten des Vereins und Verbandes und auf der Online-Plattform des Amateurfußballs FUSSBALL.de, einschliesslich der damit verbundenen mobilen Angebote und Druckerzeugnisse im Rahmen von Mannschaftslisten, Spielberichten oder Livetickern verwendet werden darf. Diese Einwilligung ist jederzeit ohne Angabe von Gründen widerrufbar. Der Widerruf ist an den eigenen Verein zu richten oder kann nach einer entsprechenden Selbstregistrierung über www.fussball.de online durchgeführt werden.', 105, 8.0, 12); $y -= 8;
    $line($p, 34, $y, 561, $y, 1.1); $y -= 24;
    $text($p, 34, $y, 'Datenschutzerklärung:', 9.2, 'F2'); $y -= 18;
    $paragraph($p, 34, $y, 'Die personenbezogenen Daten dieses Antrags werden an den SBFV übermittelt. Der SBFV ist berechtigt, die personenbezogenen Daten unter Wahrung der gesetzlichen datenschutzrechtlichen Bestimmungen zum Zwecke der Organisation und Durchführung des Spielbetriebs sowie anderer Bereiche des Fußballs, elektronisch zu erfassen und in dem gemeinsam mit dem DFB und seinen Mitgliedsverbänden betriebenen einheitlichen und verbandsübergreifenden Verwaltungssystem DFBnet zu speichern. Die Datenerfassung dient vornehmlich der Verbesserung und Vereinfachung der spieltechnischen und organisatorischen Abläufe im Verband, sowie im Verhältnis zum DFB und dessen Mitgliedsverbänden, der Schaffung direkter Kommunikationswege zwischen Mitgliedern, Vereinen und Verbänden sowie zum DFB und dessen Mitgliedsverbänden und der Erhöhung der Datenqualität für Auswertungen und Statistiken.', 112, 8.0, 11.5); $y -= 16;
    $paragraph($p, 34, $y, 'Die nachstehend aufgelisteten allgemein zugänglichen Daten zu Spielen und Spielereignisse werden in Internetportalen und anderen Medien z.B. auf den Internet-Seiten des Vereins und Verbands und auf der Online-Plattform des Amateurfußballs „FUSSBALL.DE“, einschliesslich der hiermit verbundenen mobilen Angebote im Rahmen der Spielberichte veröffentlicht. Außerdem können diese Daten an die Verleger von Druckwerken sowie Anbieter von Online-Medien zum Zwecke der Berichterstattung über Amateur- und Profifußball übermittelt werden. Hierzu gehören Name und Vorname des Spielers u.a. in Mannschaftsaufstellungen und Mannschaftskadern, Torschüsse, Auswechselungen, Karten. Ausserdem werden diverse Statistiken, wie z.B. Torschützenlisten veröffentlicht.', 112, 8.0, 11.5); $y -= 16;
    $paragraph($p, 34, $y, 'Bei Kindern und Jugendlichen unter 16 Jahren erfolgt die Veröffentlichung und Übermittlung nur, wenn der/die gesetzliche/n Vertreter ausdrücklich seine/ihre Zustimmung zur Veröffentlichung gegeben hat/haben (siehe Zusatzerklärung für Minderjährige).', 112, 8.0, 11.5); $y -= 16;
    $checkbox($p, 34, $y - 3, $data['playerDataAccepted']);
    $paragraph($p, 66, $y, 'Ich willige bzw. (im Falle des gemeinsamen Sorgerechts) wir willigen ein, dass Vor- und Nachname der Spielerin bzw. des Spielers, sowie die Spielberichtsdaten (insbes. Aufstellung, Ein-/Auswechselungen, Karten, erzielte Tore, sonstige Spielereignisse) einschliesslich statistischer Auswertungen über diese Daten verarbeitet werden dürfen (z.B. Veröffentlichung auf FUSSBALL.DE).', 105, 8.0, 11.5); $y -= 12;
    $paragraph($p, 34, $y, 'WIDERSPRUCHSRECHT: Der Spieler oder der/die gesetzliche/n Vertreter kann/können der Veröffentlichung jederzeit widersprechen. Der Widerspruch muss gegenüber dem eigenen Verein erfolgen oder kann nach einer entsprechenden Selbstregistrierung über FUSSBALL.DE online durchgeführt werden.', 112, 8.0, 11.5, 'F3');
    $paragraph($p, 34, $y, 'Detaillierte Informationen zur Datenverarbeitung im DFBnet, sowie weitergehende Datenschutzinformationen zur FIFA Connect ID finden Sie unter: www.sbfv.de/fussball/formulare-passstelle', 112, 8.0, 11.5); $y -= 8;
    $line($p, 34, $y, 561, $y, 1.1); $y -= 23;
    $checkbox($p, 34, $y - 3, $data['marketingAccepted']);
    $paragraph($p, 66, $y, 'Der unterzeichnende Spieler - bei Minderjährigen der/die gesetzliche/n Vertreter - stimmt der Nutzung seiner Adressdaten für Marketingzwecken, insbesondere für Angebote des DFB, seiner Verbände sowie Partner zu. Diese Einwilligung ist jederzeit ohne Angabe von Gründen widerrufbar.', 105, 8.0, 11.5);

    $p =& $pages[2]; $line($p, 34, 808, 561, 808, 1.1); $y = 785;
    $paragraph($p, 34, $y, 'Durch nachfolgende Unterschrift wird die Richtigkeit aller vorstehenden Angaben versichert und bestätigt, dass der Spieler Mitglied des antragstellenden Vereins ist. Soweit eine Vereinsmitgliedschaft noch nicht besteht, wird sie hiermit begründet. Spieler und Verein unterwerfen sich der Satzung und den Ordnungen des SBFV. Bei Minderjährigen bestätigt der Erziehungsberechtigte zugleich, dass der/die Jugendliche regelmäßig von einem Arzt untersucht wird.', 112, 8.5, 13); $y -= 20;
    $text($p, 34, $y, $data['signingPlace'] . ',  ' . $data['signingDateTime'], 8.8); $y -= 54;
    $line($p, 34, $y, 430, $y, 0.7); $y -= 17;
    $text($p, 34, $y, 'Stempel und Unterschrift des antragstellenden Vereins', 8.5); $y -= 86;
    $signatureY = $y + 20;
    $line($p, 34, $y, 435, $y, 0.7); $y -= 17;
    $text($p, 34, $y, 'Unterschrift des Spielers/Spielerin bei Jugendspieler Unterschrift eines gesetzlichen Vertreters', 8.2);

    $parsePng = function ($png) {
        if (substr($png, 0, 8) !== "\x89PNG\r\n\x1a\n") return null;
        $position = 8; $width = 0; $height = 0; $bitDepth = 0; $colorType = 0; $interlace = 0; $idat = '';
        while ($position + 8 <= strlen($png)) {
            $chunkLength = unpack('N', substr($png, $position, 4)); $chunkLength = $chunkLength[1];
            $name = substr($png, $position + 4, 4); $chunk = substr($png, $position + 8, $chunkLength); $position += 12 + $chunkLength;
            if ($name === 'IHDR') {
                $header = unpack('Nwidth/Nheight/Cbit/Ctype/Ccompression/Cfilter/Cinterlace', $chunk);
                $width = $header['width']; $height = $header['height']; $bitDepth = $header['bit']; $colorType = $header['type']; $interlace = $header['interlace'];
            } elseif ($name === 'IDAT') $idat .= $chunk;
            elseif ($name === 'IEND') break;
        }
        if ($width < 1 || $height < 1 || $bitDepth !== 8 || $interlace !== 0 || !in_array($colorType, array(0, 2, 4, 6), true)) return null;
        $bytesPerPixel = array(0 => 1, 2 => 3, 4 => 2, 6 => 4); $bytesPerPixel = $bytesPerPixel[$colorType];
        $raw = @gzuncompress($idat); if ($raw === false) return null;
        $stride = $width * $bytesPerPixel; $offset = 0; $previous = array_fill(0, $stride, 0); $rgb = ''; $alpha = '';
        $paeth = function ($a, $b, $c) { $p = $a + $b - $c; $pa = abs($p - $a); $pb = abs($p - $b); $pc = abs($p - $c); return $pa <= $pb && $pa <= $pc ? $a : ($pb <= $pc ? $b : $c); };
        for ($row = 0; $row < $height; $row++) {
            $filter = ord($raw[$offset++]); $scanline = substr($raw, $offset, $stride); $offset += $stride; $decoded = array();
            for ($i = 0; $i < $stride; $i++) {
                $sample = ord($scanline[$i]); $a = $i >= $bytesPerPixel ? $decoded[$i - $bytesPerPixel] : 0; $b = $previous[$i]; $c = $i >= $bytesPerPixel ? $previous[$i - $bytesPerPixel] : 0;
                if ($filter === 1) $sample = ($sample + $a) & 255;
                elseif ($filter === 2) $sample = ($sample + $b) & 255;
                elseif ($filter === 3) $sample = ($sample + intdiv($a + $b, 2)) & 255;
                elseif ($filter === 4) $sample = ($sample + $paeth($a, $b, $c)) & 255;
                elseif ($filter !== 0) return null;
                $decoded[$i] = $sample;
            }
            for ($column = 0; $column < $width; $column++) {
                $i = $column * $bytesPerPixel;
                if ($colorType === 6) { $rgb .= chr($decoded[$i]) . chr($decoded[$i + 1]) . chr($decoded[$i + 2]); $alpha .= chr($decoded[$i + 3]); }
                elseif ($colorType === 2) $rgb .= chr($decoded[$i]) . chr($decoded[$i + 1]) . chr($decoded[$i + 2]);
                elseif ($colorType === 4) { $gray = $decoded[$i]; $rgb .= chr($gray) . chr($gray) . chr($gray); $alpha .= chr($decoded[$i + 1]); }
                else { $gray = $decoded[$i]; $rgb .= chr($gray) . chr($gray) . chr($gray); }
            }
            $previous = $decoded;
        }
        return array('width' => $width, 'height' => $height, 'rgb' => gzcompress($rgb, 9), 'alpha' => $alpha !== '' ? gzcompress($alpha, 9) : null);
    };
    $signature = $parsePng($signaturePng);
    if ($signature === null) throw new Exception('Die Unterschrift konnte nicht in das PDF eingebettet werden.');

    $objects = array(
        1 => '<< /Type /Catalog /Pages 2 0 R >>',
        3 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
        4 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
        5 => '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>',
    );
    $nextId = 6; $maskId = null;
    if ($signature['alpha'] !== null) {
        $maskId = $nextId++;
        $objects[$maskId] = '<< /Type /XObject /Subtype /Image /Width ' . $signature['width'] . ' /Height ' . $signature['height'] . ' /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ' . strlen($signature['alpha']) . ">>\nstream\n" . $signature['alpha'] . "\nendstream";
    }
    $signatureId = $nextId++; $softMask = $maskId !== null ? ' /SMask ' . $maskId . ' 0 R' : '';
    $objects[$signatureId] = '<< /Type /XObject /Subtype /Image /Width ' . $signature['width'] . ' /Height ' . $signature['height'] . ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode' . $softMask . ' /Length ' . strlen($signature['rgb']) . ">>\nstream\n" . $signature['rgb'] . "\nendstream";

    $pageIds = array();
    foreach ($pages as $index => $stream) {
        if ($index === 2) {
            $targetWidth = 240; $targetHeight = min(70, $targetWidth * $signature['height'] / $signature['width']);
            $stream .= 'q ' . $targetWidth . ' 0 0 ' . $targetHeight . ' 34 ' . ($signatureY + 5) . " cm /ImSig Do Q\n";
        }
        $contentId = $nextId++; $pageId = $nextId++; $pageIds[] = $pageId . ' 0 R';
        $objects[$contentId] = '<< /Length ' . strlen($stream) . ">>\nstream\n" . $stream . "endstream";
        $xObject = $index === 2 ? ' /XObject << /ImSig ' . $signatureId . ' 0 R >>' : '';
        $objects[$pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' . $pageWidth . ' ' . $pageHeight . '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >>' . $xObject . ' >> /Contents ' . $contentId . ' 0 R >>';
    }
    $objects[2] = '<< /Type /Pages /Kids [' . implode(' ', $pageIds) . '] /Count 3 >>'; ksort($objects);
    $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; $offsets = array(0 => 0);
    foreach ($objects as $id => $object) { $offsets[$id] = strlen($pdf); $pdf .= $id . " 0 obj\n" . $object . "\nendobj\n"; }
    $xrefOffset = strlen($pdf); $maxId = max(array_keys($objects));
    $pdf .= "xref\n0 " . ($maxId + 1) . "\n0000000000 65535 f \n";
    for ($id = 1; $id <= $maxId; $id++) $pdf .= sprintf('%010d 00000 n ', isset($offsets[$id]) ? $offsets[$id] : 0) . "\n";
    $pdf .= "trailer\n<< /Size " . ($maxId + 1) . " /Root 1 0 R >>\nstartxref\n" . $xrefOffset . "\n%%EOF";
    return $pdf;
};

$proofLabels = array(
    'birth-documents' => 'Geburtsurkunde und Meldebestätigung hochgeladen',
    'identity-card' => 'Personalausweis Vorder- und Rückseite hochgeladen',
    'send-separately' => 'Unterlagen werden separat eingereicht',
);
$registrationLabels = array(
    'first-registration' => 'Erstmalige Spielberechtigung',
    'club-change' => 'Vereinswechsel',
    're-registration' => 'Wiederanmeldung',
);

if ($isFootball) {
    $pdfFilename = 'SBFV-Spielgenehmigungsantrag-' . $applicationNumber . '.pdf';
    try {
        $pdfBinary = $buildSpielgenehmigungsPdf(array(
            'lastName' => $lastName,
            'firstName' => $firstName,
            'birthDate' => $displayDate($birthDate),
            'birthPlace' => $birthPlace,
            'nationality' => $nationality,
            'gender' => $gender === 'keine-angabe' ? 'keine Angabe' : $gender,
            'street' => $street,
            'postalCode' => $postalCode,
            'city' => $city,
            'email' => (string)$email,
            'registrationType' => $registrationType,
            'identityProofType' => $identityProofType,
            'international' => $needsInternationalDocuments,
            'lastForeignResidence' => $value('lastForeignResidence'),
            'parentsNames' => $value('parentsNames'),
            'previousClub' => $value('previousClub'),
            'currentlySuspended' => $currentlySuspended,
            'suspensionPeriod' => $value('suspensionPeriod'),
            'playerDataAccepted' => $accepted('playerDataAccepted'),
            'marketingAccepted' => $accepted('marketingAccepted'),
            'signingPlace' => $signingPlace,
            'signingDateTime' => $displayDate($signingDate) . ' ' . date('H:i:s'),
        ), $signatureBinary);
    } catch (Exception $exception) {
        $respond(500, array('ok' => false, 'message' => 'Der Spielgenehmigungsantrag konnte nicht erzeugt werden: ' . $exception->getMessage()));
    }
    $pdfLabel = 'Spielgenehmigungsantrag PDF';
} else {
    $pdfFilename = 'BSV-Mitgliedsantrag-' . $applicationNumber . '.pdf';
    $pdfLines = array(
        'BSV NORDSTERN E.V. RADOLFZELL', 'Online-Mitgliedsantrag', 'Antragsnummer: ' . $applicationNumber, 'Eingang: ' . date('d.m.Y H:i:s'), '',
        'PERSOENLICHE DATEN', 'Name: ' . $firstName . ' ' . $lastName, 'Geschlecht: ' . $gender, 'Geburtsdatum: ' . $displayDate($birthDate),
        'Geburtsort: ' . $birthPlace, 'Nationalitaet: ' . $nationality, 'Anschrift: ' . $street . ', ' . $postalCode . ' ' . $city,
        'Telefon: ' . $phone, 'E-Mail: ' . $email, '',
        'E-MAIL-INFORMATIONEN',
        'Allgemeine Vereinsinformationen per E-Mail: ' . $yesNo($emailGeneralInfoAccepted),
        'Newsletter und digitale Vereinszeitschrift per E-Mail: ' . $yesNo($emailNewsletterAccepted), '',
        'MITGLIEDSCHAFT', 'Abteilung: ' . $departments[$department],
        'Unterstuetzungsbereitschaft: ' . $yesNo($value('supportWilling') === 'yes'),
        'Moegliche Unterstuetzung: ' . ($value('supportIdeas') !== '' ? $value('supportIdeas') : 'keine Angabe'), '',
        'BANKVERBINDUNG / SEPA', 'Kreditinstitut: ' . $bankName, 'BIC: ' . $bic, 'IBAN: ' . $iban, 'Kontoinhaber:in: ' . $accountHolder,
        'SEPA-Lastschriftmandat bestaetigt: Ja', '', 'BESTAETIGUNGEN', 'Beitragsordnung akzeptiert: Ja', 'Vereinssatzung akzeptiert: Ja',
        'Datenschutz akzeptiert: Ja', '', 'ABSCHLUSS', 'Ort: ' . $signingPlace, 'Datum: ' . $displayDate($signingDate), '',
        'Dieser Antrag wurde elektronisch ueber das Onlineformular des BSV Nordstern e.V. Radolfzell uebermittelt.',
    );
    $pdfBinary = $buildSimplePdf($pdfLines); $pdfLabel = 'Mitgliedsantrag PDF';
}

$pdfAttachment = array('name' => $pdfFilename, 'mime' => 'application/pdf', 'data' => $pdfBinary, 'label' => $pdfLabel);
$signatureAttachment = array('name' => 'Unterschrift-' . $applicationNumber . '.png', 'mime' => 'image/png', 'data' => $signatureBinary, 'label' => 'Unterschrift');
$allAttachments = array_merge(array($pdfAttachment, $signatureAttachment), $attachments);

$headerSafe = function ($text) { return str_replace(array("\r", "\n"), ' ', (string)$text); };
$encodedSubject = function ($subject) { return '=?UTF-8?B?' . base64_encode($subject) . '?='; };
$htmlEscape = function ($text) { return htmlspecialchars((string)$text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); };
$sendMail = function ($to, $subject, $textBody, $files, $replyTo, $htmlBody = null) use ($headerSafe, $encodedSubject) {
    $mixedBoundary = 'bsv_mixed_' . bin2hex(random_bytes(16));
    $alternativeBoundary = 'bsv_alt_' . bin2hex(random_bytes(16));
    $headers = array(
        'From: BSV Nordstern <info@bsvnordstern.de>',
        'Reply-To: ' . $headerSafe($replyTo),
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $mixedBoundary . '"',
        'X-Mailer: PHP/' . phpversion(),
    );

    $body = '--' . $mixedBoundary . "\r\n";
    if ($htmlBody !== null && $htmlBody !== '') {
        $body .= 'Content-Type: multipart/alternative; boundary="' . $alternativeBoundary . '"' . "\r\n\r\n";
        $body .= '--' . $alternativeBoundary . "\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($textBody)) . "\r\n";
        $body .= '--' . $alternativeBoundary . "\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($htmlBody)) . "\r\n";
        $body .= '--' . $alternativeBoundary . "--\r\n";
    } else {
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $body .= chunk_split(base64_encode($textBody)) . "\r\n";
    }

    foreach ($files as $file) {
        $filename = $headerSafe($file['name']);
        $body .= '--' . $mixedBoundary . "\r\n";
        $body .= 'Content-Type: ' . $file['mime'] . '; name="' . $filename . '"' . "\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= 'Content-Disposition: attachment; filename="' . $filename . '"' . "\r\n\r\n";
        $body .= chunk_split(base64_encode($file['data'])) . "\r\n";
    }
    $body .= '--' . $mixedBoundary . "--\r\n";
    return mail($to, $encodedSubject($subject), $body, implode("\r\n", $headers));
};

$emailConsentSummary =
    "Allgemeine Vereinsinformationen per E-Mail: " . $yesNo($emailGeneralInfoAccepted) . "\n" .
    "Newsletter und digitale Vereinszeitschrift per E-Mail: " . $yesNo($emailNewsletterAccepted) . "\n";

$checkboxSummary =
    "Unterstützung im Verein angeboten: " . $yesNo($value('supportWilling') === 'yes') . "\n" .
    "SEPA-Lastschriftmandat bestätigt: " . $yesNo($accepted('sepaAccepted')) . "\n" .
    "Beitragsordnung gelesen und akzeptiert: " . $yesNo($accepted('contributionAccepted')) . "\n" .
    "Vereinssatzung gelesen und akzeptiert: " . $yesNo($accepted('statutesAccepted')) . "\n" .
    "Datenschutzerklärung und Datenverarbeitung akzeptiert: " . $yesNo($accepted('privacyAccepted')) . "\n" .
    "Allgemeine Vereinsinformationen per E-Mail: " . $yesNo($emailGeneralInfoAccepted) . "\n" .
    "Newsletter und digitale Vereinszeitschrift per E-Mail: " . $yesNo($emailNewsletterAccepted) . "\n" .
    ($isFootball
        ? "Spielberichtsdaten für DFBnet und FUSSBALL.DE akzeptiert: " . $yesNo($accepted('playerDataAccepted')) . "\n" .
          "Marketing durch DFB, Verbände und Partner akzeptiert: " . $yesNo($accepted('marketingAccepted')) . "\n"
        : "Spielberichtsdaten für DFBnet und FUSSBALL.DE: nicht relevant\n" .
          "Marketing durch DFB, Verbände und Partner: nicht relevant\n");

$internalRecipient = 'jerome.ernsberger@gmail.com';
$internalSubject = 'BSV Mitgliedsantrag ' . $applicationNumber . ': ' . $firstName . ' ' . $lastName;
$internalBody = "Neuer Online-Mitgliedsantrag beim BSV Nordstern\n\n" .
    "Antragsnummer: {$applicationNumber}\n" .
    "Mitglied: {$firstName} {$lastName}\n" .
    "Geburtsdatum: " . $displayDate($birthDate) . "\n" .
    "Abteilung: {$departments[$department]}\n" .
    "Anschrift: {$street}, {$postalCode} {$city}\n" .
    "E-Mail: {$email}\n" .
    "Telefon: {$phone}\n\n" .
    "ANTWORTEN AUF SÄMTLICHE CHECKBOXEN\n" .
    $checkboxSummary . "\n" .
    ($value('supportIdeas') !== '' ? "Hinweise zur angebotenen Unterstützung: " . $value('supportIdeas') . "\n\n" : '') .
    ($isYouthFootball ? "Kontaktperson: {$guardianFirstName} {$guardianLastName}\nTelefon Kontaktperson: " . ($guardianPhone !== '' ? $guardianPhone : 'nicht angegeben') . "\n\n" : '') .
    "Bank: {$bankName}\nBIC: {$bic}\nIBAN: {$iban}\nKontoinhaber: {$accountHolder}\n\n" .
    ($isFootball ? "Spielgenehmigung: {$registrationLabels[$registrationType]}\nIdentitätsnachweis: {$proofLabels[$identityProofType]}\n\n" : '') .
    "Das PDF, die Unterschrift und alle hochgeladenen Unterlagen sind beigefügt.\n";

if (!$sendMail($internalRecipient, $internalSubject, $internalBody, $allAttachments, (string)$email)) {
    $respond(500, array('ok' => false, 'message' => 'Der Versand ist momentan nicht möglich. Bitte versuche es später erneut.'));
}

$siteBase = 'https://gerinjo.github.io/bsv-website';
$memberName = trim($firstName . ' ' . $lastName);
$departmentName = $departments[$department];
$isMinor = $age < 18;
$supportAccepted = $value('supportWilling') === 'yes';
$greeting = $isMinor
    ? 'Hallo ' . $firstName . ', hallo Familie ' . $lastName . ','
    : 'Hallo ' . $memberName . ',';
$escapedGreeting = $htmlEscape($greeting);
$escapedFirstName = $htmlEscape($firstName);
$escapedMemberName = $htmlEscape($memberName);
$escapedDepartment = $htmlEscape($departmentName);
$escapedApplicationNumber = $htmlEscape($applicationNumber);

$departmentPaths = array(
    'youth-football' => '/jugend/',
    'adult-football' => '/fussball/',
    'archery' => '/abteilungen/bogensport/',
    'gymnastics' => '/abteilungen/gymnastik/',
    'hiking' => '/abteilungen/wandergruppe/',
    'passive' => '/verein/',
);
$departmentUrl = $siteBase . $departmentPaths[$department];

$teamShopUrl = 'https://team.jako.com/de-de/team/bsv_nordstern_radolfzell';
$youthSetsUrl = 'https://team.jako.com/de-de/team/bsv_nordstern_radolfzell/jugend_sets/';
$youthSetImageUrl = $siteBase . '/images/verein/jugend/bsv-jugend-set.png';

$linkButton = function ($label, $url) use ($htmlEscape) {
    return '<a href="' . $htmlEscape($url) . '" style="display:inline-block;margin:0 8px 10px 0;padding:12px 16px;background:#f4d638;color:#092f20;text-decoration:none;font-weight:700;border-radius:4px;">' . $htmlEscape($label) . '</a>';
};
$textLink = function ($label, $url) {
    return $label . ': ' . $url . "\n";
};

$applicantSubject = 'Willkommen beim BSV – Antrag von ' . $memberName . ' eingegangen';
$applicantText = $greeting . "\n\n" .
    "herzlich willkommen beim BSV Nordstern e.V. Radolfzell!\n\n" .
    "Dein Online-Mitgliedsantrag ist erfolgreich bei uns eingegangen.\n" .
    "Antragsnummer: {$applicationNumber}\n" .
    "Abteilung: {$departmentName}\n\n" .
    ($isFootball
        ? "Im Anhang findest du den ausgefüllten Spielgenehmigungsantrag und die erfasste Unterschrift.\n"
        : "Im Anhang findest du den erzeugten Mitgliedsantrag und die erfasste Unterschrift.\n") .
    "Wir prüfen den Antrag nun. Falls Angaben oder Unterlagen fehlen, melden wir uns über die angegebenen Kontaktdaten. Die endgültige Aufnahme und beim Fußball die Spielberechtigung erfolgen nach Abschluss der Prüfung.\n\n" .
    "WILLKOMMEN IN DER BSV-FAMILIE\n" .
    "Der BSV Nordstern ist ein Sportverein mit starkem Familien- und Gemeinschaftsgedanken. Bei uns geht es nicht nur um Training, Spiele und Ergebnisse. Kinder, Jugendliche, Erwachsene und Familien sollen sich wohlfühlen und das Vereinsleben gemeinsam gestalten.\n\n" .
    "WAS DU BEKOMMST\n" .
    "- regelmäßiges Training und sportliche Entwicklung\n" .
    "- engagierte Trainerinnen, Trainer und Betreuende\n" .
    "- Spiele, Turniere, Camps und weitere Veranstaltungen\n" .
    "- eine starke Gemeinschaft rund um Mannschaft und Verein\n" .
    "- Möglichkeiten, dich auch außerhalb des Platzes einzubringen\n\n" .
    "WAS WIR VONEINANDER ERWARTEN\n" .
    "- Training und Spiele zuverlässig zu- oder absagen\n" .
    "- Trainerteams bei der Organisation unterstützen\n" .
    "- respektvoll mit Mitspielenden, Gegnern, Schiedsrichtern und Ehrenamtlichen umgehen\n" .
    "- bei Veranstaltungen, Arbeitseinsätzen oder in der Backstube mithelfen\n" .
    "- wichtige Mitteilungen des Vereins und der Mannschaft beachten\n\n" .
    ($supportAccepted
        ? "Vielen Dank, dass du im Antrag deine Bereitschaft zur Unterstützung angegeben hast. Wir kommen bei Gelegenheit darauf zurück.\n\n"
        : "Jede Unterstützung hilft – ganz gleich, ob regelmäßig oder nur bei einzelnen Veranstaltungen.\n\n");

if ($isFootball) {
    $applicantText .= "MANNSCHAFTSORGANISATION\n" .
        "Das Trainerteam informiert dich darüber, welche Anwendung oder Gruppe für deine Mannschaft genutzt wird. Bitte sage dort möglichst frühzeitig zu oder ab. Das erleichtert den ehrenamtlichen Trainerinnen und Trainern die Planung erheblich.\n\n" .
        "VEREINSKLEIDUNG\n" .
        ($isMinor
            ? "Gerade im Kinder- und Jugendbereich möchten wir uns im Training und beim Spiel einheitlich präsentieren. Deshalb empfehlen wir, ein passendes BSV-Jugend-Set zu kaufen.\n"
            : "Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im BSV-Teamshop findest du unsere Vereinskollektion.\n") .
        $textLink('BSV-Teamshop', $teamShopUrl) .
        ($isMinor ? $textLink('Jugend-Sets', $youthSetsUrl) : '') . "\n" .
        "WHATSAPP-COMMUNITY\n" .
        "Das Trainerteam fügt dich beziehungsweise deine Familie normalerweise der WhatsApp-Gruppe der Mannschaft hinzu. Sie ist Teil der BSV-WhatsApp-Community. Über die Ankündigungsgruppe informieren wir über Veranstaltungen, Versammlungen, Shop-Aktionen, Termine und organisatorische Änderungen. Bitte bleibe in dieser Gruppe, damit keine wichtigen Informationen verloren gehen.\n\n";
}

$applicantText .= "DEN VEREIN KENNENLERNEN\n" .
    $textLink('Deine Abteilung', $departmentUrl) .
    $textLink('Vorstandschaft', $siteBase . '/verein/vorstandschaft/') .
    ($isYouthFootball ? $textLink('Jugendvorstandschaft', $siteBase . '/jugend/vorstandschaft/') : '') .
    ($isYouthFootball ? $textLink('Jugendkonzept', $siteBase . '/jugend/jugendkonzept/') : '') .
    ($isFootball ? $textLink('Vereinsspielplan', $siteBase . '/fussball/spielplan/') : '') .
    ($isFootball ? $textLink('Sportstätten und Anfahrt', $siteBase . '/fussball/sportplaetze/') : '') .
    $textLink('BSV-Homepage', $siteBase . '/') .
    ($isYouthFootball ? $textLink('Kontakt Jugendleitung', $siteBase . '/kontakt/?thema=youth') : '') .
    $textLink('Allgemeiner Kontakt', $siteBase . '/kontakt/?thema=general') . "\n" .
    "FÖRDERVEREIN\n" .
    "Der Förderverein unterstützt unter anderem Bälle, Tore, Trainingsmaterialien, Mannschaftsveranstaltungen und weitere Projekte. Jeder Beitrag kommt dem Sport und der Vereinsgemeinschaft zugute.\n" .
    $textLink('Förderverein kennenlernen', $siteBase . '/foerderverein/vorstandschaft/') .
    $textLink('Mitgliedsantrag Förderverein', $siteBase . '/foerderverein/mitglied-werden/') . "\n" .
    "DEINE AUSWAHL ZUR E-MAIL-KOMMUNIKATION\n" .
    $emailConsentSummary .
    "Die freiwilligen Einwilligungen können jederzeit widerrufen werden.\n\n" .
    "Jetzt aber auf den Platz – wir freuen uns darauf, dich kennenzulernen!\n\n" .
    "Sportliche Grüße\n" .
    "BSV Nordstern e.V. Radolfzell\n" .
    "Schlesierstraße 43, 78315 Radolfzell\n" .
    "info@bsvnordstern.de · +49 7732 910080\n";

$footballHtml = '';
if ($isFootball) {
    $footballHtml =
        '<tr><td style="padding:0 36px 28px;">' .
            '<h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Mannschaftsorganisation</h2>' .
            '<p style="margin:0 0 22px;line-height:1.65;color:#3f5146;">Das Trainerteam informiert dich darüber, welche Anwendung oder Gruppe für deine Mannschaft genutzt wird. Bitte sage dort möglichst frühzeitig zu oder ab. Das erleichtert die Planung erheblich.</p>' .
            '<h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Vereinskleidung</h2>' .
            '<p style="margin:0 0 14px;line-height:1.65;color:#3f5146;">' .
                ($isMinor
                    ? 'Gerade im Kinder- und Jugendbereich möchten wir uns im Training und beim Spiel einheitlich präsentieren. Deshalb empfehlen wir, ein passendes BSV-Jugend-Set zu kaufen.'
                    : 'Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im BSV-Teamshop findest du unsere Vereinskollektion.') .
            '</p>' .
            $linkButton('BSV-Teamshop öffnen', $teamShopUrl) .
            ($isMinor ? $linkButton('Jugend-Sets ansehen', $youthSetsUrl) : '') .
            ($isMinor
                ? '<div style="margin-top:14px;padding:16px;background:#f8faf8;border:1px solid #dfe7df;border-radius:6px;">' .
                    '<p style="margin:0 0 12px;line-height:1.6;color:#3f5146;"><strong>Empfohlenes BSV-Jugend-Set</strong><br>Trikot, Polyesterjacke, Polyesterhose, Allwetterjacke, Rucksack und Stutzen.</p>' .
                    '<a href="' . $htmlEscape($youthSetsUrl) . '" style="text-decoration:none;">' .
                        '<img src="' . $htmlEscape($youthSetImageUrl) . '" alt="BSV-Jugend-Set" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:5px;">' .
                    '</a>' .
                '</div>'
                : '') .
        '</td></tr>' .
        '<tr><td style="padding:28px 36px;background:#f3f6f3;">' .
            '<h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">WhatsApp-Community</h2>' .
            '<p style="margin:0;line-height:1.65;color:#3f5146;">Das Trainerteam fügt dich beziehungsweise deine Familie normalerweise der Mannschaftsgruppe hinzu. Über die Ankündigungsgruppe erhältst du wichtige Informationen zu Veranstaltungen, Versammlungen, Aktionen, Terminen und organisatorischen Änderungen. Bitte bleibe in dieser Gruppe, damit keine wichtigen Informationen verloren gehen.</p>' .
        '</td></tr>';
}

$supportHtml = $supportAccepted
    ? '<p style="margin:16px 0 0;padding:14px 16px;background:#fff8cf;border-left:4px solid #f4d638;line-height:1.6;color:#304239;"><strong>Danke für deine Unterstützung!</strong><br>Du hast im Antrag deine Bereitschaft angegeben. Wir kommen bei Gelegenheit darauf zurück.</p>'
    : '<p style="margin:16px 0 0;line-height:1.6;color:#3f5146;">Jede Unterstützung hilft – ganz gleich, ob regelmäßig oder nur bei einzelnen Veranstaltungen.</p>';

$linkButtonsHtml =
    $linkButton('Deine Abteilung', $departmentUrl) .
    $linkButton('Vorstandschaft', $siteBase . '/verein/vorstandschaft/') .
    ($isYouthFootball ? $linkButton('Jugendvorstandschaft', $siteBase . '/jugend/vorstandschaft/') : '') .
    ($isYouthFootball ? $linkButton('Jugendkonzept', $siteBase . '/jugend/jugendkonzept/') : '') .
    ($isFootball ? $linkButton('Vereinsspielplan', $siteBase . '/fussball/spielplan/') : '') .
    ($isFootball ? $linkButton('Sportstätten & Anfahrt', $siteBase . '/fussball/sportplaetze/') : '') .
    $linkButton('BSV-Homepage', $siteBase . '/') .
    ($isYouthFootball ? $linkButton('Kontakt Jugendleitung', $siteBase . '/kontakt/?thema=youth') : '') .
    $linkButton('Allgemeiner Kontakt', $siteBase . '/kontakt/?thema=general');

$applicantHtml = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>' .
'<body style="margin:0;padding:0;background:#eef2ee;font-family:Arial,Helvetica,sans-serif;color:#17251b;">' .
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef2ee;"><tr><td align="center" style="padding:24px 12px;">' .
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-collapse:collapse;box-shadow:0 10px 35px rgba(9,47,32,.10);">' .
'<tr><td style="padding:34px 36px;background:#092f20;border-bottom:7px solid #f4d638;color:#ffffff;">' .
'<div style="font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#f4d638;font-weight:700;">BSV Nordstern e.V. Radolfzell</div>' .
'<h1 style="margin:10px 0 8px;font-size:32px;line-height:1.1;">Willkommen beim BSV!</h1>' .
'<p style="margin:0;color:#c9d9cf;">Gemeinsam auf und neben dem Platz.</p>' .
'</td></tr>' .
'<tr><td style="padding:32px 36px 24px;">' .
'<p style="margin:0 0 18px;font-size:18px;font-weight:700;color:#17251b;">' . $escapedGreeting . '</p>' .
'<p style="margin:0 0 18px;line-height:1.7;color:#3f5146;">Herzlich willkommen beim <strong>BSV Nordstern e.V. Radolfzell</strong>! Dein Online-Mitgliedsantrag ist erfolgreich bei uns eingegangen.</p>' .
'<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;background:#f3f6f3;border-left:4px solid #f4d638;"><tr><td style="padding:16px 18px;line-height:1.6;">' .
'<strong>Antragsnummer:</strong> ' . $escapedApplicationNumber . '<br>' .
'<strong>Mitglied:</strong> ' . $escapedMemberName . '<br>' .
'<strong>Abteilung:</strong> ' . $escapedDepartment .
'</td></tr></table>' .
'<p style="margin:0 0 12px;line-height:1.7;color:#3f5146;">' .
($isFootball ? 'Im Anhang findest du den ausgefüllten Spielgenehmigungsantrag und die erfasste Unterschrift.' : 'Im Anhang findest du den erzeugten Mitgliedsantrag und die erfasste Unterschrift.') .
'</p>' .
'<p style="margin:0;line-height:1.7;color:#3f5146;">Wir prüfen den Antrag nun. Falls Angaben oder Unterlagen fehlen, melden wir uns. Die endgültige Aufnahme und beim Fußball die Spielberechtigung erfolgen nach Abschluss der Prüfung.</p>' .
'</td></tr>' .
'<tr><td style="padding:28px 36px;background:#f8faf8;">' .
'<h2 style="margin:0 0 12px;color:#164f32;font-size:23px;">Willkommen in der BSV-Familie</h2>' .
'<p style="margin:0;line-height:1.7;color:#3f5146;">Der BSV Nordstern ist ein Sportverein mit starkem Familien- und Gemeinschaftsgedanken. Bei uns geht es nicht nur um Training, Spiele und Ergebnisse. Kinder, Jugendliche, Erwachsene und Familien sollen sich wohlfühlen und das Vereinsleben gemeinsam gestalten.</p>' .
'</td></tr>' .
'<tr><td style="padding:28px 36px;">' .
'<h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Was du bekommst</h2>' .
'<ul style="margin:0 0 26px;padding-left:20px;line-height:1.75;color:#3f5146;">' .
'<li>regelmäßiges Training und sportliche Entwicklung</li><li>engagierte Trainerinnen, Trainer und Betreuende</li><li>Spiele, Turniere, Camps und weitere Veranstaltungen</li><li>eine starke Gemeinschaft rund um Mannschaft und Verein</li><li>Möglichkeiten, dich auch außerhalb des Platzes einzubringen</li></ul>' .
'<h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Was wir voneinander erwarten</h2>' .
'<ul style="margin:0;padding-left:20px;line-height:1.75;color:#3f5146;">' .
'<li>Training und Spiele zuverlässig zu- oder absagen</li><li>Trainerteams bei der Organisation unterstützen</li><li>respektvoll mit Mitspielenden, Gegnern, Schiedsrichtern und Ehrenamtlichen umgehen</li><li>bei Veranstaltungen, Arbeitseinsätzen oder in der Backstube mithelfen</li><li>wichtige Mitteilungen des Vereins und der Mannschaft beachten</li></ul>' .
$supportHtml .
'</td></tr>' .
$footballHtml .
'<tr><td style="padding:28px 36px;">' .
'<h2 style="margin:0 0 14px;color:#164f32;font-size:21px;">Den Verein kennenlernen</h2>' .
'<p style="margin:0 0 16px;line-height:1.65;color:#3f5146;">Hier findest du die wichtigsten Bereiche und Ansprechpartner:</p>' .
$linkButtonsHtml .
'</td></tr>' .
'<tr><td style="padding:28px 36px;background:#092f20;color:#ffffff;">' .
'<h2 style="margin:0 0 12px;color:#f4d638;font-size:21px;">Förderverein</h2>' .
'<p style="margin:0 0 16px;line-height:1.65;color:#d3dfd7;">Der Förderverein unterstützt Bälle, Tore, Trainingsmaterialien, Mannschaftsveranstaltungen und weitere Projekte. Jeder Beitrag kommt dem Sport und der Vereinsgemeinschaft zugute.</p>' .
$linkButton('Förderverein kennenlernen', $siteBase . '/foerderverein/vorstandschaft/') .
$linkButton('Mitgliedsantrag Förderverein', $siteBase . '/foerderverein/mitglied-werden/') .
'</td></tr>' .
'<tr><td style="padding:28px 36px;">' .
'<h2 style="margin:0 0 12px;color:#164f32;font-size:21px;">Deine Auswahl zur E-Mail-Kommunikation</h2>' .
'<p style="margin:0;line-height:1.75;color:#3f5146;">Allgemeine Vereinsinformationen: <strong>' . $htmlEscape($yesNo($emailGeneralInfoAccepted)) . '</strong><br>' .
'Newsletter und digitale Vereinszeitschrift: <strong>' . $htmlEscape($yesNo($emailNewsletterAccepted)) . '</strong></p>' .
'<p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#6b786f;">Die freiwilligen Einwilligungen können jederzeit widerrufen werden.</p>' .
'</td></tr>' .
'<tr><td style="padding:30px 36px;background:#f3f6f3;border-top:1px solid #dfe7df;">' .
'<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#164f32;">Jetzt aber auf den Platz – wir freuen uns auf dich!</p>' .
'<p style="margin:0;line-height:1.7;color:#3f5146;">Sportliche Grüße<br><strong>BSV Nordstern e.V. Radolfzell</strong><br>Schlesierstraße 43 · 78315 Radolfzell<br><a href="mailto:info@bsvnordstern.de" style="color:#164f32;">info@bsvnordstern.de</a> · <a href="tel:+497732910080" style="color:#164f32;">+49 7732 910080</a></p>' .
'</td></tr>' .
'</table></td></tr></table></body></html>';

$applicantSent = $sendMail(
    (string)$email,
    $applicantSubject,
    $applicantText,
    array($pdfAttachment, $signatureAttachment),
    'info@bsvnordstern.de',
    $applicantHtml
);

$_SESSION['membership_last_submit'] = time();
$respond(200, array('ok' => true, 'applicationNumber' => $applicationNumber, 'confirmationEmailSent' => $applicantSent));
