export type DatasetDoc = {
  id: string;
  domain: string;
  title: string;
  file: string;
  doc: string;
  scripts?: string[];
  source: string;
  period: string;
  resolution: string;
  unit: string;
  short: string;
  description: string;
  overview?: Array<{ label: string; value: string }>;
  sections?: Array<{ title: string; items: string[] }>;
  fields: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

export const datasetIds = {
  loadHistorical2025: 'last.energy-charts.stuendlich.2025',
  bevPkwKm: 'last.pkw-elektrifizierung',
  generationHistorical2025: 'erzeugung.energy-charts.stuendlich.2025',
  coreModel: 'modell.kernmodell',
  feedInFactors2025: 'modell.einspeisefaktoren.stuendlich.2025',
} as const;

export const manifestUrl = `${import.meta.env.BASE_URL}data/manifest.json`;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}?view=daten`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}?view=daten&dataset=${encodeURIComponent(id)}`;
