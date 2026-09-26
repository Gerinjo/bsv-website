# Startseiten-Spielstand

Öffentlicher GET-Endpunkt für die vier aktiven Mannschaften sowie Junioren von D bis A (einschließlich C1/C2 und D1–D3) und Juniorinnen von D bis B. Keine Anmeldung und keine Datenbankzugriffe; die Funktion verarbeitet ausschließlich öffentliche Spielinformationen. Gruppen, Widget-IDs und Mannschafts-IDs sind gemeinsam mit der Startseite in `supabase/functions/_shared/home-match-groups.mjs` festgelegt. Übergebene URLs oder IDs werden nicht verwendet.

```sh
npx supabase functions deploy home-matches --project-ref avbkhyptztqitlgqnajn --use-api
```

`verify_jwt = false` ist für diesen öffentlichen Lesezugriff in `supabase/config.toml` konfiguriert. POST und andere schreibende Methoden werden mit 405 abgelehnt. Gleichzeitige Anfragen verwenden denselben laufenden Abruf, fertige Antworten werden pro Instanz 60 Sekunden gecacht. Teilweise Ausfälle werden je Mannschaft als `available: false` ausgewiesen, ein vollständiger Ausfall liefert 503. Die Startseite behält dann ihre vorhandenen Spiele.

Der Parser und `fontkitten` sind durch `deno.json` und `deno.lock` mit der Edge Function verbunden. `football-matches.ts` wird ebenfalls beim Astro-Build verwendet. Vor einer Änderung im Browser und mit diesen Befehlen prüfen:

```sh
node --test tests/next-match.test.mjs tests/match-presentation.test.mjs
deno check --config supabase/functions/home-matches/deno.json supabase/functions/home-matches/index.ts
curl -fsS https://avbkhyptztqitlgqnajn.supabase.co/functions/v1/home-matches
```

Der Feed liefert auch vergangene Wochenendspiele: Freitag bis Sonntag bleibt bis Montag 06:00 Uhr in `Europe/Berlin` erhalten, unabhängig von Sommer- und Winterzeit. An anderen Wochentagen gilt der aktuelle Kalendertag. Dieser Zeitraum wird gemeinsam für Parser und Browserauswahl in `homepageMatchWindow()` festgelegt. Ein gemeldetes Spielende oder eine Absage hat Vorrang vor einem möglicherweise noch gesetzten `live`-Flag.

`observedAt` enthält den Erzeugungszeitpunkt des Widgets. Ein Tickerstatus bis drei Minuten Alter kann die LIVE-Anzeige über die berechnete Spielzeit hinaus verlängern. Ohne frischen Ticker verwendet die Website die Anstoßzeit, die Spielzeit aus `home-match-groups.mjs` (D 60, C 70, B 80, A/Aktive 90 Minuten) und 15 Minuten Pause. Danach erscheint ohne gemeldeten Endstand „Warten auf Ergebnis“. Tore werden ausschließlich aus FUSSBALL.DE übernommen; ein veralteter Zwischenstand gilt niemals automatisch als Endstand. Bei ausstehenden Ergebnissen fragt die sichtbare Seite den Feed weiterhin minütlich ab.
