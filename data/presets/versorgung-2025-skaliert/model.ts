import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../../../src/types/data';
import type { Scenario } from '../../../src/types/scenario';

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

const SCALING_BASELINE_DEMAND_TWH = 466;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = clamp(value, min, max);
  if (step <= 0) return clamped;
  const stepped = Math.round((clamped - min) / step) * step + min;
  return clamp(stepped, min, max);
}

export function compute(
  demandTWh: number,
  _factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  const factor = demandTWh / SCALING_BASELINE_DEMAND_TWH;
  const s = (source: { defaultInstalledGW: number; minInstalledGW: number; maxInstalledGW: number; stepGW: number }) =>
    snap(source.defaultInstalledGW * factor, source.minInstalledGW, source.maxInstalledGW, source.stepGW);

  return {
    generation: {
      pvInstalledGW: s(erz.sources.pv),
      windOnInstalledGW: s(erz.sources.windOn),
      windOffInstalledGW: s(erz.sources.windOff),
      kernkraftInstalledGW: s(erz.sources.kernkraft),
      biomasseInstalledGW: s(erz.sources.biomasse),
      laufwasserInstalledGW: s(erz.sources.laufwasser),
      gasInstalledGW: s(erz.sources.gas),
      kohleInstalledGW: s(erz.sources.kohle),
      pvCapacityFactorMultiplier: 1.0,
      windOnCapacityFactorMultiplier: 1.0,
      windOffCapacityFactorMultiplier: 1.8,
    },
    storage: {
      batteriePowerGW: snap(speicher.storages.batterie.defaultPowerGW * factor, speicher.storages.batterie.minPowerGW, speicher.storages.batterie.maxPowerGW, speicher.storages.batterie.stepPowerGW),
      batterieEnergyGWh: snap(speicher.storages.batterie.defaultEnergyGWh * factor, speicher.storages.batterie.minEnergyGWh, speicher.storages.batterie.maxEnergyGWh, speicher.storages.batterie.stepEnergyGWh),
      pumpspeicherPowerGW: snap(speicher.storages.pumpspeicher.defaultPowerGW * factor, speicher.storages.pumpspeicher.minPowerGW, speicher.storages.pumpspeicher.maxPowerGW, speicher.storages.pumpspeicher.stepPowerGW),
      pumpspeicherEnergyGWh: snap(speicher.storages.pumpspeicher.defaultEnergyGWh * factor, speicher.storages.pumpspeicher.minEnergyGWh, speicher.storages.pumpspeicher.maxEnergyGWh, speicher.storages.pumpspeicher.stepEnergyGWh),
      h2ChargePowerGW: snap(speicher.storages.h2.defaultChargePowerGW * factor, speicher.storages.h2.minChargePowerGW, speicher.storages.h2.maxChargePowerGW, speicher.storages.h2.stepChargePowerGW),
      h2DischargePowerGW: snap(speicher.storages.h2.defaultDischargePowerGW * factor, speicher.storages.h2.minDischargePowerGW, speicher.storages.h2.maxDischargePowerGW, speicher.storages.h2.stepDischargePowerGW),
      h2EnergyGWh: snap(speicher.storages.h2.defaultEnergyGWh * factor, speicher.storages.h2.minEnergyGWh, speicher.storages.h2.maxEnergyGWh, speicher.storages.h2.stepEnergyGWh),
    },
    import: {
      stromGW: snap(aussenhandel.strom.import.defaultMaxGW * factor, aussenhandel.strom.import.minGW, aussenhandel.strom.import.maxGW, aussenhandel.strom.import.stepGW),
      stromEmissionGperKWh: aussenhandel.strom.import.emissionGperKWh,
      h2TWh: aussenhandel.h2.import.defaultTWh,
    },
    export: {
      stromGW: snap(aussenhandel.strom.export.defaultMaxGW * factor, aussenhandel.strom.export.minGW, aussenhandel.strom.export.maxGW, aussenhandel.strom.export.stepGW),
    },
  };
}
