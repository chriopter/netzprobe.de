import type { E100BahnData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandModule';

export function additionalTWh(targetTWh: number, _model: E100BahnData) {
  return Math.max(0, targetTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTWh: number, model: E100BahnData) {
  const annualTWh = additionalTWh(targetTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const e100BahnDemandModule: DemandScenarioModule = {
  id: 'e100-bahn',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-bahn']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-bahn-target-twh'], context['e100-bahn']);
  },
};
