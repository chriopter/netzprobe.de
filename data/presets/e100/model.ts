import type { DemandScenarioModule } from '../../../src/simulation/demandContext';
import { e100PkwDemandModule } from '../../last/e100-pkw/model';
import { e100HeatDemandModule } from '../../last/e100-heiz/model';
import { e100LkwDemandModule } from '../../last/e100-lkw/model';
import { e100BahnDemandModule } from '../../last/e100-bahn/model';
import { e100SchiffDemandModule } from '../../last/e100-schiff/model';
import { e100FlugDemandModule } from '../../last/e100-flug/model';
import { e100GhdDemandModule } from '../../last/e100-ghd/model';
import { e100IndustrieWaermeDemandModule } from '../../last/e100-industrie-waerme/model';
import { e100StahlDemandModule } from '../../last/e100-stahl/model';
import { e100ChemieDemandModule } from '../../last/e100-chemie/model';

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
