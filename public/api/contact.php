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
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Accept, Content-Type');
    header('Access-Control-Max-Age: 86400');
    exit;
}

session_name('bsv_contact');
session_set_cookie_params(array(
    'lifetime' => 0,
    'path' => '/api/',
    'secure' => true,
    'httponly' => true,
    'samesite' => 'None',
));
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $a = random_int(2, 9);
    $b = random_int(1, 9);
    $_SESSION['contact_captcha'] = $a + $b;
    header('Cache-Control: no-store');
    echo json_encode(array('ok' => true, 'a' => $a, 'b' => $b));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('HTTP/1.1 405 Method Not Allowed');
    echo json_encode(array('ok' => false, 'message' => 'Diese Anfrage ist nicht erlaubt.'));
    exit;
}

// Die Empfänger stehen ausschließlich auf dem Server. Der Browser übermittelt nur einen Schlüssel.
$teamRecipients = array(
    'fussball--herren--bezirksliga' => 'Torsten.Parzich@bsvnordstern.de',
    'fussball--herren--kreisliga-2' => 'Alexander.Kaiser@bsvnordstern.de',
    'fussball--frauen--bezirksliga' => 'Matthias.Becht@bsvnordstern.de',
    'fussball--frauen--kreisliga' => 'Myriam.Lipp@bsvnordstern.de',
    'fussball--alte-herren' => 'alteherren@bsvnordstern.de',
    'jugend--u11-e1' => 'niku.pourheidari@bsvnordstern.de',
    'jugend--u11-e2' => 'marcelino.rueth@bsvnordstern.de',
    'jugend--u11-e3' => 'stefan.sulger@bsvnordstern.de',
    'jugend--u9-f' => 'andy.wolfmueller@bsvnordstern.de',
    'jugend--u8-f' => 'pascal.dieterle@bsvnordstern.de',
    'jugend--u7-g' => 'michael.meiss@bsvnordstern.de',
    'jugend--u6-g' => 'elias.arfa@bsvnordstern.de',
    'jugend--u19' => 'jugend@bsvnordstern.de',
    'jugend--u17' => 'maxgeissmann@gmail.com',
    'jugend--u15-c1' => 'axel.schaeuble@bsvnordstern.de',
    'jugend--u15-c2' => 'sebastian.baeuerle@bsvnordstern.de',
    'jugend--u13-d1' => 'stephan.hellmann@bsvnordstern.de',
    'jugend--u13-d2' => 'joerg.boreatti@bsvnordstern.de',
    'jugend--u13-d3' => 'jugend@bsvnordstern.de',
    'jugend--juniorinnen--u17' => 'sven.goldhagen@bsvnordstern.de',
    'jugend--juniorinnen--u15' => 'alexander.kramer@bsvnordstern.de',
    'jugend--juniorinnen--u13' => 'dana.bulander@bsvnordstern.de',
);
$recipients = array(
    'general' => 'info@bsvnordstern.de',
    'membership' => 'verwaltung@bsvnordstern.de',
    'youth' => 'jugend@bsvnordstern.de',
    'sponsoring' => 'sponsoring@bsvnordstern.de',
    'social' => 'socialmedia@bsvnordstern.de',
);
foreach ($teamRecipients as $key => $address) {
    $recipients['team--' . $key . '--trial'] = $address;
    $recipients['team--' . $key . '--friendly'] = $address;
    $recipients['team--' . $key . '--general'] = $address;
}

$value = function ($key) {
    return trim((string)(isset($_POST[$key]) ? $_POST[$key] : ''));
};
$topic = $value('topic');
$firstName = $value('firstName');
$lastName = $value('lastName');
$phone = $value('phone');
$email = filter_var($value('email'), FILTER_VALIDATE_EMAIL);
$message = $value('message');
$captchaAnswer = filter_var($value('captchaAnswer'), FILTER_VALIDATE_INT);

if ($value('website') !== '') {
    echo json_encode(array('ok' => true));
    exit;
}
if (!isset($recipients[$topic]) || strlen($firstName) < 2 || strlen($lastName) < 2 || !$email || strlen($message) < 10 || strlen($message) > 5000) {
    header('HTTP/1.1 422 Unprocessable Entity');
    echo json_encode(array('ok' => false, 'message' => 'Bitte prüfe deine Eingaben.'));
    exit;
}
$expectedCaptcha = isset($_SESSION['contact_captcha']) ? $_SESSION['contact_captcha'] : null;
unset($_SESSION['contact_captcha']);
if ($captchaAnswer === false || !is_int($expectedCaptcha) || $expectedCaptcha !== $captchaAnswer) {
    header('HTTP/1.1 422 Unprocessable Entity');
    echo json_encode(array('ok' => false, 'message' => 'Die Antwort beim Spamschutz ist nicht richtig.'));
    exit;
}
if ($value('privacy') !== 'accepted') {
    header('HTTP/1.1 422 Unprocessable Entity');
    echo json_encode(array('ok' => false, 'message' => 'Bitte bestätige die Datenschutzerklärung.'));
    exit;
}

$clean = function ($text) {
    return str_replace(array("\r", "\n"), ' ', $text);
};
$endsWith = function ($text, $suffix) {
    return $suffix === '' || substr($text, -strlen($suffix)) === $suffix;
};
$inquiry = $endsWith($topic, '--friendly') ? 'Freundschaftsspiel' : ($endsWith($topic, '--trial') ? 'Probetraining' : 'Kontaktanfrage');
$subject = 'BSV Nordstern Kontaktanfrage: ' . $inquiry . ' von ' . $clean($firstName . ' ' . $lastName);
$body = "Neue Anfrage über bsvnordstern.de\n\n" .
    "Thema: {$topic}\n" .
    "Name: {$firstName} {$lastName}\n" .
    "E-Mail: {$email}\n" .
    "Telefon: " . ($phone !== '' ? $phone : 'nicht angegeben') . "\n\n" .
    "Nachricht:\n{$message}\n";
    
$headers = array(
    'From: BSV Nordstern <info@bsvnordstern.de>',
    'Reply-To: ' . $clean((string)$email),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
);

if (!mail($recipients[$topic], $subject, $body, implode("\r\n", $headers))) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(array('ok' => false, 'message' => 'Der Versand ist momentan nicht möglich. Bitte versuche es später erneut.'));
    exit;
}

echo json_encode(array('ok' => true));
