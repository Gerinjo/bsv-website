# Gemeinsame E-Mail-Konfiguration

Alle Supabase Edge Functions, die E-Mails versenden, verwenden
`_shared/email-service.ts`. Der gemeinsame Dienst erzwingt den Testmodus für
`to`, `cc`, `bcc` und `reply-to` und kennzeichnet Testnachrichten automatisch.

## Zentrale Secrets

```bash
supabase secrets set EMAIL_DELIVERY_MODE=test
supabase secrets set EMAIL_TEST_RECIPIENT=jerome.ernsberger@gmail.com
supabase secrets set RESEND_API_KEY=...
supabase secrets set MAIL_FROM="BSV Nordstern Radolfzell <...>"
```

Der Versand ist ausfallsicher auf Test gestellt. Für Live-Zustellung müssen
**beide** Werte bewusst gesetzt sein:

```bash
supabase secrets set EMAIL_DELIVERY_MODE=live
supabase secrets set EMAIL_LIVE_CONFIRMATION=SEND_BSV_EMAILS_TO_REAL_RECIPIENTS
```

Fehlt die Bestätigung oder ist sie falsch, bleibt der Testmodus aktiv. Das
frühere Secret `EMAIL_TEST_MODE` wird absichtlich nicht mehr ausgewertet.

Auch das allgemeine Kontaktformular verwendet diesen Versandweg. Die Edge
Function `contact-request` speichert die Anfrage, liest den zuständigen
Empfänger aus `public.contact_empfaenger` und versendet die Nachricht über
Resend. Im Testmodus landet auch diese Nachricht ausschließlich bei
`EMAIL_TEST_RECIPIENT`.

## Empfänger des Kontaktformulars bearbeiten

Die Zuordnung wird im Supabase Dashboard unter **Table Editor →
contact_empfaenger** gepflegt:

- `schluessel`: technische Zuordnung des Formulars; normalerweise nicht ändern
- `bezeichnung`: lesbarer Name des Bereichs oder der Mannschaft
- `email`: vorgesehener Live-Empfänger
- `aktiv`: deaktiviert die Zustellung für diesen Eintrag, wenn der Wert `false` ist

Die Tabelle ist nicht für anonyme Website-Besucher freigegeben. Das Formular
übermittelt nur den technischen Schlüssel; die E-Mail-Adresse wird
ausschließlich innerhalb der Edge Function gelesen.

Neue Anfragen und der Versandstatus stehen unter **Table Editor →
contact_anfragen**. Kurzlebige Rechenaufgaben für den Spamschutz liegen in
`contact_captcha_challenges` und werden nach Benutzung sofort gelöscht.

Der öffentliche Endpunkt lautet:

```text
https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/contact-request
```

Optional kann er beim Website-Build mit `PUBLIC_CONTACT_FORM_ENDPOINT`
überschrieben werden.

## Fördervereinsantrag

`foerderverein-membership` nimmt den vollständigen Online-Antrag inklusive
SEPA-Mandat und digitaler Unterschrift entgegen. Der zuständige Empfänger wird
mit dem Schlüssel `foerderverein` aus `public.contact_empfaenger` gelesen. Die
Antragstellenden erhalten eine separate Eingangsbestätigung ohne Bankdaten.

In `public.foerderverein_antraege` wird nur ein minimales Versandprotokoll
gespeichert. IBAN, BIC, Anschrift, Geburtsdatum, Telefonnummer, Freitexte und
Unterschrift werden dort ausdrücklich nicht abgelegt. Die Function verwendet
den gemeinsamen E-Mail-Testmodus und den einmal nutzbaren Spamschutz des
Kontaktformulars.

Der öffentliche Endpunkt lautet:

```text
https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/foerderverein-membership
```

Optional kann er beim Website-Build mit
`PUBLIC_FOERDERVEREIN_FORM_ENDPOINT` überschrieben werden.

## Mitgliedsantrag

`membership-email` ist die geschützte Mailbrücke für den bestehenden
PHP-Endpunkt, der PDF und Anlagen erzeugt. Zusätzlich erforderlich:

```bash
supabase secrets set MEMBERSHIP_EMAIL_SECRET=...
```

Auf dem PHP-Webspace wird derselbe geheime Wert als
`BSV_MEMBERSHIP_EMAIL_SECRET` gesetzt. Alternativ liest der PHP-Endpunkt bei
fehlender Umgebungsvariable `/api/membership-config.php`:

```php
<?php
if (!defined('BSV_MEMBERSHIP_CONFIG_LOADER')) {
    http_response_code(404);
    exit;
}
return array('email_secret' => 'HIER_DEN_GEMEINSAMEN_SCHLUESSEL_EINTRAGEN');
```

Die echte Datei mit Schlüssel ausschließlich im privaten Upload-Verzeichnis
außerhalb des Projekts aufbewahren und per SFTP neben `membership-v3.php`
hochladen. Sie gehört weder ins Git-Repository noch ins lokale Astro-Verzeichnis
`public`, dessen Dateien der Entwicklungsserver unverarbeitet ausliefert.
Direkte HTTP-Aufrufe der PHP-Konfiguration erhalten eine leere 404-Antwort.
Ohne Schlüssel wird keine Mail versendet. Die Umgebungsvariable hat Vorrang.

