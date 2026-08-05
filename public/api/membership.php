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

if (
    mb_strlen($lastName) < 2 || mb_strlen($firstName) < 2 ||
    !in_array($gender, $genderValues, true) ||
    !isset($departments[$department]) ||
    !preg_match('/^\d{4}-\d{2}-\d{2}$/', $birthDate) ||
    mb_strlen($birthPlace) < 2 || mb_strlen($nationality) < 2 ||
    mb_strlen($street) < 4 || mb_strlen($postalCode) < 4 ||
    mb_strlen($city) < 2 || mb_strlen($phone) < 6 || !$email
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
if ($isYouthFootball && (mb_strlen($guardianLastName) < 2 || mb_strlen($guardianFirstName) < 2)) {
    $fail('Bitte gib die Kontaktperson für das Jugendmitglied vollständig an.');
}

$bankName = $value('bankName');
$bic = strtoupper(preg_replace('/\s+/', '', $value('bic')));
$iban = strtoupper(preg_replace('/\s+/', '', $value('iban')));
$accountHolder = $value('accountHolder');

$ibanValid = function ($candidate) {
    if (!preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $candidate)) {
        return false;
    }
    $rearranged = substr($candidate, 4) . substr($candidate, 0, 4);
    $numeric = '';
    for ($i = 0, $length = strlen($rearranged); $i < $length; $i++) {
        $character = $rearranged[$i];
        $numeric .= ctype_alpha($character) ? (string)(ord($character) - 55) : $character;
    }
    $remainder = 0;
    for ($i = 0, $length = strlen($numeric); $i < $length; $i++) {
        $remainder = ($remainder * 10 + (int)$numeric[$i]) % 97;
    }
    return $remainder === 1;
};

if (mb_strlen($bankName) < 2 || !preg_match('/^[A-Z0-9]{8}([A-Z0-9]{3})?$/', $bic) || !$ibanValid($iban) || mb_strlen($accountHolder) < 2) {
    $fail('Bitte prüfe die Bankverbindung. IBAN und BIC müssen vollständig und gültig sein.');
}
if (!$accepted('sepaAccepted') || !$accepted('contributionAccepted') || !$accepted('statutesAccepted') || !$accepted('privacyAccepted')) {
    $fail('Bitte bestätige SEPA-Mandat, Beitragsordnung, Satzung und Datenschutz.');
}

$signingPlace = $value('signingPlace');
$signingDate = $value('signingDate');
if (mb_strlen($signingPlace) < 2 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $signingDate)) {
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
        $fail('Für die Spielberechtigung muss die Verarbeitung von Spielerfoto und Spielberichtsdaten bestätigt werden.');
    }
    if ($registrationType === 'club-change') {
        if (mb_strlen($value('previousClub')) < 2 || !in_array($currentlySuspended, array('yes', 'no'), true)) {
            $fail('Bitte vervollständige die Angaben zum Vereinswechsel.');
        }
        if ($currentlySuspended === 'yes' && mb_strlen($value('suspensionPeriod')) < 5) {
            $fail('Bitte gib den Zeitraum der Sperre an.');
        }
    }
}

