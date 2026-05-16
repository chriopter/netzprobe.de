import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../types/data';
import type { Scenario } from '../types/scenario';
import { compute as computeHistorisch2025 } from '../../data/presets/versorgung-historisch-2025/model';
import { compute as computeHistorisch2017 } from '../../data/presets/versorgung-historisch-2017/model';
import { compute as compute100Ee } from '../../data/presets/versorgung-100ee-noimport/model';
import { compute as compute50Ee } from '../../data/presets/versorgung-50ee-50import/model';
import { compute as compute2025Skaliert } from '../../data/presets/versorgung-2025-skaliert/model';

export type SupplyPresetId = 'historical-2025' | 'historical-2017' | '100ee-noimport' | '50ee-50import' | '2025-skaliert';
export type SupplyPillId = SupplyPresetId | 'custom';

export const supplyPresetIds: SupplyPresetId[] = [
  'historical-2025', 'historical-2017', '100ee-noimport', '50ee-50import', '2025-skaliert',
];

export const supplyPillIds: SupplyPillId[] = [
  'historical-2025', 'historical-2017', 'custom', '100ee-noimport', '50ee-50import', '2025-skaliert',
];

export const supplyPillLabels: Record<SupplyPillId, string> = {
  'historical-2025': '2025',
  'historical-2017': '2017',
  '100ee-noimport': '100% EE',
  '50ee-50import': '50% EE + 50% H₂-Import',
  '2025-skaliert': '2025 hochskaliert',
  'custom': 'Manuell',
};

export const supplyPillDescriptions: Record<SupplyPillId, string> = {
  'historical-2025': 'Beobachtete Erzeugung und Last 2025 (Pass-Through)',
  'historical-2017': 'Beobachtete Erzeugung und Last 2017 — Kernkraft on, mehr Kohle, ~36% EE',
  '100ee-noimport': 'Erneuerbar mit Speicher; Fossil und Import auf 0',
  '50ee-50import': 'Halber RE-Mix, Rest über H₂-Import (~100 g/kWh)',
  '2025-skaliert': 'Aktueller 2025-Mix proportional zur Last hochskaliert',
  'custom': 'Slider frei konfigurierbar; Dispatch läuft mit deinen Werten',
};

export const supplyPillWikiIds: Record<SupplyPillId, string> = {
  'historical-2025': 'versorgung-historisch-2025',
  'historical-2017': 'versorgung-historisch-2017',
  '100ee-noimport': 'versorgung-100ee-noimport',
  '50ee-50import': 'versorgung-50ee-50import',
  '2025-skaliert': 'versorgung-2025-skaliert',
  'custom': 'kern',
};

// Aliases for backward-compatible imports in ScenarioSidebar.
export const supplyPresetLabels = supplyPillLabels;
export const supplyPresetDescriptions = supplyPillDescriptions;
export const supplyPresetWikiIds = supplyPillWikiIds;

export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;

export function applySupplyPreset(
  presetId: SupplyPresetId,
  demandTWh: number,
  factors: FactorHour[],
  erz: ErzeugungsPool,
  speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  if (presetId === 'historical-2025') return computeHistorisch2025(demandTWh, factors, erz, speicher, aussenhandel);
  if (presetId === 'historical-2017') return computeHistorisch2017(demandTWh, factors, erz, speicher, aussenhandel);
  if (presetId === '100ee-noimport') return compute100Ee(demandTWh, factors, erz, speicher, aussenhandel);
  if (presetId === '50ee-50import') return compute50Ee(demandTWh, factors, erz, speicher, aussenhandel);
  if (presetId === '2025-skaliert') return compute2025Skaliert(demandTWh, factors, erz, speicher, aussenhandel);
  return computeHistorisch2025(demandTWh, factors, erz, speicher, aussenhandel);
}
