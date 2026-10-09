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

function bsvTrainerEmailOpen($title, $intro, $eyebrow = 'SCHÖN, DASS DU DABEI BIST.')
{
    $config = bsvTrainerWelcomeConfig();
    $e = function ($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); };
    $background = $e($config['siteUrl'] . $config['headerBackground']);
    // PNG backgrounds also work in clients that cannot display SVG. Outlook's
    // Word renderer uses the VML fallback; text stays readable with images off.
    $html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . $e(str_replace("\n", ' ', $title)) . '</title><style>@media only screen and (max-width:600px){.email-gutter{padding:12px 8px!important}.email-header-padding{padding:28px 22px 34px!important}.email-heading{font-size:30px!important}.email-body-padding{padding:24px 22px!important}.email-card-padding{padding:0 16px 16px!important}.email-card-inner{padding:18px!important}.email-link-padding{padding:0 34px 16px!important}.email-footer-padding{padding:20px 22px!important}}</style></head><body style="margin:0;background:#edf2ec;font-family:Arial,Helvetica,sans-serif;color:#14251a"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="email-gutter" align="center" style="padding:28px 10px">';
    $html .= '<!--[if mso]><table role="presentation" width="720" align="center" cellspacing="0" cellpadding="0"><tr><td><![endif]--><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:720px;background:#ffffff;border-radius:12px;overflow:hidden">';
    $html .= '<tr><td bgcolor="#092f20" background="' . $background . '" style="background-color:#092f20;background-image:url(\'' . $background . '\');background-size:cover;background-position:center;background-repeat:no-repeat;color:#ffffff">';
    $html .= '<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:720px"><v:fill type="frame" src="' . $background . '" color="#092f20"/><v:textbox inset="0,0,0,0" style="mso-fit-shape-to-text:true"><![endif]-->';
    $html .= '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td class="email-header-padding" style="padding:36px 40px 44px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td width="72"><img src="' . $e($config['siteUrl'] . $config['logo']) . '" width="56" height="56" alt="BSV Nordstern" style="display:block"></td><td style="color:#ffffff;font-size:18px;font-weight:bold">BSV NORDSTERN<br><span style="font-size:11px;color:#c9d9cf;letter-spacing:2px;font-weight:normal">RADOLFZELL · SEIT 1956</span></td></tr></table><p style="margin:30px 0 12px;color:#f4d638;font-size:12px;font-weight:bold;letter-spacing:2px">' . $e($eyebrow) . '</p><h1 class="email-heading" style="margin:0;color:#ffffff;font-size:38px;line-height:1.2;overflow-wrap:anywhere">' . nl2br($e($title)) . '</h1><p style="margin:18px 0 0;color:#d7e5dc;font-size:15px;line-height:1.7;overflow-wrap:anywhere">' . nl2br($e($intro)) . '</p></td></tr></table>';
    $html .= '<!--[if gte mso 9]></v:textbox></v:rect><![endif]--></td></tr>';
    return $html;
}

function bsvTrainerEmailClose()
{
    $site = htmlspecialchars(bsvTrainerWelcomeConfig()['siteUrl'], ENT_QUOTES, 'UTF-8');
    return '<tr><td class="email-footer-padding" style="padding:20px 40px;background:#092f20;color:#c9d9cf;font-size:12px;line-height:1.7">BSV Nordstern e.V. Radolfzell · Schlesierstraße 43 · 78315 Radolfzell<br><a href="' . $site . '" style="color:#f4d638">bsvnordstern.de</a></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';
}

function bsvTrainerNotificationEmail($text)
{
    $body = nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'));
    return bsvTrainerEmailOpen('Trainer-Onboarding', 'Neue Anmeldung im Trainerteam des BSV Nordstern Radolfzell.', 'DEIN START BEIM BSV')
        . '<tr><td class="email-body-padding" style="padding:28px 40px;color:#14251a;font-size:15px;line-height:1.7;overflow-wrap:anywhere">' . $body . '</td></tr>'
        . bsvTrainerEmailClose();
}

