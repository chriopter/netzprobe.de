import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../../../src/types/data';
import type { Scenario } from '../../../src/types/scenario';

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

export function compute(
  _demandTWh: number,
  _factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  return {
    generation: {
      pvInstalledGW: erz.sources.pv.defaultInstalledGW,
      windOnInstalledGW: erz.sources.windOn.defaultInstalledGW,
      windOffInstalledGW: erz.sources.windOff.defaultInstalledGW,
      kernkraftInstalledGW: erz.sources.kernkraft.defaultInstalledGW,
      biomasseInstalledGW: erz.sources.biomasse.defaultInstalledGW,
      laufwasserInstalledGW: erz.sources.laufwasser.defaultInstalledGW,
      gasInstalledGW: erz.sources.gas.defaultInstalledGW,
      kohleInstalledGW: erz.sources.kohle.defaultInstalledGW,
      // CF-Multipliers: 1.0 = heutige Flottenrealität, Offshore-Default 1.8
      // korrigiert den gemittelten einspeisefaktoren-2025-windFactor auf reale
      // Offshore-VLH (siehe data/kern/model.ts:96-113).
      pvCapacityFactorMultiplier: 1.0,
      windOnCapacityFactorMultiplier: 1.0,
      windOffCapacityFactorMultiplier: 1.8,
    },
    storage: {
      batteriePowerGW: speicher.storages.batterie.defaultPowerGW,
      batterieEnergyGWh: speicher.storages.batterie.defaultEnergyGWh,
      pumpspeicherPowerGW: speicher.storages.pumpspeicher.defaultPowerGW,
      pumpspeicherEnergyGWh: speicher.storages.pumpspeicher.defaultEnergyGWh,
      h2ChargePowerGW: speicher.storages.h2.defaultChargePowerGW,
      h2DischargePowerGW: speicher.storages.h2.defaultDischargePowerGW,
      h2EnergyGWh: speicher.storages.h2.defaultEnergyGWh,
    },
    import: {
      stromGW: aussenhandel.strom.import.defaultMaxGW,
      stromEmissionGperKWh: aussenhandel.strom.import.emissionGperKWh,
      h2TWh: aussenhandel.h2.import.defaultTWh,
    },
    export: {
      stromGW: aussenhandel.strom.export.defaultMaxGW,
    },
  };
}
