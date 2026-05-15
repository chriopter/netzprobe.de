# AGENTS.md

## Code

- Code, Dateinamen, Typen, Tests, technische Identifier: Englisch.
- UI-Text, README, Description-JSONs, Daten-Notes: Deutsch, knapp, sachlich.
- Simulation getrennt von UI; rechenlastige Läufe im Web Worker.
- Alles, was in der Sidebar oder sonstigen UI konfigurierbar ist, muss live in der URL codiert sein. Die URL ist der teilbare Zustand; keine Konfiguration ausschließlich in LocalStorage, SessionStorage oder Cookies speichern.
- Start: `npm install`, dann `npm run dev`. Vor Commit: `npm test` und `npm run build`.

## Datenpakete entwickeln

Datenpakete teilen sich in zwei Klassen:

- **Bausteine** (`kind: dataset` oder `kind: scenario`) — atomare Einheiten mit Parametern oder Beobachtungen. Direkt unter `data/<id>/`.
- **Presets** (`kind: composition`) — vorkonfigurierte Kombinationen von Bausteinen. Unter `data/preset/<id>/`. Im Wiki mit gelbem „Preset"-Tag hervorgehoben.

Engine-Code (`kind: model`) lebt in `data/kernmodell/`.

Jeder fachliche Daten-, Szenario- oder Modellbaustein lebt als Paket unter `data/<paket>/`.
Jedes Paket hat immer:

1. `description.json` — Wiki-Eintrag (siehe Stil unten), mit `id`, `domain` und `kind`.
2. `model.ts` — ausführbarer Paket-Adapter oder Modellcode. Auch reine Datenpakete exportieren hier typisiert ihre `data.json`.

Optional:

3. `data.json` — Modellparameter, Rohdaten und eingebettete Profile, wenn das Paket Datenwerte enthält.
4. `generate.mjs` — Generator, wenn Werte berechnet werden. Skript schreibt nach stdout oder direkt nach `data.json`; Regeneration klar in `description.json` beschreiben.

Außerdem nötig:
- Eintrag in `data/manifest.json` in der Reihenfolge, in der die App es zeigen soll. Jeder Eintrag hat `id`, `path` (Verzeichnis relativ zu `data/`) und `description` (Pfad zur Beschreibung).
- Slug eindeutig; Top-Level-Pakete liegen flach in `data/<id>/`, Kompositions-/Preset-Pakete in `data/preset/<id>/` (z. B. `data/preset/e100/`, `data/preset/versorgung-100ee-noimport/`). Der Pfad wird im Manifest aufgelöst, die ID bleibt URL-stabil.
- Paketordner-Basename, Manifest-`id`, `description.json.id` und der `model.ts`-Pfad in `scripts` (relativ zum `data/`-Root) müssen 1:1 denselben Paketnamen verwenden, z. B. `data/e100-pkw/`, `"id": "e100-pkw"`, `"scripts": ["e100-pkw/model.ts"]`.
- Kein zweites technisches Kürzel: kein `code`-Feld, keine parallelen Kurz-IDs wie `EF25`. Wenn eine Datei ein `id`-Feld hat, muss es exakt der Paketordner-Basename sein.
- App-Code referenziert Paket-IDs über `src/dataPackages.ts`; Scenario-State, Worker-Nachrichten und Core-Kontext verwenden die Paket-ID als Key, keine historischen Feature-Aliasse.
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
- Reine Daten ohne Slider: `data/last-2025/description.json` — kein `overview`, kein `sections`.
- Szenarien mit Slider und Formel: `data/e100-pkw/description.json` und `data/e100-heiz/description.json` — knappe Einleitung plus drei strukturierte Übersichtspunkte.

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

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
