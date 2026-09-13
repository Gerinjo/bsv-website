<?php
require_once __DIR__ . '/vendor/tfpdf/tfpdf.php';
require_once __DIR__ . '/vendor/tfpdf/font/unifont/ttfonts.php';

class BsvMembershipPdf extends tFPDF
{
    private $reference;
    private $receivedAt;
    private $chapter = '';

    public function __construct($reference, $receivedAt)
    {
        parent::__construct('P', 'mm', 'A4');
        $this->reference = $reference;
        $this->receivedAt = $receivedAt;
        $this->SetMargins(17, 45, 17);
        $this->SetAutoPageBreak(true, 20);
        $this->AliasNbPages();
        $this->AddFont('BSV', '', 'DejaVuSans.ttf', true);
        $this->AddFont('BSV', 'B', 'DejaVuSans-Bold.ttf', true);
        $this->SetTitle('Mitgliedsantrag | ' . $reference, true);
        $this->SetAuthor('BSV Nordstern e.V. Radolfzell', true);
        $this->SetCreator('BSV Online-Mitgliedsantrag', true);
    }

    public function Header()
    {
        $this->SetFillColor(22, 79, 50);
        $this->Rect(0, 0, 210, 3, 'F');
        $this->Image(__DIR__ . '/assets/bsv-wappen.png', 16, 9, 22, 22);
        $this->SetXY(43, 10);
        $this->SetTextColor(22, 79, 50);
        $this->SetFont('BSV', 'B', 15);
        $this->Cell(150, 7, 'BSV NORDSTERN');
        $this->SetXY(43, 19);
        $this->SetFont('BSV', '', 9);
        $this->Cell(150, 5, 'Mitgliedsantrag · ' . $this->chapter);
        $this->SetXY(43, 26);
        $this->SetTextColor(90, 105, 95);
        $this->SetFont('BSV', '', 7.5);
        $this->Cell(150, 5, $this->reference . '  |  Eingang: ' . $this->receivedAt);
        $this->SetDrawColor(220, 229, 222);
        $this->SetLineWidth(.2);
        $this->Line(17, 37, 193, 37);
        $this->SetXY(17, 43);
    }

    public function Footer()
    {
        $this->SetDrawColor(220, 229, 222);
        $this->SetLineWidth(.2);
        $this->Line(17, 281, 193, 281);
        $this->SetXY(17, 284);
        $this->SetFont('BSV', '', 7);
        $this->SetTextColor(90, 105, 95);
        $this->Cell(145, 4, 'BSV Nordstern e.V. Radolfzell · Schlesierstraße 43 · 78315 Radolfzell');
        $this->Cell(31, 4, 'Seite ' . $this->PageNo() . ' / {nb}', 0, 0, 'R');
        $this->SetXY(17, 289);
        $this->Cell(176, 4, $this->reference . ' · Vertrauliche Antragsunterlagen');
    }

    public function chapter($title)
    {
        $this->chapter = $title;
        $this->AddPage();
    }

    private function room($height)
    {
        if ($this->GetY() + $height > 276) $this->AddPage();
    }

    public function section($number, $title)
    {
        $this->room(27);
        $y = $this->GetY();
        $this->SetFillColor(244, 214, 56);
        $this->Rect(17, $y, 10, 8, 'F');
        $this->SetXY(17, $y);
        $this->SetTextColor(22, 79, 50);
        $this->SetFont('BSV', 'B', 9);
        $this->Cell(10, 8, $number, 0, 0, 'C');
        $this->SetXY(31, $y);
        $this->SetFont('BSV', 'B', 11);
        $this->Cell(162, 8, $title);
        $this->SetXY(17, $y + 12);
    }

    private function wrap($text, $width)
    {
        $lines = array();
        foreach (explode("\n", str_replace(array("\r\n", "\r"), "\n", $text)) as $paragraph) {
            $line = '';
            foreach (preg_split('/(\s+)/u', $paragraph, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY) as $word) {
                if ($this->GetStringWidth($line . $word) <= $width) {
                    $line .= $word;
                    continue;
                }
                if (trim($line) !== '') $lines[] = rtrim($line);
                $line = ltrim($word);
                if ($this->GetStringWidth($line) > $width) {
                    $line = '';
                    foreach (preg_split('//u', ltrim($word), -1, PREG_SPLIT_NO_EMPTY) as $character) {
                        if ($line !== '' && $this->GetStringWidth($line . $character) > $width) {
                            $lines[] = $line;
                            $line = '';
                        }
                        $line .= $character;
                    }
                }
            }
            $lines[] = rtrim($line);
        }
        return $lines;
    }

