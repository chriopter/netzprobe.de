import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { AussenhandelH2Data } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'h2-handel',
  domain: 'aussenhandel',
  kind: 'scenario',
  title: 'H2-Außenhandel',
  source: 'BMWK Nationale Wasserstoffstrategie 2023 (Importbedarf 2030: 50-70 TWh, 2045: 200-400 TWh); Ariadne H2-Roadmap; Agora Klimaneutrales Deutschland 2045 (importgedeckter Anteil).',
  sourceUrls: [
    'https://www.bmwk.de/Redaktion/DE/Publikationen/Energie/fortschreibung-der-nationalen-wasserstoffstrategie.html',
    'https://ariadneprojekt.de/publikation/wasserstoff-import/',
    'https://www.agora-energiewende.de/publikationen/klimaneutrales-deutschland-2045/',
  ],
  period: '2025-2045',
  resolution: 'jährlich',
  unit: 'TWh/Jahr (H2 LHV)',
  short: 'Importierter Wasserstoff als Jahresbilanz, der den inländischen Strom-Aufwand der H2-Sektoren ersetzt.',
  description: [
    '**Sektor:** importierter Wasserstoff, geliefert per Pipeline aus Skandinavien und dem Maghreb oder verschifft als Ammoniak/LOHC. Das Modell behandelt die Importmenge als reine TWh/Jahr-Bilanz (H₂-Heizwert `LHV`) und verteilt sie auf die vier inländischen H₂-Senken: **Stahl-DRI**, H₂-Chemie (`NH₃`/`MeOH`/Olefine), e-Fuels Schiff und PtL-Flug. BMWK-Fortschreibung nennt `50–70 TWh` für 2030 (Pilot-Pipeline plus erste LH₂-Schiffe), Agora und Ariadne setzen für 2045 in Vollelektrifizierungs-Pfaden `200–400 TWh` an.',
    '**Mechanik:** der Slider läuft von `0` bis `600 TWh/a` mit Schrittweite `10 TWh` und Default `0`. Die Allokation ist priority-basiert — nicht proportional —, und folgt fallendem System-**Wirkungsgrad** des inländischen Power-to-X-Pfads: Flug zuerst (`η ≈ 0,38`), dann Schiff (`0,50`), Chemie (`0,55`), zuletzt Stahl (`0,64`). Pro Sektor gilt `Strom-Reduktion = H2-Anteil / η`; eine TWh H₂-Import an den Flug-Sektor spart so rund `2,6 TWh` heimischen Strom, an den Stahl-Sektor nur `1,6 TWh`. Die Wirkungsgrade kommen aus den jeweiligen `e100-*`-Datenpaketen.',
    '**Bilanz:** importierter H₂ ist im Modell kein zusätzlicher Energiezufluss in die Strombilanz, sondern senkt nur den Strombedarf der inländischen Elektrolyse. Emissionen werden in der aktuellen Version nicht bilanziert — implizit ist `grüner` H₂ angenommen; grauer oder blauer Import bräuchte Upstream-Faktoren je TWh. Die reale Allokation läuft in der Praxis über Preis-Bids, nicht über η-Priorität. Der Max-Slider `600 TWh` liegt rund beim Doppelten der Agora-2045-Annahmen und dient ausschließlich Stresstests.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0–600 TWh/a` Import, Default `0`, Schritt `10 TWh`. BMWK-Korridor `50–70 TWh` für 2030, Agora/Ariadne `200–400 TWh` für 2045; das Maximum (`~2× Agora 2045`) dient Stresstests jenseits realistischer Importpfade.',
    },
    {
      label: 'Verteilung',
      value: '**Priority-Allokation** nach fallendem System-Wirkungsgrad: Flug (`η = 0,38`) → Schiff (`0,50`) → Chemie (`0,55`) → Stahl (`0,64`). Wirkungsgrade aus den jeweiligen `e100-*`-Sektorpaketen.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Strom-Reduktion(Sektor) = H2-Anteil(Sektor) / η(Sektor)`. Beispiel Flug: `1 TWh H₂ / 0,38 ≈ 2,6 TWh` heimischer Strom gespart; Summe über alle Sektoren ergibt die Gesamtentlastung.',
    },
  ],
  method: [
    'Scenario-Mapping: `data.import.{minTWh, maxTWh, stepTWh, defaultTWh}` ↦ Slider-Bounds und Defaults für `scenario.import.h2TWh`. Datei: handgepflegt, Adapter in data/aussenhandel/h2-handel/model.ts.',
    'Slider-Werte werden vom Engine via `demandGW` als Demand-Reduktion auf die aktiven H2-Sektoren angewandt — kein zusätzlicher Strom-Import.',
    'Allokation ist priority-basiert (nicht proportional): der Sektor mit dem höchsten Strom-pro-H2-Hebel kriegt zuerst H2-Import zugewiesen, bis er gedeckt ist; Rest geht an den nächsten.',
    'Importemissionen werden in der jetzigen Version nicht bilanziert — implizit grüner H2 angenommen. Bei grauer/blauer H2-Importannahme müssten Upstream-Emissionen pro TWh eingerechnet werden.',
    'Bounds: Min 0 TWh (keine Importe), Max 600 TWh (rund das Doppelte der Agora-Vollelektrifizierungs-Annahmen für 2045).',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'import.defaultTWh', unit: 'TWh/a', description: 'Default-Wert für den Slider.' },
    { name: 'import.minTWh', unit: 'TWh/a', description: 'Slider-Minimum (0 = kein Import).' },
    { name: 'import.maxTWh', unit: 'TWh/a', description: 'Slider-Maximum (Stresstest-Obergrenze).' },
    { name: 'import.stepTWh', unit: 'TWh/a', description: 'Slider-Schrittweite.' },
  ],
  caveats: [
    'Importierter H2 senkt nur den inländischen Strombedarf, kommt nicht als zusätzliche Energiequelle in die Bilanz.',
    'Grüner H2 angenommen — keine Upstream-Emissionen für importierten Wasserstoff modelliert.',
    'Priority-Allokation ist eine Modellannahme; realwirtschaftlich verteilt sich H2-Import nach Preis-Bid, nicht nach η.',
    'Max-Slider von 600 TWh ist über realistischen 2045-Szenarien angesetzt, um Stresstests zu erlauben — keine Empfehlung.',
  ],
};

export const data: AussenhandelH2Data = {
  id: 'h2-handel',
  name: 'H2-Außenhandel',
  import: {
    default2025TWh: 0,
    defaultTWh: 0,
    minTWh: 0,
    maxTWh: 600,
    stepTWh: 10,
  },
};
