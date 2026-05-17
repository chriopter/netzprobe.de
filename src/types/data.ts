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
  nuclearMW?: number;
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
  /** System-η Strom → e-Methanol/e-Ammoniak (Schiffsfuel, LHV). */
  eFuelSystemEfficiency: number;
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
  /** System-η Strom → PtL-Kerosin (LHV). Genutzt von h2ImportReductionGW. */
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
  /** System-η Strom → fertiges H2-Endprodukt (NH3, MeOH, Olefine-Mix). */
  h2SystemEfficiency: number;
  defaultTargetTotalTWh: number;
  maxTargetTotalTWh: number;
  stepTWh: number;
  alreadyElectricTWh: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
  note: string;
  summary: string;
};

export type ErzeugungsModellSourceId =
  | 'pv' | 'windOn' | 'windOff' | 'kernkraft' | 'biomasse' | 'laufwasser' | 'gas' | 'kohle';

export type ErzeugungsModellSourceMode = 'variable-re' | 'baseload' | 'dispatchable';

export type ErzeugungsModellVariableReSource = {
  name: string;
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
  mode: 'variable-re';
  factorPackage: 'einspeisefaktoren-2025';
  factorField: 'solarIrradiance' | 'wind100m';
  emissionGperKWh: number;
};

export type ErzeugungsModellBaseloadSource = {
  name: string;
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
  mode: 'baseload';
  availability: number;
  emissionGperKWh: number;
};

export type ErzeugungsModellDispatchableSource = {
  name: string;
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
  mode: 'dispatchable';
  availability: number;
  minLoadFraction: number;
  emissionGperKWh: number;
};

export type ErzeugungsModellSource =
  | ErzeugungsModellVariableReSource
  | ErzeugungsModellBaseloadSource
  | ErzeugungsModellDispatchableSource;

export type ErzeugungsModellImport = {
  default2025GW: number;
  defaultMaxGW: number;
  minGW: number;
  maxGW: number;
  stepGW: number;
  emissionGperKWh: number;
};

export type ErzeugungsModellExport = {
  default2025GW: number;
  defaultMaxGW: number;
  minGW: number;
  maxGW: number;
  stepGW: number;
};

export type ErzeugungsModellDispatchOrder = {
  curtailmentPriority: ErzeugungsModellSourceId[];
  rampUpPriority: ErzeugungsModellSourceId[];
  rampUpRatio: Partial<Record<ErzeugungsModellSourceId, number>>;
};

// Aggregierter Pool aus den einzelnen Erzeugung-Bausteinen.
// Import/Export wandern in AussenhandelPool, dispatchOrder lebt in der
// Engine (data/kern/data.json).
export type ErzeugungsPool = {
  sources: Record<ErzeugungsModellSourceId, ErzeugungsModellSource>;
  dispatchOrder: ErzeugungsModellDispatchOrder;
};

export type AussenhandelStromData = {
  id: 'strom-handel';
  name: string;
  import: ErzeugungsModellImport;
  export: ErzeugungsModellExport;
};

export type AussenhandelH2Data = {
  id: 'h2-handel';
  name: string;
  import: {
    default2025TWh: number;
    defaultTWh: number;
    minTWh: number;
    maxTWh: number;
    stepTWh: number;
  };
};

export type AussenhandelPool = {
  strom: {
    import: ErzeugungsModellImport;
    export: ErzeugungsModellExport;
  };
  h2: {
    import: {
      defaultTWh: number;
      minTWh: number;
      maxTWh: number;
      stepTWh: number;
    };
  };
};

// Generischer Typ für ein einzelnes erz-* Paket. Discriminated Union über `mode`.
export type ErzPackageVariableRe = {
  id: string;
  name: string;
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
  mode: 'variable-re';
  factorPackage: 'einspeisefaktoren-2025';
  factorField: 'solarIrradiance' | 'wind100m';
  emissionGperKWh: number;
};

export type ErzPackageBaseload = {
  id: string;
  name: string;
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
  mode: 'baseload';
  availability: number;
  emissionGperKWh: number;
};

export type ErzPackageDispatchable = {
  id: string;
  name: string;
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
  mode: 'dispatchable';
  availability: number;
  minLoadFraction: number;
  emissionGperKWh: number;
};

export type ErzPackageSource = ErzPackageVariableRe | ErzPackageBaseload | ErzPackageDispatchable;


export type SpeicherModellStorageId = 'batterie' | 'pumpspeicher' | 'h2';

export type SpeicherModellSymmetricStorage = {
  name: string;
  power2025GW: number;
  defaultPowerGW: number;
  minPowerGW: number;
  maxPowerGW: number;
  stepPowerGW: number;
  energy2025GWh: number;
  defaultEnergyGWh: number;
  minEnergyGWh: number;
  maxEnergyGWh: number;
  stepEnergyGWh: number;
  roundtripEfficiency: number;
  initialStateOfChargeFraction: number;
  dispatchPriority: number;
};

export type SpeicherModellAsymmetricStorage = {
  name: string;
  chargePower2025GW: number;
  defaultChargePowerGW: number;
  minChargePowerGW: number;
  maxChargePowerGW: number;
  stepChargePowerGW: number;
  dischargePower2025GW: number;
  defaultDischargePowerGW: number;
  minDischargePowerGW: number;
  maxDischargePowerGW: number;
  stepDischargePowerGW: number;
  energy2025GWh: number;
  defaultEnergyGWh: number;
  minEnergyGWh: number;
  maxEnergyGWh: number;
  stepEnergyGWh: number;
  roundtripEfficiency: number;
  initialStateOfChargeFraction: number;
  dispatchPriority: number;
};

// Aggregierter Pool aus den einzelnen speicher-* Bausteinen.
export type SpeicherPool = {
  storages: {
    batterie: SpeicherModellSymmetricStorage;
    pumpspeicher: SpeicherModellSymmetricStorage;
    h2: SpeicherModellAsymmetricStorage;
  };
};

export type SpeicherBatterieData = SpeicherModellSymmetricStorage & { id: 'batterie' };
export type SpeicherPumpspeicherData = SpeicherModellSymmetricStorage & { id: 'pumpspeicher' };
export type SpeicherH2Data = SpeicherModellAsymmetricStorage & { id: 'h2' };

export type SplitDataFile<T> = {
  source: string;
  year?: number;
  generatedAt?: string;
  sourceUrl?: string;
  sourceUrls?: string[];
  notes?: string[];
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
  'erzeugungs-modell': ErzeugungsPool;
  'speicher-modell': SpeicherPool;
  'aussenhandel-modell': AussenhandelPool;
  loadSumTWh?: number;
  generationSumTWh?: number;
  importSumTWh?: number;
  generationSharesPct?: Record<string, number>;
  generationPartsTWh?: Record<string, number>;
  hours: HourlyInput[];
  hours2017?: HourlyInput[];
  loadSum2017TWh?: number;
  generationSum2017TWh?: number;
};
