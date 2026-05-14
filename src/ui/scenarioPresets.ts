import type { Scenario } from '../types/scenario';

export const defaultScenario: Scenario = {
  id: 'historisch-2025',
  name: 'Historisch 2025',
  description: 'Historische Energy-Charts-Daten 2025 mit festen Modellannahmen.',
  demand: { 'last-2025': true, 'e100-pkw': false, 'e100-pkw-million-km': 472_200, 'e100-heiz': false, 'e100-heiz-target-heat-twh': 530 },
  renewables: { pvGW: 100.5, windOnGW: 65.5, windOffGW: 9.5 },
  fossil: { coalGW: 35, gasGW: 36 },
  storage: { batteryPowerGW: 15, batteryEnergyGWh: 22, h2PowerGW: 0, h2EnergyGWh: 0, importLimitGW: 16 },
};

export function normalizeScenario(scenario: Scenario): Scenario {
  const demand = (scenario.demand ?? {}) as Partial<Scenario['demand']>;
  return {
    ...scenario,
    demand: {
      'last-2025': demand['last-2025'] ?? true,
      'e100-pkw': demand['e100-pkw'] ?? false,
      'e100-pkw-million-km': demand['e100-pkw-million-km'] ?? 472_200,
      'e100-heiz': demand['e100-heiz'] ?? false,
      'e100-heiz-target-heat-twh': demand['e100-heiz-target-heat-twh'] ?? 530,
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
