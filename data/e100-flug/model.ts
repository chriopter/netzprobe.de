import type { E100FlugData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandModule';

export function additionalTWh(targetTWh: number, model: E100FlugData) {
  return Math.max(0, targetTWh - model.alreadyElectricTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTWh: number, model: E100FlugData) {
  const annualTWh = additionalTWh(targetTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const e100FlugDemandModule: DemandScenarioModule = {
  id: 'e100-flug',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-flug']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-flug-target-twh'], context['e100-flug']);
  },
};
