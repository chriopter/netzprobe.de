# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Alle Eingangsgrößen sind dokumentierte Annahmen aus öffentlichen Quellen, keine belastbaren Werte — als Orientierung lesen, nicht als Prognose.

Live: https://netzprobe.de/

## Stack

React, ECharts (OffscreenCanvas-Worker), Vite, TypeScript, Tailwind, Vitest. Simulation und Charts laufen in Web Workern, kein Backend, statisch hostbar.

## Daten

Pakete liegen unter `data/<domäne>/<id>/`:

- `erzeugung/` — Erzeuger (`pv`, `windon`, `windoff`, `kernkraft`, `biomasse`, `laufwasser`, `gas`, `kohle`, `handel`) plus historische Referenzen.
- `last/` — Sektor-Elektrifizierung (`e100-*`) plus historische Last.
- `speicher/` — `batterie`, `pumpspeicher`, `h2`.
- `presets/` — Vorkonfigurierte Kombinationen.
- `kern/` — Dispatch-Engine.

Jedes Paket hat `description.json` und `model.ts`, optional `data.json` und `generate.mjs`. `data/manifest.json` mappt IDs auf Pfade.

## Entwicklung

```
bin/dev          # npm run dev
bin/update       # alle Pakete auf latest + tsc + tests + build
npm test
npm run build
```

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Daten neu aus öffentlichen Quellen.
