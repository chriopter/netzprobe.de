import type { E100GhdData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandModule';

export function additionalHeatTWh(targetHeatTWh: number, model: E100GhdData) {
  return Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh);
}

export function additionalElectricityTWh(targetHeatTWh: number, model: E100GhdData) {
  return additionalHeatTWh(targetHeatTWh, model) / model.seasonalCop;
}

export function hourlyLoadGW(row: HourlyInput, targetHeatTWh: number, model: E100GhdData) {
  const annualElectricityTWh = additionalElectricityTWh(targetHeatTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualElectricityTWh * 1000 * row.heatingDegreeDayWeight * hourMultiplier / 24;
}

export const e100GhdDemandModule: DemandScenarioModule = {
  id: 'e100-ghd',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-ghd']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-ghd-target-heat-twh'], context['e100-ghd']);
  },
};
