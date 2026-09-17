# Spieltagsbelegung

Die neue Seite `/fussball/spieltagsbelegung` ist getrennt von der Trainingsplanung.
Sie umfasst Spiele im FUSSBALL.DE-Vereinsspielplan mit Spielort beim BSV sowie
die festen Bogensport-Belegungen und die ausdrücklich erfassten G-Spieltage.
Sonstiges Training, Fremdnutzung und nicht erfasste Veranstaltungen sind nicht enthalten.
Die Hälften sind rechnerische Kapazitäten, keine verbindliche Seitenzuweisung.

## Daten und Aktualisierung

Der Build lädt acht Wochen ab dem aktuellen Berliner Datum in Wochenfenstern.
Datumsfilter stehen im URL-Pfad, da Query-Parameter beim HTML-Endpunkt teilweise
ignoriert/gecacht werden. Datum, Vollständigkeit und Mannschaftsidentität werden
geprüft. Der Austragungsort stammt aus der einzelnen Spielseite, nicht aus dem
Heimrecht. Auch nominal auswärtige BSV-Teams können auf dem BSV-Platz spielen.

E-Viererspieltage werden nach datierter Staffel-URL und Austragungsplatz gebündelt.
Ein gemeinsamer E1/E2-Spieltag zählt einmal. Alle Gruppenpaarungen bestimmen den
Start, auch Spiele ohne BSV-Beteiligung. Verschleierte Uhrzeiten werden mit der
mitgelieferten Schrift über die bestehende fontkitten-Bibliothek gelesen.

Bei einem Abruffehler bleibt der letzte vollständige Stand mit Warnung und
unverändertem Quellenzeitpunkt sichtbar. Ein abgelaufener Zeitraum wird gewarnt.
Der tägliche Pages-Workflow (04:17 UTC; im Sommer 06:17, im Winter 05:17 Uhr)
stellt `.astro/matchday-plan.json` aus dem Actions-Cache wieder her und sichert
ihn nach dem Build. Der eingecheckte Snapshot ist die Rückfallebene ohne Cache.

## Planungsregeln

Vom Nutzer bestätigt: E-Spieltag 120 Minuten, für alle Fußball-Belegungen zusätzlich
30 Minuten Vorlauf und 15 Minuten Nachlauf. Reguläre Spiele erhalten außerdem
15 Minuten Halbzeitpause. Regelspielzeiten laut SBFV AB 13: D 60, C 70, B 80,
A/Aktive 90 Minuten.

Ergänzung: Bei gleicher Teamstärke (7er nach 7er, 9er nach 9er, 11er nach 11er)
auf derselben Fläche genügen 15 Minuten Wechselzeit. Der Nachlauf des Vorgängers
deckt diese ab; der Vorlauf des Nachfolgers wird bis maximal zum Anstoß gekürzt.
Anstoß, Spielzeit und Nachlauf bleiben unverändert. Weniger als 15 Minuten Abstand
bleiben als Konflikt sichtbar. Vorgänger werden für jede Hälfte separat bestimmt;
andere Plätze, andere Tage, erste Spiele und Formatwechsel behalten Standardpuffer.
Die Anpassung erfolgt auf einer Kopie beim Rendern, nicht im Quellen-Cache.

- E-Viererspieltag: eine Hälfte.
- D und D-Juniorinnen: 7er, eine Hälfte.
- C-/B-Juniorinnen: eine Hälfte, wenn einer der Mannschaftsnamen ausdrücklich
  eine 7er-Meldung enthält; sonst ganzer Platz (9er/11er).
- C1 und C2: ganzer Platz, auch C2 als 9er.
- B, A und Aktive: ganzer Platz.
- Unbekannte Spielform: konservativ ganzer Platz / 105 Minuten, mit Prüfhinweis.
- Fehlender Platz oder fehlende Uhrzeit: Prüfliste, keine erfundene Zuordnung.

Pokal-/Entscheidungsspiele erhalten einen Hinweis zu möglicher Verlängerung und
besonderer Spielform. Die SBFV-Verbandspokalregeln für Juniorinnen können von
der allgemeinen 7er-Regel abweichen. Endzeiten sind Planwerte, keine bestätigten
Abpfiffzeiten. Konflikte bedeuten mehr als zwei benötigte Hälften.

