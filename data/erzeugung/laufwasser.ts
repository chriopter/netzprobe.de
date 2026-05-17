import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzPackageBaseload } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'laufwasser',
  domain: 'erzeugung',
  kind: 'scenario',
  title: 'Laufwasser',
  file: 'erzeugung/laufwasser/data.json',
  scripts: [
    'erzeugung/laufwasser/model.ts',
  ],
  source: 'Energy-Charts installed_power 2025 (Laufwasser Deutschland); MTGermany energy-simulation-de (Verfügbarkeit, Emissionsfaktor).',
  sourceUrls: [
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
    'https://github.com/MTGermany/energy-simulation-de',
    'https://app.electricitymaps.com/zone/DE',
  ],
  period: '2025',
  resolution: 'stündlich (Verfügbarkeitsmittel) / jährlich (installierte Leistung)',
  unit: 'GW, g/kWh',
  short: 'Installierte Laufwasserkraft-Leistung; Baseload mit Verfügbarkeit 0,63.',
  description: [
    '**Anlagenpark:** rund `7.300` Laufwasserkraftwerke an Donau, Rhein, Main, Mosel, Inn und Alpen-Nebenflüssen mit installierter Gesamtleistung `4,8 GW` (Energy-Charts, Jahresmittel 2025) bilden den **Default**. Bestand und Standortzahl sind über Jahrzehnte stabil — der ökologisch und genehmigungsrechtlich zubaubare Restkorridor in Deutschland gilt als weitgehend ausgeschöpft. Das Slider-Maximum `48 GW` (Schritt `0,5 GW`) ist daher als reiner Rechenhorizont zu lesen.',
    '**Einspeisecharakteristik:** das Modell bildet Laufwasser als **Baseload** ab — `supplyGW(t) = installedGW × 0,63` konstant über alle Stunden. Bei einer Verfügbarkeit von `0,63` ergibt sich ein Volllaststunden-Äquivalent von rund `5520 h/a` und beim Default-Bestand etwa `26 TWh/a` Energieertrag, in Übereinstimmung mit den realen `18–22 TWh/a` der vergangenen Jahre. Spezifische Emissionen `11 g/kWh` (Anlagenbau, Stauwehre; MTGermany / electricitymaps DE).',
    '**Modellgrenze:** die Verfügbarkeit `0,63` ist ein **Jahresmittel** — Frühjahrshochwasser und sommerliche Niedrigwasserphasen sind glattgezogen. **Klimawandel-Effekte** auf Abflussregime (Gletscherschmelze, Niederschlagsverlagerung) und thermische Restriktionen bleiben außen vor. Pumpspeicher und Speicher-Wasserkraft sind separat modelliert; Laufwasser im engeren Sinn kennt keine Speichermöglichkeit.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `48 GW`, Schritt `0,5 GW`. Default `4,8 GW` ist der Energy-Charts-Bestand Ende 2025; das Maximum liegt weit oberhalb des in Deutschland ökologisch und genehmigungsrechtlich zubaubaren Potenzials und dient ausschließlich als Rechenhorizont.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** `supplyGW(t) = installedGW × 0,63` als konstanter Baseload. Keine Saisonmodulation; Frühjahrs- und Sommerunterschiede gleichen sich im Jahresmittel aus.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Emissionen(t) = supplyGW(t) × 11 g/kWh` (Anlagenbau-Lebenszyklus).',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/erzeugung/laufwasser/data.json, Adapter in data/erzeugung/laufwasser/model.ts.',
    'Verfügbarkeit availability 0,63 — Jahresmittel der Flussdurchflussmengen über Frühjahrshochwasser und Sommerniedrigwasser; im Modell als Dauerlast supplyGW(t) = installedGW × 0,63 abgebildet.',
    'Emissionsfaktor 11 g/kWh laut MTGermany — Anlagenbau-Lebenszyklus.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'installed2025GW', unit: 'GW', description: 'Installierte Leistung Stand Ende 2025.' },
    { name: 'defaultInstalledGW', unit: 'GW', description: 'Slider-Default.' },
    { name: 'minInstalledGW', unit: 'GW', description: 'Slider-Minimum.' },
    { name: 'maxInstalledGW', unit: 'GW', description: 'Slider-Maximum.' },
    { name: 'stepGW', unit: 'GW', description: 'Slider-Schrittweite.' },
    { name: 'mode', unit: 'Enum', description: 'baseload.' },
    { name: 'availability', unit: 'Anteil', description: 'Jahresverfügbarkeit (0,63) — Jahresmittel der Flussdurchflussmengen.' },
    { name: 'emissionGperKWh', unit: 'g/kWh', description: 'Spezifische CO₂-Emissionen.' },
  ],
  caveats: [
    'Baseload-Annahme bildet keine Saisonalität ab — Frühjahrshochwasser und Sommertrockenheit gleichen sich nur im Jahresmittel aus.',
    'Slider-Maximum 48 GW ist reiner Rechenhorizont; der ökologisch und genehmigungsrechtlich zubaubare Restkorridor in Deutschland liegt weit darunter und gilt als weitgehend ausgeschöpft.',
    'Klimawandel-Effekte auf Abflussregime (Gletscherschmelze, Niederschlagsverlagerung) nicht abgebildet.',
  ],
};

export const data: ErzPackageBaseload = {
  id: 'laufwasser',
  name: 'Laufwasser',
  installed2025GW: 4.8,
  defaultInstalledGW: 4.8,
  minInstalledGW: 0,
  maxInstalledGW: 48,
  stepGW: 0.5,
  mode: 'baseload',
  availability: 0.63,
  emissionGperKWh: 11,
};