function bsvTrainerWelcomeEmail($data, $pendingNotifications = array())
{
    $config = bsvTrainerWelcomeConfig();
    $profile = bsvTrainerWelcomeProfile($data);
    $e = function ($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); };
    $site = $config['siteUrl'];
    $team = $e($data['teamLabel']);
    $role = $e($data['role']);
    $reference = $e($data['applicationNumber']);
    $button = function ($href, $label) use ($e) {
        return '<a href="' . $e($href) . '" style="display:inline-block;margin:6px 8px 6px 0;padding:12px 16px;background:#17613a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;border-radius:5px">' . $e($label) . '</a>';
    };
    $card = function ($title, $body, $extra = '') use ($e) {
        return '<tr><td class="email-card-padding" style="padding:0 40px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f6f1;border-radius:8px"><tr><td class="email-card-inner" style="padding:22px"><h2 style="margin:0 0 10px;color:#164f32;font-size:20px">' . $e($title) . '</h2><p style="margin:0;color:#52665a;font-size:15px;line-height:1.7">' . $e($body) . '</p>' . $extra . '</td></tr></table></td></tr>';
    };
    $text = 'Hallo ' . $data['firstName'] . ",\n\nherzlich willkommen im Trainerteam des BSV Nordstern Radolfzell! Danke, dass du dich für unseren Verein engagierst.\n\n" . $data['teamLabel'] . ' · ' . $data['role'] . "\nAnmeldung: " . $data['applicationNumber'] . "\n\nDeine unterschriebenen Trainerunterlagen findest du als PDF im Anhang. Deine Mitgliedschaftsunterlagen mit Bankverbindung und Einzugserklärung liegen ebenfalls als separates PDF bei.\n";
    $html = bsvTrainerEmailOpen("Willkommen im\nTrainerteam, " . $data['firstName'] . '!', "Danke, dass du dich für unseren Verein engagierst.\nWir freuen uns auf deinen Start mit " . $data['teamLabel'] . '.');
    $html .= '<tr><td><img src="' . $e($site . $config['photo']) . '" width="720" alt="' . $e($config['photoAlt']) . '" style="display:block;width:100%;max-width:720px;height:auto"></td></tr><tr><td class="email-body-padding" style="padding:26px 40px"><p style="margin:0 0 8px;color:#17613a;font-weight:bold;font-size:16px">' . $team . ' · ' . $role . '</p><p style="margin:0;font-size:15px;line-height:1.7">Deine unterschriebenen Trainerunterlagen findest du als <strong>PDF im Anhang</strong>. Deine Mitgliedschaftsunterlagen mit Bankverbindung und Einzugserklärung liegen ebenfalls als separates PDF bei.</p><p style="margin:12px 0 0;color:#687b6e;font-size:12px">Deine Anmeldenummer: ' . $reference . '</p></td></tr>';
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
        $html .= '<tr><td class="email-link-padding" style="padding:0 62px 16px"><a href="' . $e($site . $link['path']) . '" style="color:#164f32;font-weight:bold;font-size:15px">' . $e($link['title']) . ' ↗</a><p style="margin:6px 0 0;color:#687b6e;font-size:13px">' . $e($link['description']) . '</p></td></tr>';
        $text .= $link['title'] . ': ' . $site . $link['path'] . "\n";
    }
    $html .= '<tr><td class="email-body-padding" style="padding:26px 40px 32px"><p style="margin:0;font-size:15px;line-height:1.7">Bei Fragen ist die <a href="' . $e($site . '/kontakt?thema=youth-leadership') . '" style="color:#164f32;font-weight:bold">Jugendleitung</a> für dich da.<br><br>Bis bald auf dem Platz!<br><strong>Dein BSV Nordstern</strong></p></td></tr>' . bsvTrainerEmailClose();
    $text .= "\nBei Fragen: " . $site . "/kontakt?thema=youth-leadership\n\nBis bald auf dem Platz!\nDein BSV Nordstern";
    return array('subject'=>'Willkommen im Trainerteam, ' . $data['firstName'] . ' | BSV Nordstern', 'text'=>$text, 'html'=>$html);
}
