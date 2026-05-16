import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runSimulation, type SimulationContext, type SimulationResult } from '../simulation/engine';
import type {
  E100PkwData, E100HeizData, E100LkwData, E100BahnData, E100SchiffData,
  E100FlugData, E100GhdData, E100IndustrieWaermeData, E100StahlData, E100ChemieData,
  ErzeugungsPool, SpeicherPool,
  ErzPackageBaseload, ErzPackageDispatchable, ErzPackageVariableRe, ErzHandelData,
  SpeicherBatterieData, SpeicherPumpspeicherData, SpeicherH2Data,
  GenerationHour, HourlyInput, LoadHour, ModelFactorHour, SplitDataFile,
} from '../types/data';
import type { Scenario } from '../types/scenario';
import { defaultScenario, normalizeScenario } from '../ui/scenarioPresets';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dataDir = resolve(rootDir, 'data');

function readJson<T>(packageName: string): T {
  return JSON.parse(readFileSync(resolve(dataDir, packageName, 'data.json'), 'utf8')) as T;
}

const loadData = readJson<SplitDataFile<LoadHour>>('last/2025');
const generationData = readJson<SplitDataFile<GenerationHour>>('erzeugung/2025');
const factorData = readJson<SplitDataFile<ModelFactorHour>>('erzeugung/einspeisefaktoren-2025');
const e100Pkw = readJson<E100PkwData>('last/e100-pkw');
const e100Heiz = readJson<E100HeizData>('last/e100-heiz');
const e100Lkw = readJson<E100LkwData>('last/e100-lkw');
const e100Bahn = readJson<E100BahnData>('last/e100-bahn');
const e100Schiff = readJson<E100SchiffData>('last/e100-schiff');
const e100Flug = readJson<E100FlugData>('last/e100-flug');
const e100Ghd = readJson<E100GhdData>('last/e100-ghd');
const e100IndustrieWaerme = readJson<E100IndustrieWaermeData>('last/e100-industrie-waerme');
const e100Stahl = readJson<E100StahlData>('last/e100-stahl');
const e100Chemie = readJson<E100ChemieData>('last/e100-chemie');
const erzPv = readJson<ErzPackageVariableRe>('erzeugung/pv');
const erzWindOn = readJson<ErzPackageVariableRe>('erzeugung/windon');
const erzWindOff = readJson<ErzPackageVariableRe>('erzeugung/windoff');
const erzKernkraft = readJson<ErzPackageBaseload>('erzeugung/kernkraft');
const erzBiomasse = readJson<ErzPackageBaseload>('erzeugung/biomasse');
const erzLaufwasser = readJson<ErzPackageBaseload>('erzeugung/laufwasser');
const erzGas = readJson<ErzPackageDispatchable>('erzeugung/gas');
const erzKohle = readJson<ErzPackageDispatchable>('erzeugung/kohle');
const erzHandel = readJson<ErzHandelData>('erzeugung/handel');
const speicherBatterie = readJson<SpeicherBatterieData>('speicher/batterie');
const speicherPumpspeicher = readJson<SpeicherPumpspeicherData>('speicher/pumpspeicher');
const speicherH2 = readJson<SpeicherH2Data>('speicher/h2');

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
  import: erzHandel.import,
  export: erzHandel.export,
  dispatchOrder: erzHandel.dispatchOrder,
} as ErzeugungsPool;
const speicherModell: SpeicherPool = {
  storages: {
    batterie: stripId(speicherBatterie),
    pumpspeicher: stripId(speicherPumpspeicher),
    h2: stripId(speicherH2),
  },
} as SpeicherPool;

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
};

const baseline: Scenario = { ...normalizeScenario(defaultScenario), supplyPreset: 'custom' };

function withGeneration(s: Scenario, o: Partial<Scenario['generation']>): Scenario {
  return { ...s, generation: { ...s.generation, ...o } };
}
function withStorage(s: Scenario, o: Partial<Scenario['storage']>): Scenario {
  return { ...s, storage: { ...s.storage, ...o } };
}
function withDemand(s: Scenario, o: Partial<Scenario['demand']>): Scenario {
  return { ...s, demand: { ...s.demand, ...o } };
}

// 10 diverse Szenarien als deterministische Regression-Fixture. Werte werden
// per toMatchInlineSnapshot beim ersten Lauf eingefroren und bei jedem
// folgenden Lauf verglichen. Falls eine Engine-Aenderung Resultate kippt,
// schlaegt der Test mit klarem Diff an.

function summaryFingerprint(r: SimulationResult) {
  const s = r.summary;
  return {
    totalDemandTWh: Number(s.totalDemandTWh.toFixed(3)),
    renewableSharePct: Number(s.renewableSharePct.toFixed(2)),
    renewableTWh: Number(s.renewableTWh.toFixed(3)),
    curtailmentTWh: Number(s.curtailmentTWh.toFixed(3)),
    importTWh: Number(s.importTWh.toFixed(3)),
    exportTWh: Number(s.exportTWh.toFixed(3)),
    loadSheddingTWh: Number(s.loadSheddingTWh.toFixed(3)),
    hoursWithLoadShedding: s.hoursWithLoadShedding,
    co2MtPerYear: Number(s.co2MtPerYear.toFixed(3)),
    co2GperKWh: Number(s.co2GperKWh.toFixed(2)),
    peakLoadGW: Number(s.peakLoadGW.toFixed(2)),
    securityStatus: s.securityStatus,
  };
}

