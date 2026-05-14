import type { E100PkwData, DataSet, GenerationHour, E100HeizData, LoadHour, ModelFactorHour, SplitDataFile } from '../types/data';
import { dataPackageIds, dataPackageUrl } from '../dataPackages';

const loadUrl = dataPackageUrl(dataPackageIds.loadHistorical2025, 'data.json');
const e100PkwUrl = dataPackageUrl(dataPackageIds.e100Pkw, 'data.json');
const e100HeizUrl = dataPackageUrl(dataPackageIds.e100Heiz, 'data.json');
const generationUrl = dataPackageUrl(dataPackageIds.generationHistorical2025, 'data.json');
const factorsUrl = dataPackageUrl(dataPackageIds.feedInFactors2025, 'data.json');
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
  const [loadData, e100Pkw, e100Heiz, generationData, factorData] = await Promise.all([
    loadJson<SplitDataFile<LoadHour>>(loadUrl),
    loadJson<E100PkwData>(e100PkwUrl),
    loadJson<E100HeizData>(e100HeizUrl),
    loadJson<SplitDataFile<GenerationHour>>(generationUrl),
    loadJson<SplitDataFile<ModelFactorHour>>(factorsUrl),
  ]);

  const generationByTime = new Map(generationData.hours.map((hour) => [hour.time, hour]));
  const factorsByTime = new Map(factorData.hours.map((hour) => [hour.time, hour]));
  const heatingDegreeDayByDate = new Map(e100Heiz.degreeDayProfile.days.map((day) => [day.date, day]));

  const hours = loadData.hours.map((loadHour) => {
    const generation = generationByTime.get(loadHour.time);
    const factors = factorsByTime.get(loadHour.time);
    const { date, hour } = berlinDateAndHour(loadHour.time);
    const heatingDegreeDay = heatingDegreeDayByDate.get(date);
    if (!generation || !factors || !heatingDegreeDay) {
      const missing = [
        !generation && 'erzeugung-2025',
        !factors && 'einspeisefaktoren-2025',
        !heatingDegreeDay && `e100-heiz (${date})`,
      ].filter(Boolean);
      throw new Error(`Unvollständige Daten für ${loadHour.time}: ${missing.join(', ')}`);
    }
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
    'e100-pkw': e100Pkw,
    'e100-heiz': e100Heiz,
    loadSumTWh: loadData.sumTWh,
    generationSumTWh: generationData.sumTWh,
    importSumTWh: generationData.sumImportTWh,
    generationSharesPct: generationData.sumSharesPct,
    generationPartsTWh: generationData.sumPartsTWh,
    hours,
  };
}
