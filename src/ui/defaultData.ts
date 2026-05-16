import type {
  E100PkwData, E100HeizData, E100LkwData, E100BahnData, E100SchiffData,
  E100FlugData, E100GhdData, E100IndustrieWaermeData, E100StahlData, E100ChemieData,
  ErzeugungsPool, SpeicherPool, AussenhandelPool,
  ErzPackageSource, ErzPackageBaseload, ErzPackageDispatchable, ErzPackageVariableRe,
  AussenhandelStromData, AussenhandelH2Data,
  SpeicherBatterieData, SpeicherPumpspeicherData, SpeicherH2Data,
  ErzeugungsModellDispatchOrder,
  DataSet, GenerationHour, LoadHour, ModelFactorHour, SplitDataFile,
} from '../types/data';
import { dataManifestUrl, dataPackageIds, dataPackageUrl, registerDataPackagePath } from './dataPackages';
import kernModelConfig from '../../data/kern/data.json';

type ManifestEntryRaw = { id: string; path?: string; description: string };

async function ensureManifestPaths(): Promise<void> {
  const response = await fetch(dataManifestUrl);
  if (!response.ok) return;
  const entries = await response.json() as ManifestEntryRaw[];
  for (const entry of entries) {
    if (entry.path) registerDataPackagePath(entry.id, entry.path);
  }
}
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
  await ensureManifestPaths();
  const [
    loadData, e100Pkw, e100Heiz, e100Lkw, e100Bahn, e100Schiff, e100Flug,
    e100Ghd, e100IndustrieWaerme, e100Stahl, e100Chemie, generationData, factorData,
    erzPv, erzWindOn, erzWindOff, erzKernkraft, erzBiomasse, erzLaufwasser, erzGas, erzKohle,
    aussenhandelStrom, aussenhandelH2,
    speicherBatterie, speicherPumpspeicher, speicherH2,
    load2017Data, generation2017Data,
  ] = await Promise.all([
    loadJson<SplitDataFile<LoadHour>>(dataPackageUrl(dataPackageIds.loadHistorical2025, 'data.json')),
    loadJson<E100PkwData>(dataPackageUrl(dataPackageIds.e100Pkw, 'data.json')),
    loadJson<E100HeizData>(dataPackageUrl(dataPackageIds.e100Heiz, 'data.json')),
    loadJson<E100LkwData>(dataPackageUrl(dataPackageIds.e100Lkw, 'data.json')),
    loadJson<E100BahnData>(dataPackageUrl(dataPackageIds.e100Bahn, 'data.json')),
    loadJson<E100SchiffData>(dataPackageUrl(dataPackageIds.e100Schiff, 'data.json')),
    loadJson<E100FlugData>(dataPackageUrl(dataPackageIds.e100Flug, 'data.json')),
    loadJson<E100GhdData>(dataPackageUrl(dataPackageIds.e100Ghd, 'data.json')),
    loadJson<E100IndustrieWaermeData>(dataPackageUrl(dataPackageIds.e100IndustrieWaerme, 'data.json')),
    loadJson<E100StahlData>(dataPackageUrl(dataPackageIds.e100Stahl, 'data.json')),
    loadJson<E100ChemieData>(dataPackageUrl(dataPackageIds.e100Chemie, 'data.json')),
    loadJson<SplitDataFile<GenerationHour>>(dataPackageUrl(dataPackageIds.generationHistorical2025, 'data.json')),
    loadJson<SplitDataFile<ModelFactorHour>>(dataPackageUrl(dataPackageIds.feedInFactors2025, 'data.json')),
    loadJson<ErzPackageVariableRe>(dataPackageUrl(dataPackageIds.erzPv, 'data.json')),
    loadJson<ErzPackageVariableRe>(dataPackageUrl(dataPackageIds.erzWindOn, 'data.json')),
    loadJson<ErzPackageVariableRe>(dataPackageUrl(dataPackageIds.erzWindOff, 'data.json')),
    loadJson<ErzPackageBaseload>(dataPackageUrl(dataPackageIds.erzKernkraft, 'data.json')),
    loadJson<ErzPackageBaseload>(dataPackageUrl(dataPackageIds.erzBiomasse, 'data.json')),
    loadJson<ErzPackageBaseload>(dataPackageUrl(dataPackageIds.erzLaufwasser, 'data.json')),
    loadJson<ErzPackageDispatchable>(dataPackageUrl(dataPackageIds.erzGas, 'data.json')),
    loadJson<ErzPackageDispatchable>(dataPackageUrl(dataPackageIds.erzKohle, 'data.json')),
    loadJson<AussenhandelStromData>(dataPackageUrl(dataPackageIds.aussenhandelStrom, 'data.json')),
    loadJson<AussenhandelH2Data>(dataPackageUrl(dataPackageIds.aussenhandelH2, 'data.json')),
    loadJson<SpeicherBatterieData>(dataPackageUrl(dataPackageIds.speicherBatterie, 'data.json')),
    loadJson<SpeicherPumpspeicherData>(dataPackageUrl(dataPackageIds.speicherPumpspeicher, 'data.json')),
    loadJson<SpeicherH2Data>(dataPackageUrl(dataPackageIds.speicherH2, 'data.json')),
    loadJson<SplitDataFile<LoadHour>>(dataPackageUrl(dataPackageIds.loadHistorical2017, 'data.json')),
    loadJson<SplitDataFile<GenerationHour>>(dataPackageUrl(dataPackageIds.generationHistorical2017, 'data.json')),
  ]);

  const erzeugungsModell = aggregateErzeugungsPool(
    erzPv, erzWindOn, erzWindOff, erzKernkraft, erzBiomasse, erzLaufwasser, erzGas, erzKohle,
  );
  const speicherModell = aggregateSpeicherPool(speicherBatterie, speicherPumpspeicher, speicherH2);
  const aussenhandelModell = aggregateAussenhandelPool(aussenhandelStrom, aussenhandelH2);

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

  const generation2017ByTime = new Map(generation2017Data.hours.map((hour) => [hour.time, hour]));
  const hours2017 = load2017Data.hours.map((loadHour) => {
    const generation = generation2017ByTime.get(loadHour.time);
    if (!generation) throw new Error(`Unvollständige Daten für ${loadHour.time}: erzeugung-2017`);
    const { time: _generationTime, ...observed } = generation;
    // 2017-Hours nutzen Pass-Through im Kernmodell — Faktor- und HDD-Felder werden nicht ausgewertet.
    // Wir setzen Filler-Werte (0 Faktoren, weight 1/8760) damit die HourlyInput-Form passt.
    return {
      time: loadHour.time,
      loadMW: loadHour.loadMW,
      solarIrradiance: [0],
      wind100m: [0],
      heatingDegreeDayWeight: 1 / 8760,
      hourOfDayBerlin: new Date(loadHour.time).getUTCHours(),
      observed,
    };
  });

  return {
    source: 'Energy-Charts 2025 + 2017: Last, Erzeugung und Einspeisefaktoren getrennt geladen.',
    'e100-pkw': e100Pkw,
    'e100-heiz': e100Heiz,
    'e100-lkw': e100Lkw,
    'e100-bahn': e100Bahn,
    'e100-schiff': e100Schiff,
    'e100-flug': e100Flug,
    'e100-ghd': e100Ghd,
    'e100-industrie-waerme': e100IndustrieWaerme,
    'e100-stahl': e100Stahl,
    'e100-chemie': e100Chemie,
    'erzeugungs-modell': erzeugungsModell,
    'speicher-modell': speicherModell,
    'aussenhandel-modell': aussenhandelModell,
    loadSumTWh: loadData.sumTWh,
    generationSumTWh: generationData.sumTWh,
    importSumTWh: generationData.sumImportTWh,
    generationSharesPct: generationData.sumSharesPct,
    generationPartsTWh: generationData.sumPartsTWh,
    hours,
    hours2017,
    loadSum2017TWh: load2017Data.sumTWh,
    generationSum2017TWh: generation2017Data.sumTWh,
  };
}

