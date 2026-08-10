# Gemeinsame E-Mail-Konfiguration

Alle Supabase Edge Functions, die E-Mails versenden, verwenden
`_shared/email-service.ts`. Der gemeinsame Dienst erzwingt den Testmodus für
`to`, `cc`, `bcc` und `reply-to` und kennzeichnet Testnachrichten automatisch.

## Zentrale Secrets

```bash
supabase secrets set EMAIL_TEST_MODE=true
supabase secrets set EMAIL_TEST_RECIPIENT=jerome.ernsberger@gmail.com
supabase secrets set RESEND_API_KEY=...
supabase secrets set MAIL_FROM="BSV Nordstern Radolfzell <...>"
```

`EMAIL_TEST_MODE` ist standardmäßig aktiv. Nur der explizite Wert `false`
schaltet auf Live-Empfänger um.

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
