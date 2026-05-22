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
  supplyPreset: 'custom' | 'historical-2025' | 'historical-2017' | '100ee-noimport' | '100ee-import' | '2025-skaliert';
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
     * 1.0 (heutiger Flottenschnitt). Höhere Werte beschreiben Neubau-Mix:
     * PV ~1.5 (Aufdach modern + Freifläche bifazial 1100 kWh/kWp/a vs. heute
     * 702), Wind Onshore ~1.4 (~2400 VLH neubau vs. heute 1745 gemischt),
     * Wind Offshore default 1.8 (~4000 VLH 15 MW-Klasse vs. heute auf
     * gemischtem Faktor abgebildet).
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
