# BSV-Newsletter: Anmeldung und Bestätigung

Das Formular auf `/newsletter` sendet an die öffentliche Edge Function `newsletter`.
Es verwendet den bestehenden, einmal nutzbaren Spamschutz von `contact-request`.
Ein Konto oder Supabase-Login ist nicht erforderlich.

Der Newsletter hat noch keinen festgelegten Eigennamen. Sichtbare Texte verwenden
„Newsletter des BSV Nordstern Radolfzell“ oder „unser Newsletter“. Die bestehende
Segment-ID und historische Einwilligungskennungen bleiben unverändert.

## Produktionsanbindung am 24. September 2026

Die Website-Supabase-Instanz `avbkhyptztqitlgqnajn` enthält die beiden Migrationen
`20260924210448_newsletter_double_opt_in` und
`20260924210626_newsletter_worker_schedule`. Die Function `newsletter` und der
minütliche Cron-Job `bsv-newsletter-workflow` sind eingerichtet. Worker-Aufrufe
werden mit einem eigenen Secret authentifiziert; der gemeinsame E-Mail-Dienst
verwendet seine bereits vorhandene Live-Konfiguration.

Der bestehende Versandschlüssel besitzt keine Contacts-Rechte. Deshalb ist
`NEWSLETTER_RESEND_CONTACTS_API_KEY` separat hinterlegt. Die übrigen Formulare
behalten ihren bisherigen Versandschlüssel und ihre Einstellungen.

Der vollständige Produktionsablauf wurde mit einer offiziellen Resend-Testadresse
geprüft: vor Bestätigung kein Kontakt, anschließend Segmentaufnahme und genau eine
Willkommensmail mit drei Sponsoren, danach Abmeldung und Ablehnung des alten
Bestätigungslinks. Die Testadresse wurde aus Resend und der Anmeldetabelle entfernt.
Die wiederholten Cron-Aufrufe antworten mit HTTP 200. Die Website wird über den
bestehenden GitHub-Pages-Workflow bei einem Push auf `main` veröffentlicht.

## Media und getrennte E-Mail-Angebote

`/media` bündelt das Stadionheft als PDF und `/newsletter`. Das Media-Menü steht
hinter Sponsoring; die mobile Navigation öffnet dieselbe Übersicht. Die
Startseite verlinkt direkt unter dem Einstiegsbereich auf die Newsletter-Seite;
dort stellt das Formular beide Angebote zur Auswahl. Auf der Startseite und in den
Newsletter-Mails wird ebenfalls auf die laufende Konzeptphase hingewiesen.

Das Formular bietet `newsletter` oder `club_info` (nur allgemeine
Informations-E-Mails). Eine Anmeldung umfasst genau einen Verteiler. Wer beide
möchte, meldet sich separat für beide an und bestätigt beide Links. Der Server
prüft die Auswahl und speichert sie zusammen mit einem eigenen Einwilligungsstand.
Bestätigung und Abmeldung verwenden ausschließlich das zum Token gespeicherte
Thema. Informations-E-Mails umfassen Einladungen zu Vereinsversammlungen und
organisatorische Mitteilungen; sie erteilen keine Newsletter-Einwilligung.

Die Migration `20260925090425_email_subscription_topics.sql` erweitert die
bestehenden privaten Tabellen um `topic`. Bestehende Datensätze bleiben
Newsletter-Abonnements. Die Eindeutigkeit gilt für Adresse, Versandmodus und
Thema. `newsletter_request_topic` nimmt die neue Auswahl entgegen; die bisherige
Funktion `newsletter_request` bleibt als Newsletter-Aufruf kompatibel. Die
Mitgliedsantragsintegration unterstützt beide Auswahlen mit einer gemeinsamen Verifizierung (siehe unten).

Der Informations-Verteiler bei Resend heißt **BSV Nordstern – Informations-E-Mails**
und hat die ID `13c075cd-265a-42d5-a220-4ea98307d83f`. Optional überschreibt
`NEWSLETTER_INFO_SEGMENT_ID` diese Zuordnung. Der Newsletter behält seine bisherige
Segment-ID. Der Worker fügt ausschließlich bestätigte Adressen zum jeweiligen
Segment hinzu; eine Abmeldung entfernt nur dieses Segment. Globale Resend-
Abmeldungen werden weiterhin respektiert. Broadcasts für Informations-E-Mails
müssen das Informations-Segment verwenden.

Zur Veröffentlichung zuerst ausschließlich die genannte Migration anwenden,
danach die Funktionen `newsletter` und `membership-email` (gemeinsame
E-Mail-Vorlage) aktualisieren und die Website bereitstellen. Die SQL-Prüfung
`supabase/tests/email_subscription_topics.sql` ergänzt die bisherigen Tests um
getrennte Einwilligungen, Mitgliedsanträge und Abmeldungen derselben Adresse.

