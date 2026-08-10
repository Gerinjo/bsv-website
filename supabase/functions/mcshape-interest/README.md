# MC Shape Interessentenformular

Die Edge Function `mcshape-interest` verarbeitet das Formular auf `/erlebnis/mcshape-radolfzell`.

## Versandlogik

- Anfrage an MC Shape Radolfzell
- dieselbe Anfrage als BCC-Bestätigung an den BSV
- kurze Eingangsbestätigung an die anfragende Person
- keine E-Mail-Adressen sind im Frontend fest verdrahtet

### Testmodus

Die Function läuft standardmäßig im sicheren Testmodus. Dabei werden alle
Nachrichten – auch die Bestätigung für die anfragende Person – ausschließlich
an `EMAIL_TEST_RECIPIENT` gesendet. Im Betreff und im Mailtext steht,
welche Nachricht und welcher Live-Empfänger simuliert wurden.

```bash
supabase secrets set EMAIL_TEST_MODE=true
supabase secrets set EMAIL_TEST_RECIPIENT=jerome.ernsberger@gmail.com
```

Erst der explizite Wert `false` aktiviert die echten Empfänger. Diese beiden
Secrets gelten zentral für alle Supabase-Mailfunktionen, die den gemeinsamen
Maildienst unter `_shared/email-service.ts` verwenden.

```bash
supabase secrets set EMAIL_TEST_MODE=false
```

## Erforderliche Supabase-Secrets

```bash
supabase secrets set RESEND_API_KEY=...
supabase secrets set EMAIL_TEST_MODE=true
supabase secrets set EMAIL_TEST_RECIPIENT=jerome.ernsberger@gmail.com
supabase secrets set MCSHAPE_RECIPIENT_EMAIL=...
supabase secrets set BSV_CONFIRMATION_EMAIL=...
supabase secrets set MAIL_FROM="BSV Nordstern <...>"
supabase secrets set ALLOWED_ORIGINS="https://bsvnordstern.de,https://gerinjo.github.io,http://localhost:4321"
```

`MAIL_FROM` muss eine beim verwendeten Maildienst freigeschaltete Absenderadresse bzw. Domain verwenden.

## Deployment

```bash
supabase functions deploy mcshape-interest
```

## Website-Endpunkt

Die Astro-Seite verwendet zuerst `PUBLIC_MCSHAPE_FORM_ENDPOINT`. Alternativ wird aus `PUBLIC_SUPABASE_URL` automatisch folgender Endpunkt gebildet:

```text
<PUBLIC_SUPABASE_URL>/functions/v1/mcshape-interest
```

Beispiel:

```bash
PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
```

Solange weder `PUBLIC_MCSHAPE_FORM_ENDPOINT` noch `PUBLIC_SUPABASE_URL` gesetzt ist, wird das Formular angezeigt, aber beim Absenden mit einem klaren Hinweis abgebrochen. So werden keine personenbezogenen Daten versehentlich an einen nicht konfigurierten Endpunkt gesendet.
