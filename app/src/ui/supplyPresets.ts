import { supplyPresetCatalog } from './dataCatalog';

export type SupplyPresetId = string;
export type SupplyPillId = string;

const fixCatalog = supplyPresetCatalog.filter(e => e.gruppe === 'fix');
const lastfolgendCatalog = supplyPresetCatalog.filter(e => e.gruppe === 'lastfolgend');

export const supplyPresetIds: SupplyPresetId[] = supplyPresetCatalog.map(e => e.presetId);

// 'custom' (Manuell) sits in the Fix group, right after the last fix entry.
export const supplyPillIds: SupplyPillId[] = [
  ...fixCatalog.map(e => e.presetId),
  'custom',
  ...lastfolgendCatalog.map(e => e.presetId),
];

export const supplyPillLabels: Record<SupplyPillId, string> = {
  ...Object.fromEntries(supplyPresetCatalog.map(e => [e.presetId, e.label])),
  custom: 'Manuell',
};

export const supplyPillDescriptions: Record<SupplyPillId, string> = {
  ...Object.fromEntries(supplyPresetCatalog.map(e => [e.presetId, e.beschreibung])),
  custom: 'Slider frei konfigurierbar; Dispatch läuft mit deinen Werten',
};

export const supplyPillWikiIds: Record<SupplyPillId, string> = {
  ...Object.fromEntries(supplyPresetCatalog.map(e => [e.presetId, e.wikiId])),
  custom: 'kern',
};

// Aliases for backward-compatible imports in ScenarioSidebar.
export const supplyPresetLabels = supplyPillLabels;
export const supplyPresetDescriptions = supplyPillDescriptions;
export const supplyPresetWikiIds = supplyPillWikiIds;
