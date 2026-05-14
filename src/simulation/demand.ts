import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { e100DemandModules } from '../../data/e100/model';
import type { DemandScenarioContext } from './demandModule';

export function demandGW(row: HourlyInput, scenario: Scenario, context: DemandScenarioContext) {
  const last2025LoadGW = scenario.demand['last-2025'] ? row.loadMW / 1000 : 0;
  const additiveLoadGW = e100DemandModules.reduce((sum, module) => sum + module.loadGW(row, scenario, context), 0);
  return last2025LoadGW + additiveLoadGW;
}
