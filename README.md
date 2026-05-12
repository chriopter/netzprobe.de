# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Live: https://chriopter.github.io/netzprobe/

## Stack

Frontend zuerst: Vite, TypeScript, React, Tailwind und ECharts. Die Simulation läuft im Browser, rechenlastige Läufe im Web Worker. Kein Backend, keine Datenbank, keine Anmeldung.

## Entwicklung

Abhängigkeiten installieren:

```bash
npm install
```

Dev-Server starten:

```bash
npm run dev
```

## Anspruch

KISS: statisch hostbar, schnell bedienbar, ein offener `data/`-Ordner mit Fachordnern und Datenhandbuch. UI deutsch und knapp; Modell, Tests und technische Bezeichner englisch.

`data/modell/einspeisefaktoren-stuendlich-2025.json` enthält keine Rohwetterdaten, sondern aus Energy-Charts abgeleitete PV-/Wind-Einspeisefaktoren für andere installierte Leistungen.

## Vorsicht

Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Die Daten in diesem Repo wurden neu aus öffentlichen Quellen bezogen.
