# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Alle Eingangsgrößen sind dokumentierte Annahmen aus öffentlichen Quellen, keine belastbaren Werte — als Orientierung lesen, nicht als Prognose.

Live: https://netzprobe.de/

## Stack

React, ECharts (OffscreenCanvas-Worker), Vite, TypeScript, Tailwind, Vitest. Simulation und Charts laufen in Web Workern, kein Backend, statisch hostbar.

## Daten

Pakete liegen unter `data/<domäne>/`:

- `erzeugung/` — Erzeuger (`pv`, `windon`, `windoff`, `kernkraft`, `biomasse`, `laufwasser`, `gas`, `kohle`) plus historische Referenzen und Einspeisefaktoren.
- `last/` — Sektor-Elektrifizierung (`e100-*`) plus historische Last.
- `speicher/` — `batterie`, `pumpspeicher`, `h2`.
- `aussenhandel/` — `strom-handel`, `h2-handel`.
- `presets/` — Vorkonfigurierte Kombinationen.
- `kern.ts` — Dispatch-Engine.

Jedes Paket ist ein einziges TS-Modul (`data/<domain>/<id>.ts` flach, oder `data/<domain>/<id>/index.ts` falls ein Generator-Skript dazu gehört). Das Modul exportiert `description: DatasetDoc`, optional `data` und Modul-Funktionen. Großvolumige Zeitreihen (>500 Einträge) liegen als kolokiertes JSON daneben (`*.hours.json` oder `data.json`) und werden vom TS-Modul typisiert importiert. Der Loader liest alle Module via `import.meta.glob`; ein Manifest gibt es nicht mehr.

## Entwicklung

```
bin/dev          # npm run dev
bin/update       # alle Pakete auf latest + tsc + tests + build
npm test
npm run build
```

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Daten neu aus öffentlichen Quellen.
