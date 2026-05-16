import type { ErzeugungsPool, ModelFactorHour, SpeicherPool } from '../../../src/types/data';
import type { Scenario } from '../../../src/types/scenario';

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
};

export function compute(
  _demandTWh: number,
  _factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
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
      importMaxGW: erz.import.defaultMaxGW,
      exportMaxGW: erz.export.defaultMaxGW,
      importEmissionGperKWh: erz.import.emissionGperKWh,
      // CF-Multipliers: 1.0 = heutige Flottenrealität, Offshore-Default 1.8
      // korrigiert den gemittelten einspeisefaktoren-2025-windFactor auf reale
      // Offshore-VLH (siehe data/kernmodell/model.ts:96-113).
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
  };
}
