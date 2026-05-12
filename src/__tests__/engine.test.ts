import { describe, expect, it } from 'vitest';
import { runSimulation } from '../simulation/engine';
import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

const sampleHours: HourlyInput[] = [
  { time: '2025-01-01T00:00:00Z', loadMW: 50_000, solarIrradiance: [0, 0, 0, 0, 0, 0], wind100m: [8, 7, 10, 9, 12, 11], observed: { pvMW: 0, windOnMW: 18_000, windOffMW: 3_000, gasMW: 5_000, coalMW: 12_000, importExportMW: -1_000 } },
  { time: '2025-01-01T12:00:00Z', loadMW: 60_000, solarIrradiance: [220, 260, 180, 160, 240, 230], wind100m: [6, 6, 7, 7, 9, 10], observed: { pvMW: 20_000, windOnMW: 8_000, windOffMW: 2_000, gasMW: 7_000, coalMW: 14_000, importExportMW: 2_000 } },
  { time: '2025-01-01T18:00:00Z', loadMW: 65_000, solarIrradiance: [0, 0, 0, 0, 0, 0], wind100m: [3, 4, 5, 4, 7, 8], observed: { pvMW: 0, windOnMW: 2_000, windOffMW: 1_000, gasMW: 9_000, coalMW: 18_000, importExportMW: 4_000 } },
];

const baselineScenario: Scenario = {
  id: 'demo-fakewerte',
  name: 'Demo-Fakewerte',
  description: 'Offensichtliches Demoszenario mit runden Platzhalterwerten.',
  demand: { historicalLoad: true, test100TWh: false },
  renewables: { pvGW: 100, windOnGW: 100, windOffGW: 10 },
  fossil: { coalGW: 10, gasGW: 10, nuclearGW: 0 },
  storage: { batteryPowerGW: 10, batteryEnergyGWh: 100, h2PowerGW: 10, h2EnergyGWh: 100, importLimitGW: 10 },
};

describe('simulation engine', () => {
  it('balances every hour with supply, imports, storage, curtailment or load shedding', () => {
    const result = runSimulation(sampleHours, baselineScenario);
    expect(result.hours).toHaveLength(sampleHours.length);
    for (const hour of result.hours) {
      expect(Math.abs(hour.balanceGW)).toBeLessThan(1e-6);
      expect(hour.supplyGW + hour.importGW + hour.storageDischargeGW + hour.loadSheddingGW)
        .toBeCloseTo(hour.loadGW + hour.exportGW + hour.storageChargeGW + hour.curtailmentGW, 6);
    }
  });

  it('reports annual KPIs in physical units', () => {
    const result = runSimulation(sampleHours, baselineScenario);
    expect(result.summary.totalDemandTWh).toBeGreaterThan(0);
    expect(result.summary.renewableSharePct).toBeGreaterThan(0);
    expect(result.summary.securityStatus).toMatch(/stabil|angespannt|kritisch/);
  });

  it('uses observed historical generation instead of scenario capacities', () => {
    const left = runSimulation(sampleHours, { ...baselineScenario, fossil: { coalGW: 0, gasGW: 0 }, renewables: { pvGW: 0, windOnGW: 0, windOffGW: 0 } });
    const right = runSimulation(sampleHours, { ...baselineScenario, fossil: { coalGW: 250, gasGW: 250 }, renewables: { pvGW: 250, windOnGW: 250, windOffGW: 250 } });

    expect(right.hours.map(hour => hour.supplyGW)).toEqual(left.hours.map(hour => hour.supplyGW));
  });

  it('treats the 100 TWh test load as an additive demand part', () => {
    const historical = runSimulation(sampleHours, baselineScenario);
    const noHistorical = runSimulation(sampleHours, { ...baselineScenario, demand: { ...baselineScenario.demand, historicalLoad: false } });
    const testLoad = runSimulation(sampleHours, { ...baselineScenario, demand: { ...baselineScenario.demand, test100TWh: true } });

    expect(noHistorical.summary.totalDemandTWh).toBe(0);
    expect(noHistorical.summary.renewableSharePct).toBe(0);
    expect(testLoad.summary.totalDemandTWh - historical.summary.totalDemandTWh).toBeCloseTo(100 * sampleHours.length / 8760, 6);
  });

  it('keeps historical generation fixed when additive demand changes', () => {
    const historical = runSimulation(sampleHours, baselineScenario);
    const testLoad = runSimulation(sampleHours, { ...baselineScenario, demand: { ...baselineScenario.demand, test100TWh: true } });

    expect(testLoad.hours.map(hour => hour.solarGW)).toEqual(historical.hours.map(hour => hour.solarGW));
    expect(testLoad.hours.map(hour => hour.windOnGW)).toEqual(historical.hours.map(hour => hour.windOnGW));
    expect(testLoad.hours.map(hour => hour.gasGW)).toEqual(historical.hours.map(hour => hour.gasGW));
    expect(testLoad.hours.map(hour => hour.coalGW)).toEqual(historical.hours.map(hour => hour.coalGW));
  });
});
