# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Alle Eingangsgrößen sind dokumentierte Annahmen basierend auf öffentlichen Quellen, keine empirisch belastbaren Werte. Ergebnisse als grobe Orientierung lesen, nicht als Prognose.

Live: https://netzprobe.de/

## Daten

Datenpakete trennen sich in **Bausteine** (atomare Datensätze und Szenarien, direkt unter `data/<id>/`) und **Presets** (vorkonfigurierte Kombinationen, unter `data/preset/<id>/`). Das Wiki hebt Presets mit einem gelben Tag hervor.

- `data/last-2025/`, `data/erzeugung-2025/`, `data/einspeisefaktoren-2025/` — historische Datensätze.
- `data/e100-pkw/`, `data/e100-heiz/`, ... — Last-Bausteine (Sektor-Elektrifizierung).
- `data/erz-pv/`, `data/erz-windon/`, ..., `data/speicher-batterie/`, ... — Erzeugungs- und Speicher-Bausteine.
- `data/preset/e100/`, `data/preset/versorgung-100ee-noimport/`, ... — Presets.
- `data/kernmodell/` — Dispatch-Engine.

Jedes Paket hat immer `description.json` und `model.ts`. Datenwerte liegen optional in `data.json`, Generatoren optional in `generate.mjs`; `data/manifest.json` bestimmt die Reihenfolge.

## Stack

- **Runtime:** React + React DOM, ECharts (Charts im OffscreenCanvas-Worker), Lucide (Icons)
- **Build & Dev:** Vite + `@vitejs/plugin-react`, TypeScript, Tailwind + `@tailwindcss/vite`, tsx (Skript-Runner)
- **Tests:** Vitest

Simulation und Charts laufen in Web Workern, das UI bleibt responsiv. Kein Backend, statisch hostbar.

## Entwicklung

`npm install`, dann `npm run dev`. Tests mit `npm test`, Build mit `npm run build`.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Daten neu aus öffentlichen Quellen.
