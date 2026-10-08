# Gemeinsame E-Mail-Konfiguration

Automatische Warnungen bei Überschneidungen von Spiel und Jugendtraining sowie
fehlenden Schiedsrichtern bei Jugendheimspielen sind in
[football-alerts/README.md](football-alerts/README.md) dokumentiert. Sie verwenden
dieselben Trainerempfänger und denselben zentralen Versanddienst.

Die Anmeldung auf `/newsletter` zum **Newsletter des BSV Nordstern Radolfzell** verwendet denselben E-Mail-Dienst.
Double-Opt-in, Sponsoren, Verteileraufnahme, Wiederholungen und Bereitstellung sind
in [newsletter/README.md](newsletter/README.md) beschrieben.

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

## Trainer-Onboarding

`membership-email` nimmt zusätzlich `trainer-onboarding`, `trainer-keys`,
`trainer-dfbnet`, `trainer-membership` und `trainer-welcome` vom geschützten
PHP-Antragsserver entgegen. Der eigene Schalter `TRAINER_ONBOARDING_MAIL_MODE`
ist standardmäßig `test`: alle Trainer-Mails gehen ausschließlich an
`jerome.ernsberger@gmail.com`, einschließlich Reply-To und unabhängig vom
zentralen `EMAIL_TEST_RECIPIENT`. Der gemeinsame Maildienst unterdrückt in diesem
Modus weitere To/Cc/Bcc-Empfänger. Für echte Trainerzustellung müssen
`TRAINER_ONBOARDING_MAIL_MODE=live` und der oben beschriebene bestätigte zentrale
Livebetrieb gleichzeitig aktiv sein. Änderungen des Schalters nur als privates
Supabase-Secret vornehmen.
Der PHP-Service dieser Testveröffentlichung sendet außerdem für alle fünf
Nachrichtentypen `forceTestMode: true`. Die Mailbrücke priorisiert diese sichere
Testanforderung auch bei aktivierten Live-Schaltern. Vor einem späteren
Livebetrieb muss dieser serverseitige Schutz bewusst entfernt werden.

Im Livebetrieb erhält die Jugendleitung die vollständigen Unterlagen. Die festen
Ziele für Schlüssel, DFBnet und Mitgliederverwaltung stehen serverseitig in
`_shared/trainer-onboarding-email.mjs`. Kontakte für Schlüssel/DFBnet erhalten
keine Anhänge; die Mitgliederverwaltung nur den gesonderten Mitgliedsantrag.
Die Begrüßungs-Mail enthält die PDFs des Trainers und wird bei allen Altersklassen
an ihn adressiert. Einzelne Nachrichten verwenden je Anmeldenummer und Modus
eigene Resend-Idempotenzschlüssel. Nach dem Versand der Hauptunterlagen gemeldete
Teilfehler werden auf der Dankeseite angezeigt und lösen keinen Neuversand aus.

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

## Weihnachtlicher Bambini-Spieltag

Die Mannschaftsanmeldung auf `/erlebnis/weihnachts-bambini-spieltag` verwendet
ebenfalls `contact-request` und dessen einmal nutzbaren Spamschutz. Termin und
Wunschzeiten stehen zentral in `_shared/bambini-event.mjs`: 12. Dezember 2026,
Unterseesporthalle Radolfzell, Starts um 09:00, 12:00 und 15:00 Uhr.

`contact-request/bambini-registration.mjs` prüft den Verein, die erforderliche
Telefonnummer, mindestens eine der drei Wunschzeiten und die Bestätigung des
Anmeldehinweises. Vorname, Nachname, E-Mail und Datenschutzbestätigung werden
wie bei den übrigen Kontaktanfragen geprüft. Es werden keine Kinderdaten
abgefragt.

Das öffentliche Thema `event-bambini-weihnachten-2026` wird serverseitig auf den
bestehenden Empfänger `person-jerome-ernsberger` abgebildet. Trainerkontakt,
Verein, sämtliche ausgewählten Wunschzeiten und optionale Anmerkungen kommen
in einer E-Mail an die Organisation an; Antworten gehen an den Trainerkontakt.
Teilnahme und Startzeit werden anschließend persönlich bestätigt. Eine
automatische Bestätigungsmail an die anmeldende Person ist nicht vorgesehen.

Die private Speicherung erfolgt in `contact_anfragen`, mit dem Ereignisthema
in `thema` und den Anmeldedaten in `nachricht`. Der zentrale E-Mail-Modus bleibt
maßgeblich. Bei einem Versandfehler nach erfolgreicher Speicherung zeigt das
Formular einen Kontaktlink und verhindert erneutes Absenden derselben
Anmeldung. Es ist keine Datenbankmigration erforderlich.

Zur Bereitstellung zuerst die aktualisierte öffentliche Edge Function
`contact-request` deployen, danach die Website. Die Verhaltenstests laufen mit
`node --test tests/bambini-registration.test.mjs` ohne echten E-Mail-Versand.

