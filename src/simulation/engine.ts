import type {
  E100PkwData, E100HeizData, E100LkwData, E100BahnData, E100SchiffData,
  E100FlugData, E100GhdData, E100IndustrieWaermeData, E100StahlData, E100ChemieData,
  ErzeugungsPool, SpeicherPool, AussenhandelPool,
  HourlyInput,
} from '../types/data';
import type { Scenario } from '../types/scenario';
import { kernmodellCoreModel } from '../../data/kern/model';
import type { CoreModel, CoreModelInput } from './coreModel';
import type { SimulationResult } from './types';

export type { SimHour, SimulationResult } from './types';
export type { CoreModel } from './coreModel';

export const coreModels = [
  kernmodellCoreModel,
] satisfies CoreModel[];

export const defaultCoreModel = kernmodellCoreModel;

export type SimulationContext = {
  'e100-pkw': E100PkwData;
  'e100-heiz': E100HeizData;
  'e100-lkw': E100LkwData;
  'e100-bahn': E100BahnData;
  'e100-schiff': E100SchiffData;
  'e100-flug': E100FlugData;
  'e100-ghd': E100GhdData;
  'e100-industrie-waerme': E100IndustrieWaermeData;
  'e100-stahl': E100StahlData;
  'e100-chemie': E100ChemieData;
  'erzeugungs-modell': ErzeugungsPool;
  'speicher-modell': SpeicherPool;
  'aussenhandel-modell': AussenhandelPool;
};

export function runSimulation(input: HourlyInput[], scenario: Scenario, context: SimulationContext): SimulationResult {
  const coreInput: CoreModelInput = { hours: input, scenario, ...context };
  return defaultCoreModel.run(coreInput);
}
