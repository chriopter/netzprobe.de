import type { E100PkwData, E100HeizData, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from './types';

export type CoreModelInput = {
  hours: HourlyInput[];
  scenario: Scenario;
  'e100-pkw': E100PkwData;
  'e100-heiz': E100HeizData;
};

export type CoreModel = {
  id: string;
  run: (input: CoreModelInput) => SimulationResult;
};
