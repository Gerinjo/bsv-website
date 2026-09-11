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
