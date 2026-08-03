<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $a = random_int(2, 9);
    $b = random_int(1, 9);
    $_SESSION['contact_captcha'] = $a + $b;
    echo json_encode(['ok' => true, 'a' => $a, 'b' => $b]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => 'Diese Anfrage ist nicht erlaubt.']);
    exit;
}

// Die Empfänger stehen ausschließlich auf dem Server. Der Browser übermittelt nur einen Schlüssel.
$teamRecipients = [
    'fussball--herren--bezirksliga' => 'Torsten.Parzich@bsvnordstern.de',
    'fussball--herren--kreisliga-2' => 'Alexander.Kaiser@bsvnordstern.de',
    'fussball--frauen--bezirksliga' => 'info@bsvnordstern.de',
    'fussball--frauen--kreisliga' => 'info@bsvnordstern.de',
    'fussball--alte-herren' => 'info@bsvnordstern.de',
    'jugend--u11-e1' => 'niku.pourheidari@bsvnordstern.de',
    'jugend--u11-e2' => 'marcelino.rueth@bsvnordstern.de',
    'jugend--u11-e3' => 'stefan.sulger@bsvnordstern.de',
    'jugend--u9-f' => 'andy.wolfmueller@bsvnordstern.de',
    'jugend--u8-f' => 'pascal.dieterle@bsvnordstern.de',
    'jugend--u7-g' => 'michael.meiss@bsvnordstern.de',
    'jugend--u6-g' => 'elias.arfa@bsvnordstern.de',
    'jugend--u19' => '1.vorstand@sv-markelfingen.de',
    'jugend--u17' => 'maxgeissmann@gmail.com',
    'jugend--u15-c1' => 'axel.schaeuble@bsvnordstern.de',
    'jugend--u15-c2' => 'sebastian.baeuerle@bsvnordstern.de',
    'jugend--u13-d1' => 'stephan.hellmann@bsvnordstern.de',
    'jugend--u13-d2' => 'stephan.hellmann@bsvnordstern.de',
    'jugend--u13-d3' => 'hieu.ho@bsvnordstern.de',
    'jugend--juniorinnen--u17' => 'sven.goldhagen@bsvnordstern.de',
    'jugend--juniorinnen--u15' => 'alexander.kramer@bsvnordstern.de',
    'jugend--juniorinnen--u13' => 'dana.bulander@bsvnordstern.de',
];
$recipients = [
    'general' => 'info@bsvnordstern.de',
    'membership' => 'verwaltung@bsvnordstern.de',
    'youth' => 'jugend@bsvnordstern.de',
    'sponsoring' => 'sponsoring@bsvnordstern.de',
    'social' => 'socialmedia@bsvnordstern.de',
];
foreach ($teamRecipients as $key => $address) {
    $recipients['team--' . $key . '--trial'] = $address;
    $recipients['team--' . $key . '--friendly'] = $address;
    $recipients['team--' . $key . '--general'] = $address;
}

$value = static fn(string $key): string => trim((string)($_POST[$key] ?? ''));
$topic = $value('topic');
$firstName = $value('firstName');
$lastName = $value('lastName');
$phone = $value('phone');
$email = filter_var($value('email'), FILTER_VALIDATE_EMAIL);
$message = $value('message');
$captchaAnswer = filter_var($value('captchaAnswer'), FILTER_VALIDATE_INT);

if ($value('website') !== '') {
    echo json_encode(['ok' => true]);
    exit;
}
if (!isset($recipients[$topic]) || mb_strlen($firstName) < 2 || mb_strlen($lastName) < 2 || !$email || mb_strlen($message) < 10 || mb_strlen($message) > 5000) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Bitte prüfe deine Eingaben.']);
    exit;
}
$expectedCaptcha = $_SESSION['contact_captcha'] ?? null;
unset($_SESSION['contact_captcha']);
if ($captchaAnswer === false || !is_int($expectedCaptcha) || $expectedCaptcha !== $captchaAnswer) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Die Antwort beim Spamschutz ist nicht richtig.']);
    exit;
}
if ($value('privacy') !== 'accepted') {
    http_response_code(422);
    echo json_encode(['ok' => false, 'message' => 'Bitte bestätige die Datenschutzerklärung.']);
    exit;
}

$clean = static fn(string $text): string => str_replace(["\r", "\n"], ' ', $text);
$inquiry = str_ends_with($topic, '--friendly') ? 'Freundschaftsspiel' : (str_ends_with($topic, '--trial') ? 'Probetraining' : 'Kontaktanfrage');
$subject = 'BSV Website: ' . $inquiry . ' von ' . $clean($firstName . ' ' . $lastName);
$body = "Neue Anfrage über bsvnordstern.de\n\n" .
    "Thema: {$topic}\n" .
    "Name: {$firstName} {$lastName}\n" .
    "E-Mail: {$email}\n" .
    "Telefon: " . ($phone !== '' ? $phone : 'nicht angegeben') . "\n\n" .
    "Nachricht:\n{$message}\n";
$headers = [
    'From: BSV Website <info@bsvnordstern.de>',
    'Reply-To: ' . $clean((string)$email),
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: PHP/' . phpversion(),
];

if (!mail($recipients[$topic], $subject, $body, implode("\r\n", $headers))) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => 'Der Versand ist momentan nicht möglich. Bitte versuche es später erneut.']);
    exit;
}

echo json_encode(['ok' => true]);
