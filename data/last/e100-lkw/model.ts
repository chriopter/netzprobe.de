import type { E100LkwData, HourlyInput } from '../../../src/types/data';
import type { DemandScenarioModule } from '../../../src/simulation/demandContext';

export function additionalBnKm(targetBnKm: number, model: E100LkwData) {
  return Math.max(0, targetBnKm - model.alreadyElectricBnKm);
}

export function additionalTWh(targetBnKm: number, model: E100LkwData) {
  return additionalBnKm(targetBnKm, model) * model.kwhPerKm;
}

export function hourlyLoadGW(row: HourlyInput, targetBnKm: number, model: E100LkwData) {
  const annualTWh = additionalTWh(targetBnKm, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const e100LkwDemandModule: DemandScenarioModule = {
  id: 'e100-lkw',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-lkw']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-lkw-target-bn-km'], context['e100-lkw']);
  },
};
