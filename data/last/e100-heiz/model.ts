import type { E100HeizData, HourlyInput } from '../../../src/types/data';
import type { DemandScenarioModule } from '../../../src/simulation/demandContext';

export function additionalHeatTWh(targetHeatTWh: number, model: E100HeizData) {
  return Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh);
}

export function additionalElectricityTWh(targetHeatTWh: number, model: E100HeizData) {
  return additionalHeatTWh(targetHeatTWh, model) / model.seasonalCop;
}

export function hourlyLoadGW(row: HourlyInput, targetHeatTWh: number, model: E100HeizData) {
  const annualElectricityTWh = additionalElectricityTWh(targetHeatTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualElectricityTWh * 1000 * row.heatingDegreeDayWeight * hourMultiplier / 24;
}

export const e100HeatDemandModule: DemandScenarioModule = {
  id: 'e100-heiz',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-heiz']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-heiz-target-heat-twh'], context['e100-heiz']);
  },
};
