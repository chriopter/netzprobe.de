import type { HourlyInput } from '../../src/types/data';
import type { CoreModel, CoreModelInput } from '../../src/simulation/coreModel';
import { demandGW } from '../../src/simulation/demand';
import type { DemandScenarioContext } from '../../src/simulation/demandModule';
import type { BalanceResult, HistoricalGeneration, SimHour, SimulationResult } from '../../src/simulation/types';

type StorageState = {
  batteryGWh: number;
  h2GWh: number;
};

function initialStorageState(): StorageState {
  return {
    batteryGWh: 0,
    h2GWh: 0,
  };
}

function historicalGenerationGW(row: HourlyInput): HistoricalGeneration {
  const solarGW = row.observed.pvMW / 1000;
  const windOnGW = row.observed.windOnMW / 1000;
  const windOffGW = row.observed.windOffMW / 1000;
  const biomassGW = (row.observed.biomassMW ?? 0) / 1000;
  const hydroGW = (row.observed.hydroMW ?? 0) / 1000;
  const wasteGW = (row.observed.wasteMW ?? 0) / 1000;
  const oilGW = (row.observed.oilMW ?? 0) / 1000;
  const geothermalGW = (row.observed.geothermalMW ?? 0) / 1000;
  const otherGW = (row.observed.otherMW ?? 0) / 1000;
  const coalGW = row.observed.coalMW / 1000;
  const gasGW = row.observed.gasMW / 1000;
  const nuclearGW = 0;
  const supplyGW = solarGW + windOnGW + windOffGW + biomassGW + hydroGW + wasteGW + oilGW + geothermalGW + otherGW + coalGW + gasGW + nuclearGW;
  const historicalImportGW = Math.max(0, row.observed.importExportMW / 1000);
  const historicalExportGW = Math.max(0, -row.observed.importExportMW / 1000);
  const dataBoundaryResidualGW = row.loadMW / 1000 + historicalExportGW - supplyGW - historicalImportGW;

  return { solarGW, windOnGW, windOffGW, biomassGW, hydroGW, wasteGW, oilGW, geothermalGW, otherGW, coalGW, gasGW, nuclearGW, historicalImportGW, historicalExportGW, dataBoundaryResidualGW, supplyGW };
}

function balanceHour(supplyGW: number, loadGW: number, storage: StorageState, historicalImportGW: number, historicalExportGW: number, dataBoundaryResidualGW: number): BalanceResult {
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

export function runKernmodell(input: CoreModelInput): SimulationResult {
  let storage = initialStorageState();
  const hours: SimHour[] = [];
  const demandContext: DemandScenarioContext = {
    'e100-pkw': input['e100-pkw'],
    'e100-heiz': input['e100-heiz'],
    'e100-lkw': input['e100-lkw'],
    'e100-bahn': input['e100-bahn'],
    'e100-schiff': input['e100-schiff'],
    'e100-flug': input['e100-flug'],
    'e100-ghd': input['e100-ghd'],
    'e100-industrie-waerme': input['e100-industrie-waerme'],
    'e100-stahl': input['e100-stahl'],
    'e100-chemie': input['e100-chemie'],
  };

  for (const row of input.hours) {
    const loadGW = demandGW(row, input.scenario, demandContext);
    const generation = historicalGenerationGW(row);
    const balance = balanceHour(generation.supplyGW, loadGW, storage, generation.historicalImportGW, generation.historicalExportGW, generation.dataBoundaryResidualGW);
    storage = { batteryGWh: balance.batteryGWh, h2GWh: balance.h2GWh };

    hours.push({
      time: row.time,
      loadGW,
      ...generation,
      ...balance,
    });
  }

  const sum = (fn: (h: SimHour) => number) => hours.reduce((total, hour) => total + fn(hour), 0) / 1000;
  const demandTWh = sum(hour => hour.loadGW);
  const renewableTWh = sum(hour => hour.solarGW + hour.windOnGW + hour.windOffGW + hour.biomassGW + hour.hydroGW + hour.geothermalGW);
  const loadSheddingTWh = sum(hour => hour.loadSheddingGW);
  const renewableSharePct = demandTWh > 0 ? 100 * renewableTWh / demandTWh : 0;

  return {
    hours,
    summary: {
      totalDemandTWh: demandTWh,
      renewableSharePct,
      curtailmentTWh: sum(hour => hour.curtailmentGW),
      importTWh: sum(hour => hour.importGW),
      exportTWh: sum(hour => hour.exportGW),
      loadSheddingTWh,
      securityStatus: loadSheddingTWh > 1 ? 'kritisch' : loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil',
    },
  };
}

export const kernmodellCoreModel: CoreModel = {
  id: 'kernmodell',
  run: runKernmodell,
};
