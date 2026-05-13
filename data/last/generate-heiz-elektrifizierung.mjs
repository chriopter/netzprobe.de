// Erzeugt data/last/heiz-elektrifizierung.json reproduzierbar.
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

const referenceYear = 2026;
const profileYear = 2025;
const heatingLimitC = 15;
const indoorReferenceC = 20;

// DWD-Klimanormale 1991-2020, Deutschland-Mittel Januar..Dezember in degC.
const monthlyMeanTemperatureC = [1.5, 2.6, 5.7, 9.6, 13.5, 16.6, 18.4, 18.0, 13.7, 9.4, 4.9, 2.0];
const monthLengths2025 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const referenceHeatDemandTWh = 430;
const alreadyHeatPumpHeatTWh = 35;
const defaultTargetHeatTWh = 430;
const maxTargetHeatTWh = 600;
const stepHeatTWh = 5;
const seasonalCop = 3.3;

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
  id: 'heat-pump-electrification',
  title: 'Heiz Elektrifizierung',
  source: 'Raumwaermebedarf privater Haushalte Deutschland nach AGEB/UBA; Gradtagszahl-Profil aus DWD-Klimanormalen 1991-2020 mit linearer Tagesinterpolation.',
  sourceUrls: [
    'https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren',
    'https://ag-energiebilanzen.de/daten-und-fakten/',
    'https://www.dwd.de/DE/leistungen/klimadatendeutschland/klarchivtagmonat.html',
    'https://www.dwd.de/DE/leistungen/klimadatendeutschland/vielj_mittelwerte.html',
  ],
  referenceYear,
  referenceHeatDemandTWh,
  alreadyHeatPumpHeatTWh,
  defaultTargetHeatTWh,
  maxTargetHeatTWh,
  stepHeatTWh,
  seasonalCop,
  distribution: 'heating-degree-days',
  note: 'Zusatzlast = max(0, Ziel-Raumwaerme - bereits elektrisch gedeckte Heizwaerme) / Jahresarbeitszahl. Die Stundenverteilung folgt dem taeglichen Gradtagszahl-Profil, flach auf 24 Stunden je Tag.',
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
