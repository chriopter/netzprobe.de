import type { LoadHour, SplitDataFile } from '../../src/types/data';
import type { DatasetDoc } from '../../src/ui/dataCatalog';
import hoursJson from './2025.hours.json';

export const description: DatasetDoc = {
  id: "last-2025",
  domain: "last",
  kind: "dataset",
  title: "2025",
  file: "last/2025/data.json",
  scripts: [
    "last/2025/model.ts",
  ],
  source: "Energy-Charts API; Fraunhofer ISE Jahresauswertung 2025 (Last rund 466 TWh).",
  sourceUrls: [
    "https://api.energy-charts.info/public_power?country=de&start=2025-01-01&end=2026-01-01",
    "https://www.ise.fraunhofer.de/content/dam/ise/en/documents/press-releases/2026/0126_ISE_e_PR_Net%20electricity%20generation%202025.pdf",
  ],
  period: "2025",
  resolution: "stündlich",
  unit: "MW",
  short: "Historische deutsche Netzlast 2025, stündlich.",
  description: [
    "**Datengrundlage:** stündliche Netzlast Deutschlands `2025`, abgerufen aus der Energy-Charts public_power API des Fraunhofer ISE. Original-Auflösung `15 min` aus ENTSO-E Transparency, hier auf Stundenmittel reduziert; `loadMW` ist die **öffentliche Netzlast** inklusive Pumpspeicher-Verbrauch. Werte werden im UTC-Zeitstempel geliefert und in Berlin-Zeit interpretiert. Die Reihe bildet die Basislast aller Szenarien; sektorale Zusatzlasten aus dem e100-Pfad werden additiv aufgesetzt.",
    "**Jahresgang:** Jahressumme `465,8 TWh` bei einem Mittel von rund `53 GW`. Die Last folgt einem klar **temperatur- und tageslichtgetriebenen Saisonprofil**: Wintermonate liegen bei `~59 GW` (Januar/Februar), die Sommermonate fallen auf `~48 GW` (Mai–August), was eine Spannweite von rund `12 GW` zwischen kalten und warmen Monaten ergibt. Treiber sind Beleuchtung, Heizungsumwälzpumpen, gewerblicher Kältebedarf im Sommer und der ganzjährige Industriegrundbedarf.",
    "**Tagesgang:** typische **Werktagskurve** mit Nachttal `2–4 Uhr` (`~44 GW`), steilem Morgenanstieg ab `5 Uhr`, Vormittagsplateau `8–11 Uhr` (`~63 GW`) und einem schwächeren Abendpeak `17–19 Uhr` (`~61 GW`). Wochenenden liegen rund `9 GW` unter Werktagen (Mittel `46,7` vs. `55,8 GW`), weil Industrie und Gewerbe weitgehend ruhen. Die absoluten Extrema des Jahres — Minimum `33,2 GW` an einem Sommerwochenende, Maximum `75,6 GW` an einem Werktagabend im Winter — spannen den Stundenwertekorridor auf, in dem alle Szenarien gerechnet werden.",
  ],
  method: [
    "Bezug aus Energy-Charts public_power API für Deutschland, 2025-01-01 bis 2026-01-01.",
    "15-Minuten-Werte werden auf Stundenwerte gemittelt; loadMW ist Netzlast inklusive Pumpspeicher-Verbrauch.",
    "Jahressumme sumTWh = Summe der Stundenwerte geteilt durch 1.000.000.",
  ],
  fields: [
    {
      name: "generatedAt",
      unit: "ISO-Zeit",
      description: "Zeitpunkt der lokalen Datendatei-Erzeugung.",
    },
    {
      name: "year",
      unit: "Jahr",
      description: "Bezugsjahr.",
    },
    {
      name: "source",
      unit: "Text",
      description: "Quellenkurzname.",
    },
    {
      name: "sourceUrl",
      unit: "URL",
      description: "Energy-Charts-API-Abruf.",
    },
    {
      name: "unit",
      unit: "Text",
      description: "Stundenwert-Einheit.",
    },
    {
      name: "hours[].time",
      unit: "ISO-Zeit",
      description: "Stundenanfang.",
    },
    {
      name: "hours[].loadMW",
      unit: "MW",
      description: "Aus 15-Minuten-Werten gemittelte Netzlast Deutschland.",
    },
    {
      name: "sumTWh",
      unit: "TWh",
      description: "Jahressumme der Last.",
    },
    {
      name: "sumNote",
      unit: "Text",
      description: "Rechenhinweis.",
    },
  ],
  caveats: [
    "Energy-Charts weist die öffentliche Netzlast ab; Eigenverbrauch und industrielle Eigenerzeugung sind nur indirekt enthalten.",
  ],
};

export const data: SplitDataFile<LoadHour> = {
  generatedAt: "2026-05-12T10:06:12.516262Z",
  year: 2025,
  source: "Energy-Charts public_power API: hourly load for Germany, averaged from 15-minute values.",
  sourceUrl: "https://api.energy-charts.info/public_power?country=de&start=2025-01-01&end=2026-01-01",
  unit: "MW",
  sumTWh: 465.8,
  sumNote: "Summe loadMW über alle Stunden / 1.000.000.",
  hours: hoursJson as LoadHour[],
};
