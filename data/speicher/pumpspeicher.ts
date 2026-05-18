import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { SpeicherPumpspeicherData } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'pumpspeicher',
  domain: 'speicher',
  kind: 'scenario',
  title: 'Pumpspeicher',
  file: 'speicher/pumpspeicher/data.json',
  scripts: [
    'speicher/pumpspeicher/model.ts',
  ],
  source: 'Energy-Charts (Pumpspeicher DE-LU-Bestand 2025); ENTSO-E Transparency Platform (DE-LU Marktgebiet 2023 9,93 GW); Vattenfall Goldisthal Powerplant-Datasheet; BMWK/dena Zubaupotenzial-Studien.',
  sourceUrls: [
    'https://www.energy-charts.info/',
    'https://transparency.entsoe.eu/',
    'https://powerplants.vattenfall.com/de/goldisthal/',
    'https://de.wikipedia.org/wiki/Liste_von_Pumpspeicherkraftwerken',
  ],
  period: '2025',
  resolution: 'stündlich',
  unit: 'GW, GWh',
  short: 'Slider für Pumpspeicher-Leistung und -Energie; mittelfristiger Tages- bis Wochenausgleich mit `80 %` Roundtrip-Wirkungsgrad.',
  description: [
    '**Geographie und Bestand:** der Default `9,4 GW / 45 GWh` entspricht dem DE-LU-Marktgebiet Ende `2025`. Er setzt sich aus Goldisthal (`1,06 GW / 8,5 GWh`), Markersbach (`~1 GW / 4 GWh`), weiteren deutschen Anlagen (`~6,8 GW / 27 GWh` DE-only) und Vianden in Luxembourg (`1,3 GW / 4,9 GWh`, bilanziell zum DE-LU-Marktgebiet zählend) zusammen. Das Energie-zu-Leistung-Verhältnis von rund `4,8 h` macht den Pumpspeicher zum klassischen **Tages- bis Wochenausgleich**, während Batterien den Stundenhub und H₂ den saisonalen Ausgleich übernehmen.',
    '**Wirkungsgrad-Korridor:** der angesetzte Roundtrip-Wert `80 %` liegt am oberen Rand des realen Korridors `70–78 %`, der sich aus Pumpen- und Turbinen-Verlusten, Wasserreibung und Verdunstung speist. Goldisthal erreicht laut Vattenfall rund `80 %`, ältere Anlagen wie Niederwartha liegen näher an `70 %`. Das Modell führt **keine getrennte Effizienz** für Pump- und Turbinenrichtung — der gesamte Verlust wird der Ladeseite zugeschlagen. Die Greedy-Dispatch-Mechanik mit Priorität `2` (nach Batterie, vor H₂) wird in der Batterie-Beschreibung getragen.',
    '**Zubaupotenzial:** das Slider-Maximum `15 GW / 100 GWh` umfasst Bestand plus aggressives Zubaupotenzial (`+5–6 GW` laut BMWK/dena 2024). Weiterer Ausbau ist topographisch und durch Naturschutz limitiert — verfügbare Standorte sind kartiert, neue Anlagen scheitern eher an Genehmigungen als an Geologie. Saisonale Befüllung aus natürlichem Zufluss (Frühjahrshochwasser-Bonus realer Anlagen) wird nicht modelliert.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** Leistung `0` bis `15 GW` (Default `9,4 GW`, Schritt `1 GW`), Energie `0` bis `100 GWh` (Default `45 GWh`, Schritt `10 GWh`). Default ist der DE-LU-Bestand inklusive Vianden; DE-only wären `~6,8 GW`. Das Maximum schöpft das realistische Zubaupotenzial aus.',
    },
    {
      label: 'Verteilung',
      value: '**Greedy-Dispatch:** Laden bei Überschuss, Entladen bei Unterdeckung. **Priorität** `2` — nach Batterie, vor H₂. Deckt damit den Tages- bis Wochenhub ab.',
    },
    {
      label: 'Formel',
      value: '**Bilanz:** `SoC(t+1) = SoC(t) + 0,8 · ΔLaden − ΔEntladen`. Verluste fallen vollständig beim Laden an.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/speicher/pumpspeicher/data.json, Adapter in data/speicher/pumpspeicher/model.ts.',
    'Roundtrip-Wirkungsgrad 80 % entspricht MTGermany; reale Pumpspeicher 70-78 % je nach Anlage.',
    'Initial-SoC: Pass 1 startet leer (`initialStateOfChargeFraction = 0`), der Year-End-SoC dient als Anfangswert für Pass 2. Bei reinen Pumpspeicher-Szenarien ohne nennenswerte H₂-Kapazität wird der Warm-up übersprungen — der tägliche Pumpspeicher-Zyklus schwingt sich in wenigen Tagen ein.',
    'Dispatch-Priorität 2 — wird nach Batterie eingesetzt.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'power2025GW', unit: 'GW', description: 'Installierte Leistung Ende 2025.' },
    { name: 'defaultPowerGW', unit: 'GW', description: 'Slider-Default Leistung.' },
    { name: 'minPowerGW', unit: 'GW', description: 'Slider-Minimum Leistung.' },
    { name: 'maxPowerGW', unit: 'GW', description: 'Slider-Maximum Leistung.' },
    { name: 'stepPowerGW', unit: 'GW', description: 'Slider-Schrittweite Leistung.' },
    { name: 'energy2025GWh', unit: 'GWh', description: 'Installierter Energieinhalt Ende 2025.' },
    { name: 'defaultEnergyGWh', unit: 'GWh', description: 'Slider-Default Energie.' },
    { name: 'minEnergyGWh', unit: 'GWh', description: 'Slider-Minimum Energie.' },
    { name: 'maxEnergyGWh', unit: 'GWh', description: 'Slider-Maximum Energie.' },
    { name: 'stepEnergyGWh', unit: 'GWh', description: 'Slider-Schrittweite Energie.' },
    { name: 'roundtripEfficiency', unit: 'Anteil', description: 'Roundtrip-Wirkungsgrad (0,8).' },
    { name: 'initialStateOfChargeFraction', unit: 'Anteil', description: 'Seed-SoC für 2-Pass-Lauf (0).' },
    { name: 'dispatchPriority', unit: 'Rang', description: 'Reihenfolge im Dispatch (2).' },
    { name: 'referenceScales', unit: 'Objekt', description: 'Größenanker zur Einordnung: 1 Einheit entspricht etwa Pumpspeicher Goldisthal (8,5 GWh).' },
  ],
  caveats: [
    'Maximum 15 GW / 100 GWh reflektiert DE-LU-Marktgebietsbestand (9,4 GW) plus aggressives Zubaupotenzial (+5-6 GW); weiterer Zubau topographisch und durch Naturschutz limitiert. Default 9,4 GW schließt Vianden Luxembourg ein (gehört bilanziell zum DE-LU-Marktgebiet); DE-only wären ~6,8 GW.',
    'Wirkungsgrad 80 % ist optimistisch — reale Anlagen 70-78 %.',
    'Saisonale Befüllung nicht modelliert; reale Pumpspeicher haben Frühjahrshochwasser-Bonus.',
  ],
};

export const data: SpeicherPumpspeicherData = {
  id: 'pumpspeicher',
  name: 'Pumpspeicher',
  power2025GW: 9.4,
  defaultPowerGW: 9.4,
  minPowerGW: 0,
  maxPowerGW: 15,
  stepPowerGW: 1,
  energy2025GWh: 45,
  defaultEnergyGWh: 45,
  minEnergyGWh: 0,
  maxEnergyGWh: 100,
  stepEnergyGWh: 10,
  roundtripEfficiency: 0.8,
  initialStateOfChargeFraction: 0,
  dispatchPriority: 2,
  referenceScales: {
    energy: { value: 8.5, unit: 'GWh', label: 'Pumpspeicher Goldisthal (8,5 GWh)' },
  },
};

export const speicherPumpspeicherData = data;
export default speicherPumpspeicherData;
