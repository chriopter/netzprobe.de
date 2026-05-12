import type { DataSet, GenerationHour, LoadHour, ModelFactorHour, SplitDataFile } from '../types/data';

const loadUrl = '/data/last_energy-charts-2025-stuendlich.json';
const generationUrl = '/data/erzeugung_energy-charts-2025-stuendlich.json';
const factorsUrl = '/data/modellfaktoren_2025-stuendlich.json';

export async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${url} (${response.status})`);
  return response.json() as Promise<T>;
}

export async function loadDefaultData(): Promise<DataSet> {
  const [loadData, generationData, factorData] = await Promise.all([
    loadJson<SplitDataFile<LoadHour>>(loadUrl),
    loadJson<SplitDataFile<GenerationHour>>(generationUrl),
    loadJson<SplitDataFile<ModelFactorHour>>(factorsUrl),
  ]);

  const generationByTime = new Map(generationData.hours.map((hour) => [hour.time, hour]));
  const factorsByTime = new Map(factorData.hours.map((hour) => [hour.time, hour]));

  const hours = loadData.hours.map((loadHour) => {
    const generation = generationByTime.get(loadHour.time);
    const factors = factorsByTime.get(loadHour.time);
    if (!generation || !factors) throw new Error(`Unvollständige Daten für ${loadHour.time}`);
    const { time: _generationTime, ...observed } = generation;
    return {
      time: loadHour.time,
      loadMW: loadHour.loadMW,
      solarIrradiance: factors.solarIrradiance,
      wind100m: factors.wind100m,
      observed,
    };
  });

  return {
    source: 'Energy-Charts 2025: Last, Erzeugung und Modellfaktoren getrennt geladen.',
    loadSumTWh: loadData.sumTWh,
    generationSumTWh: generationData.sumTWh,
    hours,
  };
}
