import type { Scenario } from '../types/scenario';
import erzPv from '../../data/erz-pv/data.json';
import erzWindOn from '../../data/erz-windon/data.json';
import erzWindOff from '../../data/erz-windoff/data.json';
import erzKernkraft from '../../data/erz-kernkraft/data.json';
import erzBiomasse from '../../data/erz-biomasse/data.json';
import erzLaufwasser from '../../data/erz-laufwasser/data.json';
import erzGas from '../../data/erz-gas/data.json';
import erzKohle from '../../data/erz-kohle/data.json';
import erzHandel from '../../data/erz-handel/data.json';
import speicherBatterie from '../../data/speicher-batterie/data.json';
import speicherPumpspeicher from '../../data/speicher-pumpspeicher/data.json';
import speicherH2 from '../../data/speicher-h2/data.json';

export const defaultScenario: Scenario = {
  id: 'historical-2025',
  name: 'Historisch 2025',
  description: 'Historische Energy-Charts-Daten 2025 ohne additive Elektrifizierungsbausteine.',
  supplyPreset: 'historical-2025',
  loadYear: 2025,
  demand: {
    'last-2025': true,
    'e100-pkw': false, 'e100-pkw-million-km': 472_200,
    'e100-heiz': false, 'e100-heiz-target-heat-twh': 530,
    'e100-lkw': false, 'e100-lkw-target-bn-km': 117,
    'e100-bahn': false, 'e100-bahn-target-twh': 10,
    'e100-schiff': false, 'e100-schiff-target-twh': 80,
    'e100-flug': false, 'e100-flug-target-twh': 300,
    'e100-ghd': false, 'e100-ghd-target-heat-twh': 163,
    'e100-industrie-waerme': false, 'e100-industrie-waerme-target-heat-twh': 220,
    'e100-stahl': false, 'e100-stahl-target-mio-ton': 28,
    'e100-chemie': false, 'e100-chemie-target-twh': 685,
    'h2-import-twh': 0,
  },
  generation: {
    pvInstalledGW: erzPv.defaultInstalledGW,
    windOnInstalledGW: erzWindOn.defaultInstalledGW,
    windOffInstalledGW: erzWindOff.defaultInstalledGW,
    kernkraftInstalledGW: erzKernkraft.defaultInstalledGW,
    biomasseInstalledGW: erzBiomasse.defaultInstalledGW,
    laufwasserInstalledGW: erzLaufwasser.defaultInstalledGW,
    gasInstalledGW: erzGas.defaultInstalledGW,
    kohleInstalledGW: erzKohle.defaultInstalledGW,
    importMaxGW: erzHandel.import.defaultMaxGW,
    exportMaxGW: erzHandel.export.defaultMaxGW,
    importEmissionGperKWh: erzHandel.import.emissionGperKWh,
    // Capacity-Factor-Multipliers — Default 1.0 für PV und Wind onshore
    // (heutige Flottenwerte aus einspeisefaktoren-2025). Offshore-Default 1.8
    // kompensiert dass der einspeisefaktoren-2025-windFactor aus gemittelten
    // 62 GW onshore + 9 GW offshore stammt — ohne Korrektur würde Offshore
    // dieselben ~1745 VLH wie Onshore zugeordnet bekommen statt realer 4000+
    // VLH (15 MW-Nordsee-Klasse). Siehe data/kernmodell/model.ts:96-113.
    pvCapacityFactorMultiplier: 1.0,
    windOnCapacityFactorMultiplier: 1.0,
    windOffCapacityFactorMultiplier: 1.8,
  },
  storage: {
    batteriePowerGW: speicherBatterie.defaultPowerGW,
    batterieEnergyGWh: speicherBatterie.defaultEnergyGWh,
    pumpspeicherPowerGW: speicherPumpspeicher.defaultPowerGW,
    pumpspeicherEnergyGWh: speicherPumpspeicher.defaultEnergyGWh,
    h2ChargePowerGW: speicherH2.defaultChargePowerGW,
    h2DischargePowerGW: speicherH2.defaultDischargePowerGW,
    h2EnergyGWh: speicherH2.defaultEnergyGWh,
  },
};

