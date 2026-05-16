import { describe, expect, it } from 'vitest';
import { runSimulation, type SimulationContext } from '../simulation/engine';
import type {
  E100PkwData, E100HeizData, E100LkwData, E100BahnData, E100SchiffData,
  E100FlugData, E100GhdData, E100IndustrieWaermeData, E100StahlData, E100ChemieData,
  ErzeugungsPool, SpeicherPool,
  ErzPackageBaseload, ErzPackageDispatchable, ErzPackageVariableRe, ErzHandelData,
  SpeicherBatterieData, SpeicherPumpspeicherData, SpeicherH2Data,
  HourlyInput,
} from '../types/data';
import type { Scenario } from '../types/scenario';
import { defaultScenario, normalizeScenario } from '../ui/scenarioPresets';
import erzPvJson from '../../data/erzeugung/pv/data.json';
import erzWindOnJson from '../../data/erzeugung/windon/data.json';
import erzWindOffJson from '../../data/erzeugung/windoff/data.json';
import erzKernkraftJson from '../../data/erzeugung/kernkraft/data.json';
import erzBiomasseJson from '../../data/erzeugung/biomasse/data.json';
import erzLaufwasserJson from '../../data/erzeugung/laufwasser/data.json';
import erzGasJson from '../../data/erzeugung/gas/data.json';
import erzKohleJson from '../../data/erzeugung/kohle/data.json';
import erzHandelJson from '../../data/erzeugung/handel/data.json';
import speicherBatterieJson from '../../data/speicher/batterie/data.json';
import speicherPumpspeicherJson from '../../data/speicher/pumpspeicher/data.json';
import speicherH2Json from '../../data/speicher/h2/data.json';

const flatHourlyMultipliers = Array.from({ length: 24 }, () => 1);

const sampleHours: HourlyInput[] = [
  { time: '2025-01-01T00:00:00Z', loadMW: 50_000, solarIrradiance: [0], wind100m: [0.5], heatingDegreeDayWeight: 1 / 365, hourOfDayBerlin: 1, observed: { pvMW: 0, windOnMW: 18_000, windOffMW: 3_000, gasMW: 5_000, coalMW: 12_000, importExportMW: -1_000 } },
  { time: '2025-01-01T12:00:00Z', loadMW: 60_000, solarIrradiance: [0.4], wind100m: [0.3], heatingDegreeDayWeight: 1 / 365, hourOfDayBerlin: 13, observed: { pvMW: 20_000, windOnMW: 8_000, windOffMW: 2_000, gasMW: 7_000, coalMW: 14_000, importExportMW: 2_000 } },
  { time: '2025-01-01T18:00:00Z', loadMW: 65_000, solarIrradiance: [0], wind100m: [0.2], heatingDegreeDayWeight: 1 / 365, hourOfDayBerlin: 19, observed: { pvMW: 0, windOnMW: 2_000, windOffMW: 1_000, gasMW: 9_000, coalMW: 18_000, importExportMW: 4_000 } },
];

function stripId<T extends { id?: string }>(obj: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = obj;
  return rest;
}

const erzeugungsModell: ErzeugungsPool = {
  sources: {
    pv: stripId(erzPvJson as ErzPackageVariableRe),
    windOn: stripId(erzWindOnJson as ErzPackageVariableRe),
    windOff: stripId(erzWindOffJson as ErzPackageVariableRe),
    kernkraft: stripId(erzKernkraftJson as ErzPackageBaseload),
    biomasse: stripId(erzBiomasseJson as ErzPackageBaseload),
    laufwasser: stripId(erzLaufwasserJson as ErzPackageBaseload),
    gas: stripId(erzGasJson as ErzPackageDispatchable),
    kohle: stripId(erzKohleJson as ErzPackageDispatchable),
  },
  import: (erzHandelJson as ErzHandelData).import,
  export: (erzHandelJson as ErzHandelData).export,
  dispatchOrder: (erzHandelJson as ErzHandelData).dispatchOrder,
} as ErzeugungsPool;
const speicherModell: SpeicherPool = {
  storages: {
    batterie: stripId(speicherBatterieJson as SpeicherBatterieData),
    pumpspeicher: stripId(speicherPumpspeicherJson as SpeicherPumpspeicherData),
    h2: stripId(speicherH2Json as SpeicherH2Data),
  },
} as SpeicherPool;

