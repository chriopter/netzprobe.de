export const dataPackageIds = {
  loadHistorical2025: 'last-2025',
  fullElectrification: 'e100',
  e100Pkw: 'e100-pkw',
  e100Heiz: 'e100-heiz',
  e100Lkw: 'e100-lkw',
  e100Bahn: 'e100-bahn',
  e100Schiff: 'e100-schiff',
  e100Flug: 'e100-flug',
  e100Ghd: 'e100-ghd',
  e100IndustrieWaerme: 'e100-industrie-waerme',
  e100Stahl: 'e100-stahl',
  e100Chemie: 'e100-chemie',
  generationHistorical2025: 'erzeugung-2025',
  generationHistorical2017: 'erzeugung-2017',
  loadHistorical2017: 'last-2017',
  erzPv: 'erz-pv',
  erzWindOn: 'erz-windon',
  erzWindOff: 'erz-windoff',
  erzKernkraft: 'erz-kernkraft',
  erzBiomasse: 'erz-biomasse',
  erzLaufwasser: 'erz-laufwasser',
  erzGas: 'erz-gas',
  erzKohle: 'erz-kohle',
  erzHandel: 'erz-handel',
  speicherBatterie: 'speicher-batterie',
  speicherPumpspeicher: 'speicher-pumpspeicher',
  speicherH2: 'speicher-h2',
  versorgungHistorisch2025: 'versorgung-historisch-2025',
  versorgungHistorisch2017: 'versorgung-historisch-2017',
  versorgung100EeNoImport: 'versorgung-100ee-noimport',
  versorgung50Ee50Import: 'versorgung-50ee-50import',
  versorgung2025Skaliert: 'versorgung-2025-skaliert',
  coreModel: 'kernmodell',
  feedInFactors2025: 'einspeisefaktoren-2025',
} as const;

export type DataPackageId = typeof dataPackageIds[keyof typeof dataPackageIds];
export type DataPackageFile = 'data.json' | 'description.json' | 'model.ts' | 'generate.mjs';

// Runtime lookup map for id -> path, populated by the manifest loader. Until then,
// fall back to id-as-path (which is identical for all top-level packages).
const idToPath = new Map<string, string>();

export function registerDataPackagePath(id: string, path: string): void {
  idToPath.set(id, path);
}

export function dataPackageResolvedPath(id: string): string {
  return idToPath.get(id) ?? id;
}

export const dataFileUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;
export const dataManifestUrl = dataFileUrl('manifest.json');
export const dataPackagePath = (id: DataPackageId, file: DataPackageFile) =>
  `${dataPackageResolvedPath(id)}/${file}`;
export const dataPackageUrl = (id: DataPackageId, file: DataPackageFile) => dataFileUrl(dataPackagePath(id, file));
