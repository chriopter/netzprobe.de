import type { BevPkwElectrificationLoad, DataSet, GenerationHour, HeatPumpElectrificationLoad, LoadHour, ModelFactorHour, SplitDataFile } from '../types/data';

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

const loadUrl = dataUrl('last/energy-charts-stuendlich-2025.json');
const bevPkwElectrificationUrl = dataUrl('last/pkw-elektrifizierung.json');
const heatPumpElectrificationUrl = dataUrl('last/heiz-elektrifizierung.json');
const generationUrl = dataUrl('erzeugung/energy-charts-stuendlich-2025.json');
const factorsUrl = dataUrl('modell/einspeisefaktoren-stuendlich-2025.json');
const berlinDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function berlinDateAndHour(isoTime: string) {
  const parts = Object.fromEntries(berlinDateFormatter.formatToParts(new Date(isoTime)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${url} (${response.status})`);
  return response.json() as Promise<T>;
}

export async function loadDefaultData(): Promise<DataSet> {
  const [loadData, bevPkwElectrification, heatPumpElectrification, generationData, factorData] = await Promise.all([
    loadJson<SplitDataFile<LoadHour>>(loadUrl),
    loadJson<BevPkwElectrificationLoad>(bevPkwElectrificationUrl),
    loadJson<HeatPumpElectrificationLoad>(heatPumpElectrificationUrl),
    loadJson<SplitDataFile<GenerationHour>>(generationUrl),
    loadJson<SplitDataFile<ModelFactorHour>>(factorsUrl),
  ]);

  const generationByTime = new Map(generationData.hours.map((hour) => [hour.time, hour]));
  const factorsByTime = new Map(factorData.hours.map((hour) => [hour.time, hour]));
  const heatingDegreeDayByDate = new Map(heatPumpElectrification.degreeDayProfile.days.map((day) => [day.date, day]));

  const hours = loadData.hours.map((loadHour) => {
    const generation = generationByTime.get(loadHour.time);
    const factors = factorsByTime.get(loadHour.time);
    const { date, hour } = berlinDateAndHour(loadHour.time);
    const heatingDegreeDay = heatingDegreeDayByDate.get(date);
    if (!generation || !factors || !heatingDegreeDay) throw new Error(`Unvollständige Daten für ${loadHour.time}`);
    const { time: _generationTime, ...observed } = generation;
    return {
      time: loadHour.time,
      loadMW: loadHour.loadMW,
      solarIrradiance: factors.solarIrradiance,
      wind100m: factors.wind100m,
      heatingDegreeDayWeight: heatingDegreeDay.weight,
      hourOfDayBerlin: hour,
      observed,
    };
  });

  return {
    source: 'Energy-Charts 2025: Last, Erzeugung und Einspeisefaktoren getrennt geladen.',
    bevPkwElectrification,
    heatPumpElectrification,
    loadSumTWh: loadData.sumTWh,
    generationSumTWh: generationData.sumTWh,
    importSumTWh: generationData.sumImportTWh,
    generationSharesPct: generationData.sumSharesPct,
    generationPartsTWh: generationData.sumPartsTWh,
    hours,
  };
}
