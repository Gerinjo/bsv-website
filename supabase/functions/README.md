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

## Mitgliedsantrag

`membership-email` ist die geschützte Mailbrücke für den bestehenden
PHP-Endpunkt, der PDF und Anlagen erzeugt. Zusätzlich erforderlich:

```bash
supabase secrets set MEMBERSHIP_EMAIL_SECRET=...
```

Auf dem PHP-Webspace wird derselbe geheime Wert als
`BSV_MEMBERSHIP_EMAIL_SECRET` gesetzt. Ohne ihn wird keine Mail versendet.

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
