# Vollständiger Mitgliedsantrag als PDF

Der PHP-Endpunkt erzeugt für jede Abteilung einen vollständigen Mitgliedsantrag
im BSV-Layout. Mitglied und interne Bearbeitung erhalten dieselben PDF-Bytes.
Beim Fußball kommt der bestehende SBFV-Spielgenehmigungsantrag zusätzlich dazu.
Die bisherige Unterschriften-PNG bleibt ebenfalls erhalten. Hochgeladene Nachweise
werden weiterhin nur intern mitgeschickt; ihre Dateinamen stehen im Mitgliedsantrag.
Trainerbenachrichtigungen enthalten weiterhin keine Anlagen oder Bankdaten.

## Inhalt

- Persönliche Daten, Abteilung, Mannschaft und zugehöriges Trainerteam
- Kontaktperson einschließlich Verhältnis zum Mitglied und Telefonnummer
- Unterstützungsbereitschaft und vollständiger Freitext
- Bankverbindung und Wortlaut des SEPA-Mandats
- Alle Einwilligungen mit sichtbarer Checkbox und explizitem Ja/Nein
- Fußball-Antragsart, Identitätsnachweise, Vereinswechsel, Sperre und internationale Angaben
- Liste der hochgeladenen Dateien, Ort, Datum und eingebettete Unterschrift

Nicht anwendbare Angaben werden als solche kenntlich gemacht; deaktivierte,
nicht übermittelte Formularabschnitte werden nicht als Zustimmung interpretiert.
Spamschutz, Honeypot und Sitzungsinformationen gehören nicht zum Antragsdokument.
Die Abschnittsnummern des PDFs folgen der Dokumentreihenfolge. Übliche Anträge
umfassen zwei Seiten, mit Fußball-Zusatzangaben drei. Lange Eingaben laufen auf
weitere Seiten um; Felder werden nicht abgeschnitten. Datums-/Eingangsangaben und
Antragsnummer erscheinen zusätzlich zur Seitenzahl im Dokument.

## Technik und Prüfung

`public/api/membership-pdf.php` verwendet die lokal mitgelieferte tFPDF-Version
1.33 mit eingebetteten DejaVu-Sans-Schriften. PHP benötigt mindestens Version
7.3 sowie mbstring und zlib; der bestehende Mailversand benötigt weiterhin cURL.
PDF und Unterschrift werden nur im Arbeitsspeicher verarbeitet. Der PDF-Generator
lädt keine externen Bilder oder Schriftdateien nach. Lediglich Schriftmetriken
können ohne Antragsdaten im Bibliotheksverzeichnis zwischengespeichert werden.

```sh
php -l public/api/membership-pdf.php
php -l public/api/membership-v3.php
BSV_PDF_PREVIEW_DIR=/tmp/bsv-membership-preview node --test tests/membership-pdf.test.mjs
```

Die Tests benötigen lokal PHP mit GD (nur für die synthetische Testunterschrift),
mbstring, zlib und cURL sowie `pdftotext` und `pdfinfo` aus Poppler. Sie erzeugen
PDFs mit erfundenen Daten und testen den echten PHP-Endpunkt mit einer lokalen
Mail-Bridge. Es werden keine echten E-Mails verschickt. Geprüft werden außerdem
gleiche Anhänge bei beiden Empfängern, Trainerbenachrichtigungen, Unicode,
lange Angaben, Upload-Listen und Abbruch bei fehlerhaften PDFs oder zu vielen Anlagen.

## Bereitstellung

GitHub Pages veröffentlicht ausschließlich die Website. Der PHP-Endpunkt unter
`https://api.bsvnordstern.de/api/membership.php` muss separat aktualisiert werden.
Benötigte Dateien, jeweils unter `/api/` auf dem PHP-Webspace:

- `membership.php` (bestehender Einstiegspunkt)
- `membership-v3.php`
- `membership-pdf.php`
- `assets/bsv-wappen.png`
- `vendor/tfpdf/` mit PHP-Dateien, beiden TTF-Schriften und Lizenzhinweisen

Zuerst Bibliothek, Schriften, Wappen und PDF-Generator bereitstellen; zuletzt
`membership-v3.php` austauschen. Die private `membership-config.php` bleibt
unverändert auf dem Server. Lokal erzeugte `*.mtx.php`, `*.cw.dat` und
`*.cw127.php` nicht mit hochladen, da sie lokale Dateipfade enthalten können.
Die neue Erläuterung am Onlineformular wird über den normalen Website-Deploy
veröffentlicht. Änderungen an Supabase oder der Empfängerzuordnung sind nicht nötig.
