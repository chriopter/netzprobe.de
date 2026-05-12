# Netzprobe

Kompakte Stromnetz-Simulation für Deutschland. Last und Erzeugung einstellen, Lastdeckung, Speicher, Abregelung und CO₂ sehen.

## Stack

Frontend zuerst: Vite, TypeScript, React, Tailwind und ECharts. Die Simulation läuft im Browser, rechenlastige Läufe im Web Worker. Kein Backend, keine Datenbank, keine Anmeldung.

## Anspruch

KISS: statisch hostbar, schnell bedienbar, ein offener `data/`-Ordner mit Präfix-Dateien. UI deutsch und knapp; Modell, Tests und technische Bezeichner englisch.

`modellfaktoren_*` enthält keine Rohwetterdaten, sondern aus Energy-Charts zurückgerechnete Solar-/Wind-Verfügbarkeiten für andere PV-/Wind-Leistungen.

## Vorsicht

Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln.

## Credits

Inspiriert von [`MTGermany/energy-simulation-de`](https://github.com/MTGermany/energy-simulation-de). Die Daten in diesem Repo wurden neu aus öffentlichen Quellen bezogen.