function hourFingerprint(r: SimulationResult, index: number) {
  const h = r.hours[index];
  return {
    loadGW: Number(h.loadGW.toFixed(3)),
    supplyGW: Number(h.supplyGW.toFixed(3)),
    importGW: Number(h.importGW.toFixed(3)),
    exportGW: Number(h.exportGW.toFixed(3)),
    storageChargeGW: Number(h.storageChargeGW.toFixed(3)),
    storageDischargeGW: Number(h.storageDischargeGW.toFixed(3)),
    batterieSocGWh: Number(h.batterieSocGWh.toFixed(3)),
    pumpspeicherSocGWh: Number(h.pumpspeicherSocGWh.toFixed(3)),
    h2SocGWh: Number(h.h2SocGWh.toFixed(3)),
    loadSheddingGW: Number(h.loadSheddingGW.toFixed(3)),
    curtailmentGW: Number(h.curtailmentGW.toFixed(3)),
    co2Tph: Number(h.co2Tph.toFixed(2)),
  };
}

const SCENARIOS: Array<{ name: string; build: () => Scenario }> = [
  { name: '01-historisch-2025', build: () => ({ ...baseline, supplyPreset: 'historical-2025' }) },
  { name: '02-default-custom', build: () => baseline },
  { name: '03-vollelektrifizierung', build: () => withDemand(baseline, {
    'e100-pkw': true, 'e100-heiz': true, 'e100-lkw': true, 'e100-bahn': true, 'e100-schiff': true,
    'e100-flug': true, 'e100-ghd': true, 'e100-industrie-waerme': true, 'e100-stahl': true, 'e100-chemie': true,
  }) },
  { name: '04-100ee-no-import-style', build: () => withStorage(withGeneration(baseline, {
    pvInstalledGW: 300, windOnInstalledGW: 250, windOffInstalledGW: 80,
    gasInstalledGW: 0, kohleInstalledGW: 0, importMaxGW: 0,
  }), { batteriePowerGW: 100, batterieEnergyGWh: 300, h2ChargePowerGW: 50, h2DischargePowerGW: 50, h2EnergyGWh: 50000 }) },
  { name: '05-windon-dominant-with-battery', build: () => withStorage(withGeneration(baseline, {
    pvInstalledGW: 0, windOnInstalledGW: 200, windOffInstalledGW: 0, kohleInstalledGW: 0, gasInstalledGW: 0,
  }), { batteriePowerGW: 50, batterieEnergyGWh: 250 }) },
  { name: '06-windoff-with-huge-h2', build: () => withStorage(withGeneration(baseline, {
    pvInstalledGW: 0, windOnInstalledGW: 0, windOffInstalledGW: 54, gasInstalledGW: 0, kohleInstalledGW: 0,
  }), { batteriePowerGW: 50, batterieEnergyGWh: 250, pumpspeicherPowerGW: 15, pumpspeicherEnergyGWh: 100, h2ChargePowerGW: 300, h2DischargePowerGW: 300, h2EnergyGWh: 65000 }) },
  { name: '07-kohle-phaseout', build: () => withGeneration(baseline, { kohleInstalledGW: 0 }) },
  { name: '08-pv-dominant-with-lkw', build: () => withDemand(withGeneration(baseline, {
    pvInstalledGW: 500, windOnInstalledGW: 0, windOffInstalledGW: 0, kohleInstalledGW: 0,
  }), { 'e100-lkw': true }) },
  { name: '09-heizung-only', build: () => withDemand(baseline, { 'e100-heiz': true }) },
  { name: '10-industrie-heavy', build: () => withDemand(withGeneration(baseline, {
    pvInstalledGW: 200, windOnInstalledGW: 150, windOffInstalledGW: 50,
  }), { 'e100-industrie-waerme': true, 'e100-stahl': true, 'e100-chemie': true }) },
  { name: '11-h2-import-saves-strom', build: () => withDemand(baseline, {
    'e100-pkw': true, 'e100-heiz': true, 'e100-lkw': true,
    'e100-stahl': true, 'e100-chemie': true, 'e100-schiff': true, 'e100-flug': true,
    'h2-import-twh': 200,
  }) },
];

describe('simulation regression (10 diverse scenarios)', () => {
  for (const sc of SCENARIOS) {
    it(sc.name, () => {
      const result = runSimulation(hours, sc.build(), context);
      // Summary + drei Stunden-Snapshots als Fingerprint. Snapshot wird beim
      // ersten Lauf auto-populiert.
      expect({
        summary: summaryFingerprint(result),
        hour0: hourFingerprint(result, 0),
        hour4000: hourFingerprint(result, 4000),
        hour8000: hourFingerprint(result, 8000),
      }).toMatchSnapshot();
    });
  }
});
