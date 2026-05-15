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
  coreModel: 'kernmodell',
  feedInFactors2025: 'einspeisefaktoren-2025',
} as const;

export type DataPackageId = typeof dataPackageIds[keyof typeof dataPackageIds];
export type DataPackageFile = 'data.json' | 'description.json' | 'model.ts' | 'generate.mjs';

export const dataFileUrl = (path: string) => `${import.meta.env.BASE_URL}data/${path}`;
export const dataManifestUrl = dataFileUrl('manifest.json');
export const dataPackagePath = (id: DataPackageId, file: DataPackageFile) => `${id}/${file}`;
export const dataPackageUrl = (id: DataPackageId, file: DataPackageFile) => dataFileUrl(dataPackagePath(id, file));
