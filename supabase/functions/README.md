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

Die Kontaktseite gehört derzeit nicht zu diesem Versandweg. Sie sendet an das
separate PHP-Backend unter `https://bsvnordstern.de/api/contact.php` und nutzt
dessen serverseitige Mailkonfiguration.