    public function fields($fields)
    {
        $width = count($fields) === 1 ? 176 : 84;
        $this->SetFont('BSV', '', 9.5);
        $wrapped = array();
        foreach ($fields as $field) {
            $value = trim((string)$field[1]);
            $wrapped[] = $this->wrap($value !== '' ? $value : 'Nicht angegeben', $width - 2);
        }
        $height = 7 + max(array_map('count', $wrapped)) * 4.5;
        $this->room($height);
        $y = $this->GetY();
        foreach ($fields as $index => $field) {
            $x = 17 + $index * 92;
            $this->SetXY($x, $y);
            $this->SetTextColor(90, 105, 95);
            $this->SetFont('BSV', '', 7.5);
            $this->Cell($width, 4, $field[0]);
            $this->SetTextColor(20, 37, 26);
            $this->SetFont('BSV', '', 9.5);
            foreach ($wrapped[$index] as $lineIndex => $line) {
                $this->SetXY($x, $y + 5 + $lineIndex * 4.5);
                $this->Cell($width, 4.5, $line);
            }
            $this->SetDrawColor(230, 236, 232);
            $this->SetLineWidth(.2);
            $this->Line($x, $y + $height - 2, $x + $width, $y + $height - 2);
        }
        $this->SetXY(17, $y + $height + 1);
    }

    public function paragraph($text)
    {
        $this->SetFont('BSV', '', 9);
        $this->SetTextColor(45, 62, 50);
        foreach ($this->wrap($text, 174) as $line) {
            $this->room(5);
            $this->SetX(17);
            $this->Cell(176, 4.8, $line, 0, 1);
        }
        $this->Ln(3);
    }

    public function check($label, $selected, $applicable = true)
    {
        $this->SetFont('BSV', '', 8.5);
        $lines = $this->wrap($label, 146);
        $height = max(5, count($lines) * 4.2) + 2;
        $this->room($height);
        $y = $this->GetY();
        $this->SetDrawColor(90, 115, 98);
        $this->SetLineWidth(.3);
        $this->Rect(18, $y + .7, 3.5, 3.5);
        if ($applicable && $selected) {
            $this->SetDrawColor(22, 79, 50);
            $this->SetLineWidth(.5);
            $this->Line(18.6, $y + 2.4, 19.4, $y + 3.3);
            $this->Line(19.4, $y + 3.3, 21, $y + 1.3);
        } elseif (!$applicable) {
            $this->Line(18.7, $y + 2.45, 20.8, $y + 2.45);
        }
        $this->SetTextColor(20, 37, 26);
        foreach ($lines as $index => $line) {
            $this->SetXY(25, $y + $index * 4.2);
            $this->Cell(148, 4.2, $line);
        }
        $this->SetXY(174, $y);
        $this->SetFont('BSV', 'B', 8);
        $this->SetTextColor(22, 79, 50);
        $this->Cell(19, 4.2, !$applicable ? 'Entfällt' : ($selected ? 'Ja' : 'Nein'), 0, 0, 'R');
        $this->SetXY(17, $y + $height);
    }

