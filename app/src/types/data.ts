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

export type ReferenceScale = {
  value: number;
  unit: string;
  label: string;
};

/** Size anchors per physical dimension: power in GW (capacity slider),
 *  energy in GWh (storage), activity in TWh/a, Mio. km/a, Mio. t etc. */
export type ReferenceScalesData = {
  power?: ReferenceScale;
  energy?: ReferenceScale;
  activity?: ReferenceScale;
};

/** Mixin adding optional `referenceScales` to a module data type. */
export type WithReferenceScales = {
  referenceScales?: ReferenceScalesData;
};

export type CapacityBounds = {
  installed2025GW: number;
  defaultInstalledGW: number;
  minInstalledGW: number;
  maxInstalledGW: number;
  stepGW: number;
};

export type EmissionsData = {
  co2eGperKWh: number;
};

/** Mixin: every generator carries a mandatory `emissions` field. */
export type WithEmissions = {
  emissions: EmissionsData;
};


// Engine-Inputs (parameters-Block der package.json). Identitäts-Texte
// (id, title, source, sourceUrls, note, summary) leben im method-Block und
// sind hier nicht mehr typisiert.

export type E100PkwData = {
  referenceYear: number;
  referenceMillionKm: number;
  alreadyElectricMillionKm: number;
  defaultTargetMillionKm: number;
  maxTargetMillionKm: number;
  stepMillionKm: number;
  kwhPer100Km: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
} & WithReferenceScales;

export type E100HeizData = {
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
} & WithReferenceScales;

export type E100LkwData = {
  referenceYear: number;
  referenceBnKm: number;
  alreadyElectricBnKm: number;
  defaultTargetBnKm: number;
  maxTargetBnKm: number;
  stepBnKm: number;
  kwhPerKm: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
} & WithReferenceScales;

export type E100BahnData = {
  referenceYear: number;
  dieselSubstitutionTWh: number;
  modalShiftTWh: number;
  defaultTargetTWh: number;
  maxTargetTWh: number;
  stepTWh: number;
  distribution: 'hourly-profile';
  hourlyProfile: HourlyProfile;
} & WithReferenceScales;

export type E100SchiffData = {
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
} & WithReferenceScales;

export type E100FlugData = {
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
} & WithReferenceScales;

export type E100GhdData = {
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
} & WithReferenceScales;

export type E100IndustrieWaermeData = {
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
} & WithReferenceScales;

export type E100StahlData = {
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
} & WithReferenceScales;

export type E100ChemieData = {
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
} & WithReferenceScales;

export type ErzeugungsModellSourceId =
  | 'pv' | 'windOn' | 'windOff' | 'kernkraft' | 'biomasse' | 'laufwasser' | 'gas' | 'kohle';

export type ErzeugungsModellSourceMode = 'variable-re' | 'baseload' | 'dispatchable';

export type ErzeugungsModellVariableReSource = {
  name: string;
  mode: 'variable-re';
  factorPackage: 'einspeisefaktoren-2025';
  factorField: 'solarIrradiance' | 'wind100m';
} & CapacityBounds & WithEmissions & WithReferenceScales;

export type ErzeugungsModellBaseloadSource = {
  name: string;
  mode: 'baseload';
  availability: number;
} & CapacityBounds & WithEmissions & WithReferenceScales;

export type ErzeugungsModellDispatchableSource = {
  name: string;
  mode: 'dispatchable';
  availability: number;
  minLoadFraction: number;
} & CapacityBounds & WithEmissions & WithReferenceScales;

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
// Engine (model/kern/kern/package.json).
export type ErzeugungsPool = {
  sources: Record<ErzeugungsModellSourceId, ErzeugungsModellSource>;
  dispatchOrder: ErzeugungsModellDispatchOrder;
};

export type AussenhandelStromData = {
  import: ErzeugungsModellImport;
  export: ErzeugungsModellExport;
} & WithReferenceScales;

export type AussenhandelH2Data = {
  import: {
    default2025TWh: number;
    defaultTWh: number;
    minTWh: number;
    maxTWh: number;
    stepTWh: number;
  };
} & WithReferenceScales;

export type AussenhandelPool = {
  strom: {
    import: ErzeugungsModellImport;
    export: ErzeugungsModellExport;
    referenceScales?: ReferenceScalesData;
  };
  h2: {
    import: {
      defaultTWh: number;
      minTWh: number;
      maxTWh: number;
      stepTWh: number;
    };
    referenceScales?: ReferenceScalesData;
  };
};

export type ErzPackageVariableRe = {
  mode: 'variable-re';
  factorPackage: 'einspeisefaktoren-2025';
  factorField: 'solarIrradiance' | 'wind100m';
} & CapacityBounds & WithEmissions & WithReferenceScales;

export type ErzPackageBaseload = {
  mode: 'baseload';
  availability: number;
} & CapacityBounds & WithEmissions & WithReferenceScales;

export type ErzPackageDispatchable = {
  mode: 'dispatchable';
  availability: number;
  minLoadFraction: number;
} & CapacityBounds & WithEmissions & WithReferenceScales;

export type ErzPackageSource = ErzPackageVariableRe | ErzPackageBaseload | ErzPackageDispatchable;


export type SpeicherModellStorageId = 'batterie' | 'pumpspeicher' | 'h2';

export type SpeicherModellSymmetricStorage = {
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
} & WithReferenceScales;

export type SpeicherModellAsymmetricStorage = {
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
} & WithReferenceScales;

// Aggregierter Pool aus den einzelnen speicher-* Bausteinen.
export type SpeicherPool = {
  storages: {
    batterie: SpeicherModellSymmetricStorage;
    pumpspeicher: SpeicherModellSymmetricStorage;
    h2: SpeicherModellAsymmetricStorage;
  };
};

export type SpeicherBatterieData = SpeicherModellSymmetricStorage;
export type SpeicherPumpspeicherData = SpeicherModellSymmetricStorage;
export type SpeicherH2Data = SpeicherModellAsymmetricStorage;

export type SplitDataFile<T> = {
  year?: number;
  generatedAt?: string;
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
  loadSum2017TWh?: number;
  generationSum2017TWh?: number;
};
