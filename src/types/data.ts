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
  meanTemperatureC?: number;
  heatingDegreeDay: number;
  weight: number;
};

export type DegreeDayProfile = {
  year: number;
  heatingLimitC: number;
  indoorReferenceC: number;
  monthlyMeanTemperatureC?: number[];
  interpolation?: string;
  temperatureSource?: string;
  dwdMonthlyMeanC?: number[];
  annualHeatingDegreeDays?: number;
  heatingDays?: number;
  sumNote?: string;
  days: HeatingDegreeDay[];
};

export type HourlyProfile = {
  source: string;
  sourceUrls?: string[];
  multipliers: number[];
};

export type E100PkwData = {
  id: 'e100-pkw';
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
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100HeizData = {
  id: 'e100-heiz';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  referenceHeatDemandTWh: number;
  alreadyElectricHeatTWh: number;
  defaultTargetHeatTWh: number;
  maxTargetHeatTWh: number;
  stepHeatTWh: number;
  seasonalCop: number;
  distribution: 'heating-degree-days';
  degreeDayProfile: DegreeDayProfile;
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100LkwData = {
  id: 'e100-lkw';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  referenceBnKm: number;
  alreadyElectricBnKm: number;
  defaultTargetBnKm: number;
  maxTargetBnKm: number;
  stepBnKm: number;
  kwhPerKm: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100BahnData = {
  id: 'e100-bahn';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  dieselSubstitutionTWh: number;
  modalShiftTWh: number;
  defaultTargetTWh: number;
  maxTargetTWh: number;
  stepTWh: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100SchiffData = {
  id: 'e100-schiff';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  directElectrificationTWh: number;
  eFuelSynthesisTWh: number;
  alreadyElectricTWh: number;
  defaultTargetTWh: number;
  maxTargetTWh: number;
  stepTWh: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100FlugData = {
  id: 'e100-flug';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  kerosineDemandMioT: number;
  kerosineEnergyTWh: number;
  ptlEfficiency: number;
  alreadyElectricTWh: number;
  defaultTargetTWh: number;
  maxTargetTWh: number;
  stepTWh: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100GhdData = {
  id: 'e100-ghd';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  referenceHeatDemandTWh: number;
  alreadyElectricHeatTWh: number;
  defaultTargetHeatTWh: number;
  maxTargetHeatTWh: number;
  stepHeatTWh: number;
  seasonalCop: number;
  distribution: 'heating-degree-days';
  degreeDayProfile: DegreeDayProfile;
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100IndustrieWaermeData = {
  id: 'e100-industrie-waerme';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  referenceHeatTWh: number;
  alreadyElectricHeatTWh: number;
  defaultTargetHeatTWh: number;
  maxTargetHeatTWh: number;
  stepHeatTWh: number;
  electricityPerHeat: number;
  temperatureMix: {
    ntShare: number;
    mtShare: number;
    htShare: number;
    ntCop: number;
    mtElectricFactor: number;
    htEfficiency: number;
  };
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100StahlData = {
  id: 'e100-stahl';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  primarySteelMioTon: number;
  hydrogenKgPerTonSteel: number;
  electrolyzerKwhPerKgH2: number;
  eafMwhPerTon: number;
  mwhPerTon: number;
  alreadyElectricTWh: number;
  defaultTargetMioTon: number;
  maxTargetMioTon: number;
  stepMioTon: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type E100ChemieData = {
  id: 'e100-chemie';
  title: string;
  source: string;
  sourceUrls: string[];
  referenceYear: number;
  currentElectricityTWh: number;
  processHeatSubstitutionTWh: number;
  hydrogenAmmoniaTWh: number;
  hydrogenMethanolTWh: number;
  eOlefinsViaH2TWh: number;
  additionalDirectElectricityTWh: number;
  defaultTargetTotalTWh: number;
  maxTargetTotalTWh: number;
  stepTWh: number;
  alreadyElectricTWh: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
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
  hourOfDayBerlin: number;
  observed: ObservedPower;
};

export type DataSet = {
  source: string;
  'e100-pkw': E100PkwData;
  'e100-heiz': E100HeizData;
  'e100-lkw': E100LkwData;
  'e100-bahn': E100BahnData;
  'e100-schiff': E100SchiffData;
  'e100-flug': E100FlugData;
  'e100-ghd': E100GhdData;
  'e100-industrie-waerme': E100IndustrieWaermeData;
  'e100-stahl': E100StahlData;
  'e100-chemie': E100ChemieData;
  loadSumTWh?: number;
  generationSumTWh?: number;
  importSumTWh?: number;
  generationSharesPct?: Record<string, number>;
  generationPartsTWh?: Record<string, number>;
  hours: HourlyInput[];
};
