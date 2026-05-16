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

Vorlagen unter `data/templates/` sind keine Datenpakete, stehen nicht im Manifest und werden nicht von Simulation/Loadern verwendet. Sie dürfen als `kind: template` im Wiki erscheinen.

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

`CHANGELOG.md` listet user-sichtbare Änderungen, händisch gepflegt. Eintrag dann anlegen, wenn etwas „release-würdiges" fertig ist (neues Feature, sichtbare Verhaltensänderung, nutzerrelevanter Bugfix) — nicht pro Commit.

Mechanik:

1. Alten Marker am Dateiende lesen: `<!-- last: <sha> -->`.
2. Seit dem Marker passierte Commits durchsehen: `git log <alter-sha>..HEAD --oneline`.
3. Neuen Block **direkt unter** dem Einleitungs-Paragraphen einfügen, **über** allen bestehenden `##`-Blöcken:
   - Überschrift `## YYYY-MM-DD` (heute, `date +%Y-%m-%d`).
   - Bullet-Liste mit den Änderungen.
4. Alten Marker entfernen, neuen ans Dateiende setzen: `<!-- last: $(git rev-parse --short HEAD) -->`.

Stil:

- Knackig: max. 5 Bullets pro Tagesblock, je ~10–15 Wörter — ungefähr eine Zeile.
- Substantiv-zentriert, kein Marketing, keine Quellen-Klammern; konkrete Begriffe (Sektor-Namen, Wirkungsgrade) sind erlaubt und gewollt.
- User-Perspektive: „H2-Import als eigener Slider", nicht „Refactor scenario presets".
- Verwandte Änderungen mit Semikolon in einem Bullet bündeln (z. B. „e100-lkw um Transit/Kabotage und Nutzlast-Uplift erweitert; e100-heiz-JAZ-Spanne dokumentiert.").
- Interne Refactors, Build-Hygiene, Tests, UI-Cosmetics weglassen — nur was Nutzer sehen oder im Ergebnis spüren.

## Dokumentation

Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien.
