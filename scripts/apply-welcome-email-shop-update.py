from pathlib import Path
import base64

php_path = Path('public/api/membership-v3.php')
source = php_path.read_text(encoding='utf-8')

image_path = Path('public/images/verein/jugend/bsv-jugend-set.jpg')
image_path.parent.mkdir(parents=True, exist_ok=True)
image_path.write_bytes(base64.b64decode(Path('scripts/bsv-youth-set.b64').read_text(encoding='ascii').strip()))

anchor = "$departmentUrl = $siteBase . $departmentPaths[$department];\n"
shop_vars = anchor + "\n$teamShopUrl = 'https://team.jako.com/de-de/team/bsv_nordstern_radolfzell';\n$youthSetsUrl = 'https://team.jako.com/de-de/team/bsv_nordstern_radolfzell/jugend_sets/';\n$youthSetImageUrl = $siteBase . '/images/verein/jugend/bsv-jugend-set.jpg';\n"
if "$teamShopUrl = 'https://team.jako.com/de-de/team/bsv_nordstern_radolfzell';" not in source:
    if anchor not in source:
        raise SystemExit('Shop variable anchor not found')
    source = source.replace(anchor, shop_vars, 1)

old_text = """        \"VEREINSKLEIDUNG\\n\" .
        \"Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im Vereinsshop findest du unsere Vereinskollektion.\\n\" .
        $textLink('BSV-Shop und Vereinskollektion', 'https://shop.bsvnordstern.de') . \"\\n\" .
        \"WHATSAPP-COMMUNITY\\n\" ."""
new_text = """        \"VEREINSKLEIDUNG\\n\" .
        ($isMinor
            ? \"Gerade im Kinder- und Jugendbereich möchten wir uns im Training und beim Spiel einheitlich präsentieren. Deshalb empfehlen wir, ein passendes BSV-Jugend-Set zu kaufen.\\n\"
            : \"Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im BSV-Teamshop findest du unsere Vereinskollektion.\\n\") .
        $textLink('BSV-Teamshop', $teamShopUrl) .
        ($isMinor ? $textLink('Jugend-Sets', $youthSetsUrl) : '') . \"\\n\" .
        \"WHATSAPP-COMMUNITY\\n\" ."""
if old_text not in source:
    raise SystemExit('Plain-text clothing block not found')
source = source.replace(old_text, new_text, 1)

old_html = """            '<h2 style=\"margin:0 0 12px;color:#164f32;font-size:21px;\">Vereinskleidung</h2>' .
            '<p style=\"margin:0 0 14px;line-height:1.65;color:#3f5146;\">Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im Vereinsshop findest du unsere Vereinskollektion.</p>' .
            $linkButton('BSV-Shop öffnen', 'https://shop.bsvnordstern.de') ."""
new_html = """            '<h2 style=\"margin:0 0 12px;color:#164f32;font-size:21px;\">Vereinskleidung</h2>' .
            '<p style=\"margin:0 0 14px;line-height:1.65;color:#3f5146;\">' .
                ($isMinor
                    ? 'Gerade im Kinder- und Jugendbereich möchten wir uns im Training und beim Spiel einheitlich präsentieren. Deshalb empfehlen wir, ein passendes BSV-Jugend-Set zu kaufen.'
                    : 'Bei Training, Spielen und Veranstaltungen möchten wir als BSV möglichst einheitlich auftreten. Im BSV-Teamshop findest du unsere Vereinskollektion.') .
            '</p>' .
            $linkButton('BSV-Teamshop öffnen', $teamShopUrl) .
            ($isMinor ? $linkButton('Jugend-Sets ansehen', $youthSetsUrl) : '') .
            ($isMinor
                ? '<div style=\"margin-top:14px;padding:16px;background:#f8faf8;border:1px solid #dfe7df;border-radius:6px;\">' .
                    '<p style=\"margin:0 0 12px;line-height:1.6;color:#3f5146;\"><strong>Empfohlenes BSV-Jugend-Set</strong><br>Trikot, Polyesterjacke, Polyesterhose, Allwetterjacke, Rucksack und Stutzen.</p>' .
                    '<a href=\"' . $htmlEscape($youthSetsUrl) . '\" style=\"text-decoration:none;\">' .
                        '<img src=\"' . $htmlEscape($youthSetImageUrl) . '\" alt=\"BSV-Jugend-Set\" width=\"560\" style=\"display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:5px;\">' .
                    '</a>' .
                '</div>'
                : '') ."""
if old_html not in source:
    raise SystemExit('HTML clothing block not found')
source = source.replace(old_html, new_html, 1)

php_path.write_text(source, encoding='utf-8')
print('Welcome email and youth-set image updated.')
