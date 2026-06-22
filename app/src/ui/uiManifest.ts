// Kompatibilitäts-Layer: alte uiManifest-Struktur, aber live aus den
// migrierten model/*/package.json gelesen. Keine eigene Datenquelle mehr.
//
// Konsumenten (defaultData.ts, scenarioPresets.ts) bleiben unverändert;
// langfristig können sie direkt auf `getPackage(id)` umgestellt werden.
import { getPackage } from './dataCatalog';

type AnyParams = Record<string, any>;

function params(id: string): AnyParams {
  const p = getPackage(id);
  if (!p) throw new Error(`Unknown package: ${id}`);
  return p.parameters as unknown as AnyParams;
}

function method(id: string): AnyParams {
  const p = getPackage(id);
  if (!p) throw new Error(`Unknown package: ${id}`);
  return p.method as unknown as AnyParams;
}

const last2025 = params('last-2025');
const last2017 = params('last-2017');
const erz2025 = params('erzeugung-2025');
const erz2017 = params('erzeugung-2017');

export const uiManifest = {
  source: method('last-2025').source,
  load2025: { sumTWh: last2025.sumTWh },
  load2017: { sumTWh: last2017.sumTWh },
  generation2025: {
    sumTWh: erz2025.sumTWh,
    sumImportTWh: erz2025.sumImportTWh,
    sumSharesPct: erz2025.sumSharesPct,
    sumPartsTWh: erz2025.sumPartsTWh,
  },
  generation2017: { sumTWh: erz2017.sumTWh },
  e100: {
    pkw: params('e100-pkw'),
    heiz: params('e100-heiz'),
    lkw: params('e100-lkw'),
    bahn: params('e100-bahn'),
    schiff: params('e100-schiff'),
    flug: params('e100-flug'),
    ghd: params('e100-ghd'),
    'industrie-waerme': params('e100-industrie-waerme'),
    stahl: params('e100-stahl'),
    chemie: params('e100-chemie'),
  },
  klima: params('klimatisierung'),
  generation: {
    pv: params('pv'),
    windon: params('windon'),
    windoff: params('windoff'),
    kernkraft: params('kernkraft'),
    biomasse: params('biomasse'),
    laufwasser: params('laufwasser'),
    gas: params('gas'),
    kohle: params('kohle'),
  },
  storage: {
    batterie: params('batterie'),
    pumpspeicher: params('pumpspeicher'),
    h2: params('h2'),
  },
  materials: params('weltfoerderung').materials,
  prices: params('preise'),
  trade: {
    strom: params('strom-handel'),
    h2: params('h2-handel'),
  },
  kern: params('kern'),
  historisch2025: params('historisch-2025'),
  historisch2017: params('historisch-2017'),
} as const;
