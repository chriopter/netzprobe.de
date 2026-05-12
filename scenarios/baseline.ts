import type { Scenario } from './types';

export const baselineScenario: Scenario = {
  id: 'basis-2025',
  name: 'Basis 2025',
  description: 'Plausible 2025-Größenordnung nach Energy-Charts/SMARD-nahem Datenstand.',
  demand: { basePct: 100, bevPct: 4, heatPumpPct: 5 },
  renewables: { pvGW: 82.7, windOnGW: 62.8, windOffGW: 9.4 },
  fossil: { coalGW: 31, gasGW: 35.5, nuclearGW: 0 },
  storage: { batteryPowerGW: 10, batteryEnergyGWh: 25, h2PowerGW: 2, h2EnergyGWh: 10, importLimitGW: 13 },
};

export const scenarioPresets: Scenario[] = [
  baselineScenario,
  {
    ...baselineScenario,
    id: 'erneuerbar-plus',
    name: 'Erneuerbar+',
    description: 'Mehr PV/Wind, größere Batterie, weniger fossile Reserve.',
    renewables: { pvGW: 140, windOnGW: 95, windOffGW: 25 },
    fossil: { coalGW: 8, gasGW: 28, nuclearGW: 0 },
    storage: { batteryPowerGW: 35, batteryEnergyGWh: 120, h2PowerGW: 12, h2EnergyGWh: 600, importLimitGW: 18 },
  },
  {
    ...baselineScenario,
    id: 'dunkelflaute-test',
    name: 'Dunkelflaute-Test',
    description: 'Hohe Nachfrage, wenig Reserve: zeigt Systemstress.',
    demand: { basePct: 116, bevPct: 70, heatPumpPct: 65 },
    renewables: { pvGW: 90, windOnGW: 65, windOffGW: 10 },
    fossil: { coalGW: 12, gasGW: 26, nuclearGW: 0 },
    storage: { batteryPowerGW: 16, batteryEnergyGWh: 45, h2PowerGW: 5, h2EnergyGWh: 120, importLimitGW: 8 },
  },
];