## URMEL-Cup und Bodensee Indoor Girls Cup

Die URMEL-Anmeldung auf `/erlebnis/urmel-bambini-spieltag` nutzt dieselbe
Wunschzeitenprüfung wie der Weihnachts-Spieltag. Eigene Veranstaltungsdaten
stehen in `_shared/urmel-event.mjs`; das Thema lautet `event-urmel-cup`.

Die Girls-Cup-Anmeldung auf `/erlebnis/bodensee-indoor-girls-cup` verwendet
`_shared/girls-cup-event.mjs` und das Thema `event-bodensee-indoor-girls-cup`.
Ein oder beide Turniertage können gewählt werden. Teamanzahlen sind je
Altersklasse anzugeben: E/D am 20. Februar und C/B am 21. Februar 2027.
`contact-request/girls-cup-registration.mjs` prüft, dass ausgewählte Tage und
Altersklassen zusammenpassen, und berechnet die Gebühr serverseitig:
40 € für das erste Team, 30 € für jedes weitere Team, gemeinsam für beide
Tage dieser Anmeldung. Preisangaben aus dem Browser werden nicht übernommen.

Beide Themen gehen ebenfalls an `person-jerome-ernsberger` und verwenden
die bestehenden privaten Kontakttabellen und den Spamschutz. Die E-Mail
enthält den Trainerkontakt und alle ausgewählten Zeiten bzw. Tage und Teams;
beim Girls Cup zusätzlich die Gesamtgebühr. Die Teilnahme bestätigt die
Organisation persönlich. Neue Tabellen oder Migrationen sind nicht nötig.
Auch hier zuerst `contact-request`, dann die Website veröffentlichen.

## Fördervereinsantrag

`foerderverein-membership` nimmt den vollständigen Online-Antrag inklusive
SEPA-Mandat und digitaler Unterschrift entgegen. Der zuständige Empfänger wird
mit dem Schlüssel `foerderverein` aus `public.contact_empfaenger` gelesen
(aktuell `foerderverein@bsvnordstern.de`). Jeder Antrag geht zusätzlich als
BCC-Kopie an `jerome.ernsberger@gmail.com`, unabhängig von weiteren in der
Verwaltung hinterlegten Empfängern. Doppelte Adressen werden vermieden. Die
Antragstellenden erhalten eine separate Eingangsbestätigung ohne Bankdaten;
die interne Kopie enthält den vollständigen Antrag und die Unterschrift.

Das Formular zeigt Geburts- und Unterschriftsdatum als `TT.MM.JJJJ` an.
Erst beim Absenden werden die geprüften Werte in das ISO-Format umgewandelt.
Frontend und Versanddienst prüfen Kalendertage und verhindern zukünftige
Daten. Das vorbelegte Unterschriftsdatum richtet sich nach `Europe/Berlin`.

In `public.foerderverein_antraege` wird nur ein minimales Versandprotokoll
gespeichert. IBAN, BIC, Anschrift, Geburtsdatum, Telefonnummer, Freitexte und
Unterschrift werden dort ausdrücklich nicht abgelegt. Die Function verwendet
den gemeinsamen E-Mail-Testmodus und den einmal nutzbaren Spamschutz des
Kontaktformulars.

Vor der ersten Veröffentlichung die Migration
`20260816221827_foerderverein_online_antrag.sql` auf dem Website-Projekt
anwenden und `foerderverein-membership` samt relativen Abhängigkeiten
bereitstellen. Die Function ist wie das Kontaktformular öffentlich
(`verify_jwt = false`); Origin-Prüfung und einmal verwendbarer Spamschutz
sichern das Absenden ab. Anschließend den GET-Endpunkt sowie die privaten
Tabellenrechte prüfen und erst dann die Website veröffentlichen.

Der öffentliche Endpunkt lautet:

```text
https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/foerderverein-membership
```

Optional kann er beim Website-Build mit
`PUBLIC_FOERDERVEREIN_FORM_ENDPOINT` überschrieben werden.

## Mitgliedsantrag

### Optionaler Fördervereinsbeitritt im Hauptvereinsantrag

Abschnitt 05 bietet neben persönlicher Unterstützung einen unabhängigen,
standardmäßig nicht ausgewählten Fördervereinsbeitritt an. Erst bei Auswahl
werden der jährliche Förderbeitrag (11–10.000 Euro in ganzen Euro), eine
optionale Nachricht und drei eigene Bestätigungen für Mitgliedschaft,
Lastschriftmandat und Datenübermittlung eingeblendet. Nicht ausgewählte
Fördervereinsfelder sind deaktiviert und werden serverseitig ignoriert.

