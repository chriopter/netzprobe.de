import type { Scenario } from '../types/scenario';

export const defaultScenario: Scenario = {
  id: 'historisch-2025',
  name: 'Historisch 2025',
  description: 'Historische Energy-Charts-Daten 2025 mit festen Modellannahmen.',
  demand: { historicalLoad: true, bev: false, heatPump: false, bevPct: 10, heatPumpPct: 10 },
  renewables: { pvGW: 100.5, windOnGW: 65.5, windOffGW: 9.5 },
  fossil: { coalGW: 35, gasGW: 36, nuclearGW: 0 },
  storage: { batteryPowerGW: 15, batteryEnergyGWh: 22, h2PowerGW: 0, h2EnergyGWh: 0, importLimitGW: 16 },
};

export function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    demand: {
      historicalLoad: true,
      bev: scenario.demand.bev ?? false,
      heatPump: scenario.demand.heatPump ?? false,
      bevPct: scenario.demand.bevPct ?? 10,
      heatPumpPct: scenario.demand.heatPumpPct ?? 10,
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
