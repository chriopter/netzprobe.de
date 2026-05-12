# Historisch 2025

- Verwendung: fixe historische öffentliche Erzeugung; in der UI per Radio-Button als Erzeugungsszenario übernommen.
- Quelle: Energy-Charts `public_power`, Deutschland.
- Abruf: `https://api.energy-charts.info/public_power?country=de&start=2025-01-01&end=2026-01-01`
- Rohdaten: 15-Minuten-Werte je Energieträger und Handelssaldo.
- Ermittlung: je Stunde Mittelwert aus den zugehörigen 15-Minuten-Werten.
- Auswahl: öffentliche Erzeugung nach Energieträgern; Handelssaldo separat.
- Plot: Energieträger als simulierte Versorgung gegen Lastkurve, Speicher, Import/Export und Unterdeckung.
- Einheit: MW; Summen in TWh.

## Felder

- `generatedAt` — Zeitpunkt der lokalen Datendatei-Erzeugung.
- `year` — Bezugsjahr des Datensatzes.
- `source` — Kurzbeschreibung der Quelle und Verarbeitung.
- `sourceUrl` — Energy-Charts-API-Abruf.
- `unit` — Einheit der Stundenwerte: MW.
- `hours[].time` — Zeitpunkt der Stunde.
- `hours[].pvMW` — Photovoltaik-Einspeisung.
- `hours[].windOnMW` — Wind Onshore.
- `hours[].windOffMW` — Wind Offshore.
- `hours[].gasMW` — Gaserzeugung.
- `hours[].coalMW` — Kohleerzeugung.
- `hours[].hydroMW` — Wasserkraft.
- `hours[].biomassMW` — Biomasse.
- `hours[].wasteMW` — Abfall.
- `hours[].oilMW` — Öl.
- `hours[].geothermalMW` — Geothermie.
- `hours[].otherMW` — sonstige Erzeugung.
- `hours[].importExportMW` — Handelssaldo; positive Werte stehen für Import, negative für Export.
- `sumTWh` — Erzeugungssumme ohne Handelssaldo.
- `sumPartsTWh` — Jahressummen je Energieträger.
- `sumImportTWh` — Summe positiver Handelssaldo-Werte.
- `sumExportTWh` — Summe negativer Handelssaldo-Werte als Exportbetrag.
- `sumSharesPct` — Anteile der Energieträger an der Erzeugungssumme.
- `sumNote` — Kurznotiz zur Summenberechnung.

## Hinweis

Die Datei beschreibt öffentliche Stromerzeugung; Eigenversorgung ist nicht vollständig enthalten.
