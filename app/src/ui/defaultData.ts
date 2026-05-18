import type { DataSet } from '../types/data';
import { uiManifest } from './uiManifest';

export async function loadJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${url} (${response.status})`);
  return response.json() as Promise<T>;
}

export async function loadDefaultData(): Promise<DataSet> {
  return {
    source: uiManifest.source,
    'e100-pkw': uiManifest.e100.pkw,
    'e100-heiz': uiManifest.e100.heiz,
    'e100-lkw': uiManifest.e100.lkw,
    'e100-bahn': uiManifest.e100.bahn,
    'e100-schiff': uiManifest.e100.schiff,
    'e100-flug': uiManifest.e100.flug,
    'e100-ghd': uiManifest.e100.ghd,
    'e100-industrie-waerme': uiManifest.e100['industrie-waerme'],
    'e100-stahl': uiManifest.e100.stahl,
    'e100-chemie': uiManifest.e100.chemie,
    'erzeugungs-modell': {
      sources: {
        pv: uiManifest.generation.pv,
        windOn: uiManifest.generation.windon,
        windOff: uiManifest.generation.windoff,
        kernkraft: uiManifest.generation.kernkraft,
        biomasse: uiManifest.generation.biomasse,
        laufwasser: uiManifest.generation.laufwasser,
        gas: uiManifest.generation.gas,
        kohle: uiManifest.generation.kohle,
      },
      dispatchOrder: uiManifest.kern.dispatchOrder,
    },
    'speicher-modell': {
      storages: {
        batterie: uiManifest.storage.batterie,
        pumpspeicher: uiManifest.storage.pumpspeicher,
        h2: uiManifest.storage.h2,
      },
    },
    'aussenhandel-modell': {
      strom: uiManifest.trade.strom,
      h2: {
        import: uiManifest.trade.h2.import,
        referenceScales: uiManifest.trade.h2.referenceScales,
      },
    },
    loadSumTWh: uiManifest.load2025.sumTWh,
    generationSumTWh: uiManifest.generation2025.sumTWh,
    importSumTWh: uiManifest.generation2025.sumImportTWh,
    generationSharesPct: uiManifest.generation2025.sumSharesPct,
    generationPartsTWh: uiManifest.generation2025.sumPartsTWh,
  } as unknown as DataSet;
}

export type Historical2017Data = {
  loadSum2017TWh?: number;
  generationSum2017TWh?: number;
};

export function loadHistorical2017(): Promise<Historical2017Data> {
  return Promise.resolve({
    loadSum2017TWh: uiManifest.load2017.sumTWh,
    generationSum2017TWh: uiManifest.generation2017.sumTWh,
  });
}
