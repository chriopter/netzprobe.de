import type { BevPkwElectrificationLoad, HeatPumpElectrificationLoad, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

export function bevPkwAdditionalMillionKm(targetMillionKm: number, model: BevPkwElectrificationLoad) {
  return Math.max(0, targetMillionKm - model.alreadyElectricMillionKm);
}

export function bevPkwAdditionalTWh(targetMillionKm: number, model: BevPkwElectrificationLoad) {
  return bevPkwAdditionalMillionKm(targetMillionKm, model) * model.kwhPer100Km / 100_000;
}

export function heatPumpAdditionalHeatTWh(targetHeatTWh: number, model: HeatPumpElectrificationLoad) {
  return Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh);
}

export function heatPumpAdditionalElectricityTWh(targetHeatTWh: number, model: HeatPumpElectrificationLoad) {
  return heatPumpAdditionalHeatTWh(targetHeatTWh, model) / model.seasonalCop;
}

export function heatPumpLoadGW(row: HourlyInput, scenario: Scenario, model: HeatPumpElectrificationLoad) {
  if (!scenario.demand.heatPump) return 0;
  const annualElectricityTWh = heatPumpAdditionalElectricityTWh(scenario.demand.heatPumpTargetHeatTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualElectricityTWh * 1000 * row.heatingDegreeDayWeight * hourMultiplier / 24;
}

export function bevPkwLoadGW(row: HourlyInput, scenario: Scenario, model: BevPkwElectrificationLoad) {
  if (!scenario.demand.bevPkwKm) return 0;
  const annualTWh = bevPkwAdditionalTWh(scenario.demand.bevPkwMillionKm, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export function demandGW(row: HourlyInput, scenario: Scenario, bevPkwElectrification: BevPkwElectrificationLoad, heatPumpElectrification: HeatPumpElectrificationLoad) {
  const historicalLoadGW = scenario.demand.historicalLoad ? row.loadMW / 1000 : 0;
  return historicalLoadGW + bevPkwLoadGW(row, scenario, bevPkwElectrification) + heatPumpLoadGW(row, scenario, heatPumpElectrification);
}
