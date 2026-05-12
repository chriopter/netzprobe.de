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
  demand: { historicalLoad: true, bev: false, heatPump: false, basePct: 100, bevPct: 10, heatPumpPct: 10 },
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
    expect(result.summary.co2IntensityGPerKWh).toBeGreaterThan(0);
    expect(result.summary.co2IntensityGPerKWh).toBeLessThan(800);
    expect(result.summary.renewableSharePct).toBeGreaterThan(0);
    expect(result.summary.securityStatus).toMatch(/stabil|angespannt|kritisch/);
  });

  it('reacts to scenario changes deterministically', () => {
    const clean = runSimulation(sampleHours, { ...baselineScenario, fossil: { coalGW: 0, gasGW: 10 }, renewables: { pvGW: 160, windOnGW: 120, windOffGW: 35 } });
    const fossil = runSimulation(sampleHours, { ...baselineScenario, fossil: { coalGW: 31, gasGW: 35.5 }, renewables: { pvGW: 40, windOnGW: 25, windOffGW: 5 } });
    expect(clean.summary.co2IntensityGPerKWh).toBeLessThan(fossil.summary.co2IntensityGPerKWh);
  });

  it('treats historical load, BEV and heat pumps as independent opt-in demand parts', () => {
    const historical = runSimulation(sampleHours, baselineScenario);
    const noHistorical = runSimulation(sampleHours, { ...baselineScenario, demand: { ...baselineScenario.demand, historicalLoad: false } });
    const bev = runSimulation(sampleHours, { ...baselineScenario, demand: { ...baselineScenario.demand, bev: true } });
    const heatPump = runSimulation(sampleHours, { ...baselineScenario, demand: { ...baselineScenario.demand, heatPump: true } });

    expect(noHistorical.summary.totalDemandTWh).toBe(0);
    expect(bev.summary.totalDemandTWh).toBeGreaterThan(historical.summary.totalDemandTWh);
    expect(heatPump.summary.totalDemandTWh).toBeGreaterThan(historical.summary.totalDemandTWh);
  });
});
