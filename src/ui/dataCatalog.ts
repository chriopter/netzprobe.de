import { dataManifestUrl, dataPackageIds, registerDataPackagePath } from './dataPackages';

export type ManifestEntry = {
  id: string;
  path: string;
  description: string;
};

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

export const manifestUrl = dataManifestUrl;
export const templateDescriptionPaths = [
  'templates/scenario-description.template.json',
] as const;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}wiki/`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}wiki/${encodeURIComponent(id)}`;

export function applyManifestPaths(entries: ManifestEntry[]): void {
  for (const entry of entries) registerDataPackagePath(entry.id, entry.path);
}
