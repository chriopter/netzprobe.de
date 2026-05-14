import { dataManifestUrl, dataPackageIds } from '../dataPackages';

export type ManifestEntry = {
  id: string;
  description: string;
};

export type DatasetDoc = {
  id: string;
  parentId?: string;
  domain: string;
  kind: 'dataset' | 'scenario' | 'composition' | 'model';
  title: string;
  file?: string;
  scripts?: string[];
  source: string;
  sourceUrls?: string[];
  period: string;
  resolution: string;
  unit: string;
  short: string;
  description: string;
  overview?: Array<{ label: string; value: string }>;
  method?: string[];
  sections?: Array<{ title: string; items: string[] }>;
  fields?: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

export const datasetIds = dataPackageIds;

export const manifestUrl = dataManifestUrl;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}?view=daten`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}?view=daten&id=${encodeURIComponent(id)}`;
