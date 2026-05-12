# PKW Elektrifizierung

- Verwendung: optionale Zusatzlast für elektrifizierte Pkw-Kilometer.
- Referenz: 472,2 Mrd. Pkw-km privater Haushalte im Jahr 2023.
- Slider: Zielwert in Mio. Pkw-km; erlaubt bis 150 % der Referenz.
- Abzug: 23,8 Mrd. km gelten als bereits 2023 elektrisch gefahren.
- Rechnung: `max(0, Ziel-km - 23.800 Mio. km) * 20 kWh/100 km`.
- Default: 472.200 Mio. km Ziel, 448.400 Mio. km Zusatz, 89,7 TWh/Jahr.
- Verteilung: gleichmäßig über 8.760 Stunden, noch kein Ladeprofil.
- Wirkung: erhöht nur die Last; historische Erzeugung bleibt unverändert.

## Felder

- `id` — technische Kennung.
- `title` — Name des Zusatzlast-Szenarios.
- `source` — Kurzbeschreibung der Quellen.
- `sourceUrls` — Quellen für Referenzkilometer, Fahrleistung und BEV-Bestand.
- `referenceYear` — Bezugsjahr.
- `referenceMillionKm` — Pkw-Fahrleistung privater Haushalte 2023 in Mio. km.
- `alreadyElectricMillionKm` — abgezogene bereits elektrische Pkw-km 2023.
- `defaultTargetMillionKm` — Standardwert des Sliders.
- `maxTargetMillionKm` — oberes Slider-Ende.
- `stepMillionKm` — Slider-Schrittweite.
- `kwhPer100Km` — pauschaler Flottenverbrauch ab Netz.
- `distribution` — zeitliche Verteilung der Zusatzlast.
- `note` — Rechenhinweis.

## Erwägungsgründe

- Zulassungsdaten allein zeigen nicht die reale Fahrleistung.
- Reine BEV-km werden abgezogen, damit die bestehende Elektrifizierung 2023 nicht doppelt als Zusatzlast zählt.
- Der Abzug ist eine konservative Modellannahme: BEV-Bestand mal durchschnittliche Fahrleistung alternativer Antriebe.
- Plug-in-Hybrid-Fahrten werden nicht zusätzlich als elektrisch geschätzt, weil der elektrische Fahranteil nicht sauber im Datensatz liegt.
