export type Scenario = {
  id: string;
  name: string;
  description: string;
  demand: {
    'last-2025': boolean;
    'e100-pkw': boolean;
    'e100-pkw-million-km': number;
    'e100-heiz': boolean;
    'e100-heiz-target-heat-twh': number;
  };
  renewables: { pvGW: number; windOnGW: number; windOffGW: number };
  fossil: { coalGW: number; gasGW: number };
  storage: { batteryPowerGW: number; batteryEnergyGWh: number; h2PowerGW: number; h2EnergyGWh: number; importLimitGW: number };
};
