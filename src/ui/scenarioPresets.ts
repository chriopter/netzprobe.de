import type { Scenario } from '../types/scenario';

export const defaultScenario: Scenario = {
  id: 'historisch-2025',
  name: 'Historisch 2025',
  description: 'Historische Energy-Charts-Daten 2025 mit festen Modellannahmen.',
  demand: {
    'last-2025': true,
    'e100-pkw': false, 'e100-pkw-million-km': 472_200,
    'e100-heiz': false, 'e100-heiz-target-heat-twh': 530,
    'e100-lkw': false, 'e100-lkw-target-bn-km': 93,
    'e100-bahn': false, 'e100-bahn-target-twh': 10,
    'e100-schiff': false, 'e100-schiff-target-twh': 80,
    'e100-flug': false, 'e100-flug-target-twh': 300,
    'e100-ghd': false, 'e100-ghd-target-heat-twh': 138,
    'e100-industrie-waerme': false, 'e100-industrie-waerme-target-heat-twh': 220,
    'e100-stahl': false, 'e100-stahl-target-mio-ton': 28,
    'e100-chemie': false, 'e100-chemie-target-twh': 685,
  },
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
      'e100-lkw': demand['e100-lkw'] ?? false,
      'e100-lkw-target-bn-km': demand['e100-lkw-target-bn-km'] ?? 93,
      'e100-bahn': demand['e100-bahn'] ?? false,
      'e100-bahn-target-twh': demand['e100-bahn-target-twh'] ?? 10,
      'e100-schiff': demand['e100-schiff'] ?? false,
      'e100-schiff-target-twh': demand['e100-schiff-target-twh'] ?? 80,
      'e100-flug': demand['e100-flug'] ?? false,
      'e100-flug-target-twh': demand['e100-flug-target-twh'] ?? 300,
      'e100-ghd': demand['e100-ghd'] ?? false,
      'e100-ghd-target-heat-twh': demand['e100-ghd-target-heat-twh'] ?? 138,
      'e100-industrie-waerme': demand['e100-industrie-waerme'] ?? false,
      'e100-industrie-waerme-target-heat-twh': demand['e100-industrie-waerme-target-heat-twh'] ?? 220,
      'e100-stahl': demand['e100-stahl'] ?? false,
      'e100-stahl-target-mio-ton': demand['e100-stahl-target-mio-ton'] ?? 28,
      'e100-chemie': demand['e100-chemie'] ?? false,
      'e100-chemie-target-twh': demand['e100-chemie-target-twh'] ?? 440,
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
