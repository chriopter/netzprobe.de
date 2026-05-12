# Einspeisefaktoren 2025

- Verwendung: Modellannahme für PV- und Wind-Ausbauvarianten.
- Quelle: Energy-Charts `public_power` und `installed_power`, Deutschland.
- Ermittlung: beobachtete PV-/Wind-Einspeisung geteilt durch installierte Leistung.
- Bedeutung: stündlicher Einspeisefaktor, kein Wetter- oder Verfügbarkeitsfaktor.
- Abregelung: nicht herausgerechnet; mögliche Erzeugung kann unterschätzt werden.
- Plot: skaliert PV und Wind im Modell für andere installierte Leistungen.
- Einheit: dimensionsloser Faktor.

## Felder

- `generatedAt` — Zeitpunkt der lokalen Datendatei-Erzeugung.
- `year` — Bezugsjahr des Datensatzes.
- `source` — Kurzbeschreibung der verwendeten Energy-Charts-Quellen.
- `sourceUrls` — API-Abrufe für Einspeisung und installierte Leistung.
- `notes` — Hinweise zur Ableitung und Begrenzung.
- `hours[].time` — Zeitpunkt der Stunde.
- `hours[].solarIrradiance` — PV-Einspeisefaktor aus beobachteter Einspeisung / installierter Leistung.
- `hours[].wind100m` — Wind-Einspeisefaktor aus beobachteter Einspeisung / installierter Leistung.

## Hinweis

Keine Rohwetterdaten. Abregelung ist nicht herausgerechnet.
