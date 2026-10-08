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

## Trainer-Onboarding

`/onboarding` ist ein zusammenhängendes Dokument mit persönlichen Daten
(einschließlich Nationalität und Geschlecht mit der Option „keine Angabe“),
Personalausweis-Vorder- und Rückseite, Mitgliedsstatus, Aufgabe, Vertragskontodaten,
Trainerkleidung, Mannschaftsbus und Erklärungen. Es gibt keine Fortschrittsanzeige und keine Browser-Speicherung.
Satzung, Beitragsordnung, Ausweisverarbeitung, Anforderung und Einsicht des
Führungszeugnisses sowie Datenschutz werden separat bestätigt. Trainer und
Co-Trainer sind vom Mitgliedsbeitrag befreit; für Betreuer wird der Beitragsstatus
mit der Jugendleitung geklärt.

Für die vom Verein gestellte Trainerkleidung wird pro Teil des JAKO-Sets
`SET-2852-004` eine Größe oder „Benötige ich nicht“ ausgewählt: Trikot, Polyesterjacke, Polyesterhose,
Allwetterjacke, Coachjacke und Polo. Die lokalen Produktbilder stammen aus dem
verlinkten BSV-Teamshop. Artikel und erlaubte Größen stehen gemeinsam für
Formular und PHP-Prüfung in `public/api/trainer-onboarding-clothing.json`
(Shopstand: 08.10.2026); Produktbilder liegen unter `public/images/onboarding`.
Die Größen beziehungsweise „Nicht benötigt“ erscheinen in der Onboarding-PDF für Jugendleitung und Trainer,
jedoch nicht im separaten Mitgliedsantrag.
Eine verpflichtende Checkbox bestätigt die gelesene und akzeptierte Rückgabe
der gestellten Kleidungsstücke, wenn die Trainertätigkeit innerhalb von 12 Monaten
nach Beginn endet. Die Serverprüfung verlangt diese Bestätigung; sie wird in der
unterschriebenen Onboarding-PDF dokumentiert.

Im Busabschnitt wird die gewünschte Nutzung ausdrücklich mit Ja oder Nein
abgefragt. „Ja“ ist unabhängig vom bereits eingetragenen Geburtsdatum auswählbar;
die Uploadfelder erscheinen dann direkt darunter. Die Altersvoraussetzung wird
beim Absenden geprüft. „Älter als 25 Jahre“ bedeutet hier ab dem 26. Geburtstag. Nur bei
gewünschter Nutzung sind Führerschein-Vorder- und Rückseite, die Bestätigung der
gültigen Fahrerlaubnis und des Mitführens, die Busregeln sowie die Verarbeitung
der Führerscheinkopien erforderlich. Die Prüfung der Dokumente und die Freigabe
erfolgen anschließend im Verein; das Formular erteilt keine Fahrberechtigung.
Regeln, Mindestalter und Fassung stehen in `public/api/trainer-onboarding-bus.json`
und werden gemeinsam für das Formular und die Serverprüfung verwendet. Bei
Änderungen die Fassung anpassen und beide Seiten zusammen bereitstellen. Die
bestätigte Regelfassung mit ihrem vollständigen Text steht in der Onboarding-PDF.
Die Busfotos stammen aus dem BSV-Stadionheft 8, Saison 2025/26, PDF-Seite 11
(gedruckte Seite 9). Die Original-Heftseite liegt als WebP unter
`public/images/onboarding/mannschaftsbus-ford-transit.webp`; CSS zeigt die beiden
Fotos am unteren Seitenrand. Der Quellenlink steht am Foto und im Regelkatalog.

Alle Trainer unterschreiben am Ende des vollständigen Formulars mit Ort und
Datum, auch wenn sie bereits Mitglied sind. Die Unterschrift bestätigt die
Angaben und ausgewählten Erklärungen und wird in die versendete Onboarding-PDF
eingebettet. Nichtmitglieder beantragen die Mitgliedschaft unmittelbar im
Formular; dieselbe Unterschrift wird zusätzlich in den separaten Mitgliedsantrag
übernommen. Bei Minderjährigen wird für beide Dokumente die sorgeberechtigte
unterschreibende Person abgefragt. Die Kontodaten zur Vertragsvorbereitung erteilen kein SEPA-Mandat.
Ein Führungszeugnis wird nicht hochgeladen: Der Verein fordert die Vorlage an,
die betroffene Person beantragt das Zeugnis mit dem Vereinsschreiben selbst.

