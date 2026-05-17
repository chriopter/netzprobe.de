import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../../src/types/data';
import type { Scenario } from '../../src/types/scenario';

export const description: DatasetDoc = {
  id: 'versorgung-2025-skaliert',
  domain: 'presets',
  kind: 'composition',
  title: 'Versorgung: 2025 hochskaliert',
  scripts: ['presets/versorgung-2025-skaliert/model.ts'],
  source: 'Eigene Komposition: 2025-Mix proportional zur Last.',
  sourceUrls: [],
  period: 'laufend',
  resolution: 'stündlich',
  unit: 'GW, GWh, TWh',
  short: 'Alle Versorgungs-Slider proportional zur Last: `Skalierungsfaktor = Demand / 466 TWh`.',
  description: [
    '**Komposition:** das Preset multipliziert sämtliche Default-Werte der `erz-*`, `speicher-*` und `aussenhandel-*` Bausteine — inklusive Kohle, Gas und Import-Cap — mit dem **Skalierungsfaktor** `f = demandTWh / 466 TWh` und rundet das Ergebnis pro Slider auf das Min/Max/Step-Raster des jeweiligen Bausteins. Die Mix-Anteile aus 2025 bleiben damit erhalten; der Mix als Ganzes wächst proportional mit der Last.',
    '**Werte:** Baseline `466 TWh/a` (Default-Lauf 2025). Bei `Demand = 932 TWh/a` ergibt sich `f = 2` und damit zum Beispiel `PV 205 GW`, `Wind onshore 125,6 GW`, `Kohle 62 GW`, `Batterie 20 GW / 50 GWh`. Werte werden vor dem Snap an die Slider-Maxima begrenzt — bei `f > 2` läuft etwa die PV in den `2.000 GW`-Anschlag, während Kohle weiter wächst, sodass der Mix langsam von 2025 abweicht.',
    '**Anwendungsfall:** Lineare 2025-Hochrechnung als Vergleichsanker zu klimaneutralen Presets. Beantwortet die Frage: „Was passiert, wenn die Energiewende nicht stattfindet und der 2025-Mix einfach proportional zur Last skaliert wird?" — und macht damit den fossilen Pfad bei wachsendem Strombedarf sichtbar.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Preset aktivieren:** alle Slider werden auf `Default-2025 × f` gesetzt. Beispiel: `Demand = 932 TWh → f = 2 → PV 205 GW`, `Wind onshore 125,6 GW`, `Kohle 62 GW`.',
    },
    {
      label: 'Skalierung',
      value: '**Formel:** `f = demandTWh / 466`. **Pro Slider:** `snap(defaultValue × f, min, max, step)`.',
    },
    {
      label: 'Inkonsistenz',
      value: '**Begrenzung an Slider-Maxima:** bei `f > 2` läuft z. B. PV gegen `2.000 GW`-Max, während Kohle weiter skaliert; bei moderaten Faktoren (`< 2`) bleibt der Mix nahezu konsistent.',
    },
  ],
  method: [
    'factor = demandTWh / SCALING_BASELINE_DEMAND_TWH (= 466 TWh).',
    'Für jede Quelle: snap(defaultInstalledGW × factor, minInstalledGW, maxInstalledGW, stepGW).',
    'Auch Import/Export-Caps und alle Speicher-Slider werden mitskaliert; Importemissionsfaktor bleibt auf dem 300 g/kWh aus aussenhandel/strom-handel.',
    'Datei: data/presets/versorgung-2025-skaliert/model.ts.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
  ],
  caveats: [
    'Skaliert Kohle und Gas mit — kein Klimaneutralitäts-Szenario, sondern reine 2025-Hochrechnung.',
    'An Slider-Maxima wird geclippt, dadurch Mix-Verzerrung bei großen Faktoren.',
    'Lineare Skalierung ignoriert Skaleneffekte (Speicher-Sizing, Netz-Topologie).',
    'Importemissionsfaktor bleibt Default 300 g/kWh (Nachbarmix laut aussenhandel/strom-handel) — kein H₂-Import modelliert.',
  ],
};

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

