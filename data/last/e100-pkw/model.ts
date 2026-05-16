import type { E100PkwData, HourlyInput } from '../../../src/types/data';
import type { DemandScenarioModule } from '../../../src/simulation/demandContext';

export function additionalMillionKm(targetMillionKm: number, model: E100PkwData) {
  return Math.max(0, targetMillionKm - model.alreadyElectricMillionKm);
}

export function additionalTWh(targetMillionKm: number, model: E100PkwData) {
  return additionalMillionKm(targetMillionKm, model) * model.kwhPer100Km / 100_000;
}

export function hourlyLoadGW(row: HourlyInput, targetMillionKm: number, model: E100PkwData) {
  const annualTWh = additionalTWh(targetMillionKm, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const e100PkwDemandModule: DemandScenarioModule = {
  id: 'e100-pkw',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-pkw']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-pkw-million-km'], context['e100-pkw']);
  },
};
