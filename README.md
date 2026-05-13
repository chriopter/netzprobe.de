# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln.

Live: https://chriopter.github.io/netzprobe/

## Daten

- `data/last/` — Last und Zusatzlast-Szenarien.
- `data/erzeugung/` — historische Erzeugung.
- `data/modell/` — Kernmodell und Modellannahmen.

Jede `.json` hat eine gleichnamige `.description.json`. `data/manifest.json` ist die Karte.

## Stack

Vite, TypeScript, React, Tailwind, ECharts. Simulation läuft im Browser im Web Worker. Kein Backend.

## Entwicklung

`npm install`, dann `npm run dev`. Tests mit `npm test`, Build mit `npm run build`.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Daten neu aus öffentlichen Quellen.
