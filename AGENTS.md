# AGENTS.md

## Code

- Code, Dateinamen, Typen, Tests, technische Identifier: Englisch.
- UI-Text, README, Description-JSONs, Daten-Notes: Deutsch, knapp, sachlich.
- Simulation getrennt von UI; rechenlastige Läufe im Web Worker.
- Start: `npm install`, dann `npm run dev`. Vor Commit: `npm test` und `npm run build`.

## Szenarien entwickeln

Jedes Daten-Szenario lebt unter `data/<domain>/` mit drei Dateien:

1. `<name>.json` — Modellparameter und eingebettete Profile.
2. `generate-<name>.mjs` daneben, wenn Werte berechnet werden. Skript schreibt nach stdout, JSON wird über `node generate-<name>.mjs > <name>.json` regeneriert.
3. `<name>.description.json` — Wiki-Eintrag (siehe Stil unten).

Außerdem nötig:
- Eintrag in `data/manifest.json` in der Reihenfolge, in der die App es zeigen soll.
- Loader-Anpassung in `src/loaders/defaultData.ts` und Typen in `src/types/data.ts`.
- Test-Fixture in `src/__tests__/engine.test.ts` mit minimalem Plausibilitäts-Check.

## Szenarien prüfen

Vor dem Mergen jedes neuen oder geänderten Szenarios:

- Werte gegen reale Benchmarks halten: BDEW, AGEB, UBA, KBA, DWD, BWP, Fraunhofer ISE, Destatis. Quelle samt URL in `sourceUrls`.
- Mengenrechnung explizit ausweisen, z. B. `(Ziel − Mindest) / JAZ = X TWh`.
- Stundenintegration mit kleinem Node-Skript verifizieren: monatliche und jährliche Summen müssen physikalisch erwartbar sein (Heizen Jun-Aug ≈ 0, BEV-Last über Jahr ≈ Default-TWh).
- Im Chart prüfen, dass das aktivierte Szenario einen klar erkennbaren saisonalen oder tageszeitlichen Effekt erzeugt.

## Wiki-Stil

Description-JSONs rendern im Datenhandbuch als Wiki-Eintrag. Vorbilder:
- Reine Daten ohne Slider: `data/last/energy-charts-stuendlich-2025.description.json` — kein `overview`, kein `sections`.
- Szenarien mit Slider und Formel: `data/last/pkw-elektrifizierung.description.json` und `data/last/heiz-elektrifizierung.description.json` — knappe Einleitung plus drei strukturierte Übersichtspunkte.

Regeln:

- `description`: 2–3 Sätze, generisch, ohne konkrete Zahlen. Beschreibt _was_ das Szenario tut und _wie_ es prinzipiell gerechnet wird, nicht mit welchen Werten.
- `source`: ein Satz mit den wichtigsten Bezugswerten in Klammern (z. B. „UBA Raumwärme 2023 (445 TWh)"). URLs gehören in `sourceUrls`.
- `overview`: nur für Szenarien mit Slider/Formel. Maximal drei Einträge in dieser Reihenfolge:
  - **Verwendung**: konkrete Slider-Spanne, was Default bedeutet.
  - **Verteilung**: zeitliche Verteilung und Profil-Quelle.
  - **Formel**: Rechenvorschrift inklusive Default-Auswertung.
  Kein zusätzlicher `Quelle`-Eintrag — die Quelle ist in `source` und der Wiki-Header rendert sie ohnehin separat.
- `fields`: eine knappe Zeile pro Top-Level-Feld. Verschachtelte Strukturen (`degreeDayProfile`, `hourlyProfile`) als ein einziger Eintrag mit Inhalt-Zusammenfassung, nicht jede Sub-Property einzeln.
- `caveats`: 3–5 Punkte, jeweils ein Satz, nur echte Grenzen.
- `sections` vermeiden. „Erwägungsgründe" und pädagogische Bullet-Listen gehören weder ins Wiki noch in den Code.
- Keine Wiederholung: Was schon in `title`, `short`, `source` oder `fields` steht, gehört nicht nochmal in `description` oder `overview`.
- Keine Marketingsprache.

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
