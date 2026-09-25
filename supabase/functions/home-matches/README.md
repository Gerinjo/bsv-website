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

Die Aktualität von LIVE und Ergebnissen hängt von den Meldungen auf FUSSBALL.DE ab. `observedAt` enthält den Erzeugungszeitpunkt des Widgets. Die Website verwendet ihn, um überholte LIVE-Hinweise zu entfernen. Das ursprüngliche Spiel bleibt dennoch bis zum Ende seines Kalendertags in deutscher Ortszeit sichtbar.
