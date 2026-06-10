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
    'e100-lkw': boolean;
    'e100-lkw-target-bn-km': number;
    'e100-bahn': boolean;
    'e100-bahn-target-twh': number;
    'e100-schiff': boolean;
    'e100-schiff-target-twh': number;
    'e100-flug': boolean;
    'e100-flug-target-twh': number;
    'e100-ghd': boolean;
    'e100-ghd-target-heat-twh': number;
    'e100-industrie-waerme': boolean;
    'e100-industrie-waerme-target-heat-twh': number;
    'e100-stahl': boolean;
    'e100-stahl-target-mio-ton': number;
    'e100-chemie': boolean;
    'e100-chemie-target-twh': number;
  };
  supplyPreset: 'custom' | 'historical-2025' | 'historical-2017' | '100ee-noimport' | '100ee-import' | '100kern-lastfolgend' | '2025-skaliert';
  loadYear: 2025 | 2017;
  generation: {
    pvInstalledGW: number;
    windOnInstalledGW: number;
    windOffInstalledGW: number;
    kernkraftInstalledGW: number;
    biomasseInstalledGW: number;
    laufwasserInstalledGW: number;
    gasInstalledGW: number;
    kohleInstalledGW: number;
    /**
     * Multiplier auf die einspeisefaktoren-2025-Werte, um modernere Anlagen-
     * Flotten als die aktuelle DE-2025-Realflotte zu modellieren. Defaults =
     * 1.0 (heutiger Flottenschnitt; seit dem Faktor-Split hat auch Offshore
     * einen eigenen beobachteten Faktor windOff100m mit ~2800 VLH). Höhere
     * Werte beschreiben Neubau-Mix: PV ~1.5 (Aufdach modern + Freifläche
     * bifazial 1100 kWh/kWp/a vs. heute 702), Wind Onshore ~1.4 (~2400 VLH
     * Neubau vs. heute ~1600 beobachtet), Wind Offshore ~1.2 (70-GW-Flotten-
     * mittel 2045 ~3400 VLH laut NEP-Orientierungswert 238 TWh, wake-begrenzt;
     * bis ~1.7 nur für einzelne ferne, dünn belegte Flächen).
     */
    pvCapacityFactorMultiplier: number;
    windOnCapacityFactorMultiplier: number;
    windOffCapacityFactorMultiplier: number;
  };
  storage: {
    batteriePowerGW: number;
    batterieEnergyGWh: number;
    pumpspeicherPowerGW: number;
    pumpspeicherEnergyGWh: number;
    h2ChargePowerGW: number;
    h2DischargePowerGW: number;
    h2EnergyGWh: number;
  };
  /**
   * Außenhandel-Import: Strom in GW (stündlich-konstante Obergrenze) plus
   * H2-Import in TWh/Jahr (LHV). Letzterer reduziert den inländischen Strom-
   * bedarf der H2-konsumierenden Sektoren (Stahl/Chemie/Schiff/Flug) nach
   * Wirkungsgrad-Priorität (Flug→Schiff→Chemie→Stahl), nicht als zusätzlicher
   * Stromfluss. Import-Emissionsfaktor liegt im aussenhandel/strom-handel-Paket.
   */
  import: {
    stromGW: number;
    stromEmissionGperKWh: number;
    h2TWh: number;
  };
  export: {
    stromGW: number;
  };
};
