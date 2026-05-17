import type {
  ErzeugungsPool, SpeicherPool, AussenhandelPool,
  ErzPackageSource, ErzPackageBaseload, ErzPackageDispatchable, ErzPackageVariableRe,
  AussenhandelStromData, AussenhandelH2Data,
  SpeicherBatterieData, SpeicherPumpspeicherData, SpeicherH2Data,
  ErzeugungsModellDispatchOrder,
  DataSet, HourlyInput,
} from '../types/data';
import { data as e100Pkw } from '../../data/last/e100-pkw';
import { data as e100Heiz } from '../../data/last/e100-heiz';
import { data as e100Lkw } from '../../data/last/e100-lkw';
import { data as e100Bahn } from '../../data/last/e100-bahn';
import { data as e100Schiff } from '../../data/last/e100-schiff';
import { data as e100Flug } from '../../data/last/e100-flug';
import { data as e100Ghd } from '../../data/last/e100-ghd';
import { data as e100IndustrieWaerme } from '../../data/last/e100-industrie-waerme';
import { data as e100Stahl } from '../../data/last/e100-stahl';
import { data as e100Chemie } from '../../data/last/e100-chemie';
import { data as erzPv } from '../../data/erzeugung/pv';
import { data as erzWindOn } from '../../data/erzeugung/windon';
import { data as erzWindOff } from '../../data/erzeugung/windoff';
import { data as erzKernkraft } from '../../data/erzeugung/kernkraft';
import { data as erzBiomasse } from '../../data/erzeugung/biomasse';
import { data as erzLaufwasser } from '../../data/erzeugung/laufwasser';
import { data as erzGas } from '../../data/erzeugung/gas';
import { data as erzKohle } from '../../data/erzeugung/kohle';
import { data as aussenhandelStrom } from '../../data/aussenhandel/strom-handel';
import { data as aussenhandelH2 } from '../../data/aussenhandel/h2-handel';
import { data as speicherBatterie } from '../../data/speicher/batterie';
import { data as speicherPumpspeicher } from '../../data/speicher/pumpspeicher';
import { data as speicherH2 } from '../../data/speicher/h2';
import { data as kernModelConfig } from '../../data/kern';

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
  // Drei große 2025-Datasets werden parallel als eigener Chunk geladen.
  // Vite splittet sie automatisch aus dem Initial-Bundle, weil sie dynamische Imports sind.
  const [loadModule, generationModule, factorModule] = await Promise.all([
    import('../../data/last/2025'),
    import('../../data/erzeugung/2025'),
    import('../../data/erzeugung/einspeisefaktoren-2025'),
  ]);
  const loadData = loadModule.data;
  const generationData = generationModule.data;
  const factorData = factorModule.data;

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

  return {
    source: 'Energy-Charts 2025: Last, Erzeugung und Einspeisefaktoren. 2017-Daten werden bei Bedarf nachgeladen.',
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
  };
}

export type Historical2017Data = {
  hours2017: HourlyInput[];
  loadSum2017TWh?: number;
  generationSum2017TWh?: number;
};

let historical2017Cache: Promise<Historical2017Data> | null = null;

export function loadHistorical2017(): Promise<Historical2017Data> {
  if (historical2017Cache) return historical2017Cache;
  historical2017Cache = (async () => {
    const [loadModule, generationModule] = await Promise.all([
      import('../../data/last/2017'),
      import('../../data/erzeugung/2017'),
    ]);
    const load2017Data = loadModule.data;
    const generation2017Data = generationModule.data;
    const generation2017ByTime = new Map(generation2017Data.hours.map((hour) => [hour.time, hour]));
    const hours2017 = load2017Data.hours.map((loadHour) => {
      const generation = generation2017ByTime.get(loadHour.time);
      if (!generation) throw new Error(`Unvollständige Daten für ${loadHour.time}: erzeugung-2017`);
      const { time: _generationTime, ...observed } = generation;
      // 2017-Hours nutzen Pass-Through im Kernmodell — Faktor- und HDD-Felder werden nicht ausgewertet.
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
      hours2017,
      loadSum2017TWh: load2017Data.sumTWh,
      generationSum2017TWh: generation2017Data.sumTWh,
    };
  })();
  return historical2017Cache;
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
