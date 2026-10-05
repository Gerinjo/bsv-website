<?php
require_once __DIR__ . '/membership-pdf.php';

function bsvBuildFoerdervereinPdf($data, $signaturePng)
{
    $v = function ($key) use ($data) { return isset($data[$key]) ? (string)$data[$key] : ''; };
    $yes = function ($key) use ($data) { return isset($data[$key]) && $data[$key] === true; };
    $date = function ($value) { return DateTime::createFromFormat('!Y-m-d', $value)->format('d.m.Y'); };
    $pdf = new BsvMembershipPdf($v('foerdervereinApplicationNumber'), $v('receivedAt'), true);
    $pdf->chapter('Fördermitgliedschaft & Kontakt');
    $pdf->paragraph('Hiermit beantrage ich zusätzlich die Mitgliedschaft im Förderverein des BSV Nordstern. Die Personen- und Kontodaten sowie die Unterschrift wurden aus dem gleichzeitig ausgefüllten Hauptvereinsantrag übernommen.');
    $pdf->fields(array(array('Zugehöriger Hauptvereinsantrag', $v('applicationNumber'))));
    $pdf->section('01', 'Persönliche Angaben');
    $pdf->fields(array(array('Nachname', $v('lastName')), array('Vorname', $v('firstName'))));
    $pdf->fields(array(array('Geburtsdatum', $date($v('birthDate')))));
    $pdf->fields(array(array('Straße und Hausnummer', $v('street'))));
    $pdf->fields(array(array('Postleitzahl', $v('postalCode')), array('Ort', $v('city'))));
    $pdf->fields(array(array('Telefon', $v('phone')), array('E-Mail-Adresse', $v('email'))));
    if ($yes('isYouthFootball')) {
        $pdf->fields(array(array('Kontaktperson', trim($v('guardianFirstName') . ' ' . $v('guardianLastName'))), array('Verhältnis zum Mitglied', $v('guardianRelation'))));
        $pdf->fields(array(array('Telefon der Kontaktperson', $v('guardianPhone'))));
    }
    $pdf->section('02', 'Förderbeitrag');
    $pdf->fields(array(array('Jährlicher Förderbeitrag', number_format((float)$v('foerdervereinAnnualContribution'), 2, ',', '.') . ' EUR')));
    $pdf->paragraph('Die Mitgliedschaft im BSV Nordstern wird gleichzeitig beantragt. Der Mindestbeitrag für BSV-Mitglieder beträgt 11 EUR jährlich; ein höherer Betrag ist freiwillig. Der Förderbeitrag wird zusätzlich zum Hauptvereinsbeitrag erhoben.');
    if ($v('foerdervereinNotes') !== '') $pdf->paragraph('Nachricht an den Förderverein: ' . $v('foerdervereinNotes'));

    $pdf->chapter('Lastschriftmandat & Unterschrift');
    $pdf->section('03', 'Bankverbindung & Einzugsermächtigung');
    $pdf->fields(array(array('Kreditinstitut', $v('bankName')), array('BIC', $v('bic'))));
    $pdf->fields(array(array('IBAN', $v('iban')), array('Kontoinhaber:in', $v('accountHolder'))));
    $pdf->check('Ich ermächtige den Förderverein des BSV Nordstern, den angegebenen Jahresbeitrag wiederkehrend mittels Lastschrift von dem im Hauptvereinsantrag angegebenen Konto einzuziehen. Zugleich weise ich mein Kreditinstitut an, die eingezogenen Lastschriften einzulösen.', $yes('foerdervereinSepaAccepted'));
    $pdf->section('04', 'Bestätigungen');
    $pdf->check('Ich beantrage die Mitgliedschaft im Förderverein des BSV Nordstern zum angegebenen Jahresbeitrag und erkenne dessen Satzung und Vorstandsbeschlüsse an.', $yes('foerdervereinStatutesAccepted'));
    $pdf->check('Ich habe die Datenschutzerklärung gelesen und stimme zu, dass meine Personen- und Kontodaten sowie meine Unterschrift zur Bearbeitung dieses zusätzlichen Antrags an den Förderverein übermittelt werden.', $yes('foerdervereinPrivacyAccepted'));
    $pdf->paragraph('Die nachstehende, gemeinsam erfasste Unterschrift bestätigt beide Mitgliedsanträge und die jeweils ausdrücklich erteilten Lastschriftmandate. Bei Minderjährigen unterschreibt eine sorgeberechtigte Person.');
    $pdf->signature($signaturePng, $v('signingPlace'), $date($v('signingDate')), '05');
    return $pdf->Output('S');
}
