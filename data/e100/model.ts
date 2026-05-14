import type { DemandScenarioModule } from '../../src/simulation/demandModule';
import { e100HeatDemandModule } from '../e100-heiz/model';
import { e100PkwDemandModule } from '../e100-pkw/model';

export const e100DemandModules = [
  e100PkwDemandModule,
  e100HeatDemandModule,
] satisfies DemandScenarioModule[];
