export type Scenario = {
  id: string;
  name: string;
  description: string;
  demand: { basePct: number; bevPct: number; heatPumpPct: number };
  renewables: { pvGW: number; windOnGW: number; windOffGW: number };
  fossil: { coalGW: number; gasGW: number; nuclearGW?: number };
  storage: { batteryPowerGW: number; batteryEnergyGWh: number; h2PowerGW: number; h2EnergyGWh: number; importLimitGW: number };
};

export type DemandScenario = { id: string; name: string; values: Scenario['demand'] };
export type SupplyScenario = { id: string; name: string; values: Pick<Scenario, 'renewables' | 'fossil' | 'storage'> };

export type ScenarioPresets = {
  demand: DemandScenario[];
  supply: SupplyScenario[];
};
