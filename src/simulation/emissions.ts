import { EMISSIONS } from './constants';
import type { HistoricalGeneration } from './types';

export function co2Tonnes(generation: HistoricalGeneration) {
  const kilotonnes =
    generation.solarGW * EMISSIONS.solar +
    (generation.windOnGW + generation.windOffGW) * EMISSIONS.wind +
    generation.biomassGW * EMISSIONS.biomass +
    generation.hydroGW * EMISSIONS.hydro +
    generation.wasteGW * EMISSIONS.waste +
    generation.oilGW * EMISSIONS.oil +
    generation.geothermalGW * EMISSIONS.geothermal +
    generation.otherGW * EMISSIONS.other +
    generation.coalGW * EMISSIONS.coal +
    generation.gasGW * EMISSIONS.gas +
    generation.nuclearGW * EMISSIONS.nuclear;
  return kilotonnes * 1000;
}
