export type SimHour = {
  time: string;
  loadGW: number;
  solarGW: number;
  windOnGW: number;
  windOffGW: number;
  biomassGW: number;
  hydroGW: number;
  wasteGW: number;
  oilGW: number;
  geothermalGW: number;
  otherGW: number;
  coalGW: number;
  gasGW: number;
  nuclearGW: number;
  importGW: number;
  exportGW: number;
  storageChargeGW: number;
  storageDischargeGW: number;
  curtailmentGW: number;
  loadSheddingGW: number;
  batteryGWh: number;
  h2GWh: number;
  supplyGW: number;
  balanceGW: number;
  co2Tonnes: number;
};

export type SimulationResult = {
  hours: SimHour[];
  summary: {
    totalDemandTWh: number;
    renewableSharePct: number;
    co2IntensityGPerKWh: number;
    curtailmentTWh: number;
    importTWh: number;
    exportTWh: number;
    loadSheddingTWh: number;
    securityStatus: 'stabil' | 'angespannt' | 'kritisch';
  };
};

export type HistoricalGeneration = Pick<SimHour, 'solarGW' | 'windOnGW' | 'windOffGW' | 'biomassGW' | 'hydroGW' | 'wasteGW' | 'oilGW' | 'geothermalGW' | 'otherGW' | 'coalGW' | 'gasGW' | 'nuclearGW' | 'supplyGW'>;

export type BalanceResult = {
  importGW: number;
  exportGW: number;
  storageChargeGW: number;
  storageDischargeGW: number;
  curtailmentGW: number;
  loadSheddingGW: number;
  batteryGWh: number;
  h2GWh: number;
  balanceGW: number;
};
