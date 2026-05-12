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

function dayOfYear(isoTime: string) {
  const date = new Date(isoTime);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - start) / 86_400_000);
}

function winterWeight(isoTime: string) {
  const day = dayOfYear(isoTime);
  return 1 + Math.cos(2 * Math.PI * (day - 14) / 365);
}

export function heatPumpLoadGW(row: HourlyInput, scenario: Scenario, model: HeatPumpElectrificationLoad) {
  if (!scenario.demand.heatPump) return 0;
  const annualElectricityTWh = heatPumpAdditionalElectricityTWh(scenario.demand.heatPumpTargetHeatTWh, model);
  return annualElectricityTWh * 1000 / 8760 * winterWeight(row.time);
}

export function demandGW(row: HourlyInput, scenario: Scenario, bevPkwElectrification: BevPkwElectrificationLoad, heatPumpElectrification: HeatPumpElectrificationLoad) {
  const historicalLoadGW = scenario.demand.historicalLoad ? row.loadMW / 1000 : 0;
  const bevPkwLoadGW = scenario.demand.bevPkwKm ? bevPkwAdditionalTWh(scenario.demand.bevPkwMillionKm, bevPkwElectrification) * 1000 / 8760 : 0;
  return historicalLoadGW + bevPkwLoadGW + heatPumpLoadGW(row, scenario, heatPumpElectrification);
}
