import { describe, expect, it } from 'vitest';
import { runSimulation } from '../simulation/engine';
import type { BevPkwElectrificationLoad, HeatPumpElectrificationLoad, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

const flatHourlyMultipliers = Array.from({ length: 24 }, () => 1);

const sampleHours: HourlyInput[] = [
  { time: '2025-01-01T00:00:00Z', loadMW: 50_000, solarIrradiance: [0], wind100m: [8], heatingDegreeDayWeight: 1 / 365, hourOfDayBerlin: 1, observed: { pvMW: 0, windOnMW: 18_000, windOffMW: 3_000, gasMW: 5_000, coalMW: 12_000, importExportMW: -1_000 } },
  { time: '2025-01-01T12:00:00Z', loadMW: 60_000, solarIrradiance: [220], wind100m: [6], heatingDegreeDayWeight: 1 / 365, hourOfDayBerlin: 13, observed: { pvMW: 20_000, windOnMW: 8_000, windOffMW: 2_000, gasMW: 7_000, coalMW: 14_000, importExportMW: 2_000 } },
  { time: '2025-01-01T18:00:00Z', loadMW: 65_000, solarIrradiance: [0], wind100m: [3], heatingDegreeDayWeight: 1 / 365, hourOfDayBerlin: 19, observed: { pvMW: 0, windOnMW: 2_000, windOffMW: 1_000, gasMW: 9_000, coalMW: 18_000, importExportMW: 4_000 } },
];

const baselineScenario: Scenario = {
  id: 'demo-fakewerte',
  name: 'Demo-Fakewerte',
  description: 'Offensichtliches Demoszenario mit runden Platzhalterwerten.',
  demand: { historicalLoad: true, bevPkwKm: false, bevPkwMillionKm: 472_200, heatPump: false, heatPumpTargetHeatTWh: 445 },
  renewables: { pvGW: 100, windOnGW: 100, windOffGW: 10 },
  fossil: { coalGW: 10, gasGW: 10, nuclearGW: 0 },
  storage: { batteryPowerGW: 10, batteryEnergyGWh: 100, h2PowerGW: 10, h2EnergyGWh: 100, importLimitGW: 10 },
};

const bevPkwElectrification: BevPkwElectrificationLoad = {
  id: 'bev-pkw-electrification',
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
  note: 'Test',
};

const heatPumpElectrification: HeatPumpElectrificationLoad = {
  id: 'heat-pump-electrification',
  title: 'Heiz Elektrifizierung',
  source: 'Test',
  sourceUrls: [],
  referenceYear: 2026,
  referenceHeatDemandTWh: 445,
  alreadyHeatPumpHeatTWh: 35,
  defaultTargetHeatTWh: 445,
  maxTargetHeatTWh: 600,
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
  note: 'Test',
};

const simulate = (scenario: Scenario) => runSimulation(sampleHours, scenario, bevPkwElectrification, heatPumpElectrification);

describe('simulation engine', () => {
  it('balances every hour with supply, imports, storage, curtailment or load shedding', () => {
    const result = simulate(baselineScenario);
    expect(result.hours).toHaveLength(sampleHours.length);
    for (const hour of result.hours) {
      expect(Math.abs(hour.balanceGW)).toBeLessThan(1e-6);
      expect(hour.supplyGW + hour.importGW + hour.dataBoundaryResidualGW + hour.storageDischargeGW)
        .toBeCloseTo(hour.loadGW + hour.exportGW + hour.storageChargeGW + hour.curtailmentGW, 6);
    }
  });

  it('reports annual KPIs in physical units', () => {
    const result = simulate(baselineScenario);
    expect(result.summary.totalDemandTWh).toBeGreaterThan(0);
    expect(result.summary.renewableSharePct).toBeGreaterThan(0);
    expect(result.summary.securityStatus).toMatch(/stabil|angespannt|kritisch/);
  });

  it('uses observed historical generation instead of scenario capacities', () => {
    const left = simulate({ ...baselineScenario, fossil: { coalGW: 0, gasGW: 0 }, renewables: { pvGW: 0, windOnGW: 0, windOffGW: 0 } });
    const right = simulate({ ...baselineScenario, fossil: { coalGW: 250, gasGW: 250 }, renewables: { pvGW: 250, windOnGW: 250, windOffGW: 250 } });

    expect(right.hours.map(hour => hour.supplyGW)).toEqual(left.hours.map(hour => hour.supplyGW));
  });

  it('treats electrified BEV passenger car kilometres as an additive demand part', () => {
    const historical = simulate(baselineScenario);
    const noHistorical = simulate({ ...baselineScenario, demand: { ...baselineScenario.demand, historicalLoad: false } });
    const bevLoad = simulate({ ...baselineScenario, demand: { ...baselineScenario.demand, bevPkwKm: true, bevPkwMillionKm: 472_200 } });

    expect(noHistorical.summary.totalDemandTWh).toBe(0);
    expect(noHistorical.summary.renewableSharePct).toBe(0);
    expect(bevLoad.summary.totalDemandTWh - historical.summary.totalDemandTWh).toBeCloseTo(90.44 * sampleHours.length / 8760, 6);
  });

  it('balances the historical baseline without load shedding or curtailment', () => {
    const result = simulate(baselineScenario);

    expect(result.summary.loadSheddingTWh).toBe(0);
    expect(result.summary.curtailmentTWh).toBe(0);
  });

  it('fills additive load with additional import instead of separate load shedding', () => {
    const historical = simulate(baselineScenario);
    const bevLoad = simulate({ ...baselineScenario, demand: { ...baselineScenario.demand, bevPkwKm: true, bevPkwMillionKm: 472_200 } });

    expect(bevLoad.summary.loadSheddingTWh).toBe(0);
    expect(bevLoad.summary.importTWh - historical.summary.importTWh).toBeCloseTo(90.44 * sampleHours.length / 8760, 6);
  });

  it('distributes heat pump load by heating degree day weights', () => {
    const historical = simulate(baselineScenario);
    const heatPumpLoad = simulate({ ...baselineScenario, demand: { ...baselineScenario.demand, heatPump: true, heatPumpTargetHeatTWh: 445 } });
    const expectedTWh = (445 - 35) / 3.3 * sampleHours.length / (365 * 24);

    expect(heatPumpLoad.summary.totalDemandTWh - historical.summary.totalDemandTWh).toBeCloseTo(expectedTWh, 6);
    expect(heatPumpLoad.summary.importTWh - historical.summary.importTWh).toBeCloseTo(expectedTWh, 6);
  });

  it('keeps historical generation fixed when additive demand changes', () => {
    const historical = simulate(baselineScenario);
    const testLoad = simulate({ ...baselineScenario, demand: { ...baselineScenario.demand, bevPkwKm: true } });

    expect(testLoad.hours.map(hour => hour.solarGW)).toEqual(historical.hours.map(hour => hour.solarGW));
    expect(testLoad.hours.map(hour => hour.windOnGW)).toEqual(historical.hours.map(hour => hour.windOnGW));
    expect(testLoad.hours.map(hour => hour.gasGW)).toEqual(historical.hours.map(hour => hour.gasGW));
    expect(testLoad.hours.map(hour => hour.coalGW)).toEqual(historical.hours.map(hour => hour.coalGW));
  });
});
