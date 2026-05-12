import type { BevPkwElectrificationLoad, DataSet, GenerationHour, HeatingDegreeDay, HeatPumpElectrificationLoad, LoadHour, ModelFactorHour, SplitDataFile } from '../types/data';

const dataUrl = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;

const loadUrl = dataUrl('last/energy-charts-stuendlich-2025.json');
const bevPkwElectrificationUrl = dataUrl('last/pkw-elektrifizierung.json');
const heatPumpElectrificationUrl = dataUrl('last/waermepumpen-elektrifizierung.json');
const heatingDegreeDaysUrl = dataUrl('last/gradtage-2025.json');
const generationUrl = dataUrl('erzeugung/energy-charts-stuendlich-2025.json');
const factorsUrl = dataUrl('modell/einspeisefaktoren-stuendlich-2025.json');

export async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${url} (${response.status})`);
  return response.json() as Promise<T>;
}

export async function loadDefaultData(): Promise<DataSet> {
  const [loadData, bevPkwElectrification, heatPumpElectrification, heatingDegreeDays, generationData, factorData] = await Promise.all([
    loadJson<SplitDataFile<LoadHour>>(loadUrl),
    loadJson<BevPkwElectrificationLoad>(bevPkwElectrificationUrl),
    loadJson<HeatPumpElectrificationLoad>(heatPumpElectrificationUrl),
    loadJson<SplitDataFile<HeatingDegreeDay>>(heatingDegreeDaysUrl),
    loadJson<SplitDataFile<GenerationHour>>(generationUrl),
    loadJson<SplitDataFile<ModelFactorHour>>(factorsUrl),
  ]);

  const generationByTime = new Map(generationData.hours.map((hour) => [hour.time, hour]));
  const factorsByTime = new Map(factorData.hours.map((hour) => [hour.time, hour]));
  const heatingDegreeDayByDate = new Map(heatingDegreeDays.hours.map((day) => [day.date, day]));

  const hours = loadData.hours.map((loadHour) => {
    const generation = generationByTime.get(loadHour.time);
    const factors = factorsByTime.get(loadHour.time);
    const date = loadHour.time.slice(0, 10);
    const heatingDegreeDay = heatingDegreeDayByDate.get(date);
    if (!generation || !factors || !heatingDegreeDay) throw new Error(`Unvollständige Daten für ${loadHour.time}`);
    const { time: _generationTime, ...observed } = generation;
    return {
      time: loadHour.time,
      loadMW: loadHour.loadMW,
      solarIrradiance: factors.solarIrradiance,
      wind100m: factors.wind100m,
      heatingDegreeDayWeight: heatingDegreeDay.weight,
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
