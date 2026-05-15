import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runSimulation } from '../src/simulation/engine.ts';
import { defaultScenario, normalizeScenario } from '../src/ui/scenarioPresets.ts';
import { applySupplyPreset } from '../src/ui/supplyPresets.ts';
import { demandGW } from '../src/simulation/demand.ts';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = resolve(rootDir, 'data');

const readJson = (pkg) => JSON.parse(readFileSync(resolve(dataDir, pkg, 'data.json'), 'utf8'));

const loadData = readJson('last-2025');
const generationData = readJson('erzeugung-2025');
const factorData = readJson('einspeisefaktoren-2025');
const loadData2017 = readJson('last-2017');
const generationData2017 = readJson('erzeugung-2017');
const e100Pkw = readJson('e100-pkw');
const e100Heiz = readJson('e100-heiz');
const e100Lkw = readJson('e100-lkw');
const e100Bahn = readJson('e100-bahn');
const e100Schiff = readJson('e100-schiff');
const e100Flug = readJson('e100-flug');
const e100Ghd = readJson('e100-ghd');
const e100IndustrieWaerme = readJson('e100-industrie-waerme');
const e100Stahl = readJson('e100-stahl');
const e100Chemie = readJson('e100-chemie');
const erzPv = readJson('erz-pv');
const erzWindOn = readJson('erz-windon');
const erzWindOff = readJson('erz-windoff');
const erzKernkraft = readJson('erz-kernkraft');
const erzBiomasse = readJson('erz-biomasse');
const erzLaufwasser = readJson('erz-laufwasser');
const erzGas = readJson('erz-gas');
const erzKohle = readJson('erz-kohle');
const erzHandel = readJson('erz-handel');
const speicherBatterie = readJson('speicher-batterie');
const speicherPumpspeicher = readJson('speicher-pumpspeicher');
const speicherH2 = readJson('speicher-h2');

const stripId = (obj) => {
  const { id: _id, ...rest } = obj;
  return rest;
};

const erzeugungsModell = {
  sources: {
    pv: stripId(erzPv), windOn: stripId(erzWindOn), windOff: stripId(erzWindOff),
    kernkraft: stripId(erzKernkraft), biomasse: stripId(erzBiomasse), laufwasser: stripId(erzLaufwasser),
    gas: stripId(erzGas), kohle: stripId(erzKohle),
  },
  import: erzHandel.import,
  export: erzHandel.export,
  dispatchOrder: erzHandel.dispatchOrder,
};
const speicherModell = {
  storages: {
    batterie: stripId(speicherBatterie),
    pumpspeicher: stripId(speicherPumpspeicher),
    h2: stripId(speicherH2),
  },
};

const berlinDateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
});

