# AGENTS.md

## Code

- Code, Dateinamen, Typen, Tests, technische Identifier: Englisch.
- UI-Text, README, Description-JSONs, Daten-Notes: Deutsch, knapp, sachlich.
- Simulation getrennt von UI; rechenlastige Läufe im Web Worker.
- Alles, was in der Sidebar oder sonstigen UI konfigurierbar ist, muss live in der URL codiert sein. Die URL ist der teilbare Zustand; keine Konfiguration ausschließlich in LocalStorage, SessionStorage oder Cookies speichern.
- Start: `npm install`, dann `npm run dev`. Vor Commit: `npm test` und `npm run build`.

## Modellpakete entwickeln

Modellpakete liegen unter `model/<domäne>/<id>/`. Domänen:

- `model/erzeugung/` — Erzeuger plus historische Beobachtungen und Einspeisefaktoren.
- `model/last/` — Sektor-Elektrifizierung (`e100-*`) plus historische Last.
- `model/speicher/` — Batterie, Pumpspeicher, H₂.
- `model/aussenhandel/` — Strom- und H₂-Handel.
- `model/presets/` — Kompositionen (`kind: composition`).
- `model/kern/kern/` — Beschreibung des Dispatch-Modells; die aktive Engine läuft in Rust unter `server/src/simulation.rs`.

Pro Paket gibt es ein `package.json` mit `description` und `data`. Große Zeitreihen bleiben als kolokierte JSON-Dateien (`hours.json`, `data.json`) im Paketordner. Das Dashboard lädt nur `app/src/ui/uiManifest.ts`; vollständige Paketdaten werden im Wiki lazy geladen und vom Rust-Server per `include_str!` für die Simulation genutzt.

Regeln:

- UI-Text, README, Description-JSONs und Daten-Notes bleiben Deutsch, knapp und sachlich.
- Code, Dateinamen, Typen, Tests und technische Identifier bleiben Englisch.
- Simulation gehört in Rust (`server/src/`), nicht zurück ins Frontend.
- Wenn Package-Daten geändert werden, das schlanke `uiManifest` aktualisieren, sofern Sidebar-Defaults, Slider-Bounds, Summen oder Referenzskalen betroffen sind.
- Wiki-Beschreibungen bleiben in `package.json.description`; das Dashboard darf keine vollständigen Wiki-/Profilpakete für den Erstpfad importieren.

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

Der Änderungsverlauf wird zur Build-Zeit aus `git log` generiert (`app/vite.config.ts` → `__BUILD_COMMITS__`, letzte 50 Commits ohne Merges) und im `ChangelogModal` gerendert. Keine händische Pflege nötig — die Commit-Subjects sind das Changelog. Entsprechend sollten Subjects user-verständlich sein (siehe Commit-Stil oben).

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
