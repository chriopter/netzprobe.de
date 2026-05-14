# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Alle Eingangsgrößen sind dokumentierte Annahmen basierend auf öffentlichen Quellen, keine empirisch belastbaren Werte. Ergebnisse als grobe Orientierung lesen, nicht als Prognose.

Live: https://chriopter.github.io/netzprobe/

## Daten

- `data/last-2025/` — historische Last.
- `data/e100-pkw/`, `data/e100-heiz/`, `data/e100/` — Lastszenarien und Komposition.
- `data/erzeugung-2025/` — historische Erzeugung.
- `data/kernmodell/`, `data/einspeisefaktoren-2025/` — Modell und Modellannahmen.

Jedes Paket hat immer `description.json` und `model.ts`. Datenwerte liegen optional in `data.json`, Generatoren optional in `generate.mjs`; `data/manifest.json` bestimmt die Reihenfolge.

## Stack

Vite, TypeScript, React, Tailwind, ECharts. Simulation läuft im Browser im Web Worker. Kein Backend.

## Entwicklung

`npm install`, dann `npm run dev`. Tests mit `npm test`, Build mit `npm run build`.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Daten neu aus öffentlichen Quellen.
