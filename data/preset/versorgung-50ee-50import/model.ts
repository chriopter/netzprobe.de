import type { ErzeugungsPool, ModelFactorHour, SpeicherPool } from '../../../src/types/data';
import type { Scenario } from '../../../src/types/scenario';
import { compute as compute100Ee } from '../versorgung-100ee-noimport/model';

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
};

const H2_IMPORT_EMISSION_G_PER_KWH = 100;

export function compute(
  demandTWh: number,
  factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
): SupplyOverride {
  // Halbierte Last → die 100ee-Logik dimensioniert RE auf die Hälfte; Rest wird via H₂-Import gedeckt.
  const base = compute100Ee(demandTWh / 2, factors, erz, speicher);
  return {
    generation: {
      ...base.generation,
      importMaxGW: erz.import.maxGW,
      exportMaxGW: erz.export.defaultMaxGW,
      importEmissionGperKWh: H2_IMPORT_EMISSION_G_PER_KWH,
    },
    storage: base.storage,
  };
}