export function aggregateErzeugungsPool(
  pv: ErzPackageVariableRe,
  windOn: ErzPackageVariableRe,
  windOff: ErzPackageVariableRe,
  kernkraft: ErzPackageBaseload,
  biomasse: ErzPackageBaseload,
  laufwasser: ErzPackageBaseload,
  gas: ErzPackageDispatchable,
  kohle: ErzPackageDispatchable,
): ErzeugungsPool {
  const toSource = (pkg: ErzPackageSource) => {
    const { id: _id, ...rest } = pkg as ErzPackageSource & { id?: string };
    return rest as unknown as ErzPackageSource;
  };
  return {
    sources: {
      pv: toSource(pv),
      windOn: toSource(windOn),
      windOff: toSource(windOff),
      kernkraft: toSource(kernkraft),
      biomasse: toSource(biomasse),
      laufwasser: toSource(laufwasser),
      gas: toSource(gas),
      kohle: toSource(kohle),
    },
    dispatchOrder: (kernModelConfig as { dispatchOrder: ErzeugungsModellDispatchOrder }).dispatchOrder,
  } as ErzeugungsPool;
}

export function aggregateAussenhandelPool(
  strom: AussenhandelStromData,
  h2: AussenhandelH2Data,
): AussenhandelPool {
  return {
    strom: { import: strom.import, export: strom.export },
    h2: { import: { defaultTWh: h2.import.defaultTWh, minTWh: h2.import.minTWh, maxTWh: h2.import.maxTWh, stepTWh: h2.import.stepTWh } },
  };
}

export function aggregateSpeicherPool(
  batterie: SpeicherBatterieData,
  pumpspeicher: SpeicherPumpspeicherData,
  h2: SpeicherH2Data,
): SpeicherPool {
  const strip = <T extends { id?: string }>(p: T) => {
    const { id: _id, ...rest } = p;
    return rest as Omit<T, 'id'>;
  };
  return {
    storages: {
      batterie: strip(batterie),
      pumpspeicher: strip(pumpspeicher),
      h2: strip(h2),
    },
  } as SpeicherPool;
}
