const monthlyMeanTemperatureC = [1, 2, 5, 9, 13, 16, 18, 18, 14, 10, 5, 2];
const heatingLimitC = 15;
const indoorReferenceC = 20;

const days = [];
const year = 2025;

for (let month = 0; month < 12; month += 1) {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const heatingDegreeDay = Math.max(0, indoorReferenceC - monthlyMeanTemperatureC[month]);
  const activeHeating = monthlyMeanTemperatureC[month] < heatingLimitC;

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      heatingDegreeDay: activeHeating ? heatingDegreeDay : 0,
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
  source: 'Modellprofil aus monatlichen Temperaturannahmen Deutschland 2025: Heizgrenze 15 C, Innenreferenz 20 C.',
  generatedAt: new Date().toISOString(),
  unit: 'K*d, Anteil',
  sumNote: 'weight summiert über alle Tage auf 1; stündliche Wärmelast verteilt jeden Tagesanteil flach auf 24 Stunden.',
  parameters: {
    year,
    heatingLimitC,
    indoorReferenceC,
    monthlyMeanTemperatureC,
  },
  hours: days,
};

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