`public/api/trainer-onboarding.php` prüft alle Pflichtfelder, Einwilligungen,
IBAN-Prüfziffer, Kleidungsgrößen je Artikel, Busalter, Regelfassung,
Ort, Datum und eine nicht leere PNG-Unterschrift für alle Trainer sowie die tatsächlichen Dateitypen. Je
Ausweis- und Führerscheinseite sind PDF, JPEG oder PNG bis 3 MB zugelassen;
alle Kopien zusammen höchstens 10 MB. Für Multipart-Anfragen muss PHP
`post_max_size` von mindestens 15 MB erlauben. Der Endpunkt prüft außerdem das
12-MB-Anhangslimit der vorhandenen Mailbrücke vor dem Versand. Dokumente entstehen
über die vorhandene PDF-Bibliothek im Arbeitsspeicher; es gibt keine öffentliche
Ablage. Die Jugendleitung erhält die Onboarding-PDFs, Ausweiskopien und bei
gewünschter Busnutzung die Führerscheinkopien. Bei
Nichtmitgliedern erhält die Mitgliederverwaltung
nur den separaten unterschriebenen Mitgliedsantrag, keine Ausweiskopien,
Führerscheinkopien, Busangaben oder Kontodaten. Die antragstellende Person erhält
die PDFs ohne Ausweis- oder Führerscheinkopien in einer persönlichen Begrüßungs-Mail.

Nach bestätigtem Eingang der Hauptunterlagen informiert der Endpunkt Markus
Moßbrugger (`Markus.Mossbrugger@bsvnordstern.de`) für die Schlüsselübergabe nur mit
Name, E-Mail und Telefon. Ab der E-Jugend und bei den aktiven Mannschaften gehen
diese Kontaktdaten zusammen mit Mannschaft und Rolle an `dfbnet@bsvnordstern.de`.
G- und F-Jugend lösen keine DFBnet-Mail aus. `verwaltung@bsvnordstern.de` erhält
bei jeder Anmeldung die Kontakt- und Teaminfo, bei Nichtmitgliedern zusätzlich
den separaten Mitgliedsantrag. Diese festen Empfänger werden in der geschützten
Mailbrücke festgelegt. Bankdaten und Ausweis-/Führerscheinkopien gehen nicht an
Schlüsselmanagement, DFBnet oder Mitgliederverwaltung.

Die Begrüßungs-Mail und `/onboarding/danke` verwenden gemeinsam
`public/api/trainer-onboarding-welcome.json`: Spond für G/F, Teampunkt für E bis A
einschließlich Juniorinnen, TimeTree nur bei gewünschter Busnutzung. Die E-Mail
enthält Vereinswappen, ein vorhandenes Trainerfoto, Installationslinks für iOS
und Android, die nächsten Schritte und Links zur Mannschaft sowie zu Trainings-
und Spieltagsbelegung. Die Mitgliedschaft wird mit dem bereits unterschriebenen
Antrag automatisch beantragt und von der Mitgliederverwaltung bearbeitet;
der Versand selbst bestätigt keine abgeschlossene Aufnahme in ein Mitgliedersystem.
Die Dankeseite erhält nur Mannschaft, Buswahl, Mitgliedsstatus und Versandreferenz
im URL-Fragment, keine Namen, E-Mail-Adressen, Bankdaten oder Dokumente. Ein
direkter Aufruf ohne bestätigten Versand zeigt allgemeine Einstiegshinweise.
Fehlgeschlagene Folge-Benachrichtigungen werden als `pendingNotifications`
ausgewiesen, die Begrüßungs-Mail wird trotzdem versucht und die Dankeseite
verhindert die Aufforderung zum erneuten Absenden.

**Eigener Onboarding-Testmodus:** `TRAINER_ONBOARDING_MAIL_MODE` ist ein privates
Supabase-Secret, Standard `test`. Alle fünf Trainer-Mailtypen gehen dann
ausschließlich an `jerome.ernsberger@gmail.com`, auch Reply-To; To/Cc/Bcc können
das nicht umgehen. Das gilt auch bei Livebetrieb anderer Vereinsmails und bei
anders eingestelltem `EMAIL_TEST_RECIPIENT`. Für Livebetrieb müssen sowohl dieses
Secret explizit `live` als auch der zentrale Mailbetrieb bestätigt `live` sein.
Diese Testveröffentlichung erzwingt zusätzlich `forceTestMode: true` im
authentifizierten PHP-Mailauftrag. Dieser serverseitige Schutz muss vor einem
späteren Livebetrieb bewusst entfernt werden; die Secrets allein schalten die
veröffentlichte Onboarding-Version nicht auf echte Empfänger um.
Beim Umschalten niemals öffentliche Frontend-Variablen verwenden.

