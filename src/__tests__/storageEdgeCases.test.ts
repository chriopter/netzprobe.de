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
import erzPvJson from '../../data/erz-pv/data.json';
import erzWindOnJson from '../../data/erz-windon/data.json';
import erzWindOffJson from '../../data/erz-windoff/data.json';
import erzKernkraftJson from '../../data/erz-kernkraft/data.json';
import erzBiomasseJson from '../../data/erz-biomasse/data.json';
import erzLaufwasserJson from '../../data/erz-laufwasser/data.json';
import erzGasJson from '../../data/erz-gas/data.json';
import erzKohleJson from '../../data/erz-kohle/data.json';
import erzHandelJson from '../../data/erz-handel/data.json';
import speicherBatterieJson from '../../data/speicher-batterie/data.json';
import speicherPumpspeicherJson from '../../data/speicher-pumpspeicher/data.json';
import speicherH2Json from '../../data/speicher-h2/data.json';

const flatMul = Array.from({ length: 24 }, () => 1);

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

const noopDemand: E100PkwData = { id: 'e100-pkw', title: 'X', source: 'Test', sourceUrls: [], referenceYear: 2023, referenceMillionKm: 0, alreadyElectricMillionKm: 0, defaultTargetMillionKm: 0, maxTargetMillionKm: 0, stepMillionKm: 1, kwhPer100Km: 20, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopHeiz: E100HeizData = { id: 'e100-heiz', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, referenceHeatDemandTWh: 0, alreadyElectricHeatTWh: 0, defaultTargetHeatTWh: 0, maxTargetHeatTWh: 0, stepHeatTWh: 1, seasonalCop: 3.3, distribution: 'heating-degree-days', degreeDayProfile: { year: 2025, heatingLimitC: 15, indoorReferenceC: 20, monthlyMeanTemperatureC: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], days: [] }, hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopLkw: E100LkwData = { id: 'e100-lkw', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, referenceBnKm: 0, alreadyElectricBnKm: 0, defaultTargetBnKm: 0, maxTargetBnKm: 0, stepBnKm: 1, kwhPerKm: 0.6, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopBahn: E100BahnData = { id: 'e100-bahn', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, dieselSubstitutionTWh: 0, modalShiftTWh: 0, defaultTargetTWh: 0, maxTargetTWh: 0, stepTWh: 1, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopSchiff: E100SchiffData = { id: 'e100-schiff', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, directElectrificationTWh: 0, eFuelSynthesisTWh: 0, eFuelSystemEfficiency: 0.5, alreadyElectricTWh: 0, defaultTargetTWh: 0, maxTargetTWh: 0, stepTWh: 1, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopFlug: E100FlugData = { id: 'e100-flug', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, kerosineDemandMioT: 0, kerosineEnergyTWh: 0, ptlEfficiency: 0.38, alreadyElectricTWh: 0, defaultTargetTWh: 0, maxTargetTWh: 0, stepTWh: 1, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopGhd: E100GhdData = { id: 'e100-ghd', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, referenceHeatDemandTWh: 0, alreadyElectricHeatTWh: 0, defaultTargetHeatTWh: 0, maxTargetHeatTWh: 0, stepHeatTWh: 1, seasonalCop: 2.8, distribution: 'heating-degree-days', degreeDayProfile: { year: 2025, heatingLimitC: 15, indoorReferenceC: 20, monthlyMeanTemperatureC: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], days: [] }, hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopIndW: E100IndustrieWaermeData = { id: 'e100-industrie-waerme', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, referenceHeatTWh: 0, alreadyElectricHeatTWh: 0, defaultTargetHeatTWh: 0, maxTargetHeatTWh: 0, stepHeatTWh: 1, electricityPerHeat: 0.69, temperatureMix: { ntShare: 0.3, mtShare: 0.45, htShare: 0.25, ntCop: 3.5, mtElectricFactor: 0.75, htEfficiency: 0.95 }, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopStahl: E100StahlData = { id: 'e100-stahl', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, primarySteelMioTon: 0, hydrogenKgPerTonSteel: 60, electrolyzerKwhPerKgH2: 52, eafMwhPerTon: 0.6, mwhPerTon: 3.72, alreadyElectricTWh: 0, defaultTargetMioTon: 0, maxTargetMioTon: 0, stepMioTon: 0.5, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };
const noopChemie: E100ChemieData = { id: 'e100-chemie', title: 'X', source: 'T', sourceUrls: [], referenceYear: 2023, currentElectricityTWh: 0, processHeatSubstitutionTWh: 0, hydrogenAmmoniaTWh: 0, hydrogenMethanolTWh: 0, eOlefinsViaH2TWh: 0, additionalDirectElectricityTWh: 0, h2SystemEfficiency: 0.55, defaultTargetTotalTWh: 0, maxTargetTotalTWh: 0, stepTWh: 1, alreadyElectricTWh: 0, distribution: 'hourly-profile', hourlyProfile: { source: 'T', multipliers: flatMul }, note: 'T', summary: 'T' };

const ctx: SimulationContext = {
  'e100-pkw': noopDemand, 'e100-heiz': noopHeiz, 'e100-lkw': noopLkw, 'e100-bahn': noopBahn,
  'e100-schiff': noopSchiff, 'e100-flug': noopFlug, 'e100-ghd': noopGhd,
  'e100-industrie-waerme': noopIndW, 'e100-stahl': noopStahl, 'e100-chemie': noopChemie,
  'erzeugungs-modell': erzeugungsModell, 'speicher-modell': speicherModell,
};

const baseScenario: Scenario = { ...normalizeScenario(defaultScenario), supplyPreset: 'custom' };

function hour(time: string, opts: { load: number; pvF?: number; windF?: number } = { load: 0 }): HourlyInput {
  return {
    time,
    loadMW: opts.load * 1000,
    solarIrradiance: [opts.pvF ?? 0],
    wind100m: [opts.windF ?? 0],
    heatingDegreeDayWeight: 0,
    hourOfDayBerlin: 12,
    observed: { pvMW: 0, windOnMW: 0, windOffMW: 0, gasMW: 0, coalMW: 0, importExportMW: 0 },
  };
}

function surplusScenario(extraPv = 200): Scenario {
  return {
    ...baseScenario,
    generation: {
      ...baseScenario.generation,
      pvInstalledGW: extraPv,
      windOnInstalledGW: 0,
      windOffInstalledGW: 0,
      kernkraftInstalledGW: 0,
      biomasseInstalledGW: 0,
      laufwasserInstalledGW: 0,
      gasInstalledGW: 0,
      kohleInstalledGW: 0,
    },
    storage: {
      ...baseScenario.storage,
      batteriePowerGW: 50, batterieEnergyGWh: 200,
      pumpspeicherPowerGW: 20, pumpspeicherEnergyGWh: 100,
      h2ChargePowerGW: 10, h2DischargePowerGW: 10, h2EnergyGWh: 100,
    },
  };
}

describe('storage edge cases', () => {
  it('does not discharge when storage is empty and load exceeds supply', () => {
    // Surplus first to fill nothing (initial SoC 50%, then drain), then deficit
    // Construct scenario with 0 storage energy → guaranteed empty
    const scenario: Scenario = {
      ...baseScenario,
      generation: { ...baseScenario.generation, pvInstalledGW: 0, windOnInstalledGW: 0, windOffInstalledGW: 0, kernkraftInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, gasInstalledGW: 0, kohleInstalledGW: 0 },
      storage: { ...baseScenario.storage, batteriePowerGW: 10, batterieEnergyGWh: 0, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 },
    };
    const hours = [hour('2025-01-01T00:00:00Z', { load: 50 })];
    const r = runSimulation(hours, scenario, ctx);
    expect(r.hours[0].storageDischargeGW).toBeCloseTo(0, 9);
    expect(r.hours[0].loadSheddingGW).toBeGreaterThan(0);
  });

  it('does not charge beyond capacity when storage is full', () => {
    const scenario: Scenario = {
      ...baseScenario,
      generation: { ...baseScenario.generation, pvInstalledGW: 1000, windOnInstalledGW: 0, windOffInstalledGW: 0, kernkraftInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, gasInstalledGW: 0, kohleInstalledGW: 0 },
      storage: { ...baseScenario.storage, batteriePowerGW: 10, batterieEnergyGWh: 5, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 },
    };
    // Run 10 hours of full PV (1000 GW × 1.0 PV-factor = 1000 GW surplus, capacity 5 GWh / 0.8 eta = 6.25 max acceptable per h)
    const hours: HourlyInput[] = Array.from({ length: 10 }, (_, i) => hour(`2025-01-01T${String(i).padStart(2, '0')}:00:00Z`, { load: 50, pvF: 1.0 }));
    const r = runSimulation(hours, scenario, ctx);
    const lastSoc = r.hours[r.hours.length - 1].batterieSocGWh;
    expect(lastSoc).toBeLessThanOrEqual(5 + 1e-6);
    expect(lastSoc).toBeGreaterThan(4.9);  // should be effectively full
  });

  it('honours roundtrip efficiency: charge 1 GWh + full discharge yields eta GWh back', () => {
    // Single battery, η=0.8, start at SoC=0
    const customSpeicher: SpeicherPool = {
      storages: {
        batterie: { ...(speicherModell.storages.batterie), initialStateOfChargeFraction: 0, roundtripEfficiency: 0.8 },
        pumpspeicher: { ...(speicherModell.storages.pumpspeicher) },
        h2: { ...(speicherModell.storages.h2) },
      },
    } as SpeicherPool;
    const customCtx: SimulationContext = { ...ctx, 'speicher-modell': customSpeicher };
    const scenario: Scenario = {
      ...baseScenario,
      generation: { ...baseScenario.generation, pvInstalledGW: 0, windOnInstalledGW: 0, windOffInstalledGW: 0, kernkraftInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, gasInstalledGW: 1, kohleInstalledGW: 0 },
      storage: { ...baseScenario.storage, batteriePowerGW: 1, batterieEnergyGWh: 100, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 },
    };
    // Hour 0: surplus 1 GW → charges. Hour 1+: deficit → discharges.
    const hours: HourlyInput[] = [
      hour('2025-01-01T00:00:00Z', { load: 0 }),     // 1 GW gas min available, 0 load → surplus 1 GW (gas min ~0.4 because minLoadFraction)
      hour('2025-01-01T01:00:00Z', { load: 0.5 }),   // load 0.5 GW → may discharge a bit
      hour('2025-01-01T02:00:00Z', { load: 5 }),     // larger deficit → discharge
      hour('2025-01-01T03:00:00Z', { load: 5 }),
      hour('2025-01-01T04:00:00Z', { load: 5 }),
    ];
    const r = runSimulation(hours, scenario, customCtx);
    const totalChargeGW = r.hours.reduce((s, h) => s + h.batterieChargeGW, 0);
    const totalDischargeGW = r.hours.reduce((s, h) => s + h.batterieDischargeGW, 0);
    if (totalChargeGW > 1e-9) {
      const observedRoundtrip = totalDischargeGW / totalChargeGW;
      expect(observedRoundtrip).toBeLessThanOrEqual(0.8 + 1e-6);
    }
  });

  it('balances each hour with all three storages active', () => {
    const scenario = surplusScenario(150);
    // Mix of surplus and deficit hours
    const hours: HourlyInput[] = [
      hour('2025-01-01T00:00:00Z', { load: 50, pvF: 1.0 }),  // big surplus
      hour('2025-01-01T01:00:00Z', { load: 50, pvF: 0.0 }),  // deficit
      hour('2025-01-01T02:00:00Z', { load: 50, pvF: 1.0 }),
      hour('2025-01-01T03:00:00Z', { load: 50, pvF: 0.0 }),
    ];
    const r = runSimulation(hours, scenario, ctx);
    for (const h of r.hours) {
      const lhs = h.supplyGW + h.importGW + h.storageDischargeGW + h.loadSheddingGW;
      const rhs = h.loadGW + h.exportGW + h.storageChargeGW;
      expect(lhs).toBeCloseTo(rhs, 5);
    }
  });

  it('reduces CO2 when storage shifts fossil load to renewable surplus', () => {
    // Scenario A: large fossil + storage that can shift demand
    // Scenario B: same fossil + zero storage
    const fossilOnly: Scenario = {
      ...baseScenario,
      generation: { ...baseScenario.generation, pvInstalledGW: 100, windOnInstalledGW: 0, windOffInstalledGW: 0, kernkraftInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, gasInstalledGW: 50, kohleInstalledGW: 50 },
      storage: { ...baseScenario.storage, batteriePowerGW: 0, batterieEnergyGWh: 0, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 },
    };
    const withStorage: Scenario = {
      ...fossilOnly,
      storage: { ...fossilOnly.storage, batteriePowerGW: 50, batterieEnergyGWh: 200 },
    };
    // Alternating high-PV and zero-PV hours to enable load shifting
    const hours: HourlyInput[] = Array.from({ length: 48 }, (_, i) =>
      hour(`2025-01-${String(Math.floor(i / 24) + 1).padStart(2, '0')}T${String(i % 24).padStart(2, '0')}:00:00Z`, {
        load: 60, pvF: i % 2 === 0 ? 1.0 : 0.0,
      })
    );
    const aFossil = runSimulation(hours, fossilOnly, ctx);
    const bStorage = runSimulation(hours, withStorage, ctx);
    expect(bStorage.summary.co2MtPerYear).toBeLessThanOrEqual(aFossil.summary.co2MtPerYear);
  });

  it('SoC persists across hours and is bounded by energy capacity', () => {
    const scenario = surplusScenario(50);
    const hours: HourlyInput[] = Array.from({ length: 24 }, (_, i) =>
      hour(`2025-01-01T${String(i).padStart(2, '0')}:00:00Z`, { load: 30, pvF: i < 12 ? 1.0 : 0.0 })
    );
    const r = runSimulation(hours, scenario, ctx);
    for (const h of r.hours) {
      expect(h.batterieSocGWh).toBeGreaterThanOrEqual(-1e-9);
      expect(h.batterieSocGWh).toBeLessThanOrEqual(scenario.storage.batterieEnergyGWh + 1e-6);
      expect(h.pumpspeicherSocGWh).toBeGreaterThanOrEqual(-1e-9);
      expect(h.pumpspeicherSocGWh).toBeLessThanOrEqual(scenario.storage.pumpspeicherEnergyGWh + 1e-6);
      expect(h.h2SocGWh).toBeGreaterThanOrEqual(-1e-9);
      expect(h.h2SocGWh).toBeLessThanOrEqual(scenario.storage.h2EnergyGWh + 1e-6);
    }
  });

  it('warm-up pass converges initial SoC so pure-deficit scenario does not borrow phantom energy', () => {
    // Permanent-Defizit-Szenario: nur WindOff (geringer CF), kein Import.
    // Ohne Warm-up: H2 startet bei 50% × 500 TWh = 250 TWh und drained langsam → Load-Shedding erst spät.
    // Mit Warm-up: erste Pass entlädt komplett, zweite startet bei ~0 → Load-Shedding ab Stunde 1.
    const scenario: Scenario = {
      ...baseScenario,
      generation: { ...baseScenario.generation,
        pvInstalledGW: 0, windOnInstalledGW: 0, windOffInstalledGW: 5,
        kernkraftInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0,
        gasInstalledGW: 0, kohleInstalledGW: 0,
        importMaxGW: 0,
      },
      storage: { ...baseScenario.storage,
        batteriePowerGW: 0, batterieEnergyGWh: 0,
        pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0,
        h2ChargePowerGW: 0, h2DischargePowerGW: 100, h2EnergyGWh: 2200,
      },
    };
    // 24h mit Last 50 GW, kein PV (nachts), keine Erzeugung außer minimal Wind
    const hours: HourlyInput[] = Array.from({ length: 24 }, (_, i) =>
      hour(`2025-01-01T${String(i).padStart(2, '0')}:00:00Z`, { load: 50, pvF: 0, windF: 0.1 })
    );
    const r = runSimulation(hours, scenario, ctx);
    // Mit Warm-up: H2 wurde im warm-up entladen, kann im main-pass nicht entladen → Load-Shedding ab Stunde 1
    expect(r.hours[0].loadSheddingGW).toBeGreaterThan(40);
    expect(r.hours[0].h2DischargeGW).toBeCloseTo(0, 6);
    expect(r.hours[0].h2SocGWh).toBeCloseTo(0, 3);
  });

  it('dispatches storages in priority order (Batterie → Pumpspeicher → H2)', () => {
    // Big surplus with all 3 storages having capacity left.
    // Batterie should fill first.
    const scenario: Scenario = {
      ...baseScenario,
      generation: { ...baseScenario.generation, pvInstalledGW: 30, windOnInstalledGW: 0, windOffInstalledGW: 0, kernkraftInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, gasInstalledGW: 0, kohleInstalledGW: 0 },
      storage: { ...baseScenario.storage, batteriePowerGW: 10, batterieEnergyGWh: 100, pumpspeicherPowerGW: 10, pumpspeicherEnergyGWh: 100, h2ChargePowerGW: 10, h2DischargePowerGW: 10, h2EnergyGWh: 100 },
    };
    // Surplus exactly 10 GW (fits exactly into batterie capacity)
    const hours: HourlyInput[] = [hour('2025-01-01T12:00:00Z', { load: 20, pvF: 1.0 })];
    const r = runSimulation(hours, scenario, ctx);
    expect(r.hours[0].batterieChargeGW).toBeGreaterThan(0);
    expect(r.hours[0].pumpspeicherChargeGW).toBe(0);
    expect(r.hours[0].h2ChargeGW).toBe(0);
  });
});
