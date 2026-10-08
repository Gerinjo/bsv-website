<?php
require_once __DIR__ . '/membership-pdf.php';

function bsvBuildTrainerPdf($data, $membershipOnly = false)
{
    $title = $membershipOnly ? 'Mitgliedsantrag für das Trainerteam' : 'Trainer-Onboarding';
    $pdf = new BsvMembershipPdf($data['applicationNumber'], $data['receivedAt'], false, $title);
    $pdf->chapter($membershipOnly ? 'Antrag und Unterschrift' : 'Erfassung und Erklärungen');
    $date = function ($iso) { return DateTime::createFromFormat('!Y-m-d', $iso)->format('d.m.Y'); };
    $pdf->section('01', 'Persönliche Daten');
    $pdf->fields(array(array('Vorname', $data['firstName']), array('Nachname', $data['lastName'])));
    $pdf->fields(array(array('Nationalität', $data['nationality']), array('Geschlecht', $data['gender'] === 'keine-angabe' ? 'Keine Angabe' : $data['gender'])));
    $pdf->fields(array(array('Geburtsdatum', $date($data['birthDate'])), array('Geburtsort', $data['birthPlace'])));
    $pdf->fields(array(array('Straße und Hausnummer', $data['street'])));
    $pdf->fields(array(array('Postleitzahl', $data['postalCode']), array('Wohnort', $data['city'])));
    $pdf->fields(array(array('Mobilnummer', $data['phone']), array('E-Mail-Adresse', $data['email'])));
    $pdf->section('02', 'Mitgliedschaft und Aufgabe');
    $pdf->fields(array(array('Mannschaft', $data['teamLabel']), array('Rolle', $data['role'])));
    $pdf->fields(array(array('Mitgliedschaft', $data['membership'] === 'yes' ? 'Bereits Mitglied' : 'Mitgliedschaft wird hiermit beantragt')));
    $pdf->paragraph($data['contributionExempt'] ? 'Als Trainer bzw. Co-Trainer vom Mitgliedsbeitrag befreit. Beitragsordnung und Satzung gelten weiterhin.' : 'Für Betreuer ist der Beitragsstatus mit der Jugendleitung zu klären.');
    if ($data['membership'] === 'no') $pdf->check('Hiermit beantrage ich meine Mitgliedschaft im BSV Nordstern e.V. Radolfzell.', true);
    $pdf->check('Beitragsordnung gelesen und akzeptiert, auch bei Beitragsbefreiung.', true);
    $pdf->check('Vereinssatzung gelesen und akzeptiert.', true);
    if ($membershipOnly) {
        $pdf->paragraph('Die Aufnahme wird durch den Verein bearbeitet. Dieser Antrag enthält kein SEPA-Lastschriftmandat. Kontodaten zur Vertragsvorbereitung stehen in den getrennten Onboarding-Unterlagen.');
    } else {
        $pdf->section('03', 'Identitätsunterlagen');
        $pdf->fields(array(array('Personalausweis Vorderseite', 'Kopie als separate Anlage'), array('Personalausweis Rückseite', 'Kopie als separate Anlage')));
        $pdf->check('Verarbeitung der Ausweiskopie zur Identitätsprüfung im Trainer-Onboarding akzeptiert.', true);
        $pdf->section('04', 'Vertragsdaten und Kontoverbindung');
        $pdf->fields(array(array('Kontoinhaber', $data['accountHolder']), array('Kreditinstitut', $data['bankName'])));
        $pdf->fields(array(array('IBAN', $data['iban']), array('BIC', $data['bic'])));
        $pdf->paragraph('Kontodaten zur Vorbereitung des Trainervertrags; keine Erteilung eines Lastschriftmandats.');
        $pdf->section('05', 'Trainerkleidung');
        $pdf->paragraph('Der BSV stellt das JAKO Trainer-Set ' . $data['clothingSet'] . ' zur Verfügung. Gewünschte Kleidung und Größen zur Vorbereitung der Ausstattung:');
        foreach ($data['clothing'] as $item) {
            $pdf->fields(array(array($item['name'], $item['needed'] ? 'Größe: ' . $item['size'] : 'Nicht benötigt'), array('JAKO Artikelnummer', $item['articleNumber'])));
        }
        $pdf->check('Ich habe gelesen und akzeptiere, dass ich die vom BSV gestellten Kleidungsstücke zurückgeben muss, wenn ich meine Tätigkeit als Trainer innerhalb von 12 Monaten nach Beginn beende.', true);
        $pdf->section('06', 'Mannschaftsbus');
        $pdf->fields(array(array('Bus selbst fahren', $data['busUse'] === 'yes' ? 'Fahrberechtigung angefragt; Prüfung im Verein steht aus' : 'Derzeit keine Busnutzung angefragt')));
        if ($data['busUse'] === 'yes') {
            $rules = $data['busRules'];
            $pdf->fields(array(array('Altersvoraussetzung', 'Mindestens ' . $rules['minimumAge'] . ' Jahre; anhand des Geburtsdatums geprüft'), array('Bestätigte Busregeln', 'Fassung vom ' . $date($rules['version']))));
            $pdf->fields(array(array('Führerschein Vorderseite', 'Kopie als separate Anlage'), array('Führerschein Rückseite', 'Kopie als separate Anlage')));
            $pdf->check('Gültige Fahrerlaubnis für den Mannschaftsbus vorhanden; gültiger Führerschein wird bei jeder Busfahrt im Original mitgeführt. Einschränkungen werden sofort der Vorstandschaft gemeldet.', true);
            $pdf->check('Busregeln gelesen und Einhaltung bei jeder Nutzung bestätigt.', true);
            $pdf->check('Übermittlung und Verarbeitung der Führerscheinkopien zur Prüfung der Fahrberechtigung akzeptiert.', true);
            foreach ($rules['groups'] as $group) {
                $pdf->paragraph($group['title']);
                foreach ($group['rules'] as $rule) $pdf->paragraph('• ' . $rule);
            }
        }
        $pdf->section('07', 'Führungszeugnis und Datenschutz');
        $pdf->check('Anforderung eines erweiterten Führungszeugnisses durch den Verein und Einsicht durch die zuständige Person akzeptiert.', true);
        $pdf->paragraph('Der Verein stellt die schriftliche Aufforderung zur Vorlage aus. Die betroffene Person beantragt das Führungszeugnis selbst. Das Führungszeugnis ist kein Upload dieses Formulars.');
    }
    $pdf->check($membershipOnly ? 'Datenschutzhinweise gelesen und Verarbeitung der Angaben und Unterlagen für die Mitgliedschaft akzeptiert.' : 'Datenschutzhinweise gelesen und Verarbeitung der Angaben und Unterlagen für Onboarding, Vertragsvorbereitung und Trainerkleidung akzeptiert.', true);
    if (!$membershipOnly) {
        $pdf->check('Übermittlung meiner Kontaktdaten, Mannschaft und Rolle an das Schlüsselmanagement und die Mitgliederverwaltung für meinen Start im Trainerteam akzeptiert.', true);
        if ($data['dfbnetRequested']) $pdf->check('Übermittlung meiner Kontaktdaten, Anschrift, Geburtsdatum, Geburtsort, Mannschaft und Rolle an den DFBnet-Administrator zur Einrichtung meines Zugangs akzeptiert.', true);
    }
    $pdf->paragraph($membershipOnly
        ? 'Mit meiner Unterschrift beantrage ich die Mitgliedschaft und bestätige die Richtigkeit meiner Angaben sowie die von mir ausgewählten Erklärungen zum Mitgliedsantrag.'
        : 'Mit meiner Unterschrift bestätige ich die Richtigkeit meiner Angaben und die von mir ausgewählten Erklärungen in diesem Formular.');
    if (!$membershipOnly && $data['membership'] === 'no') $pdf->paragraph('Diese Unterschrift gilt auch für den gesondert erstellten Mitgliedsantrag.');
    $pdf->fields(array(array($data['isMinor'] ? 'Unterschrift durch sorgeberechtigte Person' : 'Unterschrift durch', $data['isMinor'] ? $data['guardianFirstName'] . ' ' . $data['guardianLastName'] : $data['firstName'] . ' ' . $data['lastName'])));
    $pdf->signature($data['signatureBinary'], $data['signingPlace'], $date($data['signingDate']), $membershipOnly ? '03' : '08');
    return $pdf->Output('S');
}
