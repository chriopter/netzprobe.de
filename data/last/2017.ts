import type { LoadHour, SplitDataFile } from '../../src/types/data';
import type { DatasetDoc } from '../../src/ui/dataCatalog';
import hoursJson from './2017.hours.json';

export const description: DatasetDoc = {
  id: "last-2017",
  domain: "last",
  kind: "dataset",
  title: "2017",
  file: "last/2017/data.json",
  scripts: [
    "last/2017/model.ts",
  ],
  source: "Energy-Charts public_power API: stündliche Last 2017, aus 15-min Werten gemittelt.",
  sourceUrls: [
    "https://api.energy-charts.info/public_power?country=de&start=2017-01-01T00:00%2B01:00&end=2018-01-01T00:00%2B01:00",
  ],
  period: "2017",
  resolution: "stündlich",
  unit: "MW",
  short: "Historische deutsche Netzlast 2017, stündlich (~507 TWh).",
  description: [
    "**Datengrundlage:** stündliche Netzlast Deutschlands `2017`, abgerufen aus der Energy-Charts public_power API des Fraunhofer ISE. Original-Auflösung `15 min` aus ENTSO-E Transparency, hier auf Stundenmittel reduziert; `loadMW` ist die **öffentliche Netzlast** inklusive Pumpspeicher-Verbrauch. Das Jahr dient als Referenz für vor-pandemische Industrieaktivität und wird vom Preset *versorgung-historisch-2017* als Basis-Last konsumiert; e100-Sektoren werden auch hier additiv aufgesetzt.",
    "**Jahresgang:** Jahressumme `506,8 TWh` bei einem Mittel von rund `58 GW` — rund `41 TWh` bzw. `~8 %` über dem Niveau von `2025`. Die Differenz spiegelt vor allem **Industriebedarf vor Effizienzgewinnen und Drosselung** sowie höhere stoffliche Produktion (Stahl, Chemie, Aluminium). Das Saisonprofil ist analog zu jüngeren Jahren: Wintermonate bei `~62–64 GW` (Januar `63,7`, November `61,4`), Sommermonate bei `~54 GW` (Juli/August), Spannweite rund `10 GW`.",
    "**Tagesgang:** **Werktagskurve** mit Nachttal `1–3 Uhr` (`~47 GW`), steilem Morgenanstieg ab `5 Uhr` und einem ausgeprägten Vormittagsplateau `8–12 Uhr` mit Peak `~70 GW` (10–11 Uhr). Der Abendpeak `17–18 Uhr` liegt mit `~66,7 GW` nur knapp unter dem Tages-Maximum. Wochenenden liegen rund `11 GW` unter Werktagen (Mittel `50,1` vs. `61,0 GW`); im Vergleich zu `2025` ist der Wochenendrückgang absolut wie relativ größer, was den höheren Industrieanteil belegt. Stundenwerte spannen zwischen `35,0 GW` (Sommerwochenende) und `79,5 GW` (Wintermorgen).",
  ],
  method: [
    "Bezug aus Energy-Charts public_power API für Deutschland, 2017-01-01 bis 2018-01-01.",
    "15-Minuten-Werte werden auf Stundenwerte gemittelt; loadMW ist Netzlast inklusive Pumpspeicher-Verbrauch.",
    "Generiert über das gemeinsame Script data/erzeugung/2017/generate.mjs, das gleichzeitig erzeugung-2017/data.json schreibt.",
  ],
  fields: [
    {
      name: "year",
      unit: "Jahr",
      description: "2017.",
    },
    {
      name: "sumTWh",
      unit: "TWh",
      description: "Jahres-Brutto-Last 2017 (~507 TWh).",
    },
    {
      name: "hours[]",
      unit: "MW",
      description: "Stündliche Netzlast aus 15-min Werten.",
    },
  ],
  caveats: [
    "Last 2017 ist ~9% höher als 2025 — vor Effizienzgewinnen + Industrie-Drosselung.",
  ],
};

export const data: SplitDataFile<LoadHour> = {
  generatedAt: "2026-05-15T16:09:37.343Z",
  year: 2017,
  source: "Energy-Charts public_power API: hourly load for Germany 2017, averaged from 15-minute values.",
  sourceUrl: "https://api.energy-charts.info/public_power?country=de&start=2017-01-01T00:00%2B01:00&end=2018-01-01T00:00%2B01:00",
  unit: "MW",
  sumTWh: 506.8,
  sumNote: "Stündliche Last 2017 aus 15-min Werten gemittelt.",
  hours: hoursJson as LoadHour[],
};
