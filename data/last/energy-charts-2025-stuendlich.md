# Historische Last 2025

- Quelle: Energy-Charts `public_power`, Deutschland.
- Abruf: `https://api.energy-charts.info/public_power?country=de&start=2025-01-01&end=2026-01-01`
- Rohauflösung: 15 Minuten; Netzprobe mittelt auf Stunden.
- Auswahl: Feld für elektrische Last; keine Erzeugungs- oder Handelsreihen in dieser Datei.
- Verwendung: feste Basislast des Szenarios, nicht abschaltbar.
- Plot: als Lastkurve gegen simulierte Erzeugung, Speicher, Import/Export und Unterdeckung.
- Einheit: `loadMW` in MW; Darstellung in der UI meist als GW oder TWh-Summe.

## Felder

- `time` — Zeitpunkt der Stunde.
- `loadMW` — gemittelte Last in MW.
