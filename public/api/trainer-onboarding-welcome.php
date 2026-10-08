<?php

function bsvTrainerWelcomeConfig()
{
    static $config;
    if ($config === null) {
        $config = json_decode(file_get_contents(__DIR__ . '/trainer-onboarding-welcome.json'), true, 512, JSON_THROW_ON_ERROR);
        if (!isset($config['apps'], $config['teamAppGroups'], $config['steps'], $config['links'])) throw new RuntimeException('Invalid welcome configuration');
    }
    return $config;
}

function bsvTrainerWelcomeProfile($data)
{
    $config = bsvTrainerWelcomeConfig();
    $teamApp = null;
    foreach ($config['teamAppGroups'] as $group) if (in_array($data['teamKey'], $group['teams'], true)) $teamApp = $group['app'];
    $apps = $teamApp ? array($teamApp) : array();
    if ($data['busUse'] === 'yes') $apps[] = 'timetree';
    return array('teamKey'=>$data['teamKey'], 'teamLabel'=>$data['teamLabel'], 'teamPath'=>'/' . str_replace('--', '/', $data['teamKey']), 'apps'=>$apps, 'dfbnet'=>$teamApp !== 'spond', 'membership'=>$data['membership'], 'busUse'=>$data['busUse']);
}

function bsvTrainerWelcomeEmail($data, $pendingNotifications = array())
{
    $config = bsvTrainerWelcomeConfig();
    $profile = bsvTrainerWelcomeProfile($data);
    $e = function ($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); };
    $site = $config['siteUrl'];
    $name = $e($data['firstName']);
    $team = $e($data['teamLabel']);
    $role = $e($data['role']);
    $reference = $e($data['applicationNumber']);
    $button = function ($href, $label) use ($e) {
        return '<a href="' . $e($href) . '" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 16px;background:#17613a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:5px">' . $e($label) . '</a>';
    };
    $card = function ($title, $body, $extra = '') use ($e) {
        return '<tr><td style="padding:0 32px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f6f1;border-radius:8px"><tr><td style="padding:22px"><h2 style="margin:0 0 10px;color:#164f32;font-size:20px">' . $e($title) . '</h2><p style="margin:0;color:#52665a;font-size:15px;line-height:1.7">' . $e($body) . '</p>' . $extra . '</td></tr></table></td></tr>';
    };
    $text = 'Hallo ' . $data['firstName'] . ",\n\nherzlich willkommen im Trainerteam des BSV Nordstern Radolfzell! Danke, dass du dich für unseren Verein engagierst.\n\n" . $data['teamLabel'] . ' · ' . $data['role'] . "\nAnmeldung: " . $data['applicationNumber'] . "\n\nDeine unterschriebenen Trainerunterlagen findest du als PDF im Anhang. Bei einem neuen Mitgliedsantrag liegt dieser ebenfalls als separates PDF bei.\n";
    $html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Willkommen beim BSV</title></head><body style="margin:0;background:#edf2ec;font-family:Arial,Helvetica,sans-serif;color:#14251a"><div style="display:none;max-height:0;overflow:hidden">Deine Trainerunterlagen und die nächsten Schritte für deinen Start beim BSV.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 10px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:12px;overflow:hidden">';
    $html .= '<tr><td style="padding:28px 32px;background:#092f20;color:#ffffff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="72"><img src="' . $e($site . $config['logo']) . '" width="56" height="56" alt="BSV Nordstern" style="display:block"></td><td style="color:#ffffff;font-size:18px;font-weight:bold">BSV NORDSTERN<br><span style="font-size:11px;color:#c9d9cf;letter-spacing:2px;font-weight:normal">RADOLFZELL · SEIT 1956</span></td></tr></table><p style="margin:30px 0 12px;color:#f4d638;font-size:12px;font-weight:bold;letter-spacing:2px">SCHÖN, DASS DU DABEI BIST.</p><h1 style="margin:0;font-size:34px;line-height:1.2">Willkommen im<br>Trainerteam, ' . $name . '!</h1><p style="margin:18px 0 0;color:#d7e5dc;font-size:15px;line-height:1.7">Danke, dass du dich für unseren Verein engagierst.<br>Wir freuen uns auf deinen Start mit ' . $team . '.</p></td></tr>';
    $html .= '<tr><td><img src="' . $e($site . $config['photo']) . '" width="640" alt="' . $e($config['photoAlt']) . '" style="display:block;width:100%;max-width:640px;height:auto"></td></tr><tr><td style="padding:26px 32px"><p style="margin:0 0 8px;color:#17613a;font-weight:bold;font-size:16px">' . $team . ' · ' . $role . '</p><p style="margin:0;font-size:15px;line-height:1.7">Deine unterschriebenen Trainerunterlagen findest du als <strong>PDF im Anhang</strong>. Bei einem neuen Mitgliedsantrag liegt dieser ebenfalls als separates PDF bei.</p><p style="margin:12px 0 0;color:#687b6e;font-size:12px">Deine Anmeldenummer: ' . $reference . '</p></td></tr>';
    if ($pendingNotifications) {
        $notice = 'Deine Unterlagen sind bei der Jugendleitung angekommen. Einzelne Benachrichtigungen konnten noch nicht bestätigt werden. Bitte sende das Formular nicht erneut ab; die Jugendleitung klärt die nächsten Schritte mit dir.';
        $html .= $card('Wir kümmern uns um deinen Start', $notice);
        $text .= "\n" . $notice . "\n";
    }
    foreach ($profile['apps'] as $key) {
        $app = $config['apps'][$key];
        $html .= $card($app['name'] . ' schon jetzt installieren', $app['description'], '<div style="margin-top:12px">' . $button($app['ios'], 'Für iPhone') . $button($app['android'], 'Für Android') . '</div>');
        $text .= "\n" . $app['name'] . " schon jetzt installieren\n" . $app['description'] . "\niPhone: " . $app['ios'] . "\nAndroid: " . $app['android'] . "\n";
    }
    $steps = array('keys');
    if ($profile['dfbnet']) $steps[] = 'dfbnet';
    $steps[] = $data['membership'] === 'no' ? 'membershipNew' : 'membershipExisting';
    $steps[] = 'next';
    foreach ($steps as $key) {
        $step = $config['steps'][$key];
        $html .= $card($step['title'], $step['body']);
        $text .= "\n" . $step['title'] . "\n" . $step['body'] . "\n";
    }
    $teamUrl = $site . $profile['teamPath'];
    $html .= $card('Alles Wichtige auf unserer Homepage', 'Auf deiner Mannschaftsseite findest du Trainingszeiten, Spiele und – soweit für deine Altersklasse vorhanden – die Tabelle.', $button($teamUrl, 'Deine Mannschaft ansehen'));
    $text .= "\nDeine Mannschaft: " . $teamUrl . "\nTrainingszeiten, Spiele und – soweit für deine Altersklasse vorhanden – die Tabelle.\n";
    foreach ($config['links'] as $link) {
        $html .= '<tr><td style="padding:0 54px 16px"><a href="' . $e($site . $link['path']) . '" style="color:#164f32;font-weight:bold;font-size:15px">' . $e($link['title']) . ' ↗</a><p style="margin:6px 0 0;color:#687b6e;font-size:13px">' . $e($link['description']) . '</p></td></tr>';
        $text .= $link['title'] . ': ' . $site . $link['path'] . "\n";
    }
    $html .= '<tr><td style="padding:26px 32px 32px"><p style="margin:0;font-size:15px;line-height:1.7">Bei Fragen ist die <a href="' . $e($site . '/kontakt?thema=youth-leadership') . '" style="color:#164f32;font-weight:bold">Jugendleitung</a> für dich da.<br><br>Bis bald auf dem Platz!<br><strong>Dein BSV Nordstern</strong></p></td></tr><tr><td style="padding:20px 32px;background:#092f20;color:#c9d9cf;font-size:12px;line-height:1.7">BSV Nordstern e.V. Radolfzell · Schlesierstraße 43 · 78315 Radolfzell<br><a href="' . $e($site) . '" style="color:#f4d638">bsvnordstern.de</a></td></tr></table></td></tr></table></body></html>';
    $text .= "\nBei Fragen: " . $site . "/kontakt?thema=youth-leadership\n\nBis bald auf dem Platz!\nDein BSV Nordstern";
    return array('subject'=>'Willkommen im Trainerteam, ' . $data['firstName'] . ' | BSV Nordstern', 'text'=>$text, 'html'=>$html);
}
