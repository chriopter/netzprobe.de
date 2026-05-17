import { describe, expect, it } from 'vitest';
import { runSimulation, type SimulationContext } from '../simulation/engine';
import type {
  ErzeugungsPool, SpeicherPool, AussenhandelPool,
  ErzeugungsModellDispatchOrder,
  HourlyInput,
} from '../types/data';
import type { Scenario } from '../types/scenario';
import { defaultScenario, normalizeScenario } from '../ui/scenarioPresets';
import { data as loadData } from '../../data/last/2025';
import { data as generationData } from '../../data/erzeugung/2025';
import { data as factorData } from '../../data/erzeugung/einspeisefaktoren-2025';
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
import { data as kernConfigData } from '../../data/kern';
import { data as speicherBatterie } from '../../data/speicher/batterie';
import { data as speicherPumpspeicher } from '../../data/speicher/pumpspeicher';
import { data as speicherH2 } from '../../data/speicher/h2';

const kernConfig = kernConfigData as { dispatchOrder: ErzeugungsModellDispatchOrder };

function stripId<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = obj;
  return rest;
}

const erzeugungsModell: ErzeugungsPool = {
  sources: {
    pv: stripId(erzPv), windOn: stripId(erzWindOn), windOff: stripId(erzWindOff),
    kernkraft: stripId(erzKernkraft), biomasse: stripId(erzBiomasse), laufwasser: stripId(erzLaufwasser),
    gas: stripId(erzGas), kohle: stripId(erzKohle),
  },
  dispatchOrder: kernConfig.dispatchOrder,
} as ErzeugungsPool;
const speicherModell: SpeicherPool = {
  storages: {
    batterie: stripId(speicherBatterie),
    pumpspeicher: stripId(speicherPumpspeicher),
    h2: stripId(speicherH2),
  },
} as SpeicherPool;
const aussenhandelModell: AussenhandelPool = {
  strom: { import: aussenhandelStrom.import, export: aussenhandelStrom.export },
  h2: { import: aussenhandelH2.import },
};

const berlinDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
});

function berlinDateAndHour(isoTime: string) {
  const parts = Object.fromEntries(berlinDateFormatter.formatToParts(new Date(isoTime)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

const generationByTime = new Map(generationData.hours.map((hour) => [hour.time, hour]));
const factorsByTime = new Map(factorData.hours.map((hour) => [hour.time, hour]));
const heatingByDate = new Map(e100Heiz.degreeDayProfile.days.map((day) => [day.date, day]));

const hours: HourlyInput[] = loadData.hours.map((loadHour) => {
  const generation = generationByTime.get(loadHour.time);
  const factors = factorsByTime.get(loadHour.time);
  const { date, hour } = berlinDateAndHour(loadHour.time);
  const heatingDegreeDay = heatingByDate.get(date);
  if (!generation || !factors || !heatingDegreeDay) throw new Error(`missing data for ${loadHour.time}`);
  const { time: _t, ...observed } = generation;
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

const context: SimulationContext = {
  'e100-pkw': e100Pkw, 'e100-heiz': e100Heiz, 'e100-lkw': e100Lkw, 'e100-bahn': e100Bahn,
  'e100-schiff': e100Schiff, 'e100-flug': e100Flug, 'e100-ghd': e100Ghd,
  'e100-industrie-waerme': e100IndustrieWaerme, 'e100-stahl': e100Stahl, 'e100-chemie': e100Chemie,
  'erzeugungs-modell': erzeugungsModell, 'speicher-modell': speicherModell,
  'aussenhandel-modell': aussenhandelModell,
};

const baseline: Scenario = { ...normalizeScenario(defaultScenario), supplyPreset: 'custom' };

function withGeneration(scenario: Scenario, overrides: Partial<Scenario['generation']>): Scenario {
  return { ...scenario, generation: { ...scenario.generation, ...overrides } };
}

function withStorage(scenario: Scenario, overrides: Partial<Scenario['storage']>): Scenario {
  return { ...scenario, storage: { ...scenario.storage, ...overrides } };
}

function withE100All(scenario: Scenario): Scenario {
  return {
    ...scenario,
    demand: {
      ...scenario.demand,
      'e100-pkw': true, 'e100-heiz': true, 'e100-lkw': true, 'e100-bahn': true,
      'e100-schiff': true, 'e100-flug': true, 'e100-ghd': true,
      'e100-industrie-waerme': true, 'e100-stahl': true, 'e100-chemie': true,
    },
  };
}

const simulate = (scenario: Scenario) => runSimulation(hours, scenario, context);

describe('full-year baseline 2025', () => {
  const result = simulate(baseline);

  it('reproduces 2025 load within 10 TWh', () => {
    const observed = loadData.sumTWh ?? 466;
    expect(Math.abs(result.summary.totalDemandTWh - observed)).toBeLessThan(10);
  });

  it('balances each hour', () => {
    for (const hour of result.hours) {
      const lhs = hour.supplyGW + hour.importGW + hour.storageDischargeGW + hour.loadSheddingGW;
      const rhs = hour.loadGW + hour.exportGW + hour.storageChargeGW;
      expect(lhs).toBeCloseTo(rhs, 3);
    }
  });

  it('has renewable share within 5 percentage points of historical roughly 60 %', () => {
    expect(result.summary.renewableSharePct).toBeGreaterThanOrEqual(45);
    expect(result.summary.renewableSharePct).toBeLessThanOrEqual(75);
  });

  it('produces CO2 intensity in the band 250..500 g/kWh', () => {
    expect(result.summary.co2GperKWh).toBeGreaterThanOrEqual(250);
    expect(result.summary.co2GperKWh).toBeLessThanOrEqual(500);
  });
});

describe('full-year scenario response', () => {
  it('doubling PV increases curtailment relative to baseline without changing demand', () => {
    const base = simulate(baseline);
    const pvDouble = simulate(withGeneration(baseline, { pvInstalledGW: 200 }));
    expect(pvDouble.summary.totalDemandTWh).toBeCloseTo(base.summary.totalDemandTWh, 3);
    expect(pvDouble.summary.curtailmentTWh).toBeGreaterThan(base.summary.curtailmentTWh);
  });

  it('removing coal forces more import or load shedding', () => {
    const base = simulate(baseline);
    const noCoal = simulate(withGeneration(baseline, { kohleInstalledGW: 0 }));
    const baseAux = base.summary.importTWh + base.summary.loadSheddingTWh;
    const aux = noCoal.summary.importTWh + noCoal.summary.loadSheddingTWh;
    expect(aux).toBeGreaterThan(baseAux);
  });

  it('full electrification under 2025 generation triggers load shedding', () => {
    const stress = simulate(withE100All(baseline));
    expect(stress.summary.loadSheddingTWh).toBeGreaterThan(0);
  });

  it('large PV plus battery cycles the battery state of charge', () => {
    const scenario = withStorage(withGeneration(baseline, { pvInstalledGW: 400 }), {
      batteriePowerGW: 200, batterieEnergyGWh: 200,
    });
    const result = simulate(scenario);
    const socs = result.hours.map(hour => hour.batterieSocGWh);
    const minSoc = Math.min(...socs);
    const maxSoc = Math.max(...socs);
    expect(maxSoc - minSoc).toBeGreaterThan(50);
  });
});
