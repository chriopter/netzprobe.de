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
  // RE auf 50 % der Last auslegen. Mit Cushion 1.4 wäre direkter Faktor 0.5: 0.5 × 1.4 = 0.7 → zu viel RE.
  // Daher RE-Auslegung auf 1/3 der Last × 1.4 = 0.467 ≈ 50 %. Trifft tatsächlich 50/50-Mix.
  const base = compute100Ee(demandTWh / 3, factors, erz, speicher);
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
