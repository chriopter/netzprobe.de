import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzPackageVariableRe } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'windoff',
  domain: 'erzeugung',
  kind: 'scenario',
  title: 'Wind Offshore',
  file: 'erzeugung/windoff/data.json',
  scripts: [
    'erzeugung/windoff/model.ts',
  ],
  source: 'Energy-Charts installed_power 2025 (Wind Offshore Deutschland); MTGermany energy-simulation-de (Emissionsfaktor).',
  sourceUrls: [
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
    'https://github.com/MTGermany/energy-simulation-de',
    'https://app.electricitymaps.com/zone/DE',
  ],
  period: '2025',
  resolution: 'stündlich (Faktor) / jährlich (installierte Leistung)',
  unit: 'GW, g/kWh',
  short: 'Installierte Wind-Offshore-Leistung; stündliche Einspeisung aus 100-m-Windfeld (Onshore-Faktor).',
  description: [
    '**Anlagenpark:** rund `1.560` Offshore-Turbinen in Nordsee und Ostsee mit einer installierten Gesamtleistung von `9,4 GW` (Energy-Charts, Jahresmittel 2025) bilden den **Default**. Der Ausbau läuft im Korridor `1–2 GW/a`; das Slider-Maximum `400 GW` (Schritt `2 GW`) erlaubt H2- und Vollelektrifizierungs-Szenarien deutlich jenseits des deutschen Hoheitsgebiets, in dem das WindSeeG-Ziel `70 GW` bis 2045 vorsieht.',
    '**Einspeisecharakteristik:** das Modell nutzt denselben Einspeisefaktor `wind100m` wie Onshore — `supplyGW(t) = installedGW × wind100m[t]` — und liefert damit rund `1900–2200 h/a` Volllaststunden. Reale Offshore-Standorte erreichen dagegen `3500–4500 h/a` (Fraunhofer IWES, BNetzA Monitoring). Daraus folgt eine **systematische Unterzeichnung um Faktor 2**: beim Default `9,4 GW` weist das Modell rund `18 TWh/a` aus, die reale Einspeisung 2024/25 liegt eher bei `30–40 TWh/a`. Auch die Lastform ist **gleichphasig zu Onshore** statt der für Offshore typischen glatteren, weniger korrelierten Erzeugung. Spezifische Emissionen `13 g/kWh` (Anlagenbau und Fundamente; electricitymaps DE).',
    '**Modellgrenze — Slider liegt systematisch unter Real-Erzeugung:** wer im Slider den Energy-Charts-Wert `9,4 GW` einstellt, sieht im Chart nur etwa die halbe reale Offshore-Einspeisung. Ein eigener Offshore-Faktor mit höheren Volllaststunden und glatterer Stundenverteilung ist nicht hinterlegt — das ist die zentrale bewusste **Vereinfachung**. Netzanbindung (HVDC-Konverter, Wartungsausfälle), Standortabhängigkeit Nordsee vs. Ostsee und Cluster-Wirbeleffekte bleiben außen vor. Curtailment greift im Kernmodell als erstes bei Überschuss; reale BNetzA-Abregelung wegen Anbindungs-Engpässen ist nicht abgebildet.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `400 GW`, Schritt `2 GW`. Default `9,4 GW` ist der Energy-Charts-Bestand Ende 2025; das Maximum liegt deutlich über dem WindSeeG-Ziel `70 GW` bis 2045 und bietet Spielraum für H2-Export- und Hub-Szenarien.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** `supplyGW(t) = installedGW × wind100m[t]` mit Onshore-Faktor aus `einspeisefaktoren-2025` (gleichphasig statt offshore-glatt — siehe Caveats).',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Emissionen(t) = supplyGW(t) × 13 g/kWh`. Bei Überschuss curtailed das Kernmodell Offshore als erstes — vor Onshore und PV.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/erzeugung/windoff/data.json, Adapter in data/erzeugung/windoff/model.ts.',
    'Installierte Leistung Ende 2025 laut Energy-Charts.',
    'Einspeisefaktor wind100m wie Onshore — kein eigener Offshore-Faktor hinterlegt.',
    'Emissionsfaktor 13 g/kWh laut MTGermany.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'installed2025GW', unit: 'GW', description: 'Installierte Leistung Stand Ende 2025.' },
    { name: 'defaultInstalledGW', unit: 'GW', description: 'Slider-Default.' },
    { name: 'minInstalledGW', unit: 'GW', description: 'Slider-Minimum.' },
    { name: 'maxInstalledGW', unit: 'GW', description: 'Slider-Maximum.' },
    { name: 'stepGW', unit: 'GW', description: 'Slider-Schrittweite.' },
    { name: 'mode', unit: 'Enum', description: 'variable-re.' },
    { name: 'factorPackage', unit: 'Text', description: 'einspeisefaktoren-2025.' },
    { name: 'factorField', unit: 'Text', description: 'wind100m.' },
    { name: 'emissionGperKWh', unit: 'g/kWh', description: 'Spezifische CO₂-Emissionen.' },
  ],
  caveats: [
    'Wind Offshore nutzt denselben Einspeisefaktor wie Onshore; ein eigener Offshore-Faktor mit höherem Volllaststundenwert ist nicht hinterlegt.',
    'Reale Offshore-Volllaststunden 3500–4500 h/a (Fraunhofer IWES, BNetzA) vs. Modell 1900–2200 h/a (Onshore-Faktor) — Offshore-Erzeugung im Modell rund Faktor 2 zu niedrig, der Slider-Wert ist also nicht mit der realen Offshore-Einspeisung vergleichbar.',
    'Auch die Lastform ist gleichphasig zu Onshore; die für Offshore typische glattere Erzeugungskurve und geringere Korrelation mit Onshore fehlen.',
    'Installierte Leistung ist Jahresmittel; Inbetriebnahmen während des Jahres nicht stundenaufgelöst.',
  ],
};

export const data: ErzPackageVariableRe = {
  id: 'windoff',
  name: 'Wind Offshore',
  installed2025GW: 9.4,
  defaultInstalledGW: 9.4,
  minInstalledGW: 0,
  maxInstalledGW: 400,
  stepGW: 2,
  mode: 'variable-re',
  factorPackage: 'einspeisefaktoren-2025',
  factorField: 'wind100m',
  emissionGperKWh: 13,
};
