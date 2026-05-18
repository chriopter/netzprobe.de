export { dataWikiHomeUrl, dataWikiUrl, datasetIds } from './dataLinks';

export type DatasetDoc = {
  id: string;
  parentId?: string;
  domain: string;
  kind: 'dataset' | 'scenario' | 'composition' | 'model' | 'template';
  title: string;
  file?: string;
  scripts?: string[];
  source: string;
  sourceUrls?: string[];
  period: string;
  resolution: string;
  unit: string;
  short: string;
  description: string | string[];
  overview?: Array<{ label: string; value: string }>;
  method?: string[];
  sections?: Array<{ title: string; items: string[] }>;
  fields?: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

export const templateDescriptionPaths = [
  'templates/scenario-description.template.json',
] as const;

// Eager glob über alle Modell-Pakete. `import: 'description'` lässt Vite nur
// den Wiki-Export inlinen; die großen `data`-/Hours-Dateien lädt defaultData
// separat.
const descriptionModules = import.meta.glob<DatasetDoc | undefined>(
  '../../../model/**/package.json',
  { eager: true, import: 'description' },
);

// Lazy-Glob für die `data`-Objekte: das Wiki lädt sie on-demand, wenn der
// Felder-Tab geöffnet wird.
const dataLoaders = import.meta.glob<unknown>(
  '../../../model/**/package.json',
  { import: 'data' },
);

// Raw-Source jeder Rust-Moduldatei — wird vom DataHandbook-Modul-Tab on-demand
// nachgeladen.
const moduleSources = import.meta.glob<string>(
  '../../../model/**/model.rs',
  { query: '?raw', import: 'default' },
);
const generatorSources = import.meta.glob<string>(
  '../../../model/**/generate.mjs',
  { query: '?raw', import: 'default' },
);

// Mapping doc.id → relativer Modellordner (z. B. `last/e100-pkw`). Wir leiten
// den Pfad aus dem Glob-Key ab, indem wir das passende Paket mit der gleichen
// `description.id` finden.
function relPathFromGlobKey(key: string): string {
  return key.replace(/^\.\.\/\.\.\/\.\.\/model\//, '');
}

const folderPathById = new Map<string, string>();
const dataLoaderByDocId = new Map<string, () => Promise<unknown>>();
for (const [key, doc] of Object.entries(descriptionModules)) {
  const id = doc?.id;
  if (!id) continue;
  const packagePath = relPathFromGlobKey(key);
  const folderPath = packagePath.replace(/\/package\.json$/, '');
  folderPathById.set(id, folderPath);
  const loader = dataLoaders[key];
  if (loader) dataLoaderByDocId.set(id, loader);
}

export async function loadDataForDocId(id: string): Promise<Record<string, unknown> | null> {
  const loader = dataLoaderByDocId.get(id);
  if (!loader) return null;
  const data = await loader();
  return (data && typeof data === 'object') ? data as Record<string, unknown> : null;
}

// Pfad-Lookup für Source-Loader (lazy): glob-Key per Pfad-Stem.
const moduleSourceLoaderByPath = new Map<string, () => Promise<string>>();
for (const [key, loader] of Object.entries(moduleSources)) {
  moduleSourceLoaderByPath.set(relPathFromGlobKey(key), loader);
}

const generatorSourceLoaderByPath = new Map<string, () => Promise<string>>();
for (const [key, loader] of Object.entries(generatorSources)) {
  generatorSourceLoaderByPath.set(relPathFromGlobKey(key), loader);
}

// Die 4 Generator-Pakete (mit generate.mjs + data.json) — bei diesen behalten
// wir den data.json-Tab und einen generate.mjs-Tab.
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

// Pfad zur Generator-data.json (nur für Generator-Pakete) — wird vom Viewer
// als JSON geladen.
export function generatorDataJsonPathForId(id: string): string | null {
  if (!generatorPackageIds.has(id)) return null;
  const folder = folderPathById.get(id);
  if (!folder) return null;
  return `${folder}/data.json`;
}

export const datasetDocs: DatasetDoc[] = Object.values(descriptionModules)
  .filter((doc): doc is DatasetDoc => !!doc);
