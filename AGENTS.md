# AGENTS.md

## Code

- Code, Dateinamen, Typen, Tests, technische Identifier: Englisch.
- UI-Text, README, Description-JSONs, Daten-Notes: Deutsch, knapp, sachlich.
- Simulation getrennt von UI; rechenlastige Läufe im Web Worker.
- Alles, was in der Sidebar oder sonstigen UI konfigurierbar ist, muss live in der URL codiert sein. Die URL ist der teilbare Zustand; keine Konfiguration ausschließlich in LocalStorage, SessionStorage oder Cookies speichern.
- Start: `npm install`, dann `npm run dev`. Vor Commit: `npm test` und `npm run build`.

## Datenpakete entwickeln

Datenpakete leben unter `data/<domäne>/<paket>/`. Domänen:

- `data/erzeugung/` — Erzeuger (PV, Wind, Kohle, Gas, …) plus historische Beobachtungen und Einspeisefaktoren.
- `data/last/` — Sektor-Elektrifizierung (`e100-*`) plus historische Last.
- `data/speicher/` — Batterie, Pumpspeicher, H2.
- `data/presets/` — Kompositionen (`kind: composition`). Im Wiki mit gelbem „Preset"-Tag hervorgehoben.
- `data/kern/` — Dispatch-Engine (`kind: model`).

Bausteine (`kind: dataset` oder `kind: scenario`) sind atomare Einheiten mit Parametern oder Beobachtungen.

Jedes Paket hat immer:

1. `description.json` — Wiki-Eintrag (siehe Stil unten), mit `id`, `domain` und `kind`.
2. `model.ts` — ausführbarer Paket-Adapter oder Modellcode. Auch reine Datenpakete exportieren hier typisiert ihre `data.json`.

Optional:

3. `data.json` — Modellparameter, Rohdaten und eingebettete Profile, wenn das Paket Datenwerte enthält.
4. `generate.mjs` — Generator, wenn Werte berechnet werden. Skript schreibt nach stdout oder direkt nach `data.json`; Regeneration klar in `description.json` beschreiben.

Außerdem nötig:
- Eintrag in `data/manifest.json` mit `id`, `path` (Verzeichnis relativ zu `data/`, z. B. `erzeugung/pv` oder `last/e100-pkw`) und `description` (Pfad zur Beschreibung). Die Reihenfolge bestimmt die Wiki-Anzeige.
- Slug eindeutig; der Pfad enthält die Domäne, die ID ist domänen-frei, wenn das Paket innerhalb seiner Domäne eindeutig ist (z. B. ID `pv`, Pfad `erzeugung/pv`). Wo IDs sonst kollidieren würden (`last-2025` vs. `erzeugung-2025`), bleibt der Domänen-Präfix in der ID.
- `description.json.id` muss exakt der Manifest-`id` entsprechen; der `model.ts`-Eintrag in `scripts` muss mit `path/` beginnen, also z. B. `"scripts": ["erzeugung/pv/model.ts"]`.
- Kein zweites technisches Kürzel: kein `code`-Feld, keine parallelen Kurz-IDs wie `EF25`. Wenn eine Datei ein `id`-Feld hat, muss es exakt die Manifest-`id` sein.
- App-Code referenziert Paket-IDs über `src/ui/dataPackages.ts`; Scenario-State, Worker-Nachrichten und Core-Kontext verwenden die Paket-ID als Key, keine historischen Feature-Aliasse.
- Loader-Anpassung in `src/ui/defaultData.ts` und Typen in `src/types/data.ts`.
- Test-Fixture in `src/__tests__/engine.test.ts` mit minimalem Plausibilitäts-Check.

## Szenarien prüfen

Vor dem Mergen jedes neuen oder geänderten Szenarios:

- Werte gegen reale Benchmarks halten: BDEW, AGEB, UBA, KBA, DWD, BWP, Fraunhofer ISE, Destatis. Quelle samt URL in `sourceUrls`.
- Mengenrechnung explizit ausweisen, z. B. `(Ziel − Mindest) / JAZ = X TWh`.
- Stundenintegration mit kleinem Node-Skript verifizieren: monatliche und jährliche Summen müssen physikalisch erwartbar sein (Heizen Jun-Aug ≈ 0, BEV-Last über Jahr ≈ Default-TWh).
- Im Chart prüfen, dass das aktivierte Szenario einen klar erkennbaren saisonalen oder tageszeitlichen Effekt erzeugt.

## Wiki-Stil

Description-JSONs rendern im Datenhandbuch als Wiki-Eintrag. Vorbilder:
- Reine Daten ohne Slider: `data/last/2025/description.json` — kein `overview`, kein `sections`.
- Szenarien mit Slider und Formel: `data/last/e100-pkw/description.json` und `data/last/e100-heiz/description.json` — knappe Einleitung plus drei strukturierte Übersichtspunkte.

Regeln:

- `description`: 2–3 Sätze, generisch, ohne konkrete Zahlen. Beschreibt _was_ das Szenario tut und _wie_ es prinzipiell gerechnet wird, nicht mit welchen Werten.
- `source`: ein Satz mit den wichtigsten Bezugswerten in Klammern (z. B. „UBA Raumwärme 2023 (445 TWh)"). URLs gehören in `sourceUrls`.
- `overview`: nur für Szenarien mit Slider/Formel. Maximal drei Einträge in dieser Reihenfolge:
  - **Verwendung**: konkrete Slider-Spanne, was Default bedeutet.
  - **Verteilung**: zeitliche Verteilung und Profil-Quelle.
  - **Formel**: Rechenvorschrift inklusive Default-Auswertung.
  Kein zusätzlicher `Quelle`-Eintrag — die Quelle ist in `source` und der Wiki-Header rendert sie ohnehin separat.
- `fields`: eine knappe Zeile pro Top-Level-Feld. Verschachtelte Strukturen (`degreeDayProfile`, `hourlyProfile`) als ein einziger Eintrag mit Inhalt-Zusammenfassung, nicht jede Sub-Property einzeln.
- `file`: auf `<paket>/data.json`, wenn vorhanden. `scripts`: mindestens `<paket>/model.ts`, plus `<paket>/generate.mjs` wenn vorhanden. Ordnername, `id` und Modellcode-Pfad müssen identisch sein.
- `caveats`: 3–5 Punkte, jeweils ein Satz, nur echte Grenzen.
- `sections` vermeiden. „Erwägungsgründe" und pädagogische Bullet-Listen gehören weder ins Wiki noch in den Code.
- Keine Wiederholung: Was schon in `title`, `short`, `source` oder `fields` steht, gehört nicht nochmal in `description` oder `overview`.
- Keine Marketingsprache.

## Commits

- Format: 2-3 Zeilen Zusammenfassung, dann Leerzeile, dann Detail-Auflistung (Bullets).
- Erste Zeile: kurze imperativische Kernaussage (was, nicht wie). Subject ≤ 72 Zeichen.
- Body-Bullets: konkrete Änderungen pro Datei oder Bereich, jeweils ein Punkt.
- Kein `Co-Authored-By`-Trailer.

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
