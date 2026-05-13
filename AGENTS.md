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

Description-JSONs rendern im Datenhandbuch als Wiki-Eintrag. Vorbild: `data/last/energy-charts-stuendlich-2025.description.json` — kurz, ohne `overview`, ohne `sections`.

Regeln:

- `description`: 2–3 Sätze. Was tut der Slider, welche Rechnung, welche zeitliche Verteilung. Keine Wiederholung von `source` oder `fields`.
- `source`: ein Satz mit den wichtigsten Bezugswerten in Klammern (z. B. „UBA Raumwärme 2023 (445 TWh)"). URLs in `sourceUrls`.
- `fields`: eine knappe Zeile pro Top-Level-Feld. Verschachtelte Strukturen (`degreeDayProfile`, `hourlyProfile`) als ein einziger Eintrag mit Inhalt-Zusammenfassung, nicht jede Sub-Property einzeln.
- `caveats`: 3–5 Punkte, jeweils ein Satz, nur echte Grenzen.
- `overview` und `sections` vermeiden. Wichtige Werte gehören in `description`, strukturelle Infos in `fields`. „Erwägungsgründe"-Prosa und pädagogische Bullet-Listen entfernen.
- Keine Marketingsprache.

Negativ-Beispiel: vorherige Versionen von `pkw-elektrifizierung.description.json` und `heiz-elektrifizierung.description.json` mit `overview`-Blöcken und „Erwägungsgründe"-Sektionen.

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
