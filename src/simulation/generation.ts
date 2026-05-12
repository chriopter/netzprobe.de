import type { HourlyInput } from '../types/data';
import type { HistoricalGeneration } from './types';

export function historicalGenerationGW(row: HourlyInput): HistoricalGeneration {
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

  return { solarGW, windOnGW, windOffGW, biomassGW, hydroGW, wasteGW, oilGW, geothermalGW, otherGW, coalGW, gasGW, nuclearGW, supplyGW };
}
