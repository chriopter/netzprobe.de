// Erzeugt data/e100-heiz/data.json reproduzierbar.
// Modellparameter Raumwaerme-Elektrifizierung Deutschland plus taegliches Gradtagszahl-Profil
// aus realen Tagesmitteltemperaturen 2025.
//
// Methode:
//   1. Tagesmitteltemperaturen 2025 stammen aus 8 deutschen Großstädten via Open-Meteo
//      ERA5-Reanalyse, kalibriert auf das DWD-Gebietsmittel DE pro Monat (additiver
//      Offset). Datei: temperatures-2025.json.
//   2. Pro Tag: heating-degree-day = max(0, Innenreferenz - Tagesmittel), aber nur wenn
//      Tagesmittel < Heizgrenze. Damit reflektieren Mai/Sep echte Wetterstreuung statt
//      glatter Monatsanker.
//   3. Weights sind die normierten Tagesanteile an der Jahres-HDD-Summe.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const temperatureSeries = JSON.parse(readFileSync(join(here, 'temperatures-2025.json'), 'utf8'));

const referenceYear = 2023;
const profileYear = 2025;
const heatingLimitC = 15;
const indoorReferenceC = 20;

const referenceHeatDemandTWh = 530;
const alreadyElectricHeatTWh = 50;
const defaultTargetHeatTWh = 530;
const maxTargetHeatTWh = 700;
const stepHeatTWh = 5;
const seasonalCop = 3.3;

// 24-h-Gleichzeitigkeitsprofil fuer Waermepumpen-Heizungslast (Stunde 0 = 00:00-01:00 Berlin-Zeit).
// Bimodaler Tagesgang aus When2Heat-h-Funktionen (BDEW-Gas-SLP-SFH) und WPuQ-Feldmessung Hamelin,
// auf Grid-Aggregat-Niveau gedaempft. Renormiert sodass Summe = 24 (Tagesmittel 1,0).
const e100HeizHourlyMultipliers = [
  0.6868, 0.6083, 0.5691, 0.5691, 0.6083, 0.7653,
  1.0303, 1.3246, 1.4227, 1.2756, 1.1284, 1.0303,
  0.9812, 0.9321, 0.9321, 0.9812, 1.1284, 1.3246,
  1.4227, 1.3737, 1.2265, 1.0303, 0.8831, 0.7653,
];

const days = [];
for (let i = 0; i < temperatureSeries.times.length; i += 1) {
  const date = temperatureSeries.times[i];
  const meanTemp = temperatureSeries.meanT[i];
  const heatingDegreeDay = meanTemp < heatingLimitC ? Math.max(0, indoorReferenceC - meanTemp) : 0;
  days.push({
    date,
    meanTemperatureC: Number(meanTemp.toFixed(2)),
    heatingDegreeDay: Number(heatingDegreeDay.toFixed(3)),
    weight: 0,
  });
}

const sumHdd = days.reduce((total, day) => total + day.heatingDegreeDay, 0);
for (const day of days) {
  day.weight = Number((day.heatingDegreeDay / sumHdd).toFixed(12));
}
const weightCorrection = Number((1 - days.reduce((total, day) => total + day.weight, 0)).toFixed(12));
const peakDay = days.reduce((best, day) => day.heatingDegreeDay > best.heatingDegreeDay ? day : best, days[0]);
peakDay.weight = Number((peakDay.weight + weightCorrection).toFixed(12));

const heatingDays = days.filter((day) => day.heatingDegreeDay > 0).length;
const annualHdd = Number(sumHdd.toFixed(2));

const output = {
  id: 'e100-heiz',
  title: 'Haushalte Elektrifizierung',
  source: 'Raumwaerme- und Warmwasserbedarf privater Haushalte Deutschland nach UBA und AGEB Anwendungsbilanz 2023 (445 TWh Raumwaerme + 85 TWh Warmwasser); bereits elektrisch gedeckt rund 50 TWh Waerme (Bestand-WP ~22 TWh, Nachtspeicher/Direktheizung ~13 TWh, Durchlauferhitzer/Boiler ~15 TWh); Gradtagszahl-Profil aus realen Tagesmitteltemperaturen 2025 (Open-Meteo ERA5, 8-Staedte-Mittel, kalibriert aufs DWD-Gebietsmittel DE pro Monat).',
  sourceUrls: [
    'https://www.umweltbundesamt.de/daten/private-haushalte-konsum/wohnen/energieverbrauch-privater-haushalte',
    'https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren',
    'https://ag-energiebilanzen.de/daten-und-fakten/',
    'https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Dossier/Gebaeudesanierung/waermepumpen.html',
    'https://www.ise.fraunhofer.de/de/presse-und-medien/news/2024/waermepumpenfeldstest-zwischenergebnisse-bestaetigen-effizienten-betrieb-auch-im-altbau.html',
    'https://archive-api.open-meteo.com/v1/era5',
    'https://opendata.dwd.de/climate_environment/CDC/regional_averages_DE/monthly/air_temperature_mean/',
  ],
  referenceYear,
  referenceHeatDemandTWh,
  alreadyElectricHeatTWh,
  defaultTargetHeatTWh,
  maxTargetHeatTWh,
  stepHeatTWh,
  seasonalCop,
  summary: 'JAZ 3,3',
  distribution: 'heating-degree-days',
  note: 'Zusatzlast = max(0, Ziel-Waerme - bereits elektrisch gedeckte Waerme) / Jahresarbeitszahl. Modelliert den Uebergang fossile Heizung zu Waermepumpe; bestehende elektrische Heizung (Direktheizung, Boiler, Bestand-WP) bleibt unveraendert in der historischen Last. Tagesgewichte folgen realen Gradtagszahlen 2025, innerhalb des Tages moduliert das 24-h-Profil.',
  hourlyProfile: {
    source: 'Bimodaler WP-Tagesgang nach BDEW-SFH-Gas-SLP (When2Heat h-Funktionen, Ruhnau/Hirth 2019), WPuQ-Feldmessungen Hamelin (Schlemminger et al. 2022, 38 EFH) und VDI 4655. Auf Grid-Aggregat gedaempft, Summe = 24.',
    sourceUrls: [
      'https://www.nature.com/articles/s41597-019-0199-y',
      'https://data.open-power-system-data.org/when2heat/',
      'https://www.nature.com/articles/s41597-022-01156-1',
      'https://www.ise.fraunhofer.de/de/forschungsprojekte/wpsmart-im-bestand.html',
      'https://www.bdew.de/energie/standardlastprofile-strom/',
    ],
    multipliers: e100HeizHourlyMultipliers,
  },
  degreeDayProfile: {
    year: profileYear,
    heatingLimitC,
    indoorReferenceC,
    temperatureSource: 'Open-Meteo ERA5, Tagesmittel 8 deutscher Großstädte (Hamburg, Berlin, München, Köln, Frankfurt, Leipzig, Stuttgart, Bremen), kalibriert aufs DWD-Gebietsmittel DE pro Monat (additiver Offset).',
    dwdMonthlyMeanC: temperatureSeries.dwdMonthly,
    annualHeatingDegreeDays: annualHdd,
    heatingDays,
    sumNote: 'weight summiert ueber alle Tage auf 1; stuendliche Waermelast verteilt jeden Tagesanteil flach auf 24 Stunden.',
    days,
  },
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
