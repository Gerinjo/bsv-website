# Nordstern Post: Anmeldung und Bestätigung

Das Startseitenformular sendet an die öffentliche Edge Function `newsletter`.
Es verwendet den bestehenden, einmal nutzbaren Spamschutz von `contact-request`.
Ein Konto oder Supabase-Login ist nicht erforderlich.

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

## Ablauf

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
   Workflow fügt die Adresse im Live-Modus zum Resend-Segment **Nordstern Post**
   hinzu und versendet danach die Willkommensmail. Ein fehlgeschlagener Versand
   nimmt die erteilte Einwilligung nicht zurück.
4. Der Link in der Willkommensmail führt zu einer Abmeldeseite mit Bestätigungsbutton.
   Die Abmeldung entzieht lokal die Freigabe und entfernt die Person aus dem
   Nordstern-Post-Segment. Alte Bestätigungslinks können sie nicht wieder anmelden.
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

Referenzen: [Supabase Cron und Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions),
[Resend Contacts](https://resend.com/docs/api-reference/contacts/create-contact),
[Resend Idempotenz](https://resend.com/docs/dashboard/emails/idempotency-keys).