## Ablauf

### Auswahl im Mitgliedsantrag

Beide freiwilligen Häkchen starten die Verifizierung: `emailNewsletterAccepted`
und `emailGeneralInfoAccepted` werden vom PHP-Formular als echte boolesche Werte
an die authentifizierte Mailbrücke übergeben. Die Eingangsbestätigung mit dem
Mitgliedsantrag bleibt eine eigene Nachricht.

`newsletter_request_membership_topics` legt für alle noch unbestätigten,
ausgewählten Angebote einen privaten Bestätigungsvorgang an. Ein BSV-Mail mit
Sponsoren enthält genau einen Link; ein Klick bestätigt die gespeicherte Auswahl
atomar. Bereits bestätigte Angebote behalten ihre Einwilligung und Abmeldelinks.
Auch eine Anmeldung ausschließlich für Informations-E-Mails wird verifiziert.
Die gemeinsame Willkommensmail enthält je Angebot einen eigenen Abmeldelink.
Der Worker synchronisiert nur bestätigte Angebote in die jeweiligen Segmente.
Globale Resend-Abmeldungen werden weiterhin respektiert.

`newsletter_confirmation_batches` und `newsletter_confirmation_items` halten
Token-Hashes und die genaue Version der beteiligten Anmeldungen fest. Ein alter
oder teilweise überholter Link bestätigt keine andere Auswahl. Wiederholte
Antragsnummern lösen weder zusätzliche Mails noch eine erneute Anmeldung nach
Abmeldung aus. Ein noch gültiger Vorgang mit identischer Auswahl wird wiederverwendet.
Die Einwilligungsfassung lautet `mitgliedsantrag-email-auswahl-2026-09-25`.
Test- und Live-Modus bleiben getrennt. Anonyme und angemeldete Browser haben
keinen direkten Zugriff auf Tabellen oder RPCs. Alte Links der Einzelanmeldung
bleiben gültig; die neue API versteht gemeinsame Links auch aus einer älteren,
zwischengespeicherten Bestätigungsseite.

Die Migration `20260925124921_membership_email_confirmation_batches.sql` ist
vor den aktualisierten Functions `newsletter` und `membership-email` einzuspielen.
Zusätzlich Website und `public/api/membership-v3.php` auf dem PHP-Host aktualisieren.
Fehlschläge der Vormerkung ändern nicht den Erfolg des Mitgliedsantrags; das
Formular verweist dann auf `/newsletter`. Versandfehler werden erneut versucht.
Unbestätigte Vorgänge werden nach sieben Tagen entfernt. Versandaufträge für
beide Themen werden je Adresse nacheinander verarbeitet, einschließlich Abmeldungen.

Die Datenbanktests in `supabase/tests/membership_email_confirmation_batches.sql`
innerhalb einer Transaktion ausführen und anschließend zurückrollen. Sie prüfen
beide Auswahlen, nur Informationen, Wiederholungen, unabhängige Abmeldungen,
überholte/abgelaufene Links, bestehende Abonnements und Zugriffsrechte.

Die Migration `20260924215451_membership_newsletter_opt_in.sql` und die erweiterte
Function `membership-email` sind im Website-Projekt bereitgestellt. Für die
Aktivierung ist zusätzlich die aktualisierte `public/api/membership-v3.php` auf
`api.bsvnordstern.de` erforderlich. Die vorbereitete Upload-Datei liegt lokal
unter `/home/gerinjo/bsv-api-upload/membership-v3.php`; GitHub Pages aktualisiert
diesen PHP-Server nicht. Die private `membership-config.php` bleibt unverändert.
Die Website-Hinweise sind vorbereitet; ihre Veröffentlichung erfolgt zusammen
mit der PHP-Aktivierung. Der neue Mailbrücken-Ablauf wurde mit einer offiziellen
Resend-Testadresse produktiv geprüft: ohne Auswahl keine Anmeldung, mit Auswahl
zunächst ausstehend, Cron-Versand mit drei Sponsoren, Freischaltung und eine
Willkommensmail nach Klick. Eine neue Anfrage für dieselbe bestätigte Adresse
erzeugte keinen zweiten Link; eine wiederholte Antragsnummer nach Abmeldung
reaktivierte das Abonnement nicht. Die synthetischen Daten wurden entfernt.

### Anmeldung auf der Newsletter-Seite

