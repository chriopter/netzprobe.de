import type { BevPkwElectrificationLoad, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

export function bevPkwAdditionalMillionKm(targetMillionKm: number, model: BevPkwElectrificationLoad) {
  return Math.max(0, targetMillionKm - model.alreadyElectricMillionKm);
}

export function bevPkwAdditionalTWh(targetMillionKm: number, model: BevPkwElectrificationLoad) {
  return bevPkwAdditionalMillionKm(targetMillionKm, model) * model.kwhPer100Km / 100_000;
}

export function demandGW(row: HourlyInput, scenario: Scenario, bevPkwElectrification: BevPkwElectrificationLoad) {
  const historicalLoadGW = scenario.demand.historicalLoad ? row.loadMW / 1000 : 0;
  const bevPkwLoadGW = scenario.demand.bevPkwKm ? bevPkwAdditionalTWh(scenario.demand.bevPkwMillionKm, bevPkwElectrification) * 1000 / 8760 : 0;
  return historicalLoadGW + bevPkwLoadGW;
}