Bei Minderjährigen wird die volljährige, sorgeberechtigte Kontaktperson aus
Abschnitt 04 selbst Fördermitglied. Maßgeblich ist das Geburtsdatum des
Hauptvereinsmitglieds in Europe/Berlin, unabhängig von der gewählten Abteilung.
Das Formular ergänzt Geburtsdatum, Anschrift, E-Mail-Adresse und eigenen
BSV-Mitgliedsstatus der Kontaktperson. Vorgefüllte Kontaktdaten sind änderbar.
Der Mindestbeitrag beträgt für bereits selbst beim BSV gemeldete Kontaktpersonen
11 Euro, sonst 25 Euro. Die Mitgliedschaft des Kindes begründet keinen Rabatt.
Die gemeinsame Unterschrift gilt für den Hauptvereinsbeitritt des Kindes und den
eigenen Fördervereinsbeitritt der Kontaktperson. Beide PDFs gehen an deren
bestätigte E-Mail-Adresse. Das Fördervereins-PDF und die Fördervereinsmail
enthalten die eigenen Angaben der Kontaktperson, keine Geburtsdaten des Kindes.
Bei Volljährigen gilt der zusätzliche Antrag weiterhin für dieselbe Person.
Ein Wechsel der Person setzt die gesonderten Bestätigungen im Formular zurück.
Alte Kinderformulare ohne ausdrücklich bestätigte Kontaktperson werden vor
jedem Versand mit einem Hinweis zum Neuladen zurückgewiesen.

`membership-v3.php` validiert beide Anträge vor dem ersten Versand und erstellt
mit `foerderverein-pdf.php` ein separates Fördervereins-PDF. Dieses übernimmt
die benötigten Personen- und Kontodaten, Ort, Datum und dieselbe Unterschrift.
Es erhält eine eigene FV-Antragsnummer und verweist auf den Hauptvereinsantrag.
Mitgliederverwaltung und Antragsteller erhalten beide PDFs. Die neue,
geschützte Mailroute `foerderverein` löst ausschließlich den konfigurierten
Fördervereinsempfänger auf; sie erlaubt genau dessen PDF, keine Ausweise oder
Spielgenehmigungen. Eine BCC-Kopie geht stets an `jerome.ernsberger@gmail.com`,
sofern die Adresse nicht bereits zu den Empfängern gehört.

Ist die Hauptvereinszustellung erfolgreich, ein nachfolgender Versand aber
fehlgeschlagen, bleibt die Hauptanmeldung erfolgreich. Die Antwort nennt den
Fördervereinsstatus (`sent`, `failed`, `not_requested`) und den tatsächlichen
Status der Bestätigungsmail. Bei fehlgeschlagener Fördervereinsweiterleitung
erhält die Mitgliederverwaltung einen Hinweis zum Weiterleiten des bereits
vorliegenden PDFs. Die Oberfläche fordert nicht zum erneuten Antrag auf.
Die bestehenden Tabellen des separaten Fördervereinsformulars werden von
diesem kombinierten Versand nicht beschrieben; Bankdaten und Unterschriften
werden auch hierbei nicht in der Datenbank oder öffentlichen Dateien abgelegt.

Bereitstellung in dieser Reihenfolge:

1. `membership-email` mit den relativen Abhängigkeiten aktualisieren.
2. Auf `api.bsvnordstern.de` zuerst `membership-pdf.php` und
   `foerderverein-pdf.php`, anschließend `membership-v3.php` bereitstellen.
   Die private `membership-config.php` bleibt auf dem Server.
3. GET auf `/api/membership.php` prüfen: Die Antwort enthält
   `features.foerdervereinMembership: true` und
   `features.foerdervereinGuardianMembership: true`. Erst dann die Website publizieren.

Die Oberfläche aktiviert den gemeinsamen Beitritt nur, wenn der Server diese
Fähigkeit bestätigt. So wird eine Auswahl bei einer älteren Serverversion
nicht unbemerkt übergangen. Der separate Fördervereinsantrag bleibt verlinkt.

### Geschützte Mailbrücke

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

Der Dank direkt vor dem Förderverein enthält verlinkte Logos und einen Link auf `/werbepartner`.
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

- `membership`, `passwesen` und `membership-registration-copy` erhalten den vollständigen Antrag samt Anlagen.
- `membership-registration-copy` geht an `jerome.ernsberger@bsvnordstern.de` und wird ausschließlich bei Neuanmeldungen verwendet.
- Bei bekannter Mannschaft erhält der passende `team--...`-Eintrag eine
  getrennte Information mit den erforderlichen Mitglieds- und Kontaktdaten,
  aber ohne Bankdaten, Unterschrift, PDF oder weitere Uploads.
- Zusätzliche Traineradressen stehen in `weitere_emails`. Die primäre Adresse
  bleibt in `email`.

RLS und fehlende Rechte für `anon` und `authenticated` verhindern, dass die
Empfängeradressen über die öffentliche Website ausgelesen werden. Auch diese
Nachrichten verwenden den zentralen Testmodus aus `_shared/email-service.ts`.