1. `subscribe`: E-Mail normalisieren, Einwilligung und Spamschutz prüfen. Eine
   private Anmeldung und ein Bestätigungsauftrag werden atomar gespeichert.
   Die Person ist noch kein Newsletter-Empfänger und wird nicht zu Resend Contacts
   hinzugefügt. Gleiche Adressen können höchstens alle fünf Minuten und fünfmal
   täglich eine Nachricht anfordern. Pro abgeleitetem IP-Schlüssel sind zehn
   Anfragen stündlich erlaubt. Die Antwort verrät keinen vorhandenen Anmeldestatus.
2. Die Nachricht enthält einen zufälligen 256-Bit-Link, gültig für 48 Stunden.
   Die Seite `/newsletter/bestaetigen#token=…` bestätigt per POST und entfernt den
   Token aus der Browseradresse. Reine HTTP-GETs ändern keine Anmeldung. Die Seite
   bindet keine Analyse- oder Fremdskripte ein. Ein Klick auf denselben Link ist
   wiederholbar, erzeugt aber nur einen Willkommensauftrag.
3. Nach Bestätigung werden Einwilligungsfassung und Zeitpunkt gespeichert. Der
   Workflow fügt die Adresse im Live-Modus zum bestehenden Newsletter-Segment bei Resend
   hinzu und versendet danach die Willkommensmail. Ein fehlgeschlagener Versand
   nimmt die erteilte Einwilligung nicht zurück.
4. Der Link in der Willkommensmail führt zu einer Abmeldeseite mit Bestätigungsbutton.
   Die Abmeldung entzieht lokal die Freigabe und entfernt die Person aus dem
   Newsletter-Segment. Alte Bestätigungslinks können sie nicht wieder anmelden.
   Die normalen Newsletter-Broadcasts verwenden weiterhin Resends Abmeldelink.

Die Segment-ID `76a53fca-4c76-40a7-8c56-404806f88364` stammt aus den vorhandenen
Resend-Metadaten der September-Ausgabe im Schwesterprojekt `bsv-socialmedia`.
Sie ist über `NEWSLETTER_RESEND_SEGMENT_ID` überschreibbar. Broadcasts müssen
dieses Segment verwenden. Die lokale Tabelle ist der Einwilligungsnachweis,
kein Ersatz für Resends aktuellen Abmeldestatus. Bestehende globale Resend-
Abmeldungen werden ausdrücklich nicht zurückgesetzt; solche Anmeldungen landen
mit `resend_global_opt_out` zur Klärung im Versandprotokoll. Der Bestätigungsseite
wird dieser Sonderfall nach dem ersten Zustellversuch angezeigt.

## Gestaltung und Sponsoren

Beide Nachrichten werden als HTML und Text mit grün-gelbem BSV-Layout, Wappen,
Vereinsanschrift, Impressum, Datenschutz und freundlicher Ansprache erstellt.
Pro Nachricht werden bis zu drei unterschiedliche Partner zufällig aus dem
bestehenden öffentlichen Feed `/mitgliedschaft-sponsoren.json` ausgewählt.
HTML und Text verwenden dieselbe Auswahl. Bei einem Ausfall des Feeds bleiben
Dank und Link zur Partnerübersicht erhalten. Gespeicherte Nachrichten werden bei
Wiederholungen unverändert versendet, einschließlich Sponsorenauswahl.

## Bereitstellung

Die Umsetzung im Repository veröffentlicht weder Website noch Edge Function
automatisch. Vor der Freischaltung:

1. Die Migration `20260924210448_newsletter_double_opt_in.sql` im Website-Projekt
   anwenden. Bestehende Migrationshistorie beachten; keine fremden ausstehenden
   Migrationen ungeprüft mit ausführen.
2. Vorhandene Secrets `RESEND_API_KEY`, `MAIL_FROM`, `ALLOWED_ORIGINS` und den
   zentralen E-Mail-Modus prüfen. Für Contacts/Segments kann separat
   `NEWSLETTER_RESEND_CONTACTS_API_KEY` hinterlegt werden. Der gemeinsame
   `RESEND_API_KEY` bleibt dann ausschließlich für den E-Mail-Versand zuständig.
   Ohne separaten Schlüssel muss er zusätzlich Rechte auf Contacts/Segments haben.
   Ein Schlüssel nur für E-Mail-Versand reicht für die Verteileraufnahme nicht aus.
3. Einen eigenen zufälligen `NEWSLETTER_WORKER_SECRET` als Edge Secret und unter
   demselben Wert als Vault-Secret `newsletter_worker_secret` hinterlegen.
   `newsletter_function_url` in Vault auf
   `https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/newsletter` setzen.
   Secrets nur im Dashboard oder über eine private Secret-Datei setzen, niemals
   in Quellcode, SQL-Dateien, Browsercode oder Logs.
