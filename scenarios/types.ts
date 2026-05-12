export type Scenario = {
  id: string;
  name: string;
  description: string;
  demand: { basePct: number; bevPct: number; heatPumpPct: number };
  renewables: { pvGW: number; windOnGW: number; windOffGW: number };
  fossil: { coalGW: number; gasGW: number; nuclearGW?: number };
  storage: { batteryPowerGW: number; batteryEnergyGWh: number; h2PowerGW: number; h2EnergyGWh: number; importLimitGW: number };
};
