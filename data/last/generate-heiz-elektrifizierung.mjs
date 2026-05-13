// Erzeugt data/last/heiz-elektrifizierung.json reproduzierbar.
// Modellparameter Raumwaerme-Elektrifizierung Deutschland plus taegliches Gradtagszahl-Profil.

const referenceYear = 2026;
const profileYear = 2025;
const heatingLimitC = 15;
const indoorReferenceC = 20;
const monthlyMeanTemperatureC = [1.5, 2.6, 5.7, 9.6, 13.5, 16.6, 18.4, 18.0, 13.7, 9.4, 4.9, 2.0];

const referenceHeatDemandTWh = 430;
const alreadyHeatPumpHeatTWh = 35;
const defaultTargetHeatTWh = 430;
const maxTargetHeatTWh = 600;
const stepHeatTWh = 5;
const seasonalCop = 3.3;

const days = [];
for (let month = 0; month < 12; month += 1) {
  const daysInMonth = new Date(Date.UTC(profileYear, month + 1, 0)).getUTCDate();
  const heatingDegreeDay = Math.max(0, indoorReferenceC - monthlyMeanTemperatureC[month]);
  const activeHeating = monthlyMeanTemperatureC[month] < heatingLimitC;

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: `${profileYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      heatingDegreeDay: activeHeating ? Number(heatingDegreeDay.toFixed(2)) : 0,
      weight: 0,
    });
  }
}

const sum = days.reduce((total, day) => total + day.heatingDegreeDay, 0);
for (const day of days) {
  day.weight = Number((day.heatingDegreeDay / sum).toFixed(12));
}
const weightCorrection = Number((1 - days.reduce((total, day) => total + day.weight, 0)).toFixed(12));
days[days.length - 1].weight = Number((days[days.length - 1].weight + weightCorrection).toFixed(12));

const output = {
  id: 'heat-pump-electrification',
  title: 'Heiz Elektrifizierung',
  source: 'Raumwaermebedarf privater Haushalte Deutschland nach AGEB/UBA; Gradtagszahl-Profil aus DWD-Klimanormalen 1991-2020.',
  sourceUrls: [
    'https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren',
    'https://ag-energiebilanzen.de/daten-und-fakten/',
    'https://www.dwd.de/DE/leistungen/klimadatendeutschland/klarchivtagmonat.html',
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
    sumNote: 'weight summiert ueber alle Tage auf 1; stuendliche Waermelast verteilt jeden Tagesanteil flach auf 24 Stunden.',
    days,
  },
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