function berlinDateAndHour(isoTime) {
  const parts = Object.fromEntries(berlinDateFormatter.formatToParts(new Date(isoTime)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

const generationByTime = new Map(generationData.hours.map((hour) => [hour.time, hour]));
const factorsByTime = new Map(factorData.hours.map((hour) => [hour.time, hour]));
const heatingByDate = new Map(e100Heiz.degreeDayProfile.days.map((day) => [day.date, day]));

const hours = loadData.hours.map((loadHour) => {
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

const generation2017ByTime = new Map(generationData2017.hours.map((hour) => [hour.time, hour]));
const hours2017 = loadData2017.hours.map((loadHour) => {
  const generation = generation2017ByTime.get(loadHour.time);
  if (!generation) throw new Error(`missing 2017 generation for ${loadHour.time}`);
  const { date, hour } = berlinDateAndHour(loadHour.time);
  const heatingDegreeDay = heatingByDate.get(`2025-${date.slice(5)}`) ?? heatingByDate.get(date) ?? { weight: 0 };
  const { time: _t, ...observed } = generation;
  return {
    time: loadHour.time,
    loadMW: loadHour.loadMW,
    solarIrradiance: 0,
    wind100m: 0,
    heatingDegreeDayWeight: heatingDegreeDay.weight,
    hourOfDayBerlin: hour,
    observed,
  };
});

const context = {
  'e100-pkw': e100Pkw, 'e100-heiz': e100Heiz, 'e100-lkw': e100Lkw, 'e100-bahn': e100Bahn,
  'e100-schiff': e100Schiff, 'e100-flug': e100Flug, 'e100-ghd': e100Ghd,
  'e100-industrie-waerme': e100IndustrieWaerme, 'e100-stahl': e100Stahl, 'e100-chemie': e100Chemie,
  'erzeugungs-modell': erzeugungsModell, 'speicher-modell': speicherModell,
};

const baseHistorical = normalizeScenario(defaultScenario);
const base = { ...baseHistorical, supplyPreset: 'custom' };
const withDemandAllOn = (scenario) => ({
  ...scenario,
  demand: {
    ...scenario.demand,
    'e100-pkw': true, 'e100-heiz': true, 'e100-lkw': true, 'e100-bahn': true,
    'e100-schiff': true, 'e100-flug': true, 'e100-ghd': true,
    'e100-industrie-waerme': true, 'e100-stahl': true, 'e100-chemie': true,
  },
});
const withDemandOne = (scenario, key, value) => ({
  ...scenario,
  demand: { ...scenario.demand, [key]: true, ...(value !== undefined ? { [`${key}-target`]: value } : {}) },
});
const withDemand = (scenario, patch) => ({ ...scenario, demand: { ...scenario.demand, ...patch } });
const withGen = (scenario, patch) => ({ ...scenario, generation: { ...scenario.generation, ...patch } });
const withStore = (scenario, patch) => ({ ...scenario, storage: { ...scenario.storage, ...patch } });

const e100PkwMax = e100Pkw.maxTargetMillionKm;
const e100HeizMax = e100Heiz.maxTargetHeatTWh;
const e100LkwMax = e100Lkw.maxTargetBnKm;
const e100BahnMax = e100Bahn.maxTargetTWh;
const e100SchiffMax = e100Schiff.maxTargetTWh;
const e100FlugMax = e100Flug.maxTargetTWh;
const e100GhdMax = e100Ghd.maxTargetHeatTWh;
const e100IWMax = e100IndustrieWaerme.maxTargetHeatTWh;
const e100StahlMax = e100Stahl.maxTargetMioTon;
const e100ChemieMax = e100Chemie.maxTargetTotalTWh;

const allMaxPatch = {
  'e100-pkw': true, 'e100-pkw-million-km': e100PkwMax,
  'e100-heiz': true, 'e100-heiz-target-heat-twh': e100HeizMax,
  'e100-lkw': true, 'e100-lkw-target-bn-km': e100LkwMax,
  'e100-bahn': true, 'e100-bahn-target-twh': e100BahnMax,
  'e100-schiff': true, 'e100-schiff-target-twh': e100SchiffMax,
  'e100-flug': true, 'e100-flug-target-twh': e100FlugMax,
  'e100-ghd': true, 'e100-ghd-target-heat-twh': e100GhdMax,
  'e100-industrie-waerme': true, 'e100-industrie-waerme-target-heat-twh': e100IWMax,
  'e100-stahl': true, 'e100-stahl-target-mio-ton': e100StahlMax,
  'e100-chemie': true, 'e100-chemie-target-twh': e100ChemieMax,
};

function resolvePreset(scenario) {
  if (scenario.supplyPreset === 'custom') return scenario;
  if (scenario.supplyPreset === 'historical-2025') return scenario; // pass-through in kernmodell
  const annualDemandTWh = hours.reduce((sum, row) => sum + demandGW(row, scenario, context), 0) / 1000;
  const override = applySupplyPreset(scenario.supplyPreset, annualDemandTWh, hours, erzeugungsModell, speicherModell);
  return { ...scenario, generation: override.generation, storage: override.storage };
}
const withPreset = (scenario, presetId) => resolvePreset({ ...scenario, supplyPreset: presetId });
const verkehrPatch = {
  'e100-pkw': true, 'e100-pkw-million-km': e100PkwMax,
  'e100-lkw': true, 'e100-lkw-target-bn-km': e100LkwMax,
  'e100-bahn': true, 'e100-bahn-target-twh': e100BahnMax,
  'e100-schiff': true, 'e100-schiff-target-twh': e100SchiffMax,
  'e100-flug': true, 'e100-flug-target-twh': e100FlugMax,
};

const baseHistorical2017 = { ...baseHistorical, id: 'historical-2017', name: 'Historisch 2017', supplyPreset: 'historical-2017', loadYear: 2017 };

const scenarios = [
  { name: 'baseline-2025-historisch', scenario: baseHistorical },
  { name: 'baseline-2017-historisch', scenario: baseHistorical2017, hours: hours2017 },
  { name: 'baseline-2025', scenario: base },
  { name: 'pkw-100-historisch', scenario: withDemand(baseHistorical, { 'e100-pkw': true, 'e100-pkw-million-km': e100PkwMax }) },
  { name: 'e100-komplett-historisch', scenario: withDemand(baseHistorical, allMaxPatch) },
  { name: '100ee+verkehr', scenario: withPreset(withDemand(base, verkehrPatch), '100ee-noimport') },
  { name: '50ee+verkehr', scenario: withPreset(withDemand(base, verkehrPatch), '50ee-50import') },
  { name: '2025skal+verkehr', scenario: withPreset(withDemand(base, verkehrPatch), '2025-skaliert') },
  { name: 'pkw-100', scenario: withDemand(base, { 'e100-pkw': true, 'e100-pkw-million-km': e100PkwMax }) },
  { name: 'heiz-100', scenario: withDemand(base, { 'e100-heiz': true, 'e100-heiz-target-heat-twh': e100HeizMax }) },
  { name: 'e100-komplett', scenario: withDemand(base, allMaxPatch) },
  { name: 'pv-2x', scenario: withGen(base, { pvInstalledGW: 205 }) },
  { name: 'pv-4x', scenario: withGen(base, { pvInstalledGW: 410 }) },
  { name: 'wind-2x', scenario: withGen(base, { windOnInstalledGW: 125, windOffInstalledGW: 19 }) },
  { name: 'kernkraft-zurueck', scenario: withGen(base, { kernkraftInstalledGW: 8 }) },
  { name: 'kohle-aus', scenario: withGen(base, { kohleInstalledGW: 0 }) },
  {
    name: 'vollerneuerbar-2040',
    scenario: withStore(
      withGen(
        withDemand(base, allMaxPatch),
        { pvInstalledGW: 250, windOnInstalledGW: 160, windOffInstalledGW: 60, kohleInstalledGW: 0, gasInstalledGW: 20 },
      ),
      { batteriePowerGW: 50, batterieEnergyGWh: 200, h2ChargePowerGW: 20, h2DischargePowerGW: 30, h2EnergyGWh: 50000 },
    ),
  },
];

const fmt2 = (n) => Number(Number(n).toFixed(2));
const fmt0 = (n) => Number(Number(n).toFixed(0));

const results = scenarios.map(({ name, scenario, hours: hoursOverride }) => {
  const result = runSimulation(hoursOverride ?? hours, scenario, context);
  const summary = result.summary;
  return {
    name,
    summary: {
      totalDemandTWh: fmt2(summary.totalDemandTWh),
      renewableTWh: fmt2(summary.renewableTWh),
      renewableSharePct: fmt2(summary.renewableSharePct),
      curtailmentTWh: fmt2(summary.curtailmentTWh),
      importTWh: fmt2(summary.importTWh),
      exportTWh: fmt2(summary.exportTWh),
      loadSheddingTWh: fmt2(summary.loadSheddingTWh),
      co2MtPerYear: fmt2(summary.co2MtPerYear),
      co2GperKWh: fmt0(summary.co2GperKWh),
      hoursWithLoadShedding: summary.hoursWithLoadShedding,
      hoursWithCurtailmentOver50pct: summary.hoursWithCurtailmentOver50pct,
      peakLoadGW: fmt2(summary.peakLoadGW),
      securityStatus: summary.securityStatus,
    },
    monthlySupplyTWh: summary.monthlySupplyTWh.map(fmt2),
  };
});

process.stdout.write(JSON.stringify({ scenarios: results }, null, 2));
process.stdout.write('\n');
