import type { DemandScenarioModule } from '../../../src/simulation/demandModule';
import { e100PkwDemandModule } from '../../e100-pkw/model';
import { e100HeatDemandModule } from '../../e100-heiz/model';
import { e100LkwDemandModule } from '../../e100-lkw/model';
import { e100BahnDemandModule } from '../../e100-bahn/model';
import { e100SchiffDemandModule } from '../../e100-schiff/model';
import { e100FlugDemandModule } from '../../e100-flug/model';
import { e100GhdDemandModule } from '../../e100-ghd/model';
import { e100IndustrieWaermeDemandModule } from '../../e100-industrie-waerme/model';
import { e100StahlDemandModule } from '../../e100-stahl/model';
import { e100ChemieDemandModule } from '../../e100-chemie/model';

export const e100DemandModules = [
  e100PkwDemandModule,
  e100LkwDemandModule,
  e100BahnDemandModule,
  e100SchiffDemandModule,
  e100FlugDemandModule,
  e100HeatDemandModule,
  e100GhdDemandModule,
  e100IndustrieWaermeDemandModule,
  e100StahlDemandModule,
  e100ChemieDemandModule,
] satisfies DemandScenarioModule[];
