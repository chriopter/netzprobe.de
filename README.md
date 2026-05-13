# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln.

Live: https://chriopter.github.io/netzprobe/

## Stack

Frontend zuerst: Vite, TypeScript, React, Tailwind und ECharts. Die Simulation läuft im Browser, rechenlastige Läufe im Web Worker. Kein Backend, keine Datenbank, keine Anmeldung.

## Entwicklung

`npm install`, dann `npm run dev`. Tests mit `npm test`, Build mit `npm run build`.

## Daten

Öffentliche Datensätze liegen unter `data/`:

- `data/last/` — historische Stromlast 2025 (Energy-Charts) und Zusatzlast-Szenarien PKW Elektrifizierung und Heiz Elektrifizierung mit eingebettetem Gradtagszahl- und 24-h-Lastprofil.
- `data/erzeugung/` — historische öffentliche Erzeugung 2025 nach Energieträgern und Handelssaldo (Energy-Charts).
- `data/modell/` — Kernmodell-Beschreibung und abgeleitete PV-/Wind-Einspeisefaktoren.

`data/manifest.json` ist die maschinenlesbare Karte für App, FAQ und Datenhandbuch. Jede `.json`-Datendatei hat eine gleichnamige `.description.json` mit Quellen, Feldern, Grenzen und Quellen-URLs.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Die Daten in diesem Repo wurden neu aus öffentlichen Quellen bezogen (Energy-Charts, BDEW, UBA, AGEB, DWD, Destatis, KBA, KIT, Fraunhofer ISE).
