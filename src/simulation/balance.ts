import type { Scenario } from '../types/scenario';
import { BATTERY_ETA, H2_ETA } from './constants';
import type { BalanceResult } from './types';

export type StorageState = {
  batteryGWh: number;
  h2GWh: number;
};

export function initialStorageState(scenario: Scenario): StorageState {
  return {
    batteryGWh: scenario.storage.batteryEnergyGWh * 0.5,
    h2GWh: scenario.storage.h2EnergyGWh * 0.5,
  };
}

export function balanceHour(supplyGW: number, loadGW: number, storage: StorageState, scenario: Scenario): BalanceResult {
  let batteryGWh = storage.batteryGWh;
  let h2GWh = storage.h2GWh;
  let importGW = 0;
  let exportGW = 0;
  let storageChargeGW = 0;
  let storageDischargeGW = 0;
  let curtailmentGW = 0;
  let loadSheddingGW = 0;
  let mismatch = supplyGW - loadGW;

  if (mismatch > 0) {
    const battRoom = Math.max(0, (scenario.storage.batteryEnergyGWh - batteryGWh) / BATTERY_ETA);
    const battCharge = Math.min(mismatch, scenario.storage.batteryPowerGW, battRoom);
    storageChargeGW += battCharge;
    batteryGWh += battCharge * BATTERY_ETA;
    mismatch -= battCharge;

    const h2Room = Math.max(0, (scenario.storage.h2EnergyGWh - h2GWh) / H2_ETA);
    const h2Charge = Math.min(mismatch, scenario.storage.h2PowerGW, h2Room);
    storageChargeGW += h2Charge;
    h2GWh += h2Charge * H2_ETA;
    mismatch -= h2Charge;

    exportGW = Math.min(mismatch, scenario.storage.importLimitGW);
    mismatch -= exportGW;
    curtailmentGW = Math.max(0, mismatch);
  } else if (mismatch < 0) {
    let deficit = -mismatch;
    const battDischarge = Math.min(deficit, scenario.storage.batteryPowerGW, batteryGWh);
    storageDischargeGW += battDischarge;
    batteryGWh -= battDischarge;
    deficit -= battDischarge;

    const h2Discharge = Math.min(deficit, scenario.storage.h2PowerGW, h2GWh);
    storageDischargeGW += h2Discharge;
    h2GWh -= h2Discharge;
    deficit -= h2Discharge;

    importGW = Math.min(deficit, scenario.storage.importLimitGW);
    deficit -= importGW;
    loadSheddingGW = Math.max(0, deficit);
  }

  return {
    importGW,
    exportGW,
    storageChargeGW,
    storageDischargeGW,
    curtailmentGW,
    loadSheddingGW,
    batteryGWh,
    h2GWh,
    balanceGW: supplyGW + importGW + storageDischargeGW + loadSheddingGW - loadGW - exportGW - storageChargeGW - curtailmentGW,
  };
}
