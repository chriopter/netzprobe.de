// Erzeugt data/e100-ghd/data.json reproduzierbar.
// Modellparameter GHD-Raumwaerme-Elektrifizierung Deutschland plus taegliches Gradtagszahl-Profil.
//
// Methode:
//   1. Monatsmitteltemperaturen Deutschland (DWD-Klimanormale 1991-2020) bilden Ankerpunkte
//      auf dem mittleren Tag jedes Monats — identisch zu e100-heiz, weil GHD und HH dieselbe
//      klimaabhaengige Raumwaerme haben.
//   2. Lineare Interpolation zwischen den Ankerpunkten ergibt eine glatte Tagesmittel-
//      temperaturreihe.
//   3. Pro Tag: heating-degree-day = max(0, Innenreferenz - Tagesmittel), aber nur wenn
//      Tagesmittel < Heizgrenze.
//   4. Weights sind die normierten Tagesanteile an der Jahres-HDD-Summe.
//   5. Tagesgang folgt BDEW-SLP G0 (Gewerbe allgemein): starke Nachtabsenkung, Ramp
//      6-8 Uhr, Plateau 8-18 Uhr, Abfall ab 19 Uhr.

const referenceYear = 2023;
const profileYear = 2025;
const heatingLimitC = 15;
const indoorReferenceC = 20;

// DWD-Klimanormale 1991-2020, Deutschland-Mittel Januar..Dezember in degC.
const monthlyMeanTemperatureC = [1.5, 2.6, 5.7, 9.6, 13.5, 16.6, 18.4, 18.0, 13.7, 9.4, 4.9, 2.0];
const monthLengths2025 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const referenceHeatDemandTWh = 138;
const alreadyElectricHeatTWh = 7;
const defaultTargetHeatTWh = 138;
const maxTargetHeatTWh = 200;
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
// Restkorrektur auf das letzte Element, damit die Summe exakt 24 ist.
const normalizedSum = e100GhdHourlyMultipliers.reduce((total, value) => total + value, 0);
e100GhdHourlyMultipliers[e100GhdHourlyMultipliers.length - 1] = Number(
  (e100GhdHourlyMultipliers[e100GhdHourlyMultipliers.length - 1] + (24 - normalizedSum)).toFixed(4),
);

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
  id: 'e100-ghd',
  title: 'GHD Heiz Elektrifizierung',
  source: 'Raumwaerme- und Warmwasserbedarf Sektor Gewerbe, Handel, Dienstleistungen Deutschland nach AGEB Anwendungsbilanz 2023 (rund 115 TWh Raumwaerme + 23 TWh Warmwasser = 138 TWh Endenergie); bereits elektrisch gedeckt rund 7 TWh Waerme (Direktheizung, kleine WPs, elektrische Boiler in Gastronomie/Pflege); JAZ-Bestandsmix Grossgebaeude 2,8 (Fraunhofer ISE Annex 28, BWP); Gradtagszahl-Profil aus DWD-Klimanormalen 1991-2020 mit linearer Tagesinterpolation; Tagesgang BDEW-SLP G0 (Gewerbe allgemein).',
  sourceUrls: [
    'https://ag-energiebilanzen.de/daten-und-fakten/anwendungsbilanzen/',
    'https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren',
    'https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Publikationen/Energie/energiedaten-gesamtausgabe.html',
    'https://www.waermepumpe.de/normen-technik/grossanlagen-gewerbe/',
    'https://www.ise.fraunhofer.de/de/forschungsprojekte/wpsmart-im-bestand.html',
    'https://www.bdew.de/energie/standardlastprofile-strom/',
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
  note: 'Zusatzlast = max(0, Ziel-Waerme - bereits elektrisch gedeckte Waerme) / Jahresarbeitszahl. Modelliert den Uebergang fossile GHD-Heizung (Buero, Handel, Schule, Krankenhaus, Gastronomie, Kommunalbau) zu Waermepumpe; bestehende elektrische GHD-Heizung bleibt unveraendert in der historischen Last. Tagesgewichte folgen Gradtagszahlen, innerhalb des Tages moduliert das G0-Bueroprofil mit Nachtabsenkung und Plateau 8-18 Uhr.',
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
    monthlyMeanTemperatureC,
    interpolation: 'Lineare Interpolation zwischen Monatsmittel-Ankerpunkten am 15. jedes Monats; HDD-Schwelle pro Tag.',
    annualHeatingDegreeDays: annualHdd,
    heatingDays,
    sumNote: 'weight summiert ueber alle Tage auf 1; stuendliche Waermelast verteilt jeden Tagesanteil flach auf 24 Stunden.',
    days,
  },
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
