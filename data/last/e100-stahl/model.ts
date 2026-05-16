import type { E100StahlData, HourlyInput } from '../../../src/types/data';
import type { DemandScenarioModule } from '../../../src/simulation/demandContext';

export function additionalTWh(targetMioTon: number, model: E100StahlData) {
  // Strombedarf der Vollelektrifizierung mit DRI + EAF:
  //   grossTWh = Ziel-Produktion × mwhPerTon (52 kWh/kg H2 × 60 kg H2/t + 0,6 MWh/t EAF = 3,72 MWh/t)
  // Abzug der heute bereits elektrisch gedeckten Sekundärroute (~4,9 TWh AGEB
  // 2023). Ohne diesen Abzug würde der bestehende Elektrostahlwerks-Bestand
  // doppelt gezählt: einmal als Teil von `last-2025` und ein zweites Mal hier.
  const grossTWh = Math.max(0, targetMioTon) * model.mwhPerTon;
  return Math.max(0, grossTWh - (model.alreadyElectricTWh ?? 0));
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
