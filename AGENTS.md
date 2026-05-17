# AGENTS.md

## Code

- Code, Dateinamen, Typen, Tests, technische Identifier: Englisch.
- UI-Text, README, Description-JSONs, Daten-Notes: Deutsch, knapp, sachlich.
- Simulation getrennt von UI; rechenlastige Läufe im Web Worker.
- Alles, was in der Sidebar oder sonstigen UI konfigurierbar ist, muss live in der URL codiert sein. Die URL ist der teilbare Zustand; keine Konfiguration ausschließlich in LocalStorage, SessionStorage oder Cookies speichern.
- Start: `npm install`, dann `npm run dev`. Vor Commit: `npm test` und `npm run build`.

## Datenpakete entwickeln

Datenpakete sind **Single-File-TS-Module** unter `data/<domäne>/`. Domänen:

- `data/erzeugung/` — Erzeuger (PV, Wind, Kohle, Gas, …) plus historische Beobachtungen und Einspeisefaktoren.
- `data/last/` — Sektor-Elektrifizierung (`e100-*`) plus historische Last.
- `data/speicher/` — Batterie, Pumpspeicher, H2.
- `data/aussenhandel/` — Strom- und H₂-Handel.
- `data/presets/` — Kompositionen (`kind: composition`). Im Wiki mit gelbem „Preset"-Tag hervorgehoben.
- `data/kern.ts` — Dispatch-Engine (`kind: model`).

Vorlagen unter `data/templates/` sind keine Datenpakete und werden nicht vom Loader verwendet. Sie dürfen als `kind: template` im Wiki erscheinen.

Bausteine (`kind: dataset` oder `kind: scenario`) sind atomare Einheiten mit Parametern oder Beobachtungen.

### Ablage

Pro Paket genau **eine** der zwei Formen:

- **Flach** (Standard): `data/<domain>/<id>.ts` — das Modul enthält alles.
- **Ordner-Form** (wenn ein Generator-Skript oder Roh-Daten dazu gehören): `data/<domain>/<id>/index.ts` plus ggf. `generate.mjs`, `data.json`, weitere kolokierte Assets.

Das Modul exportiert mindestens:

- `description: DatasetDoc` — Wiki-Eintrag (siehe Wiki-Stil unten), mit `id`, `domain` und `kind`.
- optional `data: <SpecificType>` — Modellparameter, Konstanten und kleine Profile. Bei Slider-Szenarien typed nach `src/types/data.ts`.
- optional Modul-Funktionen — Rechen-/Dispatch-Logik, `compute(scenario)` für Presets, `additional…TWh()`/`hourlyLoadGW()` für e100-Module, etc.

### Größen-Regel: Zeitreihen ab 500 Zeilen auslagern

TypeScript-Module sollen lesbar bleiben. Wenn `data` ein Array mit mehr als ~500 Einträgen enthält (8.760-Stunden-Profile, 365-Tage-`degreeDayProfile`, Tausende von Kapazitätsfaktoren), wandert das Array in eine **kolokierte JSON-Datei** und wird typisiert importiert. Vorbilder:

- `data/last/2025.ts` + `data/last/2025.hours.json` (8.760 Stunden ausgelagert).
- `data/last/e100-heiz/index.ts` + `data/last/e100-heiz/data.json` (`degreeDayProfile.days` + restliches `data`-Objekt, vom Generator gepflegt).

Pattern für Non-Generator-Pakete:

```ts
import hoursJson from './2025.hours.json';
export const data: SplitDataFile<LoadHour> = {
  source: 'Energy-Charts',
  year: 2025,
  // weitere kleine Felder inline …
  hours: hoursJson as LoadHour[],
};
```

Pattern für Generator-Pakete: der Generator schreibt `data.json`, das Modul importiert es typisiert:

```ts
import dataJson from './data.json';
export const data = dataJson as E100HeizData;
```

Faustregel: TS-Datei **max. 500 Zeilen**; bei mehr lagere die größte Datenstruktur aus. Description, Slider-Bounds, Konstanten, Modul-Funktionen bleiben **immer** im TS — sie sind die menschen-lesbare Schicht.

### Konsistenz-Anforderungen

- `description.id` muss mit dem Datei-Stem oder Ordner-Name übereinstimmen (Flat: `data/last/e100-pkw.ts` → `id: 'e100-pkw'`; Ordner: `data/last/e100-heiz/index.ts` → `id: 'e100-heiz'`).
- Slug eindeutig; der Pfad enthält die Domäne, die ID ist domänen-frei, wenn das Paket innerhalb seiner Domäne eindeutig ist (z. B. ID `pv`, Pfad `erzeugung/pv.ts`). Wo IDs kollidieren würden (`last-2025` vs. `erzeugung-2025`), bleibt der Domänen-Präfix in der ID.
- Kein zweites technisches Kürzel: kein `code`-Feld, keine parallelen Kurz-IDs.
- App-Code referenziert Paket-IDs als Key in Scenario-State, Worker-Nachrichten und `SimulationContext` — keine historischen Feature-Aliasse.
- Loader-Anpassung in `src/ui/defaultData.ts` (Big-Datasets via dynamic import, Kleinpakete static), Typen in `src/types/data.ts`.
- Test-Fixture in `src/__tests__/engine.test.ts` mit minimalem Plausibilitäts-Check.
- Wenn das Modul groß ist (z. B. `last/2025.ts` mit 8.760 Stunden im JSON-Import): in `defaultData.ts` per `await import(…)` laden, damit Vite es in einen eigenen Chunk packt.

## Szenarien prüfen

