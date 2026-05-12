import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { balanceHour, initialStorageState } from './balance';
import { demandGW } from './demand';
import { historicalGenerationGW } from './generation';
import type { SimHour, SimulationResult } from './types';

export type { SimHour, SimulationResult } from './types';

export function runSimulation(input: HourlyInput[], scenario: Scenario): SimulationResult {
  let storage = initialStorageState(scenario);
  const hours: SimHour[] = [];

  for (const row of input) {
    const loadGW = demandGW(row, scenario);
    const generation = historicalGenerationGW(row);
    const balance = balanceHour(generation.supplyGW, loadGW, storage, scenario);
    storage = { batteryGWh: balance.batteryGWh, h2GWh: balance.h2GWh };

    hours.push({
      time: row.time,
      loadGW,
      ...generation,
      ...balance,
    });
  }

  const sum = (fn: (h: SimHour) => number) => hours.reduce((s, h) => s + fn(h), 0) / 1000;
  const demandTWh = sum(h => h.loadGW);
  const renewableTWh = sum(h => h.solarGW + h.windOnGW + h.windOffGW + h.biomassGW + h.hydroGW + h.geothermalGW);
  const loadSheddingTWh = sum(h => h.loadSheddingGW);
  const renewableSharePct = demandTWh > 0 ? 100 * renewableTWh / demandTWh : 0;

  return {
    hours,
    summary: {
      totalDemandTWh: demandTWh,
      renewableSharePct,
      curtailmentTWh: sum(h => h.curtailmentGW),
      importTWh: sum(h => h.importGW),
      exportTWh: sum(h => h.exportGW),
      loadSheddingTWh,
      securityStatus: loadSheddingTWh > 1 ? 'kritisch' : loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil',
    },
  };
}
