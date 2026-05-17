import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../../src/types/data';
import type { Scenario } from '../../src/types/scenario';

export const description: DatasetDoc = {
  id: 'versorgung-100ee-noimport',
  domain: 'presets',
  kind: 'composition',
  title: 'Versorgung: 100% EE ohne Import',
  scripts: ['presets/versorgung-100ee-noimport/model.ts'],
  source: 'Eigene Komposition; Mix-Anteile orientiert an BMWK-Langfristszenarien T45-Strom.',
  sourceUrls: [
    'https://langfristszenarien.de/enertile-explorer-de/szenario-explorer/das-projekt.php',
  ],
  period: 'laufend',
  resolution: 'stündlich',
  unit: 'GW, GWh, TWh',
  short: 'PV/Wind/Speicher auf `1,4 × Last` dimensioniert; Fossil und Stromimport auf null.',
  description: [
    '**Komposition:** das Preset setzt fossile Quellen (`Gas = 0 GW`, `Kohle = 0 GW`) und den Import-Cap auf null, behält `Biomasse` und `Laufwasser` auf Baseline-Bestand und dimensioniert PV, Wind onshore, Wind offshore sowie Batterie und H₂-Saisonspeicher proportional zur Jahres-Last. Variable RE-Anteile werden im Verhältnis `PV 30 % / Wind on 45 % / Wind off 15 %` aufgeteilt, anschließend per `snap()` auf das Slider-Raster gerundet.',
    '**Werte:** Auslegungsziel `Jahres-RE = 1,4 × Demand − Biomasse − Laufwasser`, dieser **Cushion-Faktor** deckt H₂-Roundtrip (`η ≈ 0,24` saisonal), Curtailment und Direkt-RE-Anteil ab. Speicher-Faustregeln: Batterie `0,1 GW/TWh` und `0,5 GWh/TWh` (z. B. `47 GW / 233 GWh` bei `466 TWh`, `120 GW / 605 GWh` bei `1.211 TWh`); H₂ `0,06 GW/TWh` Elektrolyse, `0,12 GW/TWh` Rückverstromung, Energie `0,15 × Demand` in TWh → `~130 TWh` Saisonspeicher bei `~750 TWh` Last (Fraunhofer-ISE-Benchmark). Pumpspeicher bleibt Default 2025.',
    '**Anwendungsfall:** Autarkie-Stresstest. Zeigt, wie groß PV-, Wind- und Speicherflotte werden müssen, wenn weder fossile Backup-Kraftwerke noch Stromimport zur Verfügung stehen, und wie viel Curtailment das Modell akzeptiert, um auch lange Dunkelflauten ohne Lastabwurf zu überbrücken.',
  ],
  overview: [
    {
      label: 'Mix-Anteile',
      value: '**RE-Verteilung:** `PV 30 %`, `Wind onshore 45 %`, `Wind offshore 15 %` vom zusätzlichen RE-Bedarf. `Biomasse` und `Laufwasser` decken den Restanteil und bleiben auf Default-Bestand 2025.',
    },
    {
      label: 'Cushion-Faktor',
      value: '**Auslegung:** `Jahres-RE ≥ 1,4 × Demand`. Der `40 %`-Aufschlag deckt H₂-Roundtrip-Verluste (`η ≈ 0,24` saisonal), Curtailment-Buffer und nicht-zeitlich passenden Direkt-RE-Anteil.',
    },
    {
      label: 'Speicher-Sizing',
      value: '**Batterie:** `0,1 GW/TWh × Demand` Leistung, `0,5 GWh/TWh × Demand` Energie. **H₂:** Elektrolyse `0,06 GW/TWh`, Rückverstromung `0,12 GW/TWh`, Energie `0,15 × Demand × 1.000 GWh` (Fraunhofer-ISE-„Wege"-Benchmark). **Pumpspeicher:** Default 2025.',
    },
    {
      label: 'Handel',
      value: '**Import-Cap:** `0 GW` (autark). **Export-Cap:** Default — Überschuss kann exportiert werden.',
    },
  ],
  method: [
    'yieldPV = Σ solarIrradiance / 1000 (TWh pro GW installiert); yieldWind analog mit wind100m.',
    'target = max(0, demandTWh × 1,4 − BiomasseTWh − LaufwasserTWh). Verteilt auf PV (30%), WindOn (45%), WindOff (15%).',
    'PV-GW = target × 0,30 / yieldPV. WindOn-GW = target × 0,45 / yieldWind. WindOff-GW = target × 0,15 / yieldWind.',
    'Werte werden über snap(min, max, step) auf Slider-Raster gequantelt.',
    'Datei: data/presets/versorgung-100ee-noimport/model.ts.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung (versorgung-100ee-noimport).' },
  ],
  caveats: [
    'Mix-Anteile (30/45/15) sind heuristisch; reale Langfristszenarien (T45) streuen je nach Annahme zur Volllast-Verteilung.',
    'Cushion 1,4 deckt Speicherverluste und Curtailment grob ab; reale Anforderung hängt von Speichergröße und Saisonalität ab.',
    'Speicher-Sizing nach Daumenregel (Batterie 0,5 GWh/TWh Last; H₂-Saisonspeicher 15 % Demand) — keine optimierte Dimensionierung.',
    'Wind Offshore nutzt denselben Einspeisefaktor wie Onshore — siehe erz-windoff Caveats.',
  ],
};

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

