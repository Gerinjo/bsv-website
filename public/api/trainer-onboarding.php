<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$localDev = getenv('BSV_TRAINER_LOCAL_DEV') === '1';
$allowedOrigins = array('https://bsvnordstern.de', 'https://www.bsvnordstern.de', 'https://gerinjo.github.io');
if ($localDev) $allowedOrigins = array_merge($allowedOrigins, array('http://localhost:4321', 'http://127.0.0.1:4321'));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$respond = function ($status, $data) { http_response_code($status); echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; };
if ($origin !== '' && !in_array($origin, $allowedOrigins, true)) $respond(403, array('ok' => false, 'message' => 'Diese Herkunft ist nicht zugelassen.'));
if ($origin !== '') { header('Access-Control-Allow-Origin: ' . $origin); header('Access-Control-Allow-Credentials: true'); header('Vary: Origin'); }
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { header('Access-Control-Allow-Methods: GET, POST, OPTIONS'); header('Access-Control-Allow-Headers: Accept, Content-Type'); exit; }
session_name('bsv_trainer_onboarding');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.gc_maxlifetime', '14400');
session_set_cookie_params(array('lifetime' => 0, 'path' => '/api/', 'secure' => !$localDev, 'httponly' => true, 'samesite' => $localDev ? 'Lax' : 'None'));
session_start();
require_once __DIR__ . '/trainer-onboarding-access.php';
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET' && $method !== 'POST') $respond(405, array('ok' => false, 'message' => 'Diese Anfrage ist nicht erlaubt.'));
if (($_GET['action'] ?? '') === 'access') {
    if ($method === 'GET') {
        if (bsvTrainerHasAccess($_SESSION, time())) $respond(200, array('ok' => true, 'granted' => true));
        $respond(200, array('ok' => true, 'granted' => false, 'nonce' => bsvTrainerAccessChallenge($_SESSION, time())));
    }
    if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 2048) $respond(413, array('ok' => false, 'message' => 'Die Eingabe ist zu groß.'));
    list($status, $result) = bsvTrainerUnlockAccess($_SESSION, $_POST, time());
    if ($result['granted'] ?? false) session_regenerate_id(true);
    if ($status === 429) header('Retry-After: ' . $result['retryAfter']);
    $respond($status, $result);
}
if (!bsvTrainerHasAccess($_SESSION, time())) {
    $respond(403, array('ok' => false, 'code' => 'trainer_access_required', 'message' => 'Bitte ergänze zuerst das Wort auf der Onboarding-Einstiegsseite.'));
}
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $a = random_int(2, 9); $b = random_int(1, 9);
    $_SESSION['captcha'] = array('answer' => $a + $b, 'expires' => time() + 600);
    $respond(200, array('ok' => true, 'a' => $a, 'b' => $b, 'features' => array('trainerOnboarding' => true)));
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') $respond(405, array('ok' => false, 'message' => 'Diese Anfrage ist nicht erlaubt.'));
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 15 * 1024 * 1024) $respond(413, array('ok' => false, 'message' => 'Die Unterlagen sind insgesamt zu groß.'));
$value = function ($key) { return isset($_POST[$key]) && is_string($_POST[$key]) ? trim($_POST[$key]) : ''; };
$accepted = function ($key) use ($value) { return $value($key) === 'accepted'; };
$length = function ($text) { return function_exists('mb_strlen') ? mb_strlen($text, 'UTF-8') : strlen($text); };
$fail = function ($message) use ($respond) { $respond(422, array('ok' => false, 'message' => $message)); };
if ($value('website') !== '') $respond(200, array('ok' => true));
$challenge = $_SESSION['captcha'] ?? null;
unset($_SESSION['captcha']);
$answer = filter_var($value('captchaAnswer'), FILTER_VALIDATE_INT);
if (!$challenge || $challenge['expires'] < time() || $answer === false || $challenge['answer'] !== $answer) $fail('Die Antwort beim Spamschutz ist nicht richtig oder abgelaufen.');
if (isset($_SESSION['lastSubmit']) && time() - $_SESSION['lastSubmit'] < 30) $respond(429, array('ok' => false, 'message' => 'Bitte warte kurz, bevor du erneut sendest.'));
$limits = array('firstName'=>80,'lastName'=>80,'nationality'=>120,'birthPlace'=>120,'street'=>160,'postalCode'=>5,'city'=>100,'phone'=>40,'email'=>160,'accountHolder'=>160,'bankName'=>120,'bic'=>11,'guardianFirstName'=>80,'guardianLastName'=>80,'signingPlace'=>100);
$data = array();
foreach ($limits as $key => $max) {
    $data[$key] = $value($key);
    if ($length($data[$key]) > $max || preg_match('/[\r\n\x00]/', $data[$key])) $fail('Bitte prüfe die Länge und das Format deiner Angaben.');
}
foreach (array('firstName','lastName','nationality','street','city','accountHolder','bankName') as $key) if ($length($data[$key]) < 2) $fail('Bitte fülle die persönlichen Angaben und die Kontoverbindung vollständig aus.');
if ($length($data['birthPlace']) < 2) $fail('Bitte gib deinen Geburtsort an.');
$data['gender'] = $value('gender');
if (!in_array($data['gender'], array('weiblich','männlich','divers','keine-angabe'), true)) $fail('Bitte wähle einen gültigen Eintrag für das Geschlecht.');
if (!preg_match('/^[0-9]{5}$/', $data['postalCode']) || !preg_match('/^[0-9+() \/-]{6,40}$/', $data['phone']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) $fail('Bitte prüfe Postleitzahl, Mobilnummer und E-Mail-Adresse.');
$today = new DateTimeImmutable('today', new DateTimeZone('Europe/Berlin'));
$validDate = function ($iso) use ($today) {
    $day = DateTimeImmutable::createFromFormat('!Y-m-d', $iso, new DateTimeZone('Europe/Berlin'));
    return $day && $day->format('Y-m-d') === $iso && $day <= $today ? $day : false;
};
$data['birthDate'] = $value('birthDate');
$birth = $validDate($data['birthDate']);
if (!$birth) $fail('Bitte gib ein gültiges Geburtsdatum an.');
$data['isMinor'] = $birth->diff($today)->y < 18;
try {
    $busPath = __DIR__ . '/trainer-onboarding-bus.json';
    if (!is_readable($busPath)) throw new RuntimeException('Missing bus rules');
    $busRules = json_decode(file_get_contents($busPath), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($busRules['groups'] ?? null) || !isset($busRules['version'], $busRules['minimumAge'])) throw new RuntimeException('Invalid bus rules');
} catch (Throwable $error) {
    $respond(503, array('ok'=>false, 'message'=>'Die Busregeln konnten nicht geladen werden. Bitte kontaktiere die Jugendleitung.'));
}
$data['busUse'] = $value('busUse');
if (!in_array($data['busUse'], array('yes','no'), true)) $fail('Bitte gib an, ob du den Mannschaftsbus selbst fahren möchtest.');
$data['busRules'] = $busRules;
if ($data['busUse'] === 'yes') {
    if ($birth->diff($today)->y < (int)$busRules['minimumAge']) $fail('Für die Busnutzung musst du älter als 25 Jahre sein, also mindestens 26 Jahre.');
    foreach (array('busDriverAccepted','busRulesAccepted','busLicenseProcessingAccepted') as $key) {
        if (!$accepted($key)) $fail('Bitte bestätige den gültigen Führerschein, die Busregeln und die Verarbeitung deiner Führerscheinkopien.');
    }
    if ($value('busRulesVersion') !== $busRules['version']) $fail('Die Busregeln wurden aktualisiert. Bitte lade das Formular neu und lies und bestätige die aktuelle Fassung.');
}
$data['membership'] = $value('membership');
if (!in_array($data['membership'], array('yes','no'), true)) $fail('Bitte gib an, ob du bereits Mitglied bist.');
$teams = require __DIR__ . '/trainer-onboarding-teams.php';
$team = $value('team');
if (!isset($teams[$team])) $fail('Bitte wähle eine gültige Mannschaft.');
$data['teamLabel'] = $teams[$team];
$data['teamKey'] = $team;
$data['role'] = $value('role');
if (!in_array($data['role'], array('Trainer','Co-Trainer','Betreuer'), true)) $fail('Bitte wähle deine Rolle.');
$data['contributionExempt'] = in_array($data['role'], array('Trainer','Co-Trainer'), true);
try {
    $clothing = json_decode(file_get_contents(__DIR__ . '/trainer-onboarding-clothing.json'), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($clothing['items'] ?? null) || !$clothing['items'] || !is_string($clothing['notNeededOption']['value'] ?? null) || $clothing['notNeededOption']['value'] === '') throw new RuntimeException('Invalid clothing catalog');
} catch (Throwable $error) {
    $respond(503, array('ok'=>false, 'message'=>'Die Trainerkleidung konnte nicht geladen werden. Bitte kontaktiere die Jugendleitung.'));
}
$data['clothingSet'] = $clothing['articleNumber'];
$data['clothing'] = array();
foreach ($clothing['items'] as $item) {
    $size = $value('clothing' . ucfirst($item['key']) . 'Size');
    $sizes = array_merge(...array_column($item['sizeGroups'], 'sizes'));
    $notNeeded = $size === $clothing['notNeededOption']['value'];
    if (!$notNeeded && !in_array($size, $sizes, true)) $fail('Bitte wähle eine gültige Größe oder „Benötige ich nicht“ für ' . $item['name'] . '.');
    $data['clothing'][] = array('name'=>$item['name'], 'articleNumber'=>$item['articleNumber'], 'size'=>$notNeeded ? '' : $size, 'needed'=>!$notNeeded);
}
if (!$accepted('clothingReturnAccepted')) $fail('Bitte lies und akzeptiere die Rückgaberegel für die Trainerkleidung.');
if (!$accepted('sepaAccepted')) $fail('Bitte bestätige die Einzugserklärung für fällige Mitgliedsbeiträge und deine Berechtigung für das angegebene Konto.');
try {
    $data['membershipPayment'] = json_decode(file_get_contents(__DIR__ . '/trainer-onboarding-membership.json'), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($data['membershipPayment']) || !isset($data['membershipPayment']['creditorId'], $data['membershipPayment']['mandateText'])) throw new RuntimeException('Invalid membership payment policy');
} catch (Throwable $error) {
    $respond(503, array('ok'=>false, 'message'=>'Die Angaben zum Beitragseinzug konnten nicht geladen werden. Bitte kontaktiere die Mitgliederverwaltung.'));
}
$data['iban'] = strtoupper(preg_replace('/\s+/', '', $value('iban')));
$data['bic'] = strtoupper($data['bic']);
$iban = $data['iban'];
if (!preg_match('/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/', $iban) || (str_starts_with($iban, 'DE') && !preg_match('/^DE[0-9]{20}$/', $iban))) $fail('Bitte prüfe deine IBAN.');
$remainder = 0;
foreach (str_split(substr($iban,4) . substr($iban,0,4)) as $character) {
    $digits = ctype_alpha($character) ? (string)(ord($character)-55) : $character;
    foreach (str_split($digits) as $digit) $remainder = ($remainder*10+(int)$digit)%97;
}
if ($remainder !== 1 || ($data['bic'] !== '' && !preg_match('/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/', $data['bic']))) $fail('Bitte prüfe IBAN und BIC.');
foreach (array('idProcessingAccepted','contributionAccepted','statutesAccepted','criminalRecordAccepted','privacyAccepted') as $key) if (!$accepted($key)) $fail('Bitte bestätige Ausweisverarbeitung, Beitragsordnung, Satzung, Führungszeugnis und Datenschutz.');
if ($data['membership'] === 'no' && !$accepted('membershipApplicationAccepted')) $fail('Bitte bestätige deinen Mitgliedsantrag.');
if ($data['isMinor'] && ($length($data['guardianFirstName']) < 2 || $length($data['guardianLastName']) < 2)) $fail('Bitte gib die sorgeberechtigte Person an, die die Trainerunterlagen unterschreibt.');
$data['signingDate'] = $value('signingDate');
$signing = $validDate($data['signingDate']);
if ($length($data['signingPlace']) < 2 || !$signing || $signing < $birth) $fail('Bitte prüfe Ort und Datum der Unterschrift.');
if (!preg_match('#^data:image/png;base64,([A-Za-z0-9+/=]+)$#', $value('signatureData'), $match)) $fail('Bitte unterschreibe die Trainerunterlagen.');
$binary = base64_decode($match[1], true);
$size = $binary === false ? false : @getimagesizefromstring($binary);
if (!$size || $size[2] !== IMAGETYPE_PNG || strlen($binary) > 1024*1024 || $size[0]*$size[1] > 2000000) $fail('Die Unterschrift konnte nicht verarbeitet werden.');
$image = @imagecreatefromstring($binary); $ink = 0;
if ($image) {
    for ($y=0;$y<imagesy($image);$y++) for ($x=0;$x<imagesx($image);$x++) {
        $color = imagecolorsforindex($image,imagecolorat($image,$x,$y));
        if ($color['alpha'] < 100 && min($color['red'],$color['green'],$color['blue']) < 180) $ink++;
        if ($ink >= 12) break 2;
    }
    imagedestroy($image);
}
if ($ink < 12) $fail('Bitte unterschreibe die Trainerunterlagen im Unterschriftenfeld.');
$data['signatureBinary'] = $binary;
$uploads = array();
$uploadedBytes = 0;
$uploadFields = array('idFront'=>array('Personalausweis','Vorderseite'),'idBack'=>array('Personalausweis','Rückseite'));
if ($data['busUse'] === 'yes') $uploadFields += array('licenseFront'=>array('Führerschein','Vorderseite'),'licenseBack'=>array('Führerschein','Rückseite'));
foreach ($uploadFields as $field=>$document) {
    list($name,$label) = $document;
    $file = $_FILES[$field] ?? null;
    if (!$file || is_array($file['name']) || $file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name']) || $file['size'] < 1 || $file['size'] > 3*1024*1024) $fail('Bitte lade die ' . $name . '-' . $label . ' mit höchstens 3 MB hoch.');
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $allowed = array('pdf'=>'application/pdf','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png');
    if (!isset($allowed[$extension]) || $allowed[$extension] !== $mime) $fail('Die Ausweis- und Führerscheinkopien müssen gültige PDF-, JPG- oder PNG-Dateien sein.');
    $uploadedBytes += $file['size'];
    if ($uploadedBytes > 10*1024*1024) $fail('Alle Ausweis- und Führerscheinkopien zusammen dürfen höchstens 10 MB groß sein. Bitte verkleinere die Dateien.');
    $prefix = $name === 'Personalausweis' ? 'Personalausweis-Kopie-' : 'Fuehrerschein-Kopie-';
    $uploads[] = array('filename'=>$prefix . $field . '.' . $extension,'contentType'=>$mime,'content'=>base64_encode(file_get_contents($file['tmp_name'])));
}
$endpoint = trim((string)getenv('BSV_MEMBERSHIP_EMAIL_ENDPOINT')) ?: 'https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/membership-email';
$secret = trim((string)getenv('BSV_MEMBERSHIP_EMAIL_SECRET'));
if ($secret === '' && is_file(__DIR__ . '/membership-config.php')) {
    if (!defined('BSV_MEMBERSHIP_CONFIG_LOADER')) define('BSV_MEMBERSHIP_CONFIG_LOADER', true);
    $config = require __DIR__ . '/membership-config.php';
    if (is_array($config) && isset($config['email_secret']) && is_string($config['email_secret'])) $secret = trim($config['email_secret']);
}
if ($secret === '' || !function_exists('curl_init')) $respond(503,array('ok'=>false,'message'=>'Der Versandservice für die Trainerunterlagen ist noch nicht eingerichtet. Bitte kontaktiere die Jugendleitung.'));
$data['applicationNumber'] = 'TR-' . $today->format('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));
$data['receivedAt'] = (new DateTimeImmutable('now',new DateTimeZone('Europe/Berlin')))->format('d.m.Y H:i:s T');
try {
    require_once __DIR__ . '/trainer-onboarding-pdf.php';
    require_once __DIR__ . '/trainer-onboarding-welcome.php';
    $welcomeProfile = bsvTrainerWelcomeProfile($data);
    $data['dfbnetRequested'] = $welcomeProfile['dfbnet'];
    $summary = bsvBuildTrainerPdf($data);
    $membership = bsvBuildTrainerPdf($data,true);
} catch (Throwable $error) {
    error_log('[trainer-onboarding] document_generation_failed');
    $respond(500,array('ok'=>false,'message'=>'Deine Unterlagen konnten nicht erstellt werden. Bitte kontaktiere die Jugendleitung.'));
}
if ($uploadedBytes + strlen($summary) + strlen($membership ?? '') > 12*1024*1024) $respond(413, array('ok'=>false, 'message'=>'Die erstellten Unterlagen und Kopien sind zusammen zu groß für den Versand. Bitte verkleinere deine Uploads.'));
$attachment = function ($name,$pdf) { return array('filename'=>$name,'contentType'=>'application/pdf','content'=>base64_encode($pdf)); };
$summaryAttachment = $attachment('Trainerunterlagen-' . $data['applicationNumber'] . '.pdf',$summary);
$membershipAttachment = $attachment(($data['membership'] === 'no' ? 'Mitgliedsantrag-' : 'Mitgliedsdaten-') . $data['applicationNumber'] . '.pdf',$membership);
$send = function ($type,$attachments,$text,$to='', $html=null, $subject=null) use ($data,$endpoint,$secret) {
    // This release always requests test delivery from the authenticated mail bridge.
    $payload = array('messageType'=>$type,'forceTestMode'=>true,'to'=>$to,'replyTo'=>$data['email'],'subject'=>$subject ?? 'BSV Trainerunterlagen ' . $data['applicationNumber'] . ': ' . $data['firstName'] . ' ' . $data['lastName'],'text'=>$text,'html'=>$html ?? '<div style="font-family:Arial,sans-serif;white-space:pre-wrap">' . htmlspecialchars($text,ENT_QUOTES,'UTF-8') . '</div>','applicationNumber'=>$data['applicationNumber'],'attachments'=>$attachments);
    $request = curl_init($endpoint);
    curl_setopt_array($request,array(CURLOPT_POST=>true,CURLOPT_RETURNTRANSFER=>true,CURLOPT_CONNECTTIMEOUT=>10,CURLOPT_TIMEOUT=>30,CURLOPT_HTTPHEADER=>array('Content-Type: application/json','X-BSV-Membership-Secret: ' . $secret),CURLOPT_POSTFIELDS=>json_encode($payload,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)));
    $body = curl_exec($request); $code=(int)curl_getinfo($request,CURLINFO_HTTP_CODE); curl_close($request);
    $result = $body === false ? null : json_decode($body,true);
    return $code >= 200 && $code < 300 && is_array($result) && ($result['ok'] ?? false) === true ? $result : false;
};
$reference = $data['applicationNumber'];
$copyAttachments = array($summaryAttachment);
if ($membershipAttachment) $copyAttachments[] = $membershipAttachment;
$result = $send('trainer-onboarding',array_merge($copyAttachments,$uploads),'Neue unterschriebene Trainerunterlagen ' . $reference . '. Persönliche Daten, Aufgabe, Vertragsdaten, Kleidungsgrößen, Angaben zur Busnutzung, Erklärungen sowie Ort, Datum und Unterschrift stehen im PDF. Ausweiskopien und gegebenenfalls Führerscheinkopien sind beigefügt.');
if (!$result) $respond(502,array('ok'=>false,'message'=>'Die Übermittlung konnte nicht bestätigt werden. Bitte frage bei der Jugendleitung nach, bevor du erneut sendest.'));
$_SESSION['lastSubmit'] = time();
$contact = "Name: " . $data['firstName'] . ' ' . $data['lastName'] . "\nE-Mail: " . $data['email'] . "\nMobilnummer: " . $data['phone'];
$assignment = "\nMannschaft: " . $data['teamLabel'] . "\nRolle: " . $data['role'] . "\nAnmeldenummer: " . $reference;
$dfbnetDetails = "\nStraße und Hausnummer: " . $data['street'] . "\nPostleitzahl: " . $data['postalCode'] . "\nWohnort: " . $data['city'] . "\nGeburtsdatum: " . $birth->format('d.m.Y') . "\nGeburtsort: " . $data['birthPlace'];
$pending = array();
if (!$send('trainer-keys',array(),"Neuer Trainer – persönliche Schlüsselübergabe abstimmen.\n\n" . $contact . $assignment)) $pending[] = 'trainer-keys';
if ($welcomeProfile['dfbnet'] && !$send('trainer-dfbnet',array(),"Neuer Trainer – DFBnet-Zugang einrichten und Kontakt aufnehmen.\n\n" . $contact . $dfbnetDetails . $assignment)) $pending[] = 'trainer-dfbnet';
$membershipText = $data['membership'] === 'no' ? 'Neuer unterschriebener Mitgliedsantrag für das Trainerteam mit Bankverbindung und Einzugserklärung. Bitte Aufnahme und Beitragsbefreiung für Trainer/Co-Trainer bearbeiten.' : 'Bestehendes Mitglied übernimmt eine Aufgabe im Trainerteam. Unterschriebene Mitgliedsdaten mit Bankverbindung und Einzugserklärung sind beigefügt. Bitte die Daten mit einem vorhandenen Mandat abstimmen und den Beitragsstatus prüfen.';
$membershipText .= "\nBei Ende der Trainertätigkeit und fortbestehender Mitgliedschaft fällige Beiträge gemäß Beitragsordnung einziehen; andere Beitragsbefreiungen berücksichtigen und den ersten Beitragseinzug vorab ankündigen.";
if ($data['membershipPayment']['creditorId'] === '') $membershipText .= "\nWichtig: Die Gläubiger-Identifikationsnummer fehlt noch. Das beigefügte Dokument ist bis zur Vervollständigung kein vollständiges SEPA-Mandat.";
if (!$send('trainer-membership',$membershipAttachment ? array($membershipAttachment) : array(),$membershipText . "\n\n" . $contact . $assignment)) $pending[] = 'trainer-membership';
$welcome = bsvTrainerWelcomeEmail($data,$pending);
$copyResult = $send('trainer-welcome',$copyAttachments,$welcome['text'],$data['email'],$welcome['html'],$welcome['subject']);
$respond(201,array('ok'=>true,'accepted'=>true,'delivered'=>true,'applicationNumber'=>$reference,'mailMode'=>$result['mailMode'] ?? 'test','applicantCopySent'=>$copyResult !== false,'pendingNotifications'=>$pending,'welcome'=>$welcomeProfile));
