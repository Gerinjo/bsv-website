from pathlib import Path

path = Path('public/api/membership-v3.php')
source = path.read_text(encoding='utf-8')
start_marker = '$headerSafe = function'
end_marker = "$_SESSION['membership_last_submit']"

start = source.index(start_marker)
end = source.index(end_marker, start)

replacement = r'''$headerSafe = function ($text) { return str_replace(array("\r", "\n"), ' ', (string)$text); };
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
    "Freiwillige E-Mail-Einwilligungen:\n" . $emailConsentSummary . "\n" .
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
        "Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im Vereinsshop findest du unsere Vereinskollektion.\n" .
        $textLink('BSV-Shop und Vereinskollektion', 'https://shop.bsvnordstern.de') . "\n" .
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
            '<p style="margin:0 0 14px;line-height:1.65;color:#3f5146;">Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im Vereinsshop findest du unsere Vereinskollektion.</p>' .
            $linkButton('BSV-Shop öffnen', 'https://shop.bsvnordstern.de') .
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

'''

path.write_text(source[:start] + replacement + source[end:], encoding='utf-8')
