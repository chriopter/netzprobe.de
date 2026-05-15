// Erzeugt data/e100-ghd/data.json reproduzierbar.
// Modellparameter GHD-Raumwaerme-Elektrifizierung Deutschland plus taegliches Gradtagszahl-Profil
// aus realen Tagesmitteltemperaturen 2025 (gleiche Klimareihe wie e100-heiz).
//
// Methode:
//   1. Tagesmitteltemperaturen 2025 stammen aus 8 deutschen Großstädten via Open-Meteo
//      ERA5-Reanalyse, kalibriert auf das DWD-Gebietsmittel DE pro Monat (additiver
//      Offset). Symlink: temperatures-2025.json -> ../e100-heiz/temperatures-2025.json.
//   2. Pro Tag: heating-degree-day = max(0, Innenreferenz - Tagesmittel), aber nur wenn
//      Tagesmittel < Heizgrenze.
//   3. Weights sind die normierten Tagesanteile an der Jahres-HDD-Summe.
//   4. Tagesgang folgt BDEW-SLP G0 (Gewerbe allgemein): starke Nachtabsenkung, Ramp
//      6-8 Uhr, Plateau 8-18 Uhr, Abfall ab 19 Uhr.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const temperatureSeries = JSON.parse(readFileSync(join(here, 'temperatures-2025.json'), 'utf8'));

const referenceYear = 2023;
const profileYear = 2025;
const heatingLimitC = 15;
const indoorReferenceC = 20;

const referenceHeatDemandTWh = 163;
const alreadyElectricHeatTWh = 7;
const defaultTargetHeatTWh = 163;
const maxTargetHeatTWh = 220;
const stepHeatTWh = 1;
const seasonalCop = 2.8;

// 24-h-Tagesgang fuer GHD-Waermepumpenlast (Stunde 0 = 00:00-01:00 Berlin-Zeit).
// Bueroprofil nach BDEW-SLP G0 (Gewerbe allgemein): Nachtabsenkung 0-5 Uhr, Ramp 6-7 Uhr,
// Plateau 8-18 Uhr (Buero-/Oeffnungszeiten), Abfall 19-23 Uhr.
// Rohwerte werden anschliessend so renormiert, dass Summe = 24 (Tagesmittel 1,0).
const rawGhdMultipliers = [
  0.40, 0.38, 0.36, 0.36, 0.38, 0.45,
  0.75, 1.10, 1.45, 1.50, 1.50, 1.50,
  1.50, 1.45, 1.45, 1.45, 1.45, 1.45,
  1.40, 1.10, 0.90, 0.70, 0.55, 0.45,
];

const rawSum = rawGhdMultipliers.reduce((total, value) => total + value, 0);
const e100GhdHourlyMultipliers = rawGhdMultipliers.map((value) => Number((value * 24 / rawSum).toFixed(4)));
const normalizedSum = e100GhdHourlyMultipliers.reduce((total, value) => total + value, 0);
e100GhdHourlyMultipliers[e100GhdHourlyMultipliers.length - 1] = Number(
  (e100GhdHourlyMultipliers[e100GhdHourlyMultipliers.length - 1] + (24 - normalizedSum)).toFixed(4),
);

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
  id: 'e100-ghd',
  title: 'GHD Elektrifizierung',
  source: 'Raumwaerme- und Warmwasserbedarf Sektor Gewerbe, Handel, Dienstleistungen Deutschland nach BDEW Statusreport Waerme 09/2025 (rund 153 TWh Raumwaerme + 10 TWh Warmwasser = 163 TWh Endenergie 2023) und AGEB Anwendungsbilanz; bereits elektrisch gedeckt rund 7 TWh Waerme (Direktheizung, kleine WPs, elektrische Boiler in Gastronomie/Pflege); JAZ-Bestandsmix Grossgebaeude 2,8 (Fraunhofer ISE Annex 28, BWP); Gradtagszahl-Profil aus realen Tagesmitteltemperaturen 2025 (Open-Meteo ERA5, 8-Staedte-Mittel, kalibriert aufs DWD-Gebietsmittel DE pro Monat); Tagesgang BDEW-SLP G0 (Gewerbe allgemein).',
  sourceUrls: [
    'https://www.bdew.de/media/documents/2025_09_24_Statusreport_Waerme_final.pdf',
    'https://ag-energiebilanzen.de/daten-und-fakten/anwendungsbilanzen/',
    'https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren',
    'https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Publikationen/Energie/energiedaten-gesamtausgabe.html',
    'https://www.waermepumpe.de/normen-technik/grossanlagen-gewerbe/',
    'https://www.ise.fraunhofer.de/de/forschungsprojekte/wpsmart-im-bestand.html',
    'https://www.bdew.de/energie/standardlastprofile-strom/',
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
  summary: 'JAZ 2,8',
  distribution: 'heating-degree-days',
  note: 'Zusatzlast = max(0, Ziel-Waerme - bereits elektrisch gedeckte Waerme) / Jahresarbeitszahl. Modelliert den Uebergang fossile GHD-Heizung (Buero, Handel, Schule, Krankenhaus, Gastronomie, Kommunalbau) zu Waermepumpe; bestehende elektrische GHD-Heizung bleibt unveraendert in der historischen Last. Tagesgewichte folgen realen Gradtagszahlen 2025, innerhalb des Tages moduliert das G0-Bueroprofil mit Nachtabsenkung und Plateau 8-18 Uhr.',
  hourlyProfile: {
    source: 'BDEW SLP G0 Gewerbe allgemein — Bueroprofil mit Nachtabsenkung 0-5 Uhr, Ramp 6-8 Uhr, Plateau 8-18 Uhr (Buero-/Oeffnungszeiten), Abfall 19-23 Uhr. Auf Tagesmittel 1,0 normiert, Summe = 24.',
    sourceUrls: [
      'https://www.bdew.de/energie/standardlastprofile-strom/',
      'https://www.waermepumpe.de/normen-technik/grossanlagen-gewerbe/',
    ],
    multipliers: e100GhdHourlyMultipliers,
  },
  degreeDayProfile: {
    year: profileYear,
    heatingLimitC,
    indoorReferenceC,
    temperatureSource: 'Open-Meteo ERA5, Tagesmittel 8 deutscher Großstädte (Hamburg, Berlin, München, Köln, Frankfurt, Leipzig, Stuttgart, Bremen), kalibriert aufs DWD-Gebietsmittel DE pro Monat (additiver Offset). Identische Klimareihe wie e100-heiz.',
    dwdMonthlyMeanC: temperatureSeries.dwdMonthly,
    annualHeatingDegreeDays: annualHdd,
    heatingDays,
    sumNote: 'weight summiert ueber alle Tage auf 1; stuendliche Waermelast verteilt jeden Tagesanteil flach auf 24 Stunden.',
    days,
  },
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
