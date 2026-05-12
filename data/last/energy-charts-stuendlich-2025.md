# Historisch 2025

- Quelle: Energy-Charts `public_power`, Deutschland.
- Abruf: `https://api.energy-charts.info/public_power?country=de&start=2025-01-01&end=2026-01-01`
- Rohdaten: 15-Minuten-Werte der elektrischen Last.
- Ermittlung: je Stunde Mittelwert aus den zugehörigen 15-Minuten-Werten.
- Auswahl: nur Last; keine Erzeugungs- oder Handelsreihen in dieser Datei.
- Verwendung: fixer Verbrauch; in der UI per Radio-Button als Lastszenario übernommen.
- Plot: als Lastkurve gegen simulierte Erzeugung, Speicher, Import/Export und Unterdeckung.
- Einheit: `loadMW` in MW; Darstellung in der UI meist als GW oder TWh-Summe.

## Rohdaten

- `data/last/energy-charts-stuendlich-2025.json`

## Felder

- `generatedAt` — Zeitpunkt der lokalen Datendatei-Erzeugung.
- `year` — Bezugsjahr des Datensatzes.
- `source` — Kurzbeschreibung der Quelle und Verarbeitung.
- `sourceUrl` — Energy-Charts-API-Abruf.
- `unit` — Einheit der Stundenwerte: MW.
- `hours[].time` — Zeitpunkt der Stunde.
- `hours[].loadMW` — aus 15-Minuten-Werten gemittelte elektrische Last in Deutschland.
- `sumTWh` — Jahressumme der Last in TWh.
- `sumNote` — Kurznotiz zur Summenberechnung.
