import type { E100StahlData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandModule';

export function additionalTWh(targetMioTon: number, model: E100StahlData) {
  return Math.max(0, targetMioTon) * model.mwhPerTon;
}

export function hourlyLoadGW(row: HourlyInput, targetMioTon: number, model: E100StahlData) {
  const annualTWh = additionalTWh(targetMioTon, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const e100StahlDemandModule: DemandScenarioModule = {
  id: 'e100-stahl',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-stahl']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-stahl-target-mio-ton'], context['e100-stahl']);
  },
};