export function normalizeScenario(scenario: Scenario): Scenario {
  const demand = (scenario.demand ?? {}) as Partial<Scenario['demand']>;
  const generation = (scenario.generation ?? {}) as Partial<Scenario['generation']>;
  const storage = (scenario.storage ?? {}) as Partial<Scenario['storage']>;
  const validPresets: ReadonlyArray<Scenario['supplyPreset']> = ['custom', 'historical-2025', 'historical-2017', '100ee-noimport', '50ee-50import', '2025-skaliert'];
  // Migration: alte 'manual' Werte werden zu 'custom'.
  const rawPreset = (scenario.supplyPreset as string) === 'manual' ? 'custom' : scenario.supplyPreset;
  const supplyPreset = validPresets.includes(rawPreset as Scenario['supplyPreset'])
    ? (rawPreset as Scenario['supplyPreset'])
    : 'historical-2025';
  const loadYear: Scenario['loadYear'] = scenario.loadYear === 2017 ? 2017 : 2025;
  return {
    ...scenario,
    supplyPreset,
    loadYear,
    demand: {
      'last-2025': demand['last-2025'] ?? true,
      'e100-pkw': demand['e100-pkw'] ?? false,
      'e100-pkw-million-km': demand['e100-pkw-million-km'] ?? 472_200,
      'e100-heiz': demand['e100-heiz'] ?? false,
      'e100-heiz-target-heat-twh': demand['e100-heiz-target-heat-twh'] ?? 530,
      'e100-lkw': demand['e100-lkw'] ?? false,
      'e100-lkw-target-bn-km': demand['e100-lkw-target-bn-km'] ?? 117,
      'e100-bahn': demand['e100-bahn'] ?? false,
      'e100-bahn-target-twh': demand['e100-bahn-target-twh'] ?? 10,
      'e100-schiff': demand['e100-schiff'] ?? false,
      'e100-schiff-target-twh': demand['e100-schiff-target-twh'] ?? 80,
      'e100-flug': demand['e100-flug'] ?? false,
      'e100-flug-target-twh': demand['e100-flug-target-twh'] ?? 300,
      'e100-ghd': demand['e100-ghd'] ?? false,
      'e100-ghd-target-heat-twh': demand['e100-ghd-target-heat-twh'] ?? 163,
      'e100-industrie-waerme': demand['e100-industrie-waerme'] ?? false,
      'e100-industrie-waerme-target-heat-twh': demand['e100-industrie-waerme-target-heat-twh'] ?? 220,
      'e100-stahl': demand['e100-stahl'] ?? false,
      'e100-stahl-target-mio-ton': demand['e100-stahl-target-mio-ton'] ?? 28,
      'e100-chemie': demand['e100-chemie'] ?? false,
      'e100-chemie-target-twh': demand['e100-chemie-target-twh'] ?? 685,
      'h2-import-twh': demand['h2-import-twh'] ?? 0,
    },
    generation: {
      pvInstalledGW: generation.pvInstalledGW ?? defaultScenario.generation.pvInstalledGW,
      windOnInstalledGW: generation.windOnInstalledGW ?? defaultScenario.generation.windOnInstalledGW,
      windOffInstalledGW: generation.windOffInstalledGW ?? defaultScenario.generation.windOffInstalledGW,
      kernkraftInstalledGW: generation.kernkraftInstalledGW ?? defaultScenario.generation.kernkraftInstalledGW,
      biomasseInstalledGW: generation.biomasseInstalledGW ?? defaultScenario.generation.biomasseInstalledGW,
      laufwasserInstalledGW: generation.laufwasserInstalledGW ?? defaultScenario.generation.laufwasserInstalledGW,
      gasInstalledGW: generation.gasInstalledGW ?? defaultScenario.generation.gasInstalledGW,
      kohleInstalledGW: generation.kohleInstalledGW ?? defaultScenario.generation.kohleInstalledGW,
      importMaxGW: generation.importMaxGW ?? defaultScenario.generation.importMaxGW,
      exportMaxGW: generation.exportMaxGW ?? defaultScenario.generation.exportMaxGW,
      importEmissionGperKWh: generation.importEmissionGperKWh ?? defaultScenario.generation.importEmissionGperKWh,
      pvCapacityFactorMultiplier: generation.pvCapacityFactorMultiplier ?? defaultScenario.generation.pvCapacityFactorMultiplier,
      windOnCapacityFactorMultiplier: generation.windOnCapacityFactorMultiplier ?? defaultScenario.generation.windOnCapacityFactorMultiplier,
      windOffCapacityFactorMultiplier: generation.windOffCapacityFactorMultiplier ?? defaultScenario.generation.windOffCapacityFactorMultiplier,
    },
    storage: {
      batteriePowerGW: storage.batteriePowerGW ?? defaultScenario.storage.batteriePowerGW,
      batterieEnergyGWh: storage.batterieEnergyGWh ?? defaultScenario.storage.batterieEnergyGWh,
      pumpspeicherPowerGW: storage.pumpspeicherPowerGW ?? defaultScenario.storage.pumpspeicherPowerGW,
      pumpspeicherEnergyGWh: storage.pumpspeicherEnergyGWh ?? defaultScenario.storage.pumpspeicherEnergyGWh,
      h2ChargePowerGW: storage.h2ChargePowerGW ?? defaultScenario.storage.h2ChargePowerGW,
      h2DischargePowerGW: storage.h2DischargePowerGW ?? defaultScenario.storage.h2DischargePowerGW,
      h2EnergyGWh: storage.h2EnergyGWh ?? defaultScenario.storage.h2EnergyGWh,
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

export function scenarioToUrlParam(scenario: Scenario) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(scenario))));
}