const SCALING_BASELINE_DEMAND_TWH = 466;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snap(value: number, min: number, max: number, step: number): number {
  const clamped = clamp(value, min, max);
  if (step <= 0) return clamped;
  const stepped = Math.round((clamped - min) / step) * step + min;
  return clamp(stepped, min, max);
}

export function compute(
  demandTWh: number,
  _factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  const factor = demandTWh / SCALING_BASELINE_DEMAND_TWH;
  const s = (source: { defaultInstalledGW: number; minInstalledGW: number; maxInstalledGW: number; stepGW: number }) =>
    snap(source.defaultInstalledGW * factor, source.minInstalledGW, source.maxInstalledGW, source.stepGW);

  return {
    generation: {
      pvInstalledGW: s(erz.sources.pv),
      windOnInstalledGW: s(erz.sources.windOn),
      windOffInstalledGW: s(erz.sources.windOff),
      kernkraftInstalledGW: s(erz.sources.kernkraft),
      biomasseInstalledGW: s(erz.sources.biomasse),
      laufwasserInstalledGW: s(erz.sources.laufwasser),
      gasInstalledGW: s(erz.sources.gas),
      kohleInstalledGW: s(erz.sources.kohle),
      pvCapacityFactorMultiplier: 1.0,
      windOnCapacityFactorMultiplier: 1.0,
      windOffCapacityFactorMultiplier: 1.8,
    },
    storage: {
      batteriePowerGW: snap(speicher.storages.batterie.defaultPowerGW * factor, speicher.storages.batterie.minPowerGW, speicher.storages.batterie.maxPowerGW, speicher.storages.batterie.stepPowerGW),
      batterieEnergyGWh: snap(speicher.storages.batterie.defaultEnergyGWh * factor, speicher.storages.batterie.minEnergyGWh, speicher.storages.batterie.maxEnergyGWh, speicher.storages.batterie.stepEnergyGWh),
      pumpspeicherPowerGW: snap(speicher.storages.pumpspeicher.defaultPowerGW * factor, speicher.storages.pumpspeicher.minPowerGW, speicher.storages.pumpspeicher.maxPowerGW, speicher.storages.pumpspeicher.stepPowerGW),
      pumpspeicherEnergyGWh: snap(speicher.storages.pumpspeicher.defaultEnergyGWh * factor, speicher.storages.pumpspeicher.minEnergyGWh, speicher.storages.pumpspeicher.maxEnergyGWh, speicher.storages.pumpspeicher.stepEnergyGWh),
      h2ChargePowerGW: snap(speicher.storages.h2.defaultChargePowerGW * factor, speicher.storages.h2.minChargePowerGW, speicher.storages.h2.maxChargePowerGW, speicher.storages.h2.stepChargePowerGW),
      h2DischargePowerGW: snap(speicher.storages.h2.defaultDischargePowerGW * factor, speicher.storages.h2.minDischargePowerGW, speicher.storages.h2.maxDischargePowerGW, speicher.storages.h2.stepDischargePowerGW),
      h2EnergyGWh: snap(speicher.storages.h2.defaultEnergyGWh * factor, speicher.storages.h2.minEnergyGWh, speicher.storages.h2.maxEnergyGWh, speicher.storages.h2.stepEnergyGWh),
    },
    import: {
      stromGW: snap(aussenhandel.strom.import.defaultMaxGW * factor, aussenhandel.strom.import.minGW, aussenhandel.strom.import.maxGW, aussenhandel.strom.import.stepGW),
      stromEmissionGperKWh: aussenhandel.strom.import.emissionGperKWh,
      h2TWh: aussenhandel.h2.import.defaultTWh,
    },
    export: {
      stromGW: snap(aussenhandel.strom.export.defaultMaxGW * factor, aussenhandel.strom.export.minGW, aussenhandel.strom.export.maxGW, aussenhandel.strom.export.stepGW),
    },
  };
}
