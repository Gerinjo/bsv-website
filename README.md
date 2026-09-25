# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure 🚀 

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

## Umami Analytics

Das Tracking wird nur eingebunden, wenn `PUBLIC_UMAMI_WEBSITE_ID` beim Build gesetzt ist. Die selbst gehostete Umami-Instanz läuft unter `https://bsv-nordstern-umami.vercel.app`; ihre Tracking-URL kann über `PUBLIC_UMAMI_SCRIPT_URL` konfiguriert werden.

Für GitHub Pages werden beide Werte als Repository-Variablen unter **Settings → Secrets and variables → Actions → Variables** hinterlegt. Die Website-ID ist die ID aus dem Tracking-Code der in Umami angelegten Website `bsvnordstern.de`.

## Installierbare BSV-App

Unter `/app` finden Besucher die Installationshilfe für Android und iOS. Ein Link im Footer führt dorthin. Unterstützte Browser zeigen dort zusätzlich einen Installationsbutton; iOS nutzt das Teilen-Menü. Die App startet auf der Homepage im Modus `standalone`.

- `src/pages/manifest.webmanifest.ts`: App-Name, Startadresse, Scope, Icons und Verknüpfungen; Pfade berücksichtigen den Astro-Basispfad.
- `public/icons/`: App-Icons aus dem bestehenden Vereinswappen, einschließlich Apple-Touch-Icon und separatem Maskable-Icon mit Sicherheitsabstand.
- `src/components/PwaSupport.astro`: Metadaten, Installationsdialog und Registrierung des Service Workers. Registrierung erfolgt nur in Produktionsbuilds beim Besuch von `/app` oder beim Start als installierte App.
- `public/sw.js`: Lädt Seiten aus dem Netz; bei Verbindungsfehlern erscheint `src/pages/offline.astro`. Nur diese eigenständige Hinweisseite wird gespeichert. Keine Seiten-, API-, Formular- oder Fremdinhalte werden vom Worker gecacht. HTTP-Fehler bleiben erhalten.

Bei Änderungen an der Offline-Seite die Cache-Version in `public/sw.js` erhöhen. Alte Caches werden ausschließlich innerhalb des eigenen Namensraums und Scopes gelöscht. Der Worker aktualisiert sich ohne erzwungenes Neuladen offener Formulare. Zur lokalen Prüfung `npm run build` und `npm run preview` verwenden; der Dev-Modus registriert keinen Worker. Verhaltenstests: `node --test tests/pwa-worker.test.mjs`.

## Stadionhefte

Unter `/media/stadionheft` stehen die hochgeladenen Ausgaben mit Titelbild. Das Titelbild öffnet das Original-PDF in einem neuen Tab; „Im Heft blättern“ führt zur eigenen Leseansicht mit Seitenwahl, Zoom und Vollbild (in unterstützten Browsern). Die noch nicht freigegebene externe digitale Ausgabe wird nicht verlinkt.

Neue Ausgabe veröffentlichen:

1. Das Original-PDF unter `public/dokumente/stadionheft/` ablegen.
2. Ein Titelbild aus der ersten PDF-Seite unter `public/images/stadionheft/` erzeugen, z. B. mit `pdftoppm -f 1 -singlefile -scale-to 900 -jpeg -jpegopt quality=86 eingabe.pdf public/images/stadionheft/2026-27-ausgabe-2`.
3. In `src/data/stadiumMagazines.ts` einen Eintrag mit eindeutigem Slug, Ausgabe, Saison, Datum, Seitenzahl sowie PDF- und Bildpfad ergänzen. Die Übersicht sortiert nach Datum; die Leseroute wird beim Build automatisch angelegt.
4. `npm run build` ausführen und Titelbild, PDF-Link und Leseansicht einschließlich der letzten Seite prüfen.

Der Leser verwendet die festgelegte Version von `pdfjs-dist` und lädt PDF, Worker sowie benötigte Hilfsdateien von der eigenen Website. Die Bibliothek wird nur auf den Leseansichten geladen. Original-PDF und Download bleiben auch ohne JavaScript erreichbar. Lizenztexte liegen unter `public/vendor/pdfjs/`; bei einem Bibliotheksupdate ebenfalls aktualisieren.

## Spiele auf der Startseite

`HomeNextMatch.astro` zeigt die Spielauswahl „Erste / Reserve / Junioren / Juniorinnen“ und den Link mit PDF-Symbol zur Stadionheftübersicht. Enthalten sind vier aktive Mannschaften, sieben Juniorenteams von D bis A sowie drei Juniorinnenteams von D bis B. Das Spiel des aktuellen Tages bleibt bis Mitternacht in `Europe/Berlin` sichtbar, einschließlich seines Endstands. Erst danach wird das nächste Spiel ausgewählt. Diese Auswahl erfolgt auch bei einer länger geöffneten Seite ohne Neuladen.

Alle Tabs nutzen dieselbe feste Höhe für die Spielanzeige; längere Listen sind darin scrollbar. Dadurch bleiben Spielfeld, Fußballer und Werteband beim Wechsel an derselben Position. Die Fußballer-Illustration ist KI-generiert und direkt am Motiv gekennzeichnet; Herkunft und Prompts sind in `design/teams-background.md` und `src/assets/fussball/README.md` dokumentiert.

Die öffentlich lesbare Edge Function `home-matches` liefert die aktuellen Daten aus den 14 FUSSBALL.DE-Widgets. Gruppen und Mannschaften werden für Seite und Feed gemeinsam in `supabase/functions/_shared/home-match-groups.mjs` gepflegt. Der Feed nutzt denselben Parser wie der Seitenaufbau (`supabase/functions/_shared/football-matches.ts`), berücksichtigt sowohl kommende als auch heutige abgeschlossene Spiele und entschlüsselt Uhrzeit und Ergebnis mit der vom Widget gelieferten Schrift. Er hat keinen Datenbankzugriff. Bei Änderungen an Gruppen oder Parser die Funktion ebenfalls bereitstellen.

Am Spieltag fragt die sichtbare Startseite minütlich neue Daten ab, sonst alle 15 Minuten. Verdeckte Tabs pausieren den Abruf; Antworten werden serverseitig eine Minute zwischengespeichert. Ein gemeldeter LIVE-Status erscheint pulsierend zwischen Spieltext und Spiel-Link; reduzierte Bewegung wird respektiert. Ohne aktuelle Statusmeldung wird kein LIVE behauptet, ohne gemeldete Tore kein Ergebnis erfunden. Nach drei Minuten ohne frische LIVE-Daten erlischt der LIVE-Hinweis. Ein gemeldeter Endstand bleibt erhalten; ohne Ergebnis erscheint nach der üblichen Spielzeit „Ergebnis folgt“.

Tests: `node --test tests/next-match.test.mjs tests/match-presentation.test.mjs`. Der Feed kann bei Bedarf über `PUBLIC_HOME_MATCHES_URL` umgestellt werden. Details zur Bereitstellung: `supabase/functions/home-matches/README.md`.

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
