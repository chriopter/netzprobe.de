// Erzeugt data/e100-heiz/data.json reproduzierbar.
// Modellparameter Raumwaerme-Elektrifizierung Deutschland plus taegliches Gradtagszahl-Profil.
//
// Methode:
//   1. Monatsmitteltemperaturen Deutschland (DWD-Klimanormale 1991-2020) bilden Ankerpunkte
//      auf dem mittleren Tag jedes Monats.
//   2. Lineare Interpolation zwischen den Ankerpunkten ergibt eine glatte Tagesmittel-
//      temperaturreihe (kein Monats-Stufen-Sprung am Monatswechsel).
//   3. Pro Tag: heating-degree-day = max(0, Innenreferenz - Tagesmittel), aber nur wenn
//      Tagesmittel < Heizgrenze. Damit fallen warme Tage in Mai/Sep automatisch raus
//      und Juni-August bleiben praktisch komplett unbeheizt.
//   4. Weights sind die normierten Tagesanteile an der Jahres-HDD-Summe.

const referenceYear = 2023;
const profileYear = 2025;
const heatingLimitC = 15;
const indoorReferenceC = 20;

// DWD-Klimanormale 1991-2020, Deutschland-Mittel Januar..Dezember in degC.
const monthlyMeanTemperatureC = [1.5, 2.6, 5.7, 9.6, 13.5, 16.6, 18.4, 18.0, 13.7, 9.4, 4.9, 2.0];
const monthLengths2025 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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

function midMonthDoy(month) {
  let sum = 0;
  for (let i = 0; i < month; i += 1) sum += monthLengths2025[i];
  return sum + Math.floor(monthLengths2025[month] / 2) + 1;
}

const anchors = monthlyMeanTemperatureC.map((temp, m) => ({ doy: midMonthDoy(m), temp }));

function dailyMeanTemperatureC(dayOfYear) {
  for (let i = 0; i < 12; i += 1) {
    const fromDoy = anchors[i].doy;
    const toDoy = i < 11 ? anchors[i + 1].doy : anchors[0].doy + 365;
    let probe = dayOfYear;
    if (i === 11 && dayOfYear < anchors[0].doy) probe += 365;
    if (probe >= fromDoy && probe < toDoy) {
      const fraction = (probe - fromDoy) / (toDoy - fromDoy);
      const fromTemp = anchors[i].temp;
      const toTemp = i < 11 ? anchors[i + 1].temp : anchors[0].temp;
      return fromTemp + fraction * (toTemp - fromTemp);
    }
  }
  throw new Error(`Tag ${dayOfYear} nicht in Ankerpunkten gefunden.`);
}

const days = [];
let doyCursor = 0;
for (let month = 0; month < 12; month += 1) {
  for (let day = 1; day <= monthLengths2025[month]; day += 1) {
    doyCursor += 1;
    const meanTemp = dailyMeanTemperatureC(doyCursor);
    const heatingDegreeDay = meanTemp < heatingLimitC ? Math.max(0, indoorReferenceC - meanTemp) : 0;
    days.push({
      date: `${profileYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      meanTemperatureC: Number(meanTemp.toFixed(2)),
      heatingDegreeDay: Number(heatingDegreeDay.toFixed(3)),
      weight: 0,
    });
  }
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
  title: 'Heiz Elektrifizierung',
  source: 'Raumwaerme- und Warmwasserbedarf privater Haushalte Deutschland nach UBA und AGEB Anwendungsbilanz 2023 (445 TWh Raumwaerme + 85 TWh Warmwasser); bereits elektrisch gedeckt rund 50 TWh Waerme (Bestand-WP ~22 TWh, Nachtspeicher/Direktheizung ~13 TWh, Durchlauferhitzer/Boiler ~15 TWh); Gradtagszahl-Profil aus DWD-Klimanormalen 1991-2020 mit linearer Tagesinterpolation.',
  sourceUrls: [
    'https://www.umweltbundesamt.de/daten/private-haushalte-konsum/wohnen/energieverbrauch-privater-haushalte',
    'https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren',
    'https://ag-energiebilanzen.de/daten-und-fakten/',
    'https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Dossier/Gebaeudesanierung/waermepumpen.html',
    'https://www.ise.fraunhofer.de/de/presse-und-medien/news/2024/waermepumpenfeldstest-zwischenergebnisse-bestaetigen-effizienten-betrieb-auch-im-altbau.html',
    'https://www.dwd.de/DE/leistungen/klimadatendeutschland/klarchivtagmonat.html',
    'https://www.dwd.de/DE/leistungen/klimadatendeutschland/vielj_mittelwerte.html',
  ],
  referenceYear,
  referenceHeatDemandTWh,
  alreadyElectricHeatTWh,
  defaultTargetHeatTWh,
  maxTargetHeatTWh,
  stepHeatTWh,
  seasonalCop,
  distribution: 'heating-degree-days',
  note: 'Zusatzlast = max(0, Ziel-Waerme - bereits elektrisch gedeckte Waerme) / Jahresarbeitszahl. Modelliert den Uebergang fossile Heizung zu Waermepumpe; bestehende elektrische Heizung (Direktheizung, Boiler, Bestand-WP) bleibt unveraendert in der historischen Last. Tagesgewichte folgen Gradtagszahlen, innerhalb des Tages moduliert das 24-h-Profil.',
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
    monthlyMeanTemperatureC,
    interpolation: 'Lineare Interpolation zwischen Monatsmittel-Ankerpunkten am 15. jedes Monats; HDD-Schwelle pro Tag.',
    annualHeatingDegreeDays: annualHdd,
    heatingDays,
    sumNote: 'weight summiert ueber alle Tage auf 1; stuendliche Waermelast verteilt jeden Tagesanteil flach auf 24 Stunden.',
    days,
  },
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