    public function signature($png, $place, $date)
    {
        $size = @getimagesizefromstring($png);
        if (!$size || $size[2] !== IMAGETYPE_PNG || $size[0] * $size[1] > 8000000) {
            throw new RuntimeException('Ungültiges Unterschriftenbild.');
        }
        $this->SetFont('BSV', '', 9.5);
        $metadataLines = max(count($this->wrap($place, 82)), count($this->wrap($date, 82)));
        $this->room(56 + $metadataLines * 4.5);
        $this->section('08', 'Ort, Datum und Unterschrift');
        $this->fields(array(array('Ort der Unterschrift', $place), array('Datum der Unterschrift', $date)));
        // Parse the PNG from memory: signed applications never become public files.
        $stream = fopen('php://memory', 'w+b');
        try {
            fwrite($stream, $png);
            rewind($stream);
            $info = $this->_parsepngstream($stream, 'Unterschrift');
        } finally {
            fclose($stream);
        }
        $info['i'] = count($this->images) + 1;
        $this->images['signature'] = $info;
        $scale = min(100 / $size[0], 26 / $size[1]);
        $y = $this->GetY();
        $this->Image('signature', 18, $y, $size[0] * $scale, $size[1] * $scale, 'PNG');
        $this->SetDrawColor(90, 115, 98);
        $this->Line(17, $y + 28, 127, $y + 28);
        $this->SetXY(17, $y + 30);
        $this->SetTextColor(90, 105, 95);
        $this->SetFont('BSV', '', 7.5);
        $this->Cell(176, 4, 'Im Onlineformular erfasste Unterschrift');
    }
}

