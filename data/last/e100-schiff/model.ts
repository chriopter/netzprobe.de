import type { E100SchiffData, HourlyInput } from '../../../src/types/data';
import type { DemandScenarioModule } from '../../../src/simulation/demandContext';

export function additionalTWh(targetTWh: number, model: E100SchiffData) {
  return Math.max(0, targetTWh - model.alreadyElectricTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTWh: number, model: E100SchiffData) {
  const annualTWh = additionalTWh(targetTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const e100SchiffDemandModule: DemandScenarioModule = {
  id: 'e100-schiff',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-schiff']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-schiff-target-twh'], context['e100-schiff']);
  },
};
