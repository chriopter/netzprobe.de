export type SupplyPresetId = 'historical-2025' | 'historical-2017' | '100ee-noimport' | '100ee-import' | '100kern-lastfolgend' | '2025-skaliert';
export type SupplyPillId = SupplyPresetId | 'custom';

export const supplyPresetIds: SupplyPresetId[] = [
  'historical-2025', 'historical-2017', '100ee-noimport', '100ee-import', '100kern-lastfolgend', '2025-skaliert',
];

export const supplyPillIds: SupplyPillId[] = [
  'historical-2025', 'historical-2017', 'custom', '100ee-noimport', '100ee-import', '100kern-lastfolgend', '2025-skaliert',
];

export const supplyPillLabels: Record<SupplyPillId, string> = {
  'historical-2025': '2025',
  'historical-2017': '2017',
  '100ee-noimport': '100% EE lokal',
  '100ee-import': '100% EE + Import',
  '100kern-lastfolgend': '100% Kernkraft',
  '2025-skaliert': '2025 hochskaliert',
  'custom': 'Manuell',
};

export const supplyPillDescriptions: Record<SupplyPillId, string> = {
  'historical-2025': 'Beobachtete Erzeugung und Last 2025 (Pass-Through)',
  'historical-2017': 'Beobachtete Erzeugung und Last 2017 — Kernkraft on, mehr Kohle, ~36% EE',
  '100ee-noimport': 'Autark: 100% lokale EE-Erzeugung, kein Import — fordert großen Überbau und Saisonalspeicher',
  '100ee-import': 'EE-Mix nach Studien-Konsens (Agora KN2045 / BMWK LFS3 / Ariadne) plus H₂- und Strom-Import',
  '100kern-lastfolgend': 'Stresstest-Anker: 100% Kernkraft, lastfolgend (französisches Modell). Physisch unrealistisch bis 2045 — Vergleichswert zur 100%-EE-Variante',
  '2025-skaliert': 'Aktueller 2025-Mix proportional zur Last hochskaliert',
  'custom': 'Slider frei konfigurierbar; Dispatch läuft mit deinen Werten',
};

export const supplyPillWikiIds: Record<SupplyPillId, string> = {
  'historical-2025': 'historisch-2025',
  'historical-2017': 'historisch-2017',
  '100ee-noimport': '100ee-noimport',
  '100ee-import': '100ee-import',
  '100kern-lastfolgend': '100kern-lastfolgend',
  '2025-skaliert': '2025-skaliert',
  'custom': 'kern',
};

// Aliases for backward-compatible imports in ScenarioSidebar.
export const supplyPresetLabels = supplyPillLabels;
export const supplyPresetDescriptions = supplyPillDescriptions;
export const supplyPresetWikiIds = supplyPillWikiIds;
