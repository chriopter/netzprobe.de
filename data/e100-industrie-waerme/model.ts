import type { E100IndustrieWaermeData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandModule';

export function additionalHeatTWh(targetHeatTWh: number, model: E100IndustrieWaermeData) {
  return Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh);
}

export function additionalElectricityTWh(targetHeatTWh: number, model: E100IndustrieWaermeData) {
  return additionalHeatTWh(targetHeatTWh, model) * model.electricityPerHeat;
}

export function hourlyLoadGW(row: HourlyInput, targetHeatTWh: number, model: E100IndustrieWaermeData) {
  const annualElectricityTWh = additionalElectricityTWh(targetHeatTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualElectricityTWh * 1000 * hourMultiplier / 8760;
}

export const e100IndustrieWaermeDemandModule: DemandScenarioModule = {
  id: 'e100-industrie-waerme',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-industrie-waerme']) return 0;
    return hourlyLoadGW(
      row,
      scenario.demand['e100-industrie-waerme-target-heat-twh'],
      context['e100-industrie-waerme'],
    );
  },
};
