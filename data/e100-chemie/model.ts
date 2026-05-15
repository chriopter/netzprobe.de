import type { E100ChemieData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandModule';

export function additionalTWh(targetTotalTWh: number, model: E100ChemieData) {
  return Math.max(0, targetTotalTWh - model.alreadyElectricTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTotalTWh: number, model: E100ChemieData) {
  const annualAdditionalTWh = additionalTWh(targetTotalTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualAdditionalTWh * 1000 * hourMultiplier / 8760;
}

export const e100ChemieDemandModule: DemandScenarioModule = {
  id: 'e100-chemie',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-chemie']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-chemie-target-twh'], context['e100-chemie']);
  },
};
