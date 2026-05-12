export type ObservedPower = {
  pvMW: number;
  windOnMW: number;
  windOffMW: number;
  gasMW: number;
  coalMW: number;
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

export type SplitDataFile<T> = {
  source: string;
  generatedAt?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  unit?: string;
  hours: T[];
};

export type HourlyInput = LoadHour & ModelFactorHour & {
  observed: ObservedPower;
};

export type DataSet = {
  source: string;
  hours: HourlyInput[];
};
