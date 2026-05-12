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
  fields: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

export type HandbookPage = {
  id: string;
  domain: string;
  title: string;
  short: string;
  description: string;
  overview: Array<{ label: string; value: string }>;
  sections: Array<{ title: string; items: string[] }>;
};

export const datasetIds = {
  loadHistorical2025: 'last.energy-charts.stuendlich.2025',
  generationHistorical2025: 'erzeugung.energy-charts.stuendlich.2025',
  feedInFactors2025: 'modell.einspeisefaktoren.stuendlich.2025',
} as const;

export const handbookPages: HandbookPage[] = [
  {
    id: 'modell.kernmodell',
    domain: 'modell',
    title: 'Kernmodell',
    short: 'Stündliche Bilanzrechnung aus Last, historischer Erzeugung, Speicher, Import/Export und Unterdeckung.',
    description: 'Kernmodell der Simulation: pro Stunde werden fixe Last, fixe historische Erzeugung und additive Lastannahmen bilanziert.',
    overview: [
      { label: 'Verwendung', value: 'Rechnet die stündliche Netzbilanz und daraus Jahreskennzahlen.' },
      { label: 'Zeitschritt', value: '1 Stunde' },
      { label: 'Erzeugung', value: 'Historisch fix; zusätzliche Last erhöht die Erzeugung nicht.' },
      { label: 'Ausgleich', value: 'Überschuss lädt Speicher oder wird exportiert/abgeregelt; Defizit entlädt Speicher, importiert oder wird Unterdeckung.' },
      { label: 'Code', value: 'src/simulation/engine.ts' },
    ],
    sections: [
      {
        title: 'Rechenfolge',
        items: [
          'Last aus historischem Verbrauch plus aktiven Zusatzlasten bestimmen.',
          'Historische Erzeugung aus den beobachteten Energy-Charts-Reihen übernehmen.',
          'Erzeugung minus Last bilanzieren.',
          'Überschüsse zuerst in Batterie, dann H2, dann Export, dann Abregelung.',
          'Defizite zuerst aus Batterie, dann H2, dann Import, dann Unterdeckung.',
          'Jahreskennzahlen aus den Stundenwerten summieren.',
        ],
      },
      {
        title: 'Grenzen',
        items: [
          'Kein Kraftwerksdispatch für Zusatzlasten.',
          'Keine Netzengpässe, Marktlogik oder Redispatch-Modellierung.',
          'Speicher sind einfache Energie-/Leistungsgrenzen mit Wirkungsgrad.',
        ],
      },
    ],
  },
];

export const manifestUrl = `${import.meta.env.BASE_URL}data/manifest.json`;
export const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}?view=daten`;
export const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}?view=daten&dataset=${encodeURIComponent(id)}`;
