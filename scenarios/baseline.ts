import type { Scenario } from './types';

export const demoScenario: Scenario = {
  id: 'demo-fakewerte',
  name: 'Demo-Fakewerte',
  description: 'Offensichtliches Demoszenario mit runden Platzhalterwerten.',
  demand: { basePct: 100, bevPct: 10, heatPumpPct: 10 },
  renewables: { pvGW: 100, windOnGW: 100, windOffGW: 10 },
  fossil: { coalGW: 10, gasGW: 10, nuclearGW: 0 },
  storage: { batteryPowerGW: 10, batteryEnergyGWh: 100, h2PowerGW: 10, h2EnergyGWh: 100, importLimitGW: 10 },
};

export const baselineScenario = demoScenario;
export const scenarioPresets: Scenario[] = [demoScenario];
