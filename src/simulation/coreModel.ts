import type {
  E100PkwData, E100HeizData, E100LkwData, E100BahnData, E100SchiffData,
  E100FlugData, E100GhdData, E100IndustrieWaermeData, E100StahlData, E100ChemieData,
  HourlyInput,
} from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from './types';

export type CoreModelInput = {
  hours: HourlyInput[];
  scenario: Scenario;
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
};

export type CoreModel = {
  id: string;
  run: (input: CoreModelInput) => SimulationResult;
};
