export { dataWikiHomeUrl, dataWikiUrl, datasetIds } from './dataLinks';

export type DatasetMethod = {
  title: string;
  short: string;
  parentId?: string;
  source: string;
  sourceUrls?: string[];
  period: string;
  resolution: string;
  unit: string;
  description: string | string[];
  overview?: Array<{ label: string; value: string }>;
  reasoning?: string[];
  sections?: Array<{ title: string; items: string[] }>;
  fields?: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
  file?: string;
  scripts?: string[];
  note?: string;
  summary?: string;
};

export type DatasetDoc = {
  id: string;
  domain: string;
  kind: 'dataset' | 'scenario' | 'composition' | 'model' | 'template';
  method: DatasetMethod;
};

export type DatasetPreset = {
  id: string;
  label: string;
  gruppe: 'fix' | 'lastfolgend';
  rang: number;
  beschreibung: string;
  sichtbar?: boolean;
};

// Volle Paket-Form: DatasetDoc plus parameters-Subobjekt.
export type DatasetPackage = DatasetDoc & {
  parameters: Record<string, unknown>;
  preset?: DatasetPreset;
};

export type SupplyPresetCatalogEntry = {
  presetId: string;
  label: string;
  gruppe: 'fix' | 'lastfolgend';
  rang: number;
  beschreibung: string;
  sichtbar: boolean;
  wikiId: string;
};

export const templateDescriptionPaths = [
  'templates/scenario-description.template.json',
] as const;

// Eager glob über alle Modell-Pakete. Jede package.json wird als JSON-Default
// importiert; method, parameters und Identifikation sind sofort da.
const packageModules = import.meta.glob<DatasetPackage | undefined>(
  '../../../model/**/package.json',
  { eager: true, import: 'default' },
);

const moduleSources = import.meta.glob<string>(
  '../../../model/**/model.rs',
  { query: '?raw', import: 'default' },
);
const generatorSources = import.meta.glob<string>(
  '../../../model/**/generate.mjs',
  { query: '?raw', import: 'default' },
);

function relPathFromGlobKey(key: string): string {
  return key.replace(/^\.\.\/\.\.\/\.\.\/model\//, '');
}

const folderPathById = new Map<string, string>();
const packageById = new Map<string, DatasetPackage>();
for (const [key, pkg] of Object.entries(packageModules)) {
  if (!pkg) continue;
  const id = pkg.id;
  if (!id) continue;
  const packagePath = relPathFromGlobKey(key);
  const folderPath = packagePath.replace(/\/package\.json$/, '');
  folderPathById.set(id, folderPath);
  packageById.set(id, pkg);
}

export function getPackage(id: string): DatasetPackage | null {
  return packageById.get(id) ?? null;
}

export function getParameters<T = Record<string, unknown>>(id: string): T | null {
  const pkg = packageById.get(id);
  return (pkg?.parameters as T) ?? null;
}

const moduleSourceLoaderByPath = new Map<string, () => Promise<string>>();
for (const [key, loader] of Object.entries(moduleSources)) {
  moduleSourceLoaderByPath.set(relPathFromGlobKey(key), loader);
}

const generatorSourceLoaderByPath = new Map<string, () => Promise<string>>();
for (const [key, loader] of Object.entries(generatorSources)) {
  generatorSourceLoaderByPath.set(relPathFromGlobKey(key), loader);
}

export const generatorPackageIds = new Set<string>([
  'e100-heiz',
  'e100-ghd',
  'erzeugung-2017',
  'einspeisefaktoren-2025',
]);

export type ModuleSource = {
  path: string;
  source: string;
};

export function modulePathForId(id: string): string | null {
  const folder = folderPathById.get(id);
  return folder ? `${folder}/model.rs` : null;
}

export function packageJsonPathForId(id: string): string | null {
  const folder = folderPathById.get(id);
  return folder ? `${folder}/package.json` : null;
}

export function generatorPathForId(id: string): string | null {
  const folder = folderPathById.get(id);
  if (!folder) return null;
  const scriptPath = `${folder}/generate.mjs`;
  return generatorSourceLoaderByPath.has(scriptPath) ? scriptPath : null;
}

export async function loadModuleSource(path: string): Promise<string | null> {
  const loader = moduleSourceLoaderByPath.get(path);
  if (!loader) return null;
  return loader();
}

export async function loadGeneratorSource(path: string): Promise<string | null> {
  const loader = generatorSourceLoaderByPath.get(path);
  if (!loader) return null;
  return loader();
}

export function generatorDataJsonPathForId(id: string): string | null {
  if (!generatorPackageIds.has(id)) return null;
  const folder = folderPathById.get(id);
  if (!folder) return null;
  return `${folder}/data.json`;
}

export const datasetDocs: DatasetDoc[] = Array.from(packageById.values());

const groupOrder: Record<DatasetPreset['gruppe'], number> = { fix: 0, lastfolgend: 1 };

export const supplyPresetCatalog: SupplyPresetCatalogEntry[] = Object.values(packageModules)
  .filter((pkg): pkg is DatasetPackage => !!pkg && !!pkg.preset)
  .map(pkg => {
    const preset = pkg.preset!;
    return {
      presetId: preset.id,
      label: preset.label,
      gruppe: preset.gruppe,
      rang: preset.rang,
      beschreibung: preset.beschreibung,
      sichtbar: !!preset.sichtbar,
      wikiId: pkg.id,
    };
  })
  .sort((a, b) => groupOrder[a.gruppe] - groupOrder[b.gruppe] || a.rang - b.rang);
