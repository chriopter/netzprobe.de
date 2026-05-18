import type { Scenario } from '../types/scenario';
import { supplyPresetIds } from './supplyPresets';
import { uiManifest } from './uiManifest';

export const defaultScenario: Scenario = {
  id: 'historical-2025',
  name: 'Historisch 2025',
  description: 'Historische Energy-Charts-Daten 2025 ohne additive Elektrifizierungsbausteine.',
  supplyPreset: 'historical-2025',
  loadYear: 2025,
  demand: {
    'last-2025': true,
    'e100-pkw': false, 'e100-pkw-million-km': uiManifest.e100.pkw.defaultTargetMillionKm,
    'e100-heiz': false, 'e100-heiz-target-heat-twh': uiManifest.e100.heiz.defaultTargetHeatTWh,
    'e100-lkw': false, 'e100-lkw-target-bn-km': uiManifest.e100.lkw.defaultTargetBnKm,
    'e100-bahn': false, 'e100-bahn-target-twh': uiManifest.e100.bahn.defaultTargetTWh,
    'e100-schiff': false, 'e100-schiff-target-twh': uiManifest.e100.schiff.defaultTargetTWh,
    'e100-flug': false, 'e100-flug-target-twh': uiManifest.e100.flug.defaultTargetTWh,
    'e100-ghd': false, 'e100-ghd-target-heat-twh': uiManifest.e100.ghd.defaultTargetHeatTWh,
    'e100-industrie-waerme': false, 'e100-industrie-waerme-target-heat-twh': uiManifest.e100['industrie-waerme'].defaultTargetHeatTWh,
    'e100-stahl': false, 'e100-stahl-target-mio-ton': uiManifest.e100.stahl.defaultTargetMioTon,
    'e100-chemie': false, 'e100-chemie-target-twh': uiManifest.e100.chemie.defaultTargetTotalTWh,
  },
  generation: {
    pvInstalledGW: uiManifest.generation.pv.defaultInstalledGW,
    windOnInstalledGW: uiManifest.generation.windon.defaultInstalledGW,
    windOffInstalledGW: uiManifest.generation.windoff.defaultInstalledGW,
    kernkraftInstalledGW: uiManifest.generation.kernkraft.defaultInstalledGW,
    biomasseInstalledGW: uiManifest.generation.biomasse.defaultInstalledGW,
    laufwasserInstalledGW: uiManifest.generation.laufwasser.defaultInstalledGW,
    gasInstalledGW: uiManifest.generation.gas.defaultInstalledGW,
    kohleInstalledGW: uiManifest.generation.kohle.defaultInstalledGW,
    pvCapacityFactorMultiplier: 1.0,
    windOnCapacityFactorMultiplier: 1.0,
    windOffCapacityFactorMultiplier: 1.8,
  },
  storage: {
    batteriePowerGW: uiManifest.storage.batterie.defaultPowerGW,
    batterieEnergyGWh: uiManifest.storage.batterie.defaultEnergyGWh,
    pumpspeicherPowerGW: uiManifest.storage.pumpspeicher.defaultPowerGW,
    pumpspeicherEnergyGWh: uiManifest.storage.pumpspeicher.defaultEnergyGWh,
    h2ChargePowerGW: uiManifest.storage.h2.defaultChargePowerGW,
    h2DischargePowerGW: uiManifest.storage.h2.defaultDischargePowerGW,
    h2EnergyGWh: uiManifest.storage.h2.defaultEnergyGWh,
  },
  import: {
    stromGW: uiManifest.trade.strom.import.defaultMaxGW,
    stromEmissionGperKWh: uiManifest.trade.strom.import.emissionGperKWh,
    h2TWh: uiManifest.trade.h2.import.defaultTWh,
  },
  export: {
    stromGW: uiManifest.trade.strom.export.defaultMaxGW,
  },
};

export function normalizeScenario(scenario: Scenario): Scenario {
  const demand = (scenario.demand ?? {}) as Partial<Scenario['demand']>;
  const generation = (scenario.generation ?? {}) as Partial<Scenario['generation']>;
  const storage = (scenario.storage ?? {}) as Partial<Scenario['storage']>;
  const imp = (scenario.import ?? {}) as Partial<Scenario['import']>;
  const exp = (scenario.export ?? {}) as Partial<Scenario['export']>;
  const rawPreset = (scenario.supplyPreset as string) === 'manual' ? 'custom' : scenario.supplyPreset;
  const supplyPreset = rawPreset === 'custom' || supplyPresetIds.includes(rawPreset as Exclude<Scenario['supplyPreset'], 'custom'>)
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
      'e100-pkw-million-km': demand['e100-pkw-million-km'] ?? defaultScenario.demand['e100-pkw-million-km'],
      'e100-heiz': demand['e100-heiz'] ?? false,
      'e100-heiz-target-heat-twh': demand['e100-heiz-target-heat-twh'] ?? defaultScenario.demand['e100-heiz-target-heat-twh'],
      'e100-lkw': demand['e100-lkw'] ?? false,
      'e100-lkw-target-bn-km': demand['e100-lkw-target-bn-km'] ?? defaultScenario.demand['e100-lkw-target-bn-km'],
      'e100-bahn': demand['e100-bahn'] ?? false,
      'e100-bahn-target-twh': demand['e100-bahn-target-twh'] ?? defaultScenario.demand['e100-bahn-target-twh'],
      'e100-schiff': demand['e100-schiff'] ?? false,
      'e100-schiff-target-twh': demand['e100-schiff-target-twh'] ?? defaultScenario.demand['e100-schiff-target-twh'],
      'e100-flug': demand['e100-flug'] ?? false,
      'e100-flug-target-twh': demand['e100-flug-target-twh'] ?? defaultScenario.demand['e100-flug-target-twh'],
      'e100-ghd': demand['e100-ghd'] ?? false,
      'e100-ghd-target-heat-twh': demand['e100-ghd-target-heat-twh'] ?? defaultScenario.demand['e100-ghd-target-heat-twh'],
      'e100-industrie-waerme': demand['e100-industrie-waerme'] ?? false,
      'e100-industrie-waerme-target-heat-twh': demand['e100-industrie-waerme-target-heat-twh'] ?? defaultScenario.demand['e100-industrie-waerme-target-heat-twh'],
      'e100-stahl': demand['e100-stahl'] ?? false,
      'e100-stahl-target-mio-ton': demand['e100-stahl-target-mio-ton'] ?? defaultScenario.demand['e100-stahl-target-mio-ton'],
      'e100-chemie': demand['e100-chemie'] ?? false,
      'e100-chemie-target-twh': demand['e100-chemie-target-twh'] ?? defaultScenario.demand['e100-chemie-target-twh'],
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
    import: {
      stromGW: imp.stromGW ?? defaultScenario.import.stromGW,
      stromEmissionGperKWh: imp.stromEmissionGperKWh ?? defaultScenario.import.stromEmissionGperKWh,
      h2TWh: imp.h2TWh ?? defaultScenario.import.h2TWh,
    },
    export: {
      stromGW: exp.stromGW ?? defaultScenario.export.stromGW,
    },
  };
}
