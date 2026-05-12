import type { BevPkwElectrificationLoad, HeatPumpElectrificationLoad, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

export function bevPkwAdditionalMillionKm(targetMillionKm: number, model: BevPkwElectrificationLoad) {
  return Math.max(0, targetMillionKm - model.alreadyElectricMillionKm);
}

export function bevPkwAdditionalTWh(targetMillionKm: number, model: BevPkwElectrificationLoad) {
  return bevPkwAdditionalMillionKm(targetMillionKm, model) * model.kwhPer100Km / 100_000;
}

export function heatPumpAdditionalHeatTWh(targetHeatTWh: number, model: HeatPumpElectrificationLoad) {
  return Math.max(0, targetHeatTWh - model.alreadyHeatPumpHeatTWh);
}

export function heatPumpAdditionalElectricityTWh(targetHeatTWh: number, model: HeatPumpElectrificationLoad) {
  return heatPumpAdditionalHeatTWh(targetHeatTWh, model) / model.seasonalCop;
}

export function heatPumpLoadGW(row: HourlyInput, scenario: Scenario, model: HeatPumpElectrificationLoad) {
  if (!scenario.demand.heatPump) return 0;
  const annualElectricityTWh = heatPumpAdditionalElectricityTWh(scenario.demand.heatPumpTargetHeatTWh, model);
  return annualElectricityTWh * 1000 * row.heatingDegreeDayWeight / 24;
}

export function demandGW(row: HourlyInput, scenario: Scenario, bevPkwElectrification: BevPkwElectrificationLoad, heatPumpElectrification: HeatPumpElectrificationLoad) {
  const historicalLoadGW = scenario.demand.historicalLoad ? row.loadMW / 1000 : 0;
  const bevPkwLoadGW = scenario.demand.bevPkwKm ? bevPkwAdditionalTWh(scenario.demand.bevPkwMillionKm, bevPkwElectrification) * 1000 / 8760 : 0;
  return historicalLoadGW + bevPkwLoadGW + heatPumpLoadGW(row, scenario, heatPumpElectrification);
}
