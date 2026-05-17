import { dataPackageIds } from './dataPackages';

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

export const datasetIds = dataPackageIds;

export const templateDescriptionPaths = [
  'templates/scenario-description.template.json',
] as const;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}wiki/`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}wiki/${encodeURIComponent(id)}`;

// Eager glob über alle TS-Module unter data/. `import: 'description'` lässt Vite
// nur das description-Export inlinen — `data`-Konstanten der Big-Datasets bleiben
// tree-shakable und können von defaultData.ts per dynamic import in eigene
// Chunks gepackt werden. Modul-Files ohne `description` (z.B. *.model.ts)
// fallen über das !!doc-Filter raus.
const descriptionModules = import.meta.glob<DatasetDoc | undefined>(
  '../../data/**/*.ts',
  { eager: true, import: 'description' },
);

// Raw-Source jedes TS-Moduls — wird vom DataHandbook-Modul-Tab on-demand
// nachgeladen, damit die großen Hour-Arrays nicht im Initial-Bundle landen.
const moduleSources = import.meta.glob<string>(
  '../../data/**/*.ts',
  { query: '?raw', import: 'default' },
);
const generatorSources = import.meta.glob<string>(
  '../../data/**/generate.mjs',
  { query: '?raw', import: 'default' },
);

// Mapping doc.id → relative Pfad-Variante (z. B. `last/e100-pkw.ts` für Flat-
// Form, `erzeugung/2017/index.ts` für Generator-Pakete). Wir leiten den Pfad
// aus dem Glob-Key ab, indem wir das passende Modul mit der gleichen
// `description.id` finden.
function relPathFromGlobKey(key: string): string {
  return key.replace(/^\.\.\/\.\.\/data\//, '');
}

const docPathById = new Map<string, string>();
for (const [key, doc] of Object.entries(descriptionModules)) {
  const id = doc?.id;
  if (id) docPathById.set(id, relPathFromGlobKey(key));
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
  return docPathById.get(id) ?? null;
}

export function generatorPathForId(id: string): string | null {
  const docPath = docPathById.get(id);
  if (!docPath) return null;
  const folder = docPath.replace(/\/index\.ts$/, '').replace(/\.ts$/, '');
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
  const docPath = docPathById.get(id);
  if (!docPath) return null;
  const folder = docPath.replace(/\/index\.ts$/, '').replace(/\.ts$/, '');
  return `${folder}/data.json`;
}

export const datasetDocs: DatasetDoc[] = Object.values(descriptionModules)
  .filter((doc): doc is DatasetDoc => !!doc);
