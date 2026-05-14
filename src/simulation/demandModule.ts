import type { E100PkwData, E100HeizData, HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';

export type DemandScenarioContext = {
  'e100-pkw': E100PkwData;
  'e100-heiz': E100HeizData;
};

export type DemandScenarioModule = {
  id: string;
  loadGW: (row: HourlyInput, scenario: Scenario, context: DemandScenarioContext) => number;
};
