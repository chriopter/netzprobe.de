# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln.

Live: https://chriopter.github.io/netzprobe/

## Stack

Frontend zuerst: Vite, TypeScript, React, Tailwind und ECharts. Die Simulation läuft im Browser, rechenlastige Läufe im Web Worker. Kein Backend, keine Datenbank, keine Anmeldung.

## Entwicklung

`npm install`, dann `npm run dev`.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Die Daten in diesem Repo wurden neu aus öffentlichen Quellen bezogen.