4. Nur die neue Function bereitstellen:

   ```sh
   npx supabase functions deploy newsletter --project-ref avbkhyptztqitlgqnajn
   ```

   `verify_jwt = false` steht in `supabase/config.toml`. Schreibende Aktionen
   prüfen jeweils Captcha/Einwilligung, einen geheimen Link oder den Worker-Key.
5. `supabase/setup/newsletter-worker.sql` ausführen. Der minütliche Aufruf verarbeitet
   fehlgeschlagene Zustellungen und bereinigt abgelaufene Daten. Ohne diesen Job
   gibt es nur den unmittelbaren Versandversuch; Wiederholungen und Bereinigung
   sind dann nicht vollständig eingerichtet.
6. Website bauen und veröffentlichen. `PUBLIC_NEWSLETTER_ENDPOINT` überschreibt
   bei Bedarf den Standardendpunkt. `NEWSLETTER_SITE_URL` ist die serverseitige
   Zieladresse für Links (Standard `https://bsvnordstern.de`, optional mit Basispfad).
7. Den Ablauf zunächst im bestehenden Testmodus prüfen. Dieser bleibt unverändert:
   alle Nachrichten gehen ausschließlich an `EMAIL_TEST_RECIPIENT`. Test- und
   Live-Anmeldungen sind getrennt; Testadressen kommen niemals ins Resend-Segment.
   Eine Umschaltung des zentralen E-Mail-Modus betrifft auch andere Formulare und
   erfolgt nach dem bestehenden Verfahren aus `../README.md`.

## Zustellung und Betrieb

`newsletter_jobs` ist der dauerhafte Benachrichtigungsworkflow. Ein Auftrag erhält
eine zeitlich begrenzte Lease; pro Adresse läuft höchstens ein Auftrag gleichzeitig.
Nach einem Absturz kann ein anderer Worker übernehmen. Bestätigungs- und
Willkommensmail erhalten je einen Resend-Idempotenzschlüssel. Bis zu zehn Versuche
mit wachsendem Abstand sind möglich; nach 23 Stunden wird gestoppt, damit keine
Wiederholung außerhalb von Resends 24-Stunden-Idempotenzfenster erfolgt.

Die privaten Auftragspayloads enthalten bis zur erfolgreichen Zustellung die
fertige Mail und damit auch den Bearer-Link. Nach Erfolg, Abbruch oder endgültigem
Fehler wird der Inhalt entfernt. In der Anmeldung selbst liegen ausschließlich
SHA-256-Hashes der Tokens. Unbestätigte Erstanmeldungen werden nach sieben Tagen
gelöscht. IP-Adressen werden nicht im Klartext gespeichert; HMAC-Schlüssel zur
Begrenzung der Anfragen verfallen nach einem Tag. Bestätigte Einwilligungs- und
Abmeldeinformationen bleiben als Nachweis erhalten.

Vor Newsletter-Broadcasts `newsletter_jobs` auf `pending` und `failed` prüfen.
`resend_contact_401/403` bedeutet meist einen unpassenden Resend-Schlüssel,
`resend_contact_429` eine temporäre Begrenzung; `delivery_failed` einen Mailfehler.
Keine Provider-Antworten oder persönlichen Daten werden in den Function-Logs
gespeichert. Endgültig gescheiterte Anmeldungen nach Klärung erneut über einen
frischen Bestätigungslink verarbeiten; alte Jobs nicht blind zurücksetzen.

## Prüfung

```sh
npm test
npm run build
deno check --config supabase/functions/newsletter/deno.json supabase/functions/newsletter/index.ts
```

`supabase/tests/newsletter_double_opt_in.sql` auf einer isolierten PostgreSQL-
Datenbank nach der Migration ausführen. Der Test rollt seine Beispieldaten zurück
und prüft Zustandswechsel, Ablauffristen, Wiederholbarkeit, Modustrennung,
Lease-Wiederaufnahme und private Zugriffsrechte. `tests/newsletter.test.mjs` prüft
den HTTP-Handler, Versandfehler, Resend-Integration und beide E-Mail-Varianten
ohne echten Versand.

`tests/membership-newsletter.test.mjs` und
`supabase/tests/membership_newsletter_opt_in.sql` prüfen die Auswahl im
Mitgliedsantrag, fehlende Einwilligung, doppelte Aufrufe, bestehende Abonnements,
erneute Anmeldung nach Abmeldung, Modustrennung und private Zugriffsrechte.

Referenzen: [Supabase Cron und Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions),
[Resend Contacts](https://resend.com/docs/api-reference/contacts/create-contact),
[Resend Idempotenz](https://resend.com/docs/dashboard/emails/idempotency-keys).