const EE_PV_SHARE = 0.30;
const EE_WIND_ON_SHARE = 0.45;
const EE_WIND_OFF_SHARE = 0.15;
// Cushion 1.4 deckt H₂-Roundtrip (η=0.24) für den Saisonal-Anteil; Curtail-Buffer + Direkt-RE-Anteil.
// 1.5 produzierte bei niedrigem Demand zu viel Curtailment (validierungs-Agent B); 1.4 ist Sweet-Spot.
const EE_CUSHION = 1.4;
// Speicher skalieren mit Jahres-Demand. Faustregeln: Batterie für tägliches Smoothing (~5 h Speicher bei 10 % Spitzenanteil),
// H₂ für saisonal (~2 Wochen Dunkelflaute auf Peak-Last). Werte an Fraunhofer ISE „Wege..."-Benchmark gefittet.
const EE_BATTERY_POWER_PER_TWH = 0.1;       // 47 GW @ 466 TWh, 120 GW @ 1211 TWh
const EE_BATTERY_ENERGY_PER_TWH = 0.5;      // 233 GWh @ 466 TWh, 605 GWh @ 1211 TWh
const EE_H2_CHARGE_PER_TWH = 0.06;          // 28 GW @ 466 TWh, 73 GW @ 1211 TWh
const EE_H2_DISCHARGE_PER_TWH = 0.12;       // 56 GW @ 466 TWh, 145 GW @ 1211 TWh
// Saisonal-H₂-Speicher: Fraunhofer ISE-Benchmark ~130 TWh @ ~750 TWh Last = 0.17. 0.15 als robuster Mittelwert.
const EE_H2_ENERGY_FRACTION_OF_DEMAND = 0.15;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = clamp(value, min, max);
  if (step <= 0) return clamped;
  const stepped = Math.round((clamped - min) / step) * step + min;
  return clamp(stepped, min, max);
}

function annualYieldTWhPerGW(factors: FactorHour[], field: 'solarIrradiance' | 'wind100m'): number {
  const sum = factors.reduce((acc, hour) => acc + (hour[field][0] ?? 0), 0);
  return sum / 1000;
}

export function compute(
  demandTWh: number,
  factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  const yieldPV = Math.max(annualYieldTWhPerGW(factors, 'solarIrradiance'), 0.1);
  const yieldWind = Math.max(annualYieldTWhPerGW(factors, 'wind100m'), 0.1);

  const baselineBioTWh = erz.sources.biomasse.defaultInstalledGW * 8.76;
  const baselineHydroTWh = erz.sources.laufwasser.defaultInstalledGW * 8.76;
  const target = Math.max(0, demandTWh * EE_CUSHION - baselineBioTWh - baselineHydroTWh);

  const totalShare = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
  const pvGW = (target * EE_PV_SHARE / totalShare) / yieldPV;
  const windOnGW = (target * EE_WIND_ON_SHARE / totalShare) / yieldWind;
  const windOffGW = (target * EE_WIND_OFF_SHARE / totalShare) / yieldWind;

  return {
    generation: {
      pvInstalledGW: snap(pvGW, erz.sources.pv.minInstalledGW, erz.sources.pv.maxInstalledGW, erz.sources.pv.stepGW),
      windOnInstalledGW: snap(windOnGW, erz.sources.windOn.minInstalledGW, erz.sources.windOn.maxInstalledGW, erz.sources.windOn.stepGW),
      windOffInstalledGW: snap(windOffGW, erz.sources.windOff.minInstalledGW, erz.sources.windOff.maxInstalledGW, erz.sources.windOff.stepGW),
      kernkraftInstalledGW: 0,
      biomasseInstalledGW: erz.sources.biomasse.defaultInstalledGW,
      laufwasserInstalledGW: erz.sources.laufwasser.defaultInstalledGW,
      gasInstalledGW: 0,
      kohleInstalledGW: 0,
      pvCapacityFactorMultiplier: 1.0,
      windOnCapacityFactorMultiplier: 1.0,
      windOffCapacityFactorMultiplier: 1.8,
    },
    storage: {
      batteriePowerGW: snap(demandTWh * EE_BATTERY_POWER_PER_TWH, speicher.storages.batterie.minPowerGW, speicher.storages.batterie.maxPowerGW, speicher.storages.batterie.stepPowerGW),
      batterieEnergyGWh: snap(demandTWh * EE_BATTERY_ENERGY_PER_TWH, speicher.storages.batterie.minEnergyGWh, speicher.storages.batterie.maxEnergyGWh, speicher.storages.batterie.stepEnergyGWh),
      pumpspeicherPowerGW: speicher.storages.pumpspeicher.defaultPowerGW,
      pumpspeicherEnergyGWh: speicher.storages.pumpspeicher.defaultEnergyGWh,
      h2ChargePowerGW: snap(demandTWh * EE_H2_CHARGE_PER_TWH, speicher.storages.h2.minChargePowerGW, speicher.storages.h2.maxChargePowerGW, speicher.storages.h2.stepChargePowerGW),
      h2DischargePowerGW: snap(demandTWh * EE_H2_DISCHARGE_PER_TWH, speicher.storages.h2.minDischargePowerGW, speicher.storages.h2.maxDischargePowerGW, speicher.storages.h2.stepDischargePowerGW),
      h2EnergyGWh: snap(demandTWh * EE_H2_ENERGY_FRACTION_OF_DEMAND * 1000, speicher.storages.h2.minEnergyGWh, speicher.storages.h2.maxEnergyGWh, speicher.storages.h2.stepEnergyGWh),
    },
    import: {
      stromGW: 0,
      stromEmissionGperKWh: aussenhandel.strom.import.emissionGperKWh,
      h2TWh: 0,
    },
    export: {
      stromGW: aussenhandel.strom.export.defaultMaxGW,
    },
  };
}
