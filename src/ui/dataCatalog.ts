export type ManifestEntry = {
  id: string;
  domain: string;
  description: string;
};

export type DatasetParent = {
  code: string;
  name: string;
};

export type DatasetDoc = {
  id: string;
  code: string;
  parent?: DatasetParent;
  domain: string;
  title: string;
  file: string;
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
  fields: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

export const datasetCodes = {
  loadHistorical2025: 'LAST25',
  bevPkwKm: 'E100-PKW',
  heatPump: 'E100-HEIZ',
  generationHistorical2025: 'ERZ25',
  coreModel: 'KERN',
  feedInFactors2025: 'EF25',
} as const;

export const parentCodes = {
  fullElectrification: { code: 'E100', name: '100% Elektrifizierung' },
} as const;

export const manifestUrl = `${import.meta.env.BASE_URL}data/manifest.json`;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}?view=daten`;
export const dataWikiUrl = (code: string) => `${import.meta.env.BASE_URL}?view=daten&code=${encodeURIComponent(code)}`;