const baselineScenario: Scenario = { ...normalizeScenario(defaultScenario), supplyPreset: 'custom' };

const e100Pkw: E100PkwData = {
  id: 'e100-pkw',
  title: 'PKW Elektrifizierung',
  source: 'Test',
  sourceUrls: [],
  referenceYear: 2023,
  referenceMillionKm: 472_200,
  alreadyElectricMillionKm: 20_000,
  defaultTargetMillionKm: 472_200,
  maxTargetMillionKm: 708_300,
  stepMillionKm: 1_000,
  kwhPer100Km: 20,
  distribution: 'hourly-profile',
  hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers },
  note: 'Test', summary: 'Test',
};

const e100Heiz: E100HeizData = {
  id: 'e100-heiz',
  title: 'Heiz Elektrifizierung',
  source: 'Test',
  sourceUrls: [],
  referenceYear: 2023,
  referenceHeatDemandTWh: 530,
  alreadyElectricHeatTWh: 50,
  defaultTargetHeatTWh: 530,
  maxTargetHeatTWh: 700,
  stepHeatTWh: 5,
  seasonalCop: 3.3,
  distribution: 'heating-degree-days',
  degreeDayProfile: {
    year: 2025,
    heatingLimitC: 15,
    indoorReferenceC: 20,
    monthlyMeanTemperatureC: [1.5, 2.6, 5.7, 9.6, 13.5, 16.6, 18.4, 18.0, 13.7, 9.4, 4.9, 2.0],
    days: [],
  },
  hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers },
  note: 'Test', summary: 'Test',
};

