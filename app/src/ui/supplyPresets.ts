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