Jede Belegung wird einmal als durchgehender Block über die gemeinsame Zeitachse
gezeichnet. Grenzen anderer Spiele teilen den Block nicht. Bei Überbelegung
zeigt der betroffene Platz ausdrücklich parallele Belegungen statt vermeintlich
freier Hälften; benötigte Platzgröße und genaue Konfliktzeiten bleiben sichtbar.

## Bogensport und Platzwechsel

`src/data/pitchReservations.ts` ist die gemeinsame Quelle für Wochenplan und
Spieltag: Nebenplatz komplett gesperrt, Freitag 17:30–19:00 und Sonntag 10:00–12:00.
Festbelegungen erhalten keine Fußball-Puffer und werden unabhängig von den
FUSSBALL.DE-Daten erzeugt, auch an Tagen ohne Spiele und bei Quellen-Ausfällen.

`planWithPitchReservations` prüft betroffene Spiele einschließlich ihrer Puffer.
Passt die Belegung auf den Hauptplatz, erscheint sie dort als unbestätigter
Vorschlag. Quellen-URL, gemeldeter Spielort und Anstoß bleiben unverändert.
Jeder Vorschlag berücksichtigt vorherige Vorschläge und berechnet Wechselzeiten
auf beiden Plätzen neu. Unbekannte Belegungen oder Kapazitätskonflikte verhindern
eine Freigabe: Das Spiel bleibt mit offener Klärung beim gesperrten Nebenplatz.
Die Entscheidung ist konservativ und kein vollständiger Optimierungsalgorithmus.
Platzwechsel müssen vor Durchführung durch die Verantwortlichen bestätigt werden.

## Tests

`npm test` prüft Spielformen, Puffer, Parser, Turnierzusammenfassung, Spielorte,
Absagen, Fehler-Fallback und Konflikte. Die Browserprüfung umfasst Datumswechsel,
Gesamtübersicht, Quellen-/Detailverweise und Desktop-/Handyansichten.

## Manuelle G-/F-Spieltage

G1 und G2 verwenden gemeinsam `src/data/gTournamentSchedule.ts` (Gruppenplan 7,
Herbstrunde 2026/27, Stand 15.09.2026). Beide G-Teamseiten zeigen dieselben fünf
Termine. Die leeren Zeilen für 18.–20.09. sind keine angesetzten Spieltage.
Die Gruppenteilnehmer stammen aus der Vorlage; FC Steißlingen richtet erst im
Frühjahr aus. Ohne belegten FUSSBALL.DE-Link wird kein externer Link erfunden.

`manualTournamentBookings` ergänzt Heimspieltage vor der Berechnung der
Bogensport-Verlegungen und Platzkonflikte. Ein gemeinsamer Spieltag zählt nur
einmal. G und F dauern 120 Minuten plus 30 Minuten Vorlauf und 15 Minuten
Nachlauf. Platz und Umfang werden je Gruppenplan ausdrücklich angegeben.
Bestätigt: G1 + G2 am 11.10.2026, 09–11 Uhr, halber Hauptplatz;
Belegungszeit 08:30–11:15 Uhr. Auswärtsspieltage belegen keinen BSV-Platz.
Manuelle Termine werden bei jedem Build ergänzt und von automatischen
FUSSBALL.DE-Aktualisierungen nicht überschrieben. Ihr Quellenstand bleibt
sichtbar; Terminänderungen benötigen eine Aktualisierung der Datendatei.

F1 (Gruppe 9, Stand 15.09.), F2 (Gruppe 10, neuerer Stand 13.09.) und F3
(Gruppe 5, Stand 10.09.) stehen in `src/data/fTournamentSchedules.ts`.
F1 erscheint auf `/jugend/u9-f`, F2/F3 getrennt auf `/jugend/u8-f` mit eigenen
Abschnitts-IDs und Rückverweisen. Leere Terminfenster werden nicht erfunden;
F1 am 18.10. und F3 am 31.10. bleiben mit offener Uhrzeit sichtbar.
Die Heimspieltage am 10.10. um 09, 12 und 15 Uhr sind eigenständige Belegungen,
jeweils zwei Stunden plus Puffer. Überschneidungen mit anderen Mannschaften
bleiben als Konflikte sichtbar; es werden keine Spielorte stillschweigend geändert.
Haupt-/Nebenplatz und Platzumfang der F-Heimspieltage sind noch nicht bestätigt.
Bis dahin bleibt `homePitch: null`; die Termine erscheinen mit Zeitpuffern unter
„Noch zu klären“ und verhindern unsichere automatische Verlegungsvorschläge.