function bsvBuildMembershipPdf($data, $signaturePng)
{
    $v = function ($key) use ($data) { return isset($data[$key]) ? (string)$data[$key] : ''; };
    $yes = function ($key) use ($data) { return isset($data[$key]) && $data[$key] === true; };
    $date = function ($value) {
        $parsed = DateTime::createFromFormat('!Y-m-d', $value);
        return $parsed ? $parsed->format('d.m.Y') : $value;
    };
    $pdf = new BsvMembershipPdf($v('applicationNumber'), $v('receivedAt'));
    $pdf->chapter('Mitgliedschaft & Kontakt');
    $pdf->section('01', 'Persönliche Angaben');
    $pdf->fields(array(array('Nachname', $v('lastName')), array('Vorname', $v('firstName'))));
    $pdf->fields(array(array('Geburtsdatum', $date($v('birthDate'))), array('Geschlecht', $v('gender') === 'keine-angabe' ? 'Keine Angabe' : $v('gender'))));
    $pdf->fields(array(array('Geburtsort', $v('birthPlace')), array('Nationalität', $v('nationality'))));
    $pdf->fields(array(array('Straße und Hausnummer', $v('street'))));
    $pdf->fields(array(array('Postleitzahl', $v('postalCode')), array('Ort', $v('city'))));
    $pdf->fields(array(array('Mobilnummer', $v('phone')), array('E-Mail-Adresse', $v('email'))));
    $pdf->section('02', 'Abteilung & Mannschaft');
    $pdf->fields(array(array('Gewählte Abteilung', $v('departmentLabel'))));
    $pdf->check('Die Mannschaft ist bereits bekannt.', $v('teamKnown') === 'yes', $yes('teamQuestionApplies'));
    if ($v('teamKnown') === 'yes') {
        $pdf->fields(array(array('Ausgewählte Mannschaft', $v('teamLabel'))));
        $pdf->fields(array(array('Trainerteam zum Zeitpunkt des Antrags', $v('teamTrainers'))));
    }
    $pdf->section('03', 'Kontaktperson für das Jugendmitglied');
    if ($yes('isYouthFootball')) {
        $pdf->fields(array(array('Nachname', $v('guardianLastName')), array('Vorname', $v('guardianFirstName'))));
        $pdf->fields(array(array('Verhältnis zum Mitglied', $v('guardianRelation')), array('Telefon', $v('guardianPhone'))));
    } else {
        $pdf->paragraph('Für die gewählte Abteilung nicht abgefragt.');
    }
    $pdf->section('04', 'Unterstützung im Verein');
    $pdf->check('Ja, ich kann mir eine Unterstützung vorstellen.', $yes('supportWilling'));
    if ($yes('supportWilling')) $pdf->paragraph('Ideen oder mögliche Aufgaben: ' . ($v('supportIdeas') !== '' ? $v('supportIdeas') : 'Nicht angegeben'));

    if ($yes('isFootball')) {
        $pdf->chapter('Spielgenehmigung & Unterlagen');
        $pdf->section('05', 'Spielgenehmigung');
        $pdf->paragraph('Unterlagen zur persönlichen Identifikation');
        foreach (array('birth-documents' => 'Geburtsurkunde und Meldebestätigung hochladen', 'identity-card' => 'Personalausweis – Vorder- und Rückseite hochladen', 'send-separately' => 'Unterlagen separat an das Passwesen senden') as $key => $label) {
            $pdf->check($label, $v('identityProofType') === $key);
        }
        $pdf->Ln(3);
        $pdf->paragraph('Art des Spielberechtigungsantrags');
        foreach (array('first-registration' => 'Erstmalige Spielberechtigung', 'club-change' => 'Vereinswechsel', 're-registration' => 'Wiederanmeldung') as $key => $label) {
            $pdf->check($label, $v('registrationType') === $key);
        }
        if ($v('registrationType') === 'club-change') {
            $pdf->fields(array(array('Bisheriger Verein', $v('previousClub'))));
            $pdf->check('Derzeit gesperrt', $v('currentlySuspended') === 'yes');
            if ($v('currentlySuspended') === 'yes') $pdf->fields(array(array('Sperre von/bis', $v('suspensionPeriod'))));
        }
        $pdf->Ln(3);
        $pdf->paragraph('Internationale Freigabe');
        if ($yes('needsInternationalDocuments')) {
            $pdf->fields(array(array('Letzter Wohnort im Ausland', $v('lastForeignResidence'))));
            $pdf->fields(array(array('Name und Vorname beider Eltern', $v('parentsNames'))));
        } else {
            $pdf->paragraph('Zusätzliche Angaben zur internationalen Freigabe wurden nicht benötigt.');
        }
        $pdf->Ln(3);
        $pdf->paragraph('Hochgeladene Unterlagen');
        if (empty($data['uploads'])) {
            $pdf->paragraph('Keine Dateien hochgeladen.');
        } else {
            foreach ($data['uploads'] as $upload) {
                $pdf->fields(array(array($upload['label'], $upload['originalName'])));
            }
        }
        $pdf->paragraph('Die Dateien werden als separate Anlagen an die zuständige Bearbeitung übermittelt.');
    }

    $pdf->chapter('Mandat & Einwilligungen');
    $pdf->section('06', 'Bankverbindung & SEPA-Lastschrift');
    $pdf->fields(array(array('Kreditinstitut', $v('bankName')), array('BIC', $v('bic'))));
    $pdf->fields(array(array('IBAN', $v('iban')), array('Kontoinhaber:in', $v('accountHolder'))));
    $pdf->check('Ich ermächtige den BSV Nordstern e.V. Radolfzell, wiederkehrende Zahlungen mittels Lastschrift einzuziehen. Zugleich weise ich mein Kreditinstitut an, die vom Verein gezogenen Lastschriften einzulösen.', $yes('sepaAccepted'));
    $pdf->section('07', 'Bestätigungen & freiwillige Einwilligungen');
    $pdf->check('Ich habe die Beitragsordnung gelesen und akzeptiert.', $yes('contributionAccepted'));
    $pdf->check('Ich habe die Vereinssatzung gelesen und akzeptiert.', $yes('statutesAccepted'));
    $pdf->check('Ich habe die Datenschutzerklärung gelesen und stimme der Verarbeitung meiner Angaben zur Bearbeitung des Mitgliedsantrags zu.', $yes('privacyAccepted'));
    $pdf->check('Ich möchte allgemeine Vereinsinformationen per E-Mail erhalten, zum Beispiel Einladungen zur Jugendvollversammlung oder Mitgliederversammlung sowie wichtige organisatorische Mitteilungen.', $yes('emailGeneralInfoAccepted'));
    $pdf->check('Ich möchte den Newsletter und die Vereinszeitschrift digital per E-Mail erhalten.', $yes('emailNewsletterAccepted'));
    $pdf->check('Ich willige in die Verarbeitung der Spielberichtsdaten für DFBnet und FUSSBALL.DE ein.', $yes('playerDataAccepted'), $yes('isFootball'));
    $pdf->check('Ich stimme der Nutzung der Adressdaten für Marketingzwecke des DFB, seiner Verbände und Partner zu. Diese Einwilligung ist freiwillig und widerrufbar.', $yes('marketingAccepted'), $yes('isFootball'));
    $pdf->paragraph('Die beiden freiwilligen E-Mail-Einwilligungen können unabhängig voneinander erteilt und jederzeit widerrufen werden.');
    $pdf->signature($signaturePng, $v('signingPlace'), $date($v('signingDate')));
    return $pdf->Output('S');
}