$normalizedNationality = mb_strtolower($nationality, 'UTF-8');
$isGerman = in_array($normalizedNationality, array('deutsch', 'deutsche', 'deutschland', 'german'), true);
$needsInternationalDocuments = $isFootball && !$isGerman && $age >= 10 && $age < 18;
if ($needsInternationalDocuments && (mb_strlen($value('lastForeignResidence')) < 2 || mb_strlen($value('parentsNames')) < 5)) {
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
    if (!isset($_FILES[$field])) {
        return array();
    }
    $file = $_FILES[$field];
    if (!is_array($file['name'])) {
        return array($file);
    }
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
    &$totalUploadBytes,
    &$attachments,
    $allowedMimes,
    $cleanFilename,
    $normalizeFiles,
    $fail
) {
    $files = $normalizeFiles($field);
    $usableFiles = array_filter($files, function ($file) {
        return isset($file['error']) && $file['error'] !== UPLOAD_ERR_NO_FILE;
    });

    if ($required && count($usableFiles) === 0) {
        $fail('Bitte lade die erforderliche Datei „' . $label . '“ hoch.');
    }
    if (!$multiple && count($usableFiles) > 1) {
        $fail('Für „' . $label . '“ darf nur eine Datei hochgeladen werden.');
    }

    $number = 0;
    foreach ($usableFiles as $file) {
        $number++;
        if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
            $fail('Die Datei „' . $label . '“ konnte nicht hochgeladen werden.');
        }
        if ((int)$file['size'] <= 0 || (int)$file['size'] > 5 * 1024 * 1024) {
            $fail('Die Datei „' . $label . '“ darf maximal 5 MB groß sein.');
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : false;
        $mime = $finfo ? finfo_file($finfo, $file['tmp_name']) : mime_content_type($file['tmp_name']);
        if ($finfo) {
            finfo_close($finfo);
        }
        if ($mime === 'application/octet-stream' && in_array($extension, array('heic', 'heif'), true)) {
            $mime = $extension === 'heic' ? 'image/heic' : 'image/heif';
        }
        if (!isset($allowedMimes[$mime])) {
            $fail('Die Datei „' . $label . '“ hat ein nicht unterstütztes Format.');
        }

        $data = file_get_contents($file['tmp_name']);
        if ($data === false) {
            $fail('Die Datei „' . $label . '“ konnte nicht gelesen werden.');
        }
        $totalUploadBytes += strlen($data);
        if ($totalUploadBytes > 15 * 1024 * 1024) {
            $fail('Die Anhänge sind insgesamt zu groß. Bitte reduziere die Dateigröße auf zusammen höchstens 15 MB.');
        }

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
    $readUploads('playerPhoto', 'Spielerfoto', true);
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
$pdfFilename = 'BSV-Mitgliedsantrag-' . $applicationNumber . '.pdf';

$yesNo = function ($condition) {
    return $condition ? 'Ja' : 'Nein';
};
$displayDate = function ($date) {
    $parsed = DateTime::createFromFormat('!Y-m-d', $date);
    return $parsed ? $parsed->format('d.m.Y') : $date;
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

$pdfLines = array(
    'BSV NORDSTERN E.V. RADOLFZELL',
    'Online-Mitgliedsantrag',
    'Antragsnummer: ' . $applicationNumber,
    'Eingang: ' . date('d.m.Y H:i:s'),
    '',
    'PERSOENLICHE DATEN',
    'Name: ' . $firstName . ' ' . $lastName,
    'Geschlecht: ' . $gender,
    'Geburtsdatum: ' . $displayDate($birthDate),
    'Geburtsort: ' . $birthPlace,
    'Nationalitaet: ' . $nationality,
    'Anschrift: ' . $street . ', ' . $postalCode . ' ' . $city,
    'Telefon: ' . $phone,
    'E-Mail: ' . $email,
    '',
    'MITGLIEDSCHAFT',
    'Abteilung: ' . $departments[$department],
);

if ($isYouthFootball) {
    $pdfLines[] = 'Kontaktperson: ' . $guardianFirstName . ' ' . $guardianLastName;
    $pdfLines[] = 'Verhaeltnis: ' . ($guardianRelation !== '' ? $guardianRelation : 'nicht angegeben');
    $pdfLines[] = 'Telefon Kontaktperson: ' . ($guardianPhone !== '' ? $guardianPhone : 'nicht angegeben');
}

$pdfLines = array_merge($pdfLines, array(
    'Unterstuetzungsbereitschaft: ' . $yesNo($value('supportWilling') === 'yes'),
    'Moegliche Unterstuetzung: ' . ($value('supportIdeas') !== '' ? $value('supportIdeas') : 'keine Angabe'),
    '',
    'BANKVERBINDUNG / SEPA',
    'Kreditinstitut: ' . $bankName,
    'BIC: ' . $bic,
    'IBAN: ' . $iban,
    'Kontoinhaber:in: ' . $accountHolder,
    'SEPA-Lastschriftmandat bestaetigt: Ja',
    '',
    'BESTAETIGUNGEN',
    'Beitragsordnung akzeptiert: Ja',
    'Vereinssatzung akzeptiert: Ja',
    'Datenschutz akzeptiert: Ja',
));

if ($isFootball) {
    $pdfLines = array_merge($pdfLines, array(
        '',
        'SPIELGENEHMIGUNG',
        'Identitaetsnachweis: ' . $proofLabels[$identityProofType],
        'Antragsart: ' . $registrationLabels[$registrationType],
        'Spielerfoto/DFBnet/FUSSBALL.DE Einwilligung: Ja',
        'Marketing-Einwilligung: ' . $yesNo($accepted('marketingAccepted')),
    ));
    if ($registrationType === 'club-change') {
        $pdfLines[] = 'Bisheriger Verein: ' . $value('previousClub');
        $pdfLines[] = 'Derzeit gesperrt: ' . ($currentlySuspended === 'yes' ? 'Ja' : 'Nein');
        if ($currentlySuspended === 'yes') {
            $pdfLines[] = 'Sperrzeitraum: ' . $value('suspensionPeriod');
        }
    }
    if ($needsInternationalDocuments) {
        $pdfLines[] = 'Internationale Freigabe erforderlich: Ja';
        $pdfLines[] = 'Letzter Wohnort im Ausland: ' . $value('lastForeignResidence');
        $pdfLines[] = 'Namen beider Eltern: ' . $value('parentsNames');
    }
}

$uploadedLabels = array();
foreach ($attachments as $attachment) {
    $uploadedLabels[] = $attachment['label'];
}
$pdfLines = array_merge($pdfLines, array(
    '',
    'ANLAGEN',
    count($uploadedLabels) > 0 ? implode(', ', $uploadedLabels) : 'Keine Anlagen erforderlich',
    'Unterschrift: als separate PNG-Datei beigefuegt',
    '',
    'ABSCHLUSS',
    'Ort: ' . $signingPlace,
    'Datum: ' . $displayDate($signingDate),
    '',
    'Dieser Antrag wurde elektronisch ueber das Onlineformular des BSV Nordstern e.V. Radolfzell uebermittelt.',
));

$pdfEscape = function ($text) {
    $encoded = function_exists('iconv') ? iconv('UTF-8', 'Windows-1252//TRANSLIT', $text) : $text;
    if ($encoded === false) {
        $encoded = preg_replace('/[^\x20-\x7E]/', '?', $text);
    }
    return str_replace(array('\\', '(', ')'), array('\\\\', '\\(', '\\)'), $encoded);
};

$buildPdf = function ($lines) use ($pdfEscape) {
    $wrapped = array();
    foreach ($lines as $line) {
        if ($line === '') {
            $wrapped[] = '';
            continue;
        }
        $parts = explode("\n", wordwrap($line, 88, "\n", true));
        foreach ($parts as $part) {
            $wrapped[] = $part;
        }
    }
    $pages = array_chunk($wrapped, 48);
    if (count($pages) === 0) {
        $pages = array(array(''));
    }

    $objects = array();
    $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    $objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

    $pageIds = array();
    foreach ($pages as $index => $pageLines) {
        $contentId = 4 + ($index * 2);
        $pageId = 5 + ($index * 2);
        $pageIds[] = $pageId . ' 0 R';

        $stream = "BT\n/F1 10 Tf\n48 790 Td\n14 TL\n";
        foreach ($pageLines as $line) {
            $stream .= '(' . $pdfEscape($line) . ") Tj\nT*\n";
        }
        $stream .= "ET";
        $objects[$contentId] = '<< /Length ' . strlen($stream) . " >>\nstream\n" . $stream . "\nendstream";
        $objects[$pageId] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ' . $contentId . ' 0 R >>';
    }
    $objects[2] = '<< /Type /Pages /Kids [' . implode(' ', $pageIds) . '] /Count ' . count($pageIds) . ' >>';
    ksort($objects);

    $pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    $offsets = array(0 => 0);
    foreach ($objects as $id => $object) {
        $offsets[$id] = strlen($pdf);
        $pdf .= $id . " 0 obj\n" . $object . "\nendobj\n";
    }

    $xrefOffset = strlen($pdf);
    $maxId = max(array_keys($objects));
    $pdf .= "xref\n0 " . ($maxId + 1) . "\n";
    $pdf .= "0000000000 65535 f \n";
    for ($id = 1; $id <= $maxId; $id++) {
        $offset = isset($offsets[$id]) ? $offsets[$id] : 0;
        $pdf .= sprintf('%010d 00000 n ', $offset) . "\n";
    }
    $pdf .= "trailer\n<< /Size " . ($maxId + 1) . " /Root 1 0 R >>\n";
    $pdf .= "startxref\n" . $xrefOffset . "\n%%EOF";
    return $pdf;
};

$pdfBinary = $buildPdf($pdfLines);
$pdfAttachment = array(
    'name' => $pdfFilename,
    'mime' => 'application/pdf',
    'data' => $pdfBinary,
    'label' => 'Mitgliedsantrag PDF',
);
$signatureAttachment = array(
    'name' => 'Unterschrift-' . $applicationNumber . '.png',
    'mime' => 'image/png',
    'data' => $signatureBinary,
    'label' => 'Unterschrift',
);
$allAttachments = array_merge(array($pdfAttachment, $signatureAttachment), $attachments);

$headerSafe = function ($text) {
    return str_replace(array("\r", "\n"), ' ', (string)$text);
};
$encodedSubject = function ($subject) {
    return '=?UTF-8?B?' . base64_encode($subject) . '?=';
};
$sendMail = function ($to, $subject, $textBody, $files, $replyTo) use ($headerSafe, $encodedSubject) {
    $boundary = 'bsv_' . bin2hex(random_bytes(16));
    $headers = array(
        'From: BSV Nordstern <info@bsvnordstern.de>',
        'Reply-To: ' . $headerSafe($replyTo),
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
        'X-Mailer: PHP/' . phpversion(),
    );

    $body = '--' . $boundary . "\r\n";
    $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
    $body .= $textBody . "\r\n";

    foreach ($files as $file) {
        $filename = $headerSafe($file['name']);
        $body .= '--' . $boundary . "\r\n";
        $body .= 'Content-Type: ' . $file['mime'] . '; name="' . $filename . '"' . "\r\n";
        $body .= "Content-Transfer-Encoding: base64\r\n";
        $body .= 'Content-Disposition: attachment; filename="' . $filename . '"' . "\r\n\r\n";
        $body .= chunk_split(base64_encode($file['data'])) . "\r\n";
    }
    $body .= '--' . $boundary . "--\r\n";

    return mail($to, $encodedSubject($subject), $body, implode("\r\n", $headers));
};

$internalRecipient = 'jerome.ernsberger@gmail.com';
$internalSubject = 'BSV Mitgliedsantrag ' . $applicationNumber . ': ' . $firstName . ' ' . $lastName;
$internalBody = "Neuer Online-Mitgliedsantrag beim BSV Nordstern\n\n" .
    "Antragsnummer: {$applicationNumber}\n" .
    "Mitglied: {$firstName} {$lastName}\n" .
    "Abteilung: {$departments[$department]}\n" .
    "E-Mail: {$email}\n" .
    "Telefon: {$phone}\n\n" .
    "Das PDF, die Unterschrift und alle hochgeladenen Unterlagen sind beigefügt.\n";

if (!$sendMail($internalRecipient, $internalSubject, $internalBody, $allAttachments, (string)$email)) {
    $respond(500, array('ok' => false, 'message' => 'Der Versand ist momentan nicht möglich. Bitte versuche es später erneut.'));
}

$applicantSubject = 'Eingangsbestätigung Mitgliedsantrag ' . $applicationNumber;
$applicantBody = "Hallo {$firstName} {$lastName},\n\n" .
    "vielen Dank für deinen Mitgliedsantrag beim BSV Nordstern e.V. Radolfzell.\n" .
    "Deine Antragsnummer lautet: {$applicationNumber}\n\n" .
    "Im Anhang findest du den erzeugten Mitgliedsantrag sowie die erfasste Unterschrift.\n" .
    "Der Antrag wird nun geprüft. Bei Rückfragen melden wir uns über die angegebenen Kontaktdaten.\n\n" .
    "Sportliche Grüße\nBSV Nordstern e.V. Radolfzell\n";
$applicantSent = $sendMail((string)$email, $applicantSubject, $applicantBody, array($pdfAttachment, $signatureAttachment), 'info@bsvnordstern.de');

$_SESSION['membership_last_submit'] = time();
$respond(200, array(
    'ok' => true,
    'applicationNumber' => $applicationNumber,
    'confirmationEmailSent' => $applicantSent,
));
