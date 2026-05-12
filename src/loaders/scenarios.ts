import type { DemandScenario, Scenario, ScenarioPresets, SupplyScenario } from '../types/scenario';
import { loadJson } from './defaultData';

type ScenarioFile<T> = { items: T[] };

export function composeScenario(demand: DemandScenario, supply: SupplyScenario): Scenario {
  return {
    id: 'demo-fakewerte',
    name: 'Demo-Fakewerte',
    description: 'Offensichtliches Demoszenario mit runden Platzhalterwerten.',
    demand: structuredClone(demand.values),
    ...structuredClone(supply.values),
  };
}

export async function loadScenarioPresets(): Promise<ScenarioPresets> {
  const [demand, supply] = await Promise.all([
    loadJson<ScenarioFile<DemandScenario>>('/data/szenarien_nachfrage.json'),
    loadJson<ScenarioFile<SupplyScenario>>('/data/szenarien_netz-erzeugung.json'),
  ]);
  return { demand: demand.items, supply: supply.items };
}
