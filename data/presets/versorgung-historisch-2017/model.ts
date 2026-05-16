import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../../../src/types/data';
import type { Scenario } from '../../../src/types/scenario';

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

// Historischer Pass-Through 2017: das Kernmodell switcht die stündlichen Beobachtungs-Daten
// auf erzeugung-2017 + last-2017 anhand des supplyPreset. Der Pool wird nicht direkt konsumiert,
// die Slider-Werte sind für die UI-Anzeige gesetzt — installierter Bestand Ende 2017.
const INSTALLED_2017 = {
  pv: 42.4, windOn: 50.2, windOff: 5.4, kernkraft: 10.8,
  biomasse: 7.6, laufwasser: 4.8,
  gas: 30, kohle: 46,
};

export function compute(
  _demandTWh: number,
  _factors: FactorHour[],
  _erz: ErzeugungsPool,
  _speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  return {
    generation: {
      pvInstalledGW: INSTALLED_2017.pv,
      windOnInstalledGW: INSTALLED_2017.windOn,
      windOffInstalledGW: INSTALLED_2017.windOff,
      kernkraftInstalledGW: INSTALLED_2017.kernkraft,
      biomasseInstalledGW: INSTALLED_2017.biomasse,
      laufwasserInstalledGW: INSTALLED_2017.laufwasser,
      gasInstalledGW: INSTALLED_2017.gas,
      kohleInstalledGW: INSTALLED_2017.kohle,
      pvCapacityFactorMultiplier: 1.0,
      windOnCapacityFactorMultiplier: 1.0,
      windOffCapacityFactorMultiplier: 1.8,
    },
    storage: {
      batteriePowerGW: 0,
      batterieEnergyGWh: 0,
      pumpspeicherPowerGW: 9.4,
      pumpspeicherEnergyGWh: 40,
      h2ChargePowerGW: 0,
      h2DischargePowerGW: 0,
      h2EnergyGWh: 0,
    },
    import: {
      stromGW: 14,
      stromEmissionGperKWh: aussenhandel.strom.import.emissionGperKWh,
      h2TWh: 0,
    },
    export: {
      stromGW: 30,
    },
  };
}