### Sponsoren in der Willkommensmail

Der Website-Build veröffentlicht unter `/mitgliedschaft-sponsoren.json` die
freigegebenen Sponsoren mit Logo, Website und Jugendzuordnung aus derselben
Datenquelle wie die Sponsorenübersicht. Das PHP-Formular wählt pro
Willkommensmail zufällig bis zu vier verschiedene Partner: bei der Abteilung
Jugendfußball ausschließlich Jugendsponsoren, sonst aus allen freigegebenen
Partnern. Die Auswahl richtet sich nach der Abteilung, nicht nach dem Alter.

Der Dank am Mailende enthält verlinkte Logos und einen Link auf `/werbepartner`.
Die Textversion nennt dieselben ausgewählten Partner mit ihren Webadressen.
PHP hält die öffentlichen Feed-Daten eine Stunde in
`/api/membership-sponsors-cache.json` vor. Bei einem Abruffehler kann ein bis zu
24 Stunden alter Cache verwendet werden; ohne gültige Daten bleiben Dank und
Übersichtslink erhalten. Ein Fehler des Sponsorenfeeds verhindert den Versand
des Mitgliedsantrags nicht.

Für die erste Bereitstellung zuerst die Website mit dem neuen JSON-Endpunkt
veröffentlichen und anschließend die aktualisierte `membership-v3.php` auf den
PHP-Webspace hochladen. Spätere Sponsorenänderungen kommen automatisch über die
bestehende tägliche Synchronisierung und den Website-Build in die Mailauswahl.

### Versandfehler untersuchen

Der PHP-Endpunkt läuft auf `api.bsvnordstern.de`. Änderungen an
`public/api/membership-v3.php` müssen dort separat bereitgestellt werden:
Der GitHub-Pages-Build entfernt PHP-Dateien und aktualisiert diesen Server nicht.

Bei einem fehlgeschlagenen Versand protokolliert PHP unter `[membership-mail]`
die Antragsreferenz, den Nachrichtentyp, einen Fehlercode sowie HTTP- und
cURL-Status. Die Referenz erscheint auch im Formular. Antragsdaten, Anlagen,
Adressen, Antwortinhalte und geheime Schlüssel werden dabei nicht protokolliert.

Zusätzlich wird derselbe bereinigte Eintrag in
`/api/membership-mail-errors.php` auf dem PHP-Webspace angehängt. Die Datei
entsteht beim nächsten Versandfehler, sofern das Verzeichnis für PHP schreibbar
ist. Sie kann per SFTP heruntergeladen und als Text geöffnet werden; ein
HTTP-Aufruf endet durch einen PHP-Schutz mit Status 404 und leerem Inhalt.
Nach Abschluss der Fehlersuche kann die Datei auf dem Webspace gelöscht werden.

- `missing_bridge_secret`: `BSV_MEMBERSHIP_EMAIL_SECRET` fehlt in der
  Laufzeitumgebung des PHP-Webservers.
- `curl_unavailable`: Die PHP-Erweiterung cURL fehlt.
- `bridge_connection_failed`: DNS, TLS oder die ausgehende Verbindung prüfen;
  der cURL-Code grenzt den Fehler ein.
- `unauthorized`: PHP-Secret und Supabase-Secret `MEMBERSHIP_EMAIL_SECRET`
  müssen übereinstimmen. Die Werte nicht in Logs oder Tickets kopieren.
- `recipient_*` / `invalid_recipient_configuration`: Die geschützte
  Empfängerzuordnung in `contact_empfaenger` prüfen.
- `email_failed`: Die Logs der Edge Function `membership-email` und den
  Maildienst prüfen.
- `request_too_large` / `attachments_too_large`: Die Größe der Anlagen prüfen.

Die Erreichbarkeit des Spamschutzes allein bestätigt keinen funktionierenden
E-Mail-Versand. Für eine Versandprobe keine echten Mitgliedsdaten verwenden.

Die internen Empfänger werden nicht mehr über ein Edge Secret gepflegt,
sondern serverseitig aus `public.contact_empfaenger` geladen:

- `membership` und `passwesen` erhalten den vollständigen Antrag samt Anlagen.
- Bei bekannter Mannschaft erhält der passende `team--...`-Eintrag eine
  getrennte Information mit den erforderlichen Mitglieds- und Kontaktdaten,
  aber ohne Bankdaten, Unterschrift, PDF oder weitere Uploads.
- Zusätzliche Traineradressen stehen in `weitere_emails`. Die primäre Adresse
  bleibt in `email`.

RLS und fehlende Rechte für `anon` und `authenticated` verhindern, dass die
Empfängeradressen über die öffentliche Website ausgelesen werden. Auch diese
Nachrichten verwenden den zentralen Testmodus aus `_shared/email-service.ts`.
