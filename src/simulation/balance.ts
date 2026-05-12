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

export function balanceHour(supplyGW: number, loadGW: number, storage: StorageState, historicalImportGW: number, historicalExportGW: number, dataBoundaryResidualGW: number): BalanceResult {
  const historicalCoverageGW = supplyGW + historicalImportGW + dataBoundaryResidualGW;
  const mismatch = historicalCoverageGW - loadGW - historicalExportGW;
  const curtailmentGW = Math.max(0, mismatch);
  const automaticImportGW = Math.max(0, -mismatch);
  const loadSheddingGW = 0;

  return {
    importGW: historicalImportGW + automaticImportGW,
    exportGW: historicalExportGW,
    storageChargeGW: 0,
    storageDischargeGW: 0,
    curtailmentGW,
    loadSheddingGW,
    batteryGWh: storage.batteryGWh,
    h2GWh: storage.h2GWh,
    balanceGW: historicalCoverageGW + automaticImportGW - loadGW - historicalExportGW - curtailmentGW,
  };
}