Vor dem Mergen jedes neuen oder geänderten Szenarios:

- Werte gegen reale Benchmarks halten: BDEW, AGEB, UBA, KBA, DWD, BWP, Fraunhofer ISE, Destatis. Quelle samt URL in `sourceUrls`.
- Mengenrechnung explizit ausweisen, z. B. `(Ziel − Mindest) / JAZ = X TWh`.
- Stundenintegration mit kleinem Node-Skript verifizieren: monatliche und jährliche Summen müssen physikalisch erwartbar sein (Heizen Jun-Aug ≈ 0, BEV-Last über Jahr ≈ Default-TWh).
- Im Chart prüfen, dass das aktivierte Szenario einen klar erkennbaren saisonalen oder tageszeitlichen Effekt erzeugt.

## Wiki-Stil

Description-JSONs rendern im Datenhandbuch als Wiki-Eintrag. Vorbilder:
- Arbeitsvorlage: `data/templates/scenario-description.template.json` — Struktur und Mindestniveau für neue Szenarien.
- Reine Daten ohne Slider: `data/last/2025/description.json` — kein `overview`, kein `sections`.
- Szenarien mit Slider und Formel: `data/last/e100-pkw/description.json` — aktueller Qualitätsanker für fachbuchartigen Lesefluss.

Regeln:

- `description`: 2–3 Markdown-Absätze im Fachbuchstil. Konkrete Bezugswerte nennen, wenn sie zum Verständnis nötig sind: Bezugsjahr, Referenzmenge, historisch enthaltener Sockel, zentraler Umrechnungsfaktor, Ergebnisgrößenordnung und Profilmechanik. Wo das Szenario fossile Endenergie ersetzt, gehört auch der Substitutions- und Wirkungsgrad-Vergleich in den Lesefluss (z. B. Verbrenner `~25 %` vs. BEV `75–85 %`). Flottenmittel-Korridore von der breiteren Einzelmodell-Streuung sauber trennen.
- Markdown sparsam nutzen: `**Begriffe**` für tragende Konzepte, `` `Werte/Einheiten/Formeln` `` für technische Größen, Links nur wenn sie den Lesefluss nicht stören.
- `source`: ein Satz mit den wichtigsten Bezugswerten in Klammern (z. B. „UBA Raumwärme 2023 (445 TWh)"). URLs gehören in `sourceUrls`.
- `overview`: nur für Szenarien mit Slider/Formel. Drei Einträge in dieser Reihenfolge, jeweils mit inline Markdown:
  - **Verwendung**: konkrete Slider-Spanne, was Default und Minimum bedeuten; das Maximum braucht eine fachliche Rationale (Wachstum, nicht-modellierte Teilbereiche, Vergleichsbedarf), keine arbiträren Werte.
  - **Verteilung**: zeitliche Verteilung und Profil-Quelle.
  - **Formel**: Rechenvorschrift inklusive Default-Auswertung.
  Kein zusätzlicher `Quelle`-Eintrag — Quellen stehen in `source`/`sourceUrls` und werden als eigenes Wiki-Kapitel gerendert.
- `method`: technische Herleitung mit Bezeichnern aus `data.json`/`model.ts`. Hier gehören Mengenrechnung, Faktorenkorridore und Profilnormierung hin.
- `method`-Einträge mit Präfix `Datei:` werden nicht in der Herleitung gezeigt, sondern im `Files`-Tab als Reproduktionshinweis gerendert.
- `fields`: eine knappe Zeile pro Top-Level-Feld. Verschachtelte Strukturen (`degreeDayProfile`, `hourlyProfile`) als ein einziger Eintrag mit Inhalt-Zusammenfassung, nicht jede Sub-Property einzeln.
- `file`: auf `<domain>/<paket>/data.json`, wenn vorhanden. `scripts`: mindestens `<domain>/<paket>/model.ts`, plus `<domain>/<paket>/generate.mjs` wenn vorhanden. Ordnername, `id` und Modellcode-Pfad müssen identisch sein.
- `caveats`: 3–5 Punkte, jeweils ein Satz, nur echte Grenzen. Scope-Lücken (nicht-modellierte Teilbereiche) mit Mengenangabe explizit benennen; optimistische Annahmen am Rand der Realweltdaten als solche flaggen, idealerweise mit Quellenverweis.
- `sections` vermeiden. „Erwägungsgründe" und pädagogische Bullet-Listen gehören weder ins Wiki noch in den Code.
- Keine tote Wiederholung: Zahlen dürfen in `description`, `overview` und `method` vorkommen, wenn sie dort unterschiedliche Aufgaben erfüllen (Lesefluss, Bedienung, Herleitung). Keine reinen Copy-Paste-Dubletten.
- Keine Marketingsprache.

## Commits

- Format: 2-3 Zeilen Zusammenfassung, dann Leerzeile, dann Detail-Auflistung (Bullets).
- Erste Zeile: kurze imperativische Kernaussage (was, nicht wie). Subject ≤ 72 Zeichen.
- Body-Bullets: konkrete Änderungen pro Datei oder Bereich, jeweils ein Punkt.
- Kein `Co-Authored-By`-Trailer.

## Changelog

Der Änderungsverlauf wird zur Build-Zeit aus `git log` generiert (`vite.config.ts` → `__BUILD_COMMITS__`, letzte 50 Commits ohne Merges) und im `ChangelogModal` gerendert. Keine händische Pflege nötig — die Commit-Subjects sind das Changelog. Entsprechend sollten Subjects user-verständlich sein (siehe Commit-Stil oben).

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
