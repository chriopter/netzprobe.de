import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

const TEST_100_TWH_LOAD_GW = 100_000 / 8760;

export function demandGW(row: HourlyInput, scenario: Scenario) {
  const historicalLoadGW = scenario.demand.historicalLoad ? row.loadMW / 1000 : 0;
  const test100TWhLoadGW = scenario.demand.test100TWh ? TEST_100_TWH_LOAD_GW : 0;
  return historicalLoadGW + test100TWhLoadGW;
}
