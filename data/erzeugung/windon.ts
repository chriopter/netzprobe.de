import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzPackageVariableRe } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'windon',
  domain: 'erzeugung',
  kind: 'scenario',
  title: 'Wind Onshore',
  file: 'erzeugung/windon/data.json',
  scripts: [
    'erzeugung/windon/model.ts',
  ],
  source: 'Energy-Charts installed_power 2025 (Wind Onshore Deutschland); MTGermany energy-simulation-de (Emissionsfaktor).',
  sourceUrls: [
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
    'https://github.com/MTGermany/energy-simulation-de',
    'https://app.electricitymaps.com/zone/DE',
  ],
  period: '2025',
  resolution: 'stündlich (Faktor) / jährlich (installierte Leistung)',
  unit: 'GW, g/kWh',
  short: 'Installierte Wind-Onshore-Leistung; stündliche Einspeisung aus 100-m-Windfeld.',
  description: [
    '**Anlagenpark:** rund `28.700` Onshore-Windturbinen mit einer installierten Gesamtleistung von `62,8 GW` (Energy-Charts, Jahresmittel 2025) bilden den **Default** — überwiegend in Nord- und Ostdeutschland, mit zunehmend repowerten Standorten in der Mitte. Der Nettozubau liegt zuletzt bei `3–4 GW/a`; das Slider-Maximum `1200 GW` (Schritt `5 GW`) deckt auch radikale Ausbau- und H2-Szenarien ab.',
    '**Einspeisecharakteristik:** die Stundenleistung folgt dem deutschlandweit gewichteten 100-m-Windfeld — `supplyGW(t) = installedGW × wind100m[t]`. Der normierte Einspeisefaktor aus `einspeisefaktoren-2025` läuft stündlich zwischen `0` (Flautenstunden) und etwa `0,95` (Sturmphasen). Über das Jahr ergibt das Volllaststunden im Korridor `1900–2200 h/a` und damit beim Default-Bestand rund `120 TWh/a` Energieertrag; die Lastform ist **antizyklisch zu PV** (Winterhochs, Sommerschwäche) und an die Großwetterlage gekoppelt — Dunkelflauten von mehreren Tagen sind in den Faktoren enthalten. Spezifische Emissionen `13 g/kWh` (Anlagenbau, Wartung; electricitymaps DE).',
    '**Modellgrenze:** der Einspeisefaktor ist ein **Bundesmittel**: Standortqualität (Küste vs. Mittelgebirge vs. Süd), Repowering-Effekte und Nabenhöhen-Mix sind aggregiert. Installierte Leistung ist Jahresmittel — unterjähriger Zubau wird nicht stundenscharf ausgerollt. Curtailment im Kernmodell greift nach Wind Offshore und vor PV; reale Netzengpass-Abregelung (Schleswig-Holstein, NEMO) ist nicht abgebildet.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `1200 GW`, Schritt `5 GW`. Default `62,8 GW` ist der Energy-Charts-Bestand Ende 2025; das Maximum bietet Kopfraum für Vollversorgungs-Szenarien (EEG-Pfad `115 GW` bis 2030, Langfristszenarien BMWK `160–240 GW`) sowie Power-to-X-Überdimensionierung.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** `supplyGW(t) = installedGW × wind100m[t]` aus `einspeisefaktoren-2025`. Stundenwerte `0`–`0,95`, ausgeprägte Wetterabhängigkeit, Winterüberhang, mehrtägige Flautenphasen erhalten.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Emissionen(t) = supplyGW(t) × 13 g/kWh`. Bei Überschuss curtailed das Kernmodell Onshore nach Offshore und vor PV.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/erzeugung/windon/data.json, Adapter in data/erzeugung/windon/model.ts.',
    'Installierte Leistung Ende 2025 laut Energy-Charts (Jahresmittel).',
    'Einspeisefaktor wind100m stündlich aus einspeisefaktoren-2025; Werte 0 bis etwa 0,95.',
    'Emissionsfaktor 13 g/kWh laut MTGermany (Quelle: electricitymaps DE).',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'installed2025GW', unit: 'GW', description: 'Installierte Leistung Stand Ende 2025.' },
    { name: 'defaultInstalledGW', unit: 'GW', description: 'Slider-Default.' },
    { name: 'minInstalledGW', unit: 'GW', description: 'Slider-Minimum.' },
    { name: 'maxInstalledGW', unit: 'GW', description: 'Slider-Maximum.' },
    { name: 'stepGW', unit: 'GW', description: 'Slider-Schrittweite.' },
    { name: 'mode', unit: 'Enum', description: 'variable-re: aus Einspeisefaktor berechnet.' },
    { name: 'factorPackage', unit: 'Text', description: 'Verweis auf einspeisefaktoren-2025.' },
    { name: 'factorField', unit: 'Text', description: 'wind100m.' },
    { name: 'emissionGperKWh', unit: 'g/kWh', description: 'Spezifische CO₂-Emissionen.' },
  ],
  caveats: [
    'Einspeisefaktor wind100m ist deutschlandweiter Durchschnitt; regionale Unterschiede (Küste vs. Süd) nicht abgebildet.',
    'Default 62,8 GW ist Jahresmittel; Wachstum 2025 wird nicht stundenaufgelöst berücksichtigt.',
    'Standortqualität (Repowering vs. Neuanlagen) ist im Faktor nicht differenziert.',
  ],
};

export const data: ErzPackageVariableRe = {
  id: 'windon',
  name: 'Wind Onshore',
  installed2025GW: 62.8,
  defaultInstalledGW: 62.8,
  minInstalledGW: 0,
  maxInstalledGW: 1200,
  stepGW: 5,
  mode: 'variable-re',
  factorPackage: 'einspeisefaktoren-2025',
  factorField: 'wind100m',
  emissionGperKWh: 13,
};
