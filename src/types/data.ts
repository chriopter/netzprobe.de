export type ObservedPower = {
  pvMW: number;
  windOnMW: number;
  windOffMW: number;
  gasMW: number;
  coalMW: number;
  importExportMW: number;
};

export type HourlyInput = {
  time: string;
  loadMW: number;
  solarIrradiance: number[];
  wind100m: number[];
  observed: ObservedPower;
};

export type DataSet = {
  source: string;
  hours: HourlyInput[];
};
