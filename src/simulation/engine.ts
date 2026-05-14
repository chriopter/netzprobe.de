import type { E100PkwData, E100HeizData, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { kernmodellCoreModel } from '../../data/kernmodell/model';
import type { CoreModel } from './coreModel';
import type { SimulationResult } from './types';

export type { SimHour, SimulationResult } from './types';
export type { CoreModel } from './coreModel';

export const coreModels = [
  kernmodellCoreModel,
] satisfies CoreModel[];

export const defaultCoreModel = kernmodellCoreModel;

export function runSimulation(input: HourlyInput[], scenario: Scenario, e100Pkw: E100PkwData, e100Heiz: E100HeizData): SimulationResult {
  return defaultCoreModel.run({ hours: input, scenario, 'e100-pkw': e100Pkw, 'e100-heiz': e100Heiz });
}
