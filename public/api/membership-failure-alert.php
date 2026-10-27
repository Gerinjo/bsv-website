<?php
// This helper is not a public endpoint. Never accept alert data from HTTP here.
if (realpath(isset($_SERVER['SCRIPT_FILENAME']) ? $_SERVER['SCRIPT_FILENAME'] : '') === __FILE__) {
    http_response_code(404);
    exit;
}

function bsvMembershipFailureAlert($context, $config, $internalDelivered, $transports = array()) {
    $notified = array();
    return function ($stage, $reason, $httpStatus = 0, $curlCode = 0) use ($context, $config, $internalDelivered, $transports, &$notified) {
        // At most one alert per failed step in this request; no recursive mail bridge calls.
        if (isset($notified[$stage])) return false;
        $notified[$stage] = true;
        $clean = function ($value, $limit = 200) {
            $text = str_replace(array("\r", "\n", "\0"), ' ', (string)$value);
            return function_exists('mb_substr') ? mb_substr($text, 0, $limit, 'UTF-8') : substr($text, 0, $limit);
        };
        $reference = $clean($context['reference']);
        $labels = array('documents' => 'Antragsunterlagen erstellen', 'internal' => 'Antrag an die Mitgliederverwaltung',
            'applicant' => 'Bestätigung an die Antragstellenden', 'team' => 'Trainerbenachrichtigung',
            'foerderverein' => 'Weiterleitung an den Förderverein', 'newsletter' => 'E-Mail-Einwilligung übernehmen');
        $delivered = $internalDelivered();
        $text = "Bei einer geprüften Online-Mitgliedsanmeldung ist ein technischer Fehler aufgetreten.\n\n" .
            'Antragsnummer: ' . $reference . "\nZeitpunkt: " . (new DateTimeImmutable('now', new DateTimeZone('Europe/Berlin')))->format('d.m.Y H:i:s T') . "\n" .
            'Betroffener Schritt: ' . (isset($labels[$stage]) ? $labels[$stage] : 'Antragsverarbeitung') . "\n" .
            'Fehlercode: ' . $clean($reason, 80) . "\nHTTP-Status: " . (int)$httpStatus . "\ncURL-Code: " . (int)$curlCode . "\n\n" .
            'Vorname: ' . $clean($context['firstName']) . "\nNachname: " . $clean($context['lastName']) . "\n" .
            'E-Mail: ' . $clean($context['email']) . "\nTelefon: " . $clean($context['phone']) . "\n" .
            'Kontaktperson: ' . $clean(isset($context['contactName']) ? $context['contactName'] : '') . "\n" .
            'Telefon Kontaktperson: ' . $clean(isset($context['contactPhone']) ? $context['contactPhone'] : '') . "\n" .
            'Abteilung: ' . $clean($context['department']) . "\nMannschaft: " . $clean($context['team']) . "\n\n" .
            ($delivered
                ? "Der Hauptantrag wurde bereits an die Mitgliederverwaltung übermittelt. Bitte die betroffene Zusatznachricht prüfen. Kein erneuter Mitgliedsantrag erforderlich.\n"
                : "Der Eingang des Hauptantrags bei der Mitgliederverwaltung ist nicht bestätigt. Bitte die Familie kontaktieren und den Eingang prüfen, bevor sie erneut absendet. Die Eingaben bleiben zunächst im geöffneten Formular erhalten.\n") .
            "\nDiese Warnung enthält keine Bankdaten, Ausweise, Unterschriften oder Antragsanlagen.\n";
        $isTest = isset($context['test']) && $context['test'] === true;
        if ($isTest) $text = "TEST DER FEHLERBENACHRICHTIGUNG – kein echter Mitgliedsantrag.\n\n" . $text;
        $message = array('from' => 'BSV Nordstern <no-reply@bsvnordstern.de>',
            'to' => array('jerome.ernsberger@bsvnordstern.de'),
            'reply_to' => 'jerome.ernsberger@bsvnordstern.de',
            'subject' => ($isTest ? 'TEST – ' : '') . 'BSV: Fehler bei Mitgliedsanmeldung ' . $reference,
            'text' => $text);
        $idempotencyKey = 'membership-alert/' . hash('sha256', $reference . '/' . $stage);
        $resend = isset($transports['resend']) ? $transports['resend'] : function ($message, $key) use ($config) {
            if (empty($config['alert_resend_api_key']) || !function_exists('curl_init')) return false;
            $endpoint = getenv('BSV_MEMBERSHIP_ALERT_EMAIL_ENDPOINT');
            if (!$endpoint) $endpoint = 'https://api.resend.com/emails';
            $request = curl_init($endpoint);
            curl_setopt_array($request, array(CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8,
                CURLOPT_HTTPHEADER => array('Content-Type: application/json',
                    'Authorization: Bearer ' . $config['alert_resend_api_key'], 'Idempotency-Key: ' . $key),
                CURLOPT_POSTFIELDS => json_encode($message, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE)));
            $body = curl_exec($request);
            $status = (int)curl_getinfo($request, CURLINFO_HTTP_CODE);
            curl_close($request);
            $result = is_string($body) ? json_decode($body, true) : null;
            return $status >= 200 && $status < 300 && is_array($result) && !empty($result['id']);
        };
        $native = isset($transports['native']) ? $transports['native'] : function ($message) {
            if (!function_exists('mail')) return false;
            return @mail($message['to'][0], '=?UTF-8?B?' . base64_encode($message['subject']) . '?=', $message['text'],
                "From: BSV Nordstern <no-reply@bsvnordstern.de>\r\nReply-To: jerome.ernsberger@bsvnordstern.de\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit");
        };
        // Try a second provider when the API, network or cURL itself is unavailable.
        foreach (array('resend' => $resend, 'hosting' => $native) as $channel => $transport) {
            try {
                if ($transport($message, $idempotencyKey)) {
                    error_log('[membership-alert] ' . json_encode(array('reference' => $reference, 'stage' => $stage, 'status' => 'accepted', 'channel' => $channel)));
                    return true;
                }
            } catch (Throwable $exception) {
                // Never log transport exceptions, response bodies or personal details.
            }
        }
        error_log('[membership-alert] ' . json_encode(array('reference' => $reference, 'stage' => $stage, 'status' => 'failed')));
        return false;
    };
}