Bereitstellung: zuerst `membership-email` mit den Routen `trainer-onboarding`
und `trainer-membership` aktualisieren, danach `trainer-onboarding.php`,
`trainer-onboarding-access.php`, `trainer-onboarding-pdf.php`, `trainer-onboarding-teams.php`, `trainer-onboarding-welcome.php`,
`trainer-onboarding-clothing.json`, `trainer-onboarding-bus.json` und die bestehende
`trainer-onboarding-welcome.json` sowie die PDF-Bibliothek auf dem PHP-Antragsserver bereitstellen, anschließend die Website
veröffentlichen. Die privaten Mailbridge-Zugangsdaten werden wie bei
`membership-v3.php` aus der Umgebung oder `membership-config.php` gelesen;
der eigene Onboarding-Testmodus bleibt zunächst aktiv. Ohne diese Konfiguration wird
kein Versand behauptet. `PUBLIC_TRAINER_ONBOARDING_ENDPOINT` überschreibt bei
Bedarf die Standardadresse `https://api.bsvnordstern.de/api/trainer-onboarding.php`.
`trainer-onboarding-teams.php` bei Änderungen an den Mannschaften mitpflegen.
Bei Änderungen des Trainer-Sets den gemeinsamen Kleidungskatalog und die
zugehörigen Produktbilder aktualisieren und mit bereitstellen.

Zur lokalen Formularvorschau kann der PHP-Service mit
`BSV_TRAINER_LOCAL_DEV=1 php -d upload_max_filesize=4M -d post_max_size=15M -S localhost:8808 -t public`
gestartet werden. In der ignorierten `.env.development.local` dafür
`PUBLIC_TRAINER_ONBOARDING_ENDPOINT="http://localhost:8808/api/trainer-onboarding.php"`
setzen und Astro im Hintergrund neu starten. Der lokale Modus erlaubt nur die
bekannten lokalen Ursprünge zusätzlich und verwendet ein eigenes Session-Cookie.
Ohne Mailbridge-Zugangsdaten erfolgt kein Versand. Die automatischen Tests
verwenden ausschließlich synthetische Unterlagen und eine abgefangene Mailbrücke.

Vor dem Formular zeigt `/onboarding` das BSV-Wappen oben mittig, die zentrale
Überschrift „Trainer Onboarding“, „Wir lieben den …“ und das gelbe kursive
Buchstabenrätsel `F _ s _ b _ l _ !`. Die Überschrift steht mittig zwischen Wappen
und Text. Unter dem Rätsel ist die Fußballer-Illustration der Startseite groß
eingebunden; der Hintergrund verbindet geschwungene Flächen mit dezenten
Spielfeld- und Balllinien. Links vom Fußballer steht „Willkommen beim BSV Nordstern
Radolfzell“, rechts „Seit 1956“ mit einer großen gelben Jahreszahl. Auf schmalen
Bildschirmen stehen die beiden Texte nebeneinander über der Illustration.
Vier unterstrichene Eingabefelder
ergänzen „Fussball“. Der Fokus startet in der ersten Lücke, Eingaben springen
automatisch weiter; erst eine vom PHP-Service bestätigte Lösung öffnet das Formular.
Die Freigabe gilt vier Stunden in derselben Browser-Session. Der PHP-Endpunkt
prüft sie auch vor jeder Spamschutz- und Versand-Anfrage. Die Session verwendet
ein HttpOnly-Cookie, eine kurzlebige Zufallsabfrage, einen Wechsel der Session-ID
nach Freigabe und eine einminütige Sperre nach fünf Fehlversuchen pro Session.
Bei Ablauf bleiben Formulareingaben für eine erneute Freigabe erhalten.
Dies ist eine kleine Hürde gegen automatisierte Aufrufe, keine Anmeldung mit
geheimem Passwort: Die statischen Formulartexte bleiben öffentlich, persönliche
Unterlagen werden ausschließlich über den freigegebenen PHP-Service verarbeitet.
Die Website bleibt `noindex`. Der einmalige Spamschutz, die Versandsperre und
der Schutz vor wiederholtem Absenden nach einem bestätigten Teilversand bleiben aktiv.
Verhaltenstests: `node --test tests/trainer-onboarding-submission.test.mjs tests/trainer-onboarding-email.test.mjs tests/trainer-bank-details.test.mjs`.

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

`HomeNextMatch.astro` zeigt die Spielauswahl „Erste / Reserve / Junioren / Juniorinnen“ und den Link mit PDF-Symbol zur Stadionheftübersicht. Enthalten sind vier aktive Mannschaften, sieben Juniorenteams von D bis A sowie drei Juniorinnenteams von D bis B. Spiele von Freitag bis Sonntag bleiben einschließlich ihrer Endstände bis Montag um 06:00 Uhr in `Europe/Berlin` sichtbar. Mehrere Begegnungen einer Mannschaft am selben Wochenende werden gemeinsam angezeigt. An den übrigen Wochentagen bleibt das Tagesspiel bis Mitternacht stehen. Ohne Begegnung im aktuellen Zeitraum wird das nächste Spiel angezeigt. Diese Auswahl erfolgt auch bei einer länger geöffneten Seite ohne Neuladen.

