# Automatische Hinweise an die Jugendtrainer

`football-alerts` prüft stündlich zwischen 08:00 und 20:00 Uhr in
`Europe/Berlin`. Der Cronjob läuft zur vollen Stunde; außerhalb dieses Fensters
kehrt die Function ohne Abruf und Versand zurück. Sommerzeit wird berücksichtigt.

## Regeln und Datenquellen

- **Training:** Spiele und F-/G-Heimspieltage innerhalb der nächsten 14 Tage
  einschließlich heute werden mit den wiederkehrenden Jugendtrainings auf
  demselben Platz verglichen. Auch Vorlauf, Nachlauf und eine Teilplatzbelegung
  zählen: Die Mail bittet um Abstimmung und gegebenenfalls Umorganisation.
  Abgelaufene Überschneidungen werden nicht nachträglich gemeldet.
- **Schiedsrichter:** Genau zwei Berliner Kalendertage vor einem Heimspiel der
  D-, C-, B- oder A-Junioren wird der öffentliche Schiedsrichtereintrag auf der
  FUSSBALL.DE-Spielseite geprüft. Für Juniorinnen gilt dies nur im Pokal.
  Heimspiele einer Spielgemeinschaft auf einem Partnerplatz zählen ebenfalls.
- Ein vorhandener, auch verschleierter Name gilt als besetzt. Ein eindeutig
  leerer oder ausdrücklich unbesetzter Eintrag führt zur Warnung. Fehlende
  Markierungen, Datenschutztexte, Abruffehler, abgesagte Spiele und noch nicht
  freigegebene FUSSBALL.DE-Ansetzungen erzeugen keine Schiedsrichterwarnung.
- Spieltermine und tatsächliche Plätze kommen frisch von FUSSBALL.DE. Bestätigte
  Vereinskorrekturen aus `src/utils/matchdayAdjustments.ts` gelten ebenfalls;
  automatische Vorschläge zur Platzverlegung werden nicht als Buchung behandelt.
  Die vereinsintern gepflegten F-/G-Gruppenpläne gelten mit festgelegtem Platz und
  Uhrzeit auch dann als Belegung, wenn ihr Termin noch als vorläufig markiert ist.

Training und Platzzuordnung werden gemeinsam mit der Website in
`src/data/trainingPlan.ts` gepflegt; Torwarttraining steht in
`src/data/goalkeeperTraining.ts`. Auswärtige Trainingsplätze werden nicht
berücksichtigt. Der Wochenplan muss bei Hallenwechseln, Ferienausnahmen oder
geänderten Trainingszeiten entsprechend gepflegt werden. Änderungen an diesen
Daten, Gruppenplänen oder Spielkorrekturen erfordern auch eine erneute
Bereitstellung von `football-alerts`; ein Website-Build allein aktualisiert
die bereits bereitgestellte Function nicht.

Empfänger sind die aktiven Einträge aus `public.contact_empfaenger` mit
`team--jugend--…` beziehungsweise `goalkeeping`. Hauptadresse und alle gültigen
`weitere_emails` werden berücksichtigt. Fehlende Kontakte werden protokolliert;
es gibt keinen Ersatzempfänger. Versand erfolgt über den vorhandenen zentralen
E-Mail-Dienst und dessen globalen Test-/Live-Modus.

## Doppelte Nachrichten und Ausfälle

Eine unveränderte Warnung wird je Mannschaft und Spiel nur einmal zugestellt.
Bei Trainingskonflikten erzeugen geänderte Spielzeiten, Plätze oder
Trainingszeiten eine neue Warnung. Bei Schiedsrichtern zählt Mannschaft,
Spiel-ID und Datum. Testzustellungen verbrauchen keine Live-Warnung.

