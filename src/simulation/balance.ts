import type { BalanceResult } from './types';

export type StorageState = {
  batteryGWh: number;
  h2GWh: number;
};

export function initialStorageState(): StorageState {
  return {
    batteryGWh: 0,
    h2GWh: 0,
  };
}

export function balanceHour(supplyGW: number, loadGW: number, storage: StorageState): BalanceResult {
  const mismatch = supplyGW - loadGW;
  const curtailmentGW = Math.max(0, mismatch);
  const loadSheddingGW = Math.max(0, -mismatch);

  return {
    importGW: 0,
    exportGW: 0,
    storageChargeGW: 0,
    storageDischargeGW: 0,
    curtailmentGW,
    loadSheddingGW,
    batteryGWh: storage.batteryGWh,
    h2GWh: storage.h2GWh,
    balanceGW: supplyGW + loadSheddingGW - loadGW - curtailmentGW,
  };
}
