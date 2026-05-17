import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzeugungsPool, ModelFactorHour, SpeicherPool, AussenhandelPool } from '../../src/types/data';
import type { Scenario } from '../../src/types/scenario';

export const description: DatasetDoc = {
  id: 'versorgung-historisch-2017',
  domain: 'presets',
  kind: 'composition',
  title: 'Historisch 2017',
  scripts: ['presets/versorgung-historisch-2017/model.ts'],
  source: 'Energy-Charts public_power API 2017 (echte stündliche Beobachtung).',
  sourceUrls: [
    'https://api.energy-charts.info/public_power?country=de&start=2017-01-01T00:00%2B01:00&end=2018-01-01T00:00%2B01:00',
  ],
  period: '2017',
  resolution: 'stündlich',
  unit: 'MW, TWh',
  short: 'Pass-Through der echten 2017-Stundenkurve (Kernkraft an, Kohle hoch, EE-Anteil ~36 %).',
  description: [
    '**Komposition:** das Kernmodell schaltet bei aktivem Preset auf den Historisch-Branch (`isHistorical`) und liest pro Stunde direkt die beobachteten Werte aus `erzeugung-2017` und `last-2017` statt den Dispatch zu rechnen. Die Slider-Werte zeigen den installierten Bestand Ende 2017 (`PV 42,4 GW`, `Wind on 50,2 GW`, `Wind off 5,4 GW`, `Kernkraft 10,8 GW`, `Kohle 46 GW`, `Gas 30 GW`) — sie greifen aber nicht in die Bilanz ein, sondern dienen als UI-Anzeige.',
    '**Werte:** Last-Basis `~507 TWh/a` (höher als 2025), Brutto-Erzeugung `~554 TWh/a` ohne Pumpspeicher, Saldo `~-60 TWh/a` Export, CO₂-Intensität `~485 g/kWh`. Kernkraft trägt `~76 TWh/a`, Kohle `~260 TWh/a`. Zusatzlast aus aktiven e100-Sektoren wird als automatischer Import bis zum physikalischen `NTC-Cap 35 GW` bedient; der Rest fällt als `Lastabwurf`. Speicher sind praktisch nur über Pumpspeicher (`9,4 GW / 45 GWh`) vorhanden.',
    '**Anwendungsfall:** Vergleichsanker für den 2017er Stromsektor — Kernkraftausstieg noch nicht vollzogen, Kohle dominant, EE-Anteil `~36 %`. Mit aktivem e100 wird sichtbar, wie schnell der `NTC-Cap` bei Vollelektrifizierung erschöpft ist und welche Zusatzlast nicht mehr aus Importen gedeckt werden kann.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Preset aktivieren** in der Erzeugungs-Card unter „Fix". Die Last-Basis wird automatisch auf `last-2017` (`~507 TWh`) umgestellt; e100-Sektoren wirken additiv darauf. Die Erzeugung folgt der echten 2017-Stundenkurve.',
    },
    {
      label: 'Erwartung',
      value: '**Bilanz 2017:** Brutto-Erzeugung `~554 TWh`, Saldo `~-60 TWh` (Export-Überschuss), CO₂-Faktor `~485 g/kWh`, Kernkraft `~76 TWh`, Kohle `~260 TWh`.',
    },
    {
      label: 'Quelle',
      value: '**Energy-Charts** `public_power`-API: `8.760` Stundenwerte aus 15-Minuten-Beobachtung gemittelt.',
    },
  ],
  method: [
    "Kernmodell-Branch 'isHistorical' liest pro Stunde row.observed.* statt Dispatch.",
    "Stunden-Daten werden im Loader umgeschaltet: bei supplyPreset='historical-2017' kommen erzeugung-2017 + last-2017, sonst die 2025-Datensätze.",
    'Slider-Werte in diesem Preset sind nur UI-Anzeige (Bestand 2017) — sie greifen nicht in die Bilanz ein.',
    'Zusatzlast aus e100-Sektoren wird als automatischer Import bedient, gedeckelt auf 35 GW NTC; Rest = Fehlend.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'title', unit: 'Text', description: 'Anzeigename.' },
    { name: 'source', unit: 'Text', description: 'Energy-Charts API 2017.' },
  ],
  caveats: [
    'Last-Basis ist die echte 2017-Last (~507 TWh) — höher als 2025-Last (~466 TWh). e100-Aktivierungen sind additiv zu 2017-Last, nicht zu 2025-Last.',
    'Energy-Charts importExport-Saldo ist commercial-flow, weicht von AGEB-Brutto-Statistik ab (~30 TWh).',
    'Speicher 2017 praktisch null — Batterien gab es kaum, Pumpspeicher unverändert.',
  ],
};

export type FactorHour = Pick<ModelFactorHour, 'solarIrradiance' | 'wind100m'>;
export type SupplyOverride = {
  generation: Scenario['generation'];
  storage: Scenario['storage'];
  import: Scenario['import'];
  export: Scenario['export'];
};

// Historischer Pass-Through 2017: das Kernmodell switcht die stündlichen Beobachtungs-Daten
// auf erzeugung-2017 + last-2017 anhand des supplyPreset. Der Pool wird nicht direkt konsumiert,
// die Slider-Werte sind für die UI-Anzeige gesetzt — installierter Bestand Ende 2017.
const INSTALLED_2017 = {
  pv: 42.4, windOn: 50.2, windOff: 5.4, kernkraft: 10.8,
  biomasse: 7.6, laufwasser: 4.8,
  gas: 30, kohle: 46,
};

export function compute(
  _demandTWh: number,
  _factors: FactorHour[],
  _erz: ErzeugungsPool,
  _speicher: SpeicherPool,
  aussenhandel: AussenhandelPool,
): SupplyOverride {
  return {
    generation: {
      pvInstalledGW: INSTALLED_2017.pv,
      windOnInstalledGW: INSTALLED_2017.windOn,
      windOffInstalledGW: INSTALLED_2017.windOff,
      kernkraftInstalledGW: INSTALLED_2017.kernkraft,
      biomasseInstalledGW: INSTALLED_2017.biomasse,
      laufwasserInstalledGW: INSTALLED_2017.laufwasser,
      gasInstalledGW: INSTALLED_2017.gas,
      kohleInstalledGW: INSTALLED_2017.kohle,
      pvCapacityFactorMultiplier: 1.0,
      windOnCapacityFactorMultiplier: 1.0,
      windOffCapacityFactorMultiplier: 1.8,
    },
    storage: {
      batteriePowerGW: 0,
      batterieEnergyGWh: 0,
      pumpspeicherPowerGW: 9.4,
      pumpspeicherEnergyGWh: 40,
      h2ChargePowerGW: 0,
      h2DischargePowerGW: 0,
      h2EnergyGWh: 0,
    },
    import: {
      stromGW: 14,
      stromEmissionGperKWh: aussenhandel.strom.import.emissionGperKWh,
      h2TWh: 0,
    },
    export: {
      stromGW: 30,
    },
  };
}