const e100Lkw: E100LkwData = { id: 'e100-lkw', title: 'Lkw Test', source: 'Test', sourceUrls: [], referenceYear: 2023, referenceBnKm: 93, alreadyElectricBnKm: 1.5, defaultTargetBnKm: 93, maxTargetBnKm: 140, stepBnKm: 1, kwhPerKm: 0.6, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100Bahn: E100BahnData = { id: 'e100-bahn', title: 'Bahn Test', source: 'Test', sourceUrls: [], referenceYear: 2023, dieselSubstitutionTWh: 2, modalShiftTWh: 8, defaultTargetTWh: 10, maxTargetTWh: 25, stepTWh: 0.5, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100Schiff: E100SchiffData = { id: 'e100-schiff', title: 'Schiff Test', source: 'Test', sourceUrls: [], referenceYear: 2023, directElectrificationTWh: 1.2, eFuelSynthesisTWh: 78, eFuelSystemEfficiency: 0.5, alreadyElectricTWh: 0.3, defaultTargetTWh: 80, maxTargetTWh: 120, stepTWh: 1, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100Flug: E100FlugData = { id: 'e100-flug', title: 'Flug Test', source: 'Test', sourceUrls: [], referenceYear: 2023, kerosineDemandMioT: 9.47, kerosineEnergyTWh: 114, ptlEfficiency: 0.38, alreadyElectricTWh: 0, defaultTargetTWh: 300, maxTargetTWh: 380, stepTWh: 5, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100Ghd: E100GhdData = { id: 'e100-ghd', title: 'GHD Test', source: 'Test', sourceUrls: [], referenceYear: 2023, referenceHeatDemandTWh: 138, alreadyElectricHeatTWh: 7, defaultTargetHeatTWh: 138, maxTargetHeatTWh: 200, stepHeatTWh: 1, seasonalCop: 2.8, distribution: 'heating-degree-days', degreeDayProfile: { year: 2025, heatingLimitC: 15, indoorReferenceC: 20, monthlyMeanTemperatureC: [1.5, 2.6, 5.7, 9.6, 13.5, 16.6, 18.4, 18.0, 13.7, 9.4, 4.9, 2.0], days: [] }, hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100IndustrieWaerme: E100IndustrieWaermeData = { id: 'e100-industrie-waerme', title: 'Industrie Wärme Test', source: 'Test', sourceUrls: [], referenceYear: 2023, referenceHeatTWh: 220, alreadyElectricHeatTWh: 25, defaultTargetHeatTWh: 220, maxTargetHeatTWh: 320, stepHeatTWh: 5, electricityPerHeat: 0.69, temperatureMix: { ntShare: 0.30, mtShare: 0.45, htShare: 0.25, ntCop: 3.5, mtElectricFactor: 0.75, htEfficiency: 0.95 }, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100Stahl: E100StahlData = { id: 'e100-stahl', title: 'Stahl Test', source: 'Test', sourceUrls: [], referenceYear: 2023, primarySteelMioTon: 25.6, hydrogenKgPerTonSteel: 60, electrolyzerKwhPerKgH2: 52, eafMwhPerTon: 0.6, mwhPerTon: 3.72, alreadyElectricTWh: 4.9, defaultTargetMioTon: 28, maxTargetMioTon: 35, stepMioTon: 0.5, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };
const e100Chemie: E100ChemieData = { id: 'e100-chemie', title: 'Chemie Test', source: 'Test', sourceUrls: [], referenceYear: 2023, currentElectricityTWh: 55, processHeatSubstitutionTWh: 60, hydrogenAmmoniaTWh: 25, hydrogenMethanolTWh: 50, eOlefinsViaH2TWh: 225, additionalDirectElectricityTWh: 25, h2SystemEfficiency: 0.55, defaultTargetTotalTWh: 440, maxTargetTotalTWh: 600, stepTWh: 10, alreadyElectricTWh: 55, distribution: 'hourly-profile', hourlyProfile: { source: 'Test flat', multipliers: flatHourlyMultipliers }, note: 'Test', summary: 'Test' };

const testContext: SimulationContext = {
  'e100-pkw': e100Pkw, 'e100-heiz': e100Heiz, 'e100-lkw': e100Lkw, 'e100-bahn': e100Bahn,
  'e100-schiff': e100Schiff, 'e100-flug': e100Flug, 'e100-ghd': e100Ghd,
  'e100-industrie-waerme': e100IndustrieWaerme, 'e100-stahl': e100Stahl, 'e100-chemie': e100Chemie,
  'erzeugungs-modell': erzeugungsModell, 'speicher-modell': speicherModell,
};

const simulate = (scenario: Scenario) => runSimulation(sampleHours, scenario, testContext);

describe('simulation engine (sample hours)', () => {
  it('balances every hour with supply, imports, storage, curtailment or load shedding', () => {
    const result = simulate(baselineScenario);
    expect(result.hours).toHaveLength(sampleHours.length);
    for (const hour of result.hours) {
      const lhs = hour.supplyGW + hour.importGW + hour.storageDischargeGW + hour.loadSheddingGW;
      const rhs = hour.loadGW + hour.exportGW + hour.storageChargeGW;
      expect(lhs).toBeCloseTo(rhs, 5);
    }
  });

  it('reports annual KPIs in physical units', () => {
    const result = simulate(baselineScenario);
    expect(result.summary.totalDemandTWh).toBeGreaterThan(0);
    expect(result.summary.securityStatus).toMatch(/stabil|angespannt|kritisch/);
    expect(result.summary.co2GperKWh).toBeGreaterThanOrEqual(0);
  });

  it('treats electrified BEV passenger car kilometres as an additive demand part', () => {
    const historical = simulate(baselineScenario);
    const bevLoad = simulate({ ...baselineScenario, demand: { ...baselineScenario.demand, 'e100-pkw': true, 'e100-pkw-million-km': 472_200 } });

    expect(bevLoad.summary.totalDemandTWh - historical.summary.totalDemandTWh).toBeCloseTo(90.44 * sampleHours.length / 8760, 6);
  });

  it('produces CO2 emissions when fossil dispatch is active', () => {
    const fossilHeavy = simulate({ ...baselineScenario, generation: { ...baselineScenario.generation, gasInstalledGW: 60, kohleInstalledGW: 50 } });
    expect(fossilHeavy.summary.co2GperKWh).toBeGreaterThan(0);
  });
});

describe('default-run shape', () => {
  it('uses package defaults from erzeugungs-modell and speicher-modell', () => {
    expect(baselineScenario.generation.pvInstalledGW).toBeCloseTo(erzeugungsModell.sources.pv.defaultInstalledGW, 6);
    expect(baselineScenario.storage.batterieEnergyGWh).toBeCloseTo(speicherModell.storages.batterie.defaultEnergyGWh, 6);
  });
});