Eine atomare Datenbankreservierung verhindert parallelen Doppelversand.
Wiederholungen verwenden dieselbe eingefrorene Nachricht und denselben
Resend-Idempotenzschlüssel. Nach spätestens acht Versuchen oder 23 Stunden
wechselt ein erneut beanspruchter, unklarer Versand zu `needs_review` und wird
nicht automatisch neu verschickt. Die 23 Stunden liegen innerhalb des
24-Stunden-Fensters von Resend. Pro Lauf sind höchstens 40 Versandversuche
zulässig; übrige Fälle werden beim nächsten Lauf erneut geprüft.

Keine alten FUSSBALL.DE-Daten dienen als Ersatz bei einem Abruffehler.
Unabhängig gepflegte Vereinsbelegungen bleiben nutzbar. Protokolle und
Empfänger sind durch Tabellenrechte und RLS vom Browserzugriff ausgeschlossen.
Der Endpunkt benötigt einen eigenen, in Supabase Vault gespeicherten Schlüssel.

## Bereitstellung

1. Migration `20260926120835_football_alerts.sql` anwenden. Die Automation ist
   zunächst deaktiviert.
2. `supabase/setup/football-alerts.sql` ausführen. Schlüssel werden innerhalb
   der Datenbank erzeugt; nicht in Browser, Repository oder Logs kopieren.
3. Function bereitstellen:

   ```sh
   npx supabase functions deploy football-alerts --project-ref avbkhyptztqitlgqnajn --use-api
   ```

4. Einen authentifizierten Prüflauf in der Datenbank auslösen:

   ```sql
   select net.http_post(
     url := (select decrypted_secret from vault.decrypted_secrets where name = 'football_alert_function_url'),
     headers := jsonb_build_object(
       'Content-Type', 'application/json',
       'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'football_alert_worker_secret')
     ),
     body := '{"action":"dry-run"}'::jsonb,
     timeout_milliseconds := 140000
   );
   ```

   Die zurückgegebene Request-ID anschließend in `net._http_response` prüfen.
   Der Prüflauf protokolliert den Lauf und eine Vorschau ohne Mailadressen;
   er reserviert und versendet keine Nachrichten. HTTP 207 bedeutet einen
   Teilerfolg mit fehlenden Quellen, Kontakten oder einem Versandfehler.

5. Nach erfolgreichem Prüflauf `supabase/setup/football-alerts-activate.sql`
   ausführen. Damit werden Versandfreigabe und Cronjob `bsv-football-alerts`
   gesetzt. Die globale E-Mail-Konfiguration bleibt unverändert.

## Betrieb

Läufe stehen in `public.football_alert_runs`, Versandstatus in
`public.football_alert_deliveries`. `partial`, `failed` und `needs_review`
prüfen; eine erfolgreiche Cron-Anforderung allein bestätigt keinen Mailversand.
Keine gespeicherten Nachrichten oder Empfänger in öffentliche Logs kopieren.

Versand pausieren, ohne Verlauf oder Deduplizierung zu löschen:

```sql
update public.football_alert_settings
set enabled = false, updated_at = now() where id = true;
```

Wiederaufnahme: `enabled = true` setzen. Ein manueller Versandlauf nutzt
denselben authentifizierten Aufruf mit `{"action":"run"}` und beachtet
Freigabe, Sendezeiten und Deduplizierung.

## Prüfungen

```sh
node --test tests/football-alerts.test.mjs
deno check --config supabase/functions/football-alerts/deno.json supabase/functions/football-alerts/index.ts
```

`supabase/tests/football_alerts.sql` prüft Rechte, konkurrierende Reservierungen,
Wiederholungen und Test-/Live-Trennung innerhalb einer zurückgerollten Transaktion.

Am 26.09.2026 wurden Migration, Function und Schlüssel im Projekt
`avbkhyptztqitlgqnajn` bereitgestellt und der stündliche Cronjob aktiviert.
Der authentifizierte Prüflauf las die aktuellen Quellen ohne Fehler und fand
keine Warnfälle. Für alle 18 benötigten Trainergruppen waren aktive Empfänger
hinterlegt.