Alle Tabs nutzen für die Spielanzeige den freien Platz bis 24 Pixel vor dem gelben Werteband. Bei untereinander angeordnetem Text und Fußballermotiv endet die Liste entsprechend vor dem Motiv. Erst längere Listen sind scrollbar. Die zusätzliche Anzeigehöhe wird im Layout ausgeglichen, sodass Spielfeld, Fußballer, Werteband und nachfolgende Inhalte an derselben Position bleiben. Die Fußballer-Illustration ist KI-generiert und direkt am Motiv gekennzeichnet; Herkunft und Prompts sind in `design/teams-background.md` und `src/assets/fussball/README.md` dokumentiert.

Die öffentlich lesbare Edge Function `home-matches` liefert die aktuellen Daten aus den 14 FUSSBALL.DE-Widgets. Gruppen und Mannschaften werden für Seite und Feed gemeinsam in `supabase/functions/_shared/home-match-groups.mjs` gepflegt. Der Feed nutzt denselben Parser wie der Seitenaufbau (`supabase/functions/_shared/football-matches.ts`), berücksichtigt sowohl kommende als auch abgeschlossene Spiele im aktuellen Anzeigezeitraum und entschlüsselt Uhrzeit und Ergebnis mit der vom Widget gelieferten Schrift. Er hat keinen Datenbankzugriff. Bei Änderungen an Gruppen oder Parser die Funktion ebenfalls bereitstellen.

Am Spieltag und bei noch ausstehenden Wochenendergebnissen fragt die sichtbare Startseite minütlich neue Daten ab, sonst alle 15 Minuten. Verdeckte Tabs pausieren den Abruf; Antworten werden serverseitig eine Minute zwischengespeichert. Ab Anstoß erscheint LIVE pulsierend, auch ohne Ticker; reduzierte Bewegung wird respektiert. Die Zeitberechnung verwendet für D 60, C 70, B 80 und A sowie Aktive 90 Minuten, jeweils zuzüglich 15 Minuten Halbzeitpause. Die Spielzeiten gelten auch für Juniorinnen und werden je Team in `home-match-groups.mjs` gepflegt. Ein frischer Tickerstatus (höchstens drei Minuten alt) kann LIVE über die berechnete Dauer hinaus verlängern und einen gemeldeten Zwischenstand ergänzen. Anschließend erscheint ohne bestätigten Endstand „Warten auf Ergebnis“; ein alter Zwischenstand wird nicht zum Endstand erklärt. Gemeldete Endstände und Absagen haben Vorrang. Derselbe Anzeigezeitraum gilt beim Build, im Feed und bei der Zusammenführung der Browserdaten; vorübergehend fehlende Wochenendspiele bleiben erhalten.

Tests: `node --test tests/next-match.test.mjs tests/match-presentation.test.mjs`. Der Feed kann bei Bedarf über `PUBLIC_HOME_MATCHES_URL` umgestellt werden. Details zur Bereitstellung: `supabase/functions/home-matches/README.md`.

Bestätigte Endstände verlinken direkt zur eigenen Mannschaftsseite mit `#tabelle`.
Der Tabellen-Tab öffnet sich automatisch und wird in den sichtbaren Bereich
gescrollt; die mobile Kopfzeile wird berücksichtigt. Zwischenstände bleiben
reine Anzeigen. Auch nach einem Feed-Update wird der Linkstatus aktualisiert.
Die Mannschaftsseiten unterstützen außerdem `#spiele` und aktualisieren den
Anker beim manuellen Tabwechsel, ohne zusätzliche Verlaufseinträge anzulegen.

## Warnungen zum Jugendspielbetrieb

Die Edge Function `football-alerts` prüft stündlich von 08:00 bis 20:00 Uhr
Trainingskonflikte in den nächsten 14 Tagen sowie fehlende Schiedsrichter zwei
Kalendertage vor D–A-Juniorenheimspielen; bei Juniorinnen nur im Pokal.
Betroffene Trainer und hinterlegte Co-Trainer erhalten je unverändertem Fall
eine E-Mail. Trainingsdaten werden zentral in `src/data/trainingPlan.ts`
gepflegt. Nach Änderungen dort auch die Function erneut bereitstellen.
Einrichtung und Betrieb: [football-alerts/README.md](supabase/functions/football-alerts/README.md).

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
