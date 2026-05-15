import type { ErzeugungsPool, ModelFactorHour, SpeicherPool } from '../../../src/types/data';
import type { Scenario } from '../../../src/types/scenario';

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
};

const EE_PV_SHARE = 0.30;
const EE_WIND_ON_SHARE = 0.45;
const EE_WIND_OFF_SHARE = 0.15;
// Cushion 1.4 deckt H₂-Roundtrip (η=0.24) für den Saisonal-Anteil; Curtail-Buffer + Direkt-RE-Anteil.
// 1.5 produzierte bei niedrigem Demand zu viel Curtailment (validierungs-Agent B); 1.4 ist Sweet-Spot.
const EE_CUSHION = 1.4;
// Speicher skalieren mit Jahres-Demand. Faustregeln: Batterie für tägliches Smoothing (~5 h Speicher bei 10 % Spitzenanteil),
// H₂ für saisonal (~2 Wochen Dunkelflaute auf Peak-Last). Werte an Fraunhofer ISE „Wege..."-Benchmark gefittet.
const EE_BATTERY_POWER_PER_TWH = 0.1;       // 47 GW @ 466 TWh, 120 GW @ 1211 TWh
const EE_BATTERY_ENERGY_PER_TWH = 0.5;      // 233 GWh @ 466 TWh, 605 GWh @ 1211 TWh
const EE_H2_CHARGE_PER_TWH = 0.06;          // 28 GW @ 466 TWh, 73 GW @ 1211 TWh
const EE_H2_DISCHARGE_PER_TWH = 0.12;       // 56 GW @ 466 TWh, 145 GW @ 1211 TWh
// Saisonal-H₂-Speicher: Fraunhofer ISE-Benchmark ~130 TWh @ ~750 TWh Last = 0.17. 0.15 als robuster Mittelwert.
const EE_H2_ENERGY_FRACTION_OF_DEMAND = 0.15;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = clamp(value, min, max);
  if (step <= 0) return clamped;
  const stepped = Math.round((clamped - min) / step) * step + min;
  return clamp(stepped, min, max);
}

function annualYieldTWhPerGW(factors: FactorHour[], field: 'solarIrradiance' | 'wind100m'): number {
  const sum = factors.reduce((acc, hour) => acc + (hour[field][0] ?? 0), 0);
  return sum / 1000;
}

export function compute(
  demandTWh: number,
  factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
): SupplyOverride {
  const yieldPV = Math.max(annualYieldTWhPerGW(factors, 'solarIrradiance'), 0.1);
  const yieldWind = Math.max(annualYieldTWhPerGW(factors, 'wind100m'), 0.1);

  const baselineBioTWh = erz.sources.biomasse.defaultInstalledGW * 8.76;
  const baselineHydroTWh = erz.sources.laufwasser.defaultInstalledGW * 8.76;
  const target = Math.max(0, demandTWh * EE_CUSHION - baselineBioTWh - baselineHydroTWh);

  const totalShare = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
  const pvGW = (target * EE_PV_SHARE / totalShare) / yieldPV;
  const windOnGW = (target * EE_WIND_ON_SHARE / totalShare) / yieldWind;
  const windOffGW = (target * EE_WIND_OFF_SHARE / totalShare) / yieldWind;

  return {
    generation: {
      pvInstalledGW: snap(pvGW, erz.sources.pv.minInstalledGW, erz.sources.pv.maxInstalledGW, erz.sources.pv.stepGW),
      windOnInstalledGW: snap(windOnGW, erz.sources.windOn.minInstalledGW, erz.sources.windOn.maxInstalledGW, erz.sources.windOn.stepGW),
      windOffInstalledGW: snap(windOffGW, erz.sources.windOff.minInstalledGW, erz.sources.windOff.maxInstalledGW, erz.sources.windOff.stepGW),
      kernkraftInstalledGW: 0,
      biomasseInstalledGW: erz.sources.biomasse.defaultInstalledGW,
      laufwasserInstalledGW: erz.sources.laufwasser.defaultInstalledGW,
      gasInstalledGW: 0,
      kohleInstalledGW: 0,
      importMaxGW: 0,
      exportMaxGW: erz.export.defaultMaxGW,
      importEmissionGperKWh: erz.import.emissionGperKWh,
    },
    storage: {
      batteriePowerGW: snap(demandTWh * EE_BATTERY_POWER_PER_TWH, speicher.storages.batterie.minPowerGW, speicher.storages.batterie.maxPowerGW, speicher.storages.batterie.stepPowerGW),
      batterieEnergyGWh: snap(demandTWh * EE_BATTERY_ENERGY_PER_TWH, speicher.storages.batterie.minEnergyGWh, speicher.storages.batterie.maxEnergyGWh, speicher.storages.batterie.stepEnergyGWh),
      pumpspeicherPowerGW: speicher.storages.pumpspeicher.defaultPowerGW,
      pumpspeicherEnergyGWh: speicher.storages.pumpspeicher.defaultEnergyGWh,
      h2ChargePowerGW: snap(demandTWh * EE_H2_CHARGE_PER_TWH, speicher.storages.h2.minChargePowerGW, speicher.storages.h2.maxChargePowerGW, speicher.storages.h2.stepChargePowerGW),
      h2DischargePowerGW: snap(demandTWh * EE_H2_DISCHARGE_PER_TWH, speicher.storages.h2.minDischargePowerGW, speicher.storages.h2.maxDischargePowerGW, speicher.storages.h2.stepDischargePowerGW),
      h2EnergyGWh: snap(demandTWh * EE_H2_ENERGY_FRACTION_OF_DEMAND * 1000, speicher.storages.h2.minEnergyGWh, speicher.storages.h2.maxEnergyGWh, speicher.storages.h2.stepEnergyGWh),
    },
  };
}
