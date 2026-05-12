export type ObservedPower = {
  pvMW: number;
  windOnMW: number;
  windOffMW: number;
  gasMW: number;
  coalMW: number;
  hydroMW?: number;
  biomassMW?: number;
  wasteMW?: number;
  oilMW?: number;
  geothermalMW?: number;
  otherMW?: number;
  importExportMW: number;
};

export type LoadHour = {
  time: string;
  loadMW: number;
};

export type GenerationHour = ObservedPower & {
  time: string;
};

export type ModelFactorHour = {
  time: string;
  solarIrradiance: number[];
  wind100m: number[];
};

export type HeatingDegreeDay = {
  date: string;
  heatingDegreeDay: number;
  weight: number;
};

export type BevPkwElectrificationLoad = {
  id: 'bev-pkw-electrification';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  referenceMillionKm: number;
  alreadyElectricMillionKm: number;
  defaultTargetMillionKm: number;
  maxTargetMillionKm: number;
  stepMillionKm: number;
  kwhPer100Km: number;
  distribution: 'flat';
  note: string;
};

export type HeatPumpElectrificationLoad = {
  id: 'heat-pump-electrification';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  referenceHeatDemandTWh: number;
  alreadyHeatPumpHeatTWh: number;
  defaultTargetHeatTWh: number;
  maxTargetHeatTWh: number;
  stepHeatTWh: number;
  seasonalCop: number;
  distribution: 'heating-degree-days';
  degreeDayProfileFile: string;
  note: string;
};

export type SplitDataFile<T> = {
  source: string;
  generatedAt?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  unit?: string;
  sumTWh?: number;
  sumImportTWh?: number;
  sumExportTWh?: number;
  sumSharesPct?: Record<string, number>;
  sumPartsTWh?: Record<string, number>;
  sumNote?: string;
  hours: T[];
};

export type HourlyInput = LoadHour & ModelFactorHour & {
  heatingDegreeDayWeight: number;
  observed: ObservedPower;
};

export type DataSet = {
  source: string;
  bevPkwElectrification: BevPkwElectrificationLoad;
  heatPumpElectrification: HeatPumpElectrificationLoad;
  loadSumTWh?: number;
  generationSumTWh?: number;
  importSumTWh?: number;
  generationSharesPct?: Record<string, number>;
  generationPartsTWh?: Record<string, number>;
  hours: HourlyInput[];
};
