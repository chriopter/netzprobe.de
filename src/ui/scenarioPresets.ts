import type { Scenario } from '../types/scenario';

export const defaultScenario: Scenario = {
  id: 'historisch-2025',
  name: 'Historisch 2025',
  description: 'Historische Energy-Charts-Daten 2025 mit festen Modellannahmen.',
  demand: { historicalLoad: true, bevPkwKm: false, bevPkwMillionKm: 472_200 },
  renewables: { pvGW: 100.5, windOnGW: 65.5, windOffGW: 9.5 },
  fossil: { coalGW: 35, gasGW: 36, nuclearGW: 0 },
  storage: { batteryPowerGW: 15, batteryEnergyGWh: 22, h2PowerGW: 0, h2EnergyGWh: 0, importLimitGW: 16 },
};

export function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    demand: {
      historicalLoad: true,
      bevPkwKm: scenario.demand.bevPkwKm ?? false,
      bevPkwMillionKm: scenario.demand.bevPkwMillionKm ?? 472_200,
    },
  };
}

export function scenarioFromUrl(): Scenario | null {
  try {
    const raw = new URL(window.location.href).searchParams.get('s');
    return raw ? JSON.parse(decodeURIComponent(escape(atob(raw)))) : null;
  } catch {
    return null;
  }
}
