export type DatasetDoc = {
  id: string;
  domain: string;
  title: string;
  file: string;
  doc: string;
  source: string;
  period: string;
  resolution: string;
  unit: string;
  short: string;
  description: string;
  fields: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

export const datasetIds = {
  loadHistorical2025: 'last.energy-charts.stuendlich.2025',
  generationHistorical2025: 'erzeugung.energy-charts.stuendlich.2025',
  feedInFactors2025: 'modell.einspeisefaktoren.stuendlich.2025',
} as const;

export const manifestUrl = `${import.meta.env.BASE_URL}data/manifest.json`;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}?view=daten`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}?view=daten&dataset=${encodeURIComponent(id)}`;
