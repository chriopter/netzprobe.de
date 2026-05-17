import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { E100FlugData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandContext';

export const description: DatasetDoc = {
  id: 'e100-flug',
  parentId: 'e100',
  domain: 'last',
  kind: 'scenario',
  title: 'Flug Elektrifizierung',
  file: 'last/e100-flug/data.json',
  scripts: [
    'last/e100-flug/model.ts',
  ],
  source: 'BAFA Mineralölabsatz 2023 (Flugturbinenkraftstoff schwer 9,47 Mio. t), Destatis Energieverwendung / AG Energiebilanzen 2023, BDL Verkehrsdaten, Fraunhofer ISE PtL-Studie, DECHEMA E-Fuels-White-Paper, ICCT, Öko-Institut RESCUE, EU-Kommission ReFuelEU Aviation.',
  sourceUrls: [
    'https://www.bafa.de/DE/Energie/Rohstoffe/Mineraloelstatistik/mineraloel_node.html',
    'https://www.bafa.de/SharedDocs/Kurzmeldungen/DE/Energie/Mineraloel/2023_12_mineraloelinfo.html',
    'https://www.bafa.de/SharedDocs/Kurzmeldungen/DE/Energie/Mineraloel/2024_12_mineraloelinfo.html',
    'https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Energie/Verwendung/_inhalt.html',
    'https://ag-energiebilanzen.de/wp-content/uploads/2024/04/AGEB_Jahresbericht2023_20240403_dt.pdf',
    'https://www.bdl.aero/de/publikation/report-luftverkehr-und-klima/',
    'https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-power-to-x.html',
    'https://dechema.de/dechema_media/Downloads/Positionspapiere/WhitePaper_E_Fuels-p-20002780.pdf',
    'https://theicct.org/publication/fuel-burn-of-new-commercial-jet-aircraft-1960-to-2019/',
    'https://www.oeko.de/publikationen/p-details/rescue-langfristszenarien-fuer-eine-treibhausgasneutrale-energieversorgung',
    'https://transport.ec.europa.eu/transport-modes/air/environment/refueleu-aviation_en',
  ],
  period: '2023',
  resolution: 'Jahr × Stunde',
  unit: 'Mio. t Kerosin, TWh thermisch, TWh Strom',
  short: 'Zusatzlast aus Umstellung des Flugverkehrs ab DE auf strombasiertes e-Kerosin (PtL-SAF).',
  description: [
    '**Bezugsjahr 2023:** ab deutschen Flughäfen werden `9,47 Mio. t` Flugturbinenkraftstoff schwer abgesetzt (BAFA Mineralölstatistik, Inland + internationaler Bunker). 2024 sank der Absatz auf `9,02 Mio. t`, Vor-Corona 2019 lag bei rund `10 Mio. t`. Elektrischer Flugbetrieb ist praktisch nicht vorhanden; der Flughafen-Bodenstrom steckt bereits in der historischen Last und ist nicht Teil des Sliders.',
    '**Faktor:** mit dem Jet-A-1-Heizwert (LHV `43,1 MJ/kg ≈ 12 MWh/t`) ergibt der Kerosinabsatz `~114 TWh` thermische Endenergie. Substituiert wird über **Power-to-Liquid** (Elektrolyse → Fischer-Tropsch oder Methanol-to-Jet mit DAC-CO2) bei System-η `0,38` (Fraunhofer ISE, DECHEMA, ICCT, Öko-Institut RESCUE; Bandbreite `30–50 %`). Vollumstellung kostet `114 / 0,38 ≈ 300 TWh/a` Strom.',
    '**Lastform:** PtL-Anlagen laufen als kontinuierliche Industrieprozesse mit Wasserstoff-, Syngas- und Wachs-Puffern; das hinterlegte 24-h-Profil ist daher konstant `1,0` (Summe `24`). Direkte Batterie-Kurzstrecke und HEFA-/Bio-SAF-Pfade ohne Strombedarf sind nicht separat abgebildet — das Szenario zeigt die Obergrenze bei `100 %` PtL.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `380 TWh`. Default `300 TWh` entspricht dem Kerosinabsatz 2023 (`9,47 Mio. t × 12 MWh/t / 0,38`). Das Maximum deckt Rückkehr auf das Vor-Corona-Niveau (`~10 Mio. t`) plus moderates Wachstum bzw. konservativere PtL-Wirkungsgrade (`35 %`) ab.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** konstantes 24-h-Profil (`1,0` je Stunde, Summe `24`). Elektrolyse, FT-Synthese und DAC laufen mit großen Speichern dauerhaft; ein Tagesgang wäre Spekulation.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Zusatzstrom = Kerosin (Mio. t) × 12 MWh/t / η_PtL`. Default: `9,47 × 12 / 0,38 ≈ 299 TWh/a`, gerundet `300 TWh`.',
    },
  ],
  method: [
    'Datei: handgepflegt, kein Generator-Skript. Konstanten direkt in data/e100-flug/data.json; Rechenlogik in data/e100-flug/model.ts.',
    'Kerosinmenge kerosineDemandMioT: BAFA Mineralölstatistik 2023 weist 9,47 Mio. t Flugturbinenkraftstoff schwer ab deutschen Flughäfen aus (Inland + international Bunker). 2024 ging der Absatz laut BAFA auf 9,02 Mio. t zurück. Vor-Corona 2019 lag bei rund 10 Mio. t; Slider-Maximum berücksichtigt Rückkehr und Wachstum.',
    'Energieinhalt kerosineEnergyTWh: Heizwert Jet A-1 (LHV) 43,1 MJ/kg = 11,97 kWh/kg ≈ 12 MWh/t (DIN, ASTM D1655, DLR Kerosene-Properties); 9,47 Mio. t × 12 MWh/t ≈ 114 TWh Endenergie thermisch.',
    'PtL-Wirkungsgrad ptlEfficiency: 0,38 als Mittelwert Power-to-Liquid-Konversion Strom → e-Kerosin (Elektrolyse → Fischer-Tropsch oder Methanol-to-Jet inkl. DAC-CO2). Quellen: Fraunhofer ISE PtL-Studie, DECHEMA E-Fuels-White-Paper, ICCT eFuel-Analysen, Öko-Institut RESCUE. Bandbreite Literatur 30–50 % je nach Pfad und DAC-Integration; FT-typisch 35–45 %. Wert wird vom Kernmodell für die H2-Import-Substitutionslogik gelesen: 1 TWh importierter H2 ersetzt (1/0,38)=2,63 TWh inländischen PtL-Strom — Flug ist damit der Pfad mit dem höchsten Strom-Einsparungs-Hebel pro TWh H2-Import.',
    'Bereits elektrisch alreadyElectricTWh: 0 — kein nennenswerter elektrischer Flugbetrieb in DE; Flughafen-Bodenstrom ist klein und in der historischen Last 2025 enthalten.',
    'Ziel-Pfad: ReFuelEU Aviation schreibt 70 % SAF bis 2050 vor, davon 35 % synthetisch (PtL). Das Szenario modelliert den Vollumstellungs-Pfad (100 % PtL) als Obergrenze für den Strombedarf; reale Pfade mit Bio-/HEFA-Anteil liegen darunter.',
    'Stundenverteilung hourlyProfile.multipliers: 24 × 1,0 (Summe 24). PtL-Anlagen sind kontinuierlich gefahrene Industrieprozesse mit Wasserstoff- und Produktspeichern; ein Tagesgang wäre Spekulation.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'title', unit: 'Text', description: 'Anzeigename.' },
    { name: 'source', unit: 'Text', description: 'Quellenkurzname.' },
    { name: 'sourceUrls', unit: 'Liste', description: 'Belege.' },
    { name: 'referenceYear', unit: 'Jahr', description: 'Bezugsjahr.' },
    { name: 'kerosineDemandMioT', unit: 'Mio. t', description: 'Kerosinabsatz ab deutschen Flughäfen.' },
    { name: 'kerosineEnergyTWh', unit: 'TWh thermisch', description: 'Endenergie aus Heizwert × Menge.' },
    { name: 'ptlEfficiency', unit: 'Anteil', description: 'Power-to-Liquid Konversionswirkungsgrad Strom → e-Kerosin (LHV). Default 0,38 (Fischer-Tropsch + DAC). Wird vom kernmodell für die H2-Import-Substitutionslogik gelesen: 1 TWh importierter H2 ersetzt (1/0,38)=2,63 TWh inländischen PtL-Strom — Flug ist der Pfad mit dem höchsten Strom-Einsparungs-Hebel pro TWh H2-Import.' },
    { name: 'alreadyElectricTWh', unit: 'TWh', description: 'Bereits elektrisch gedeckter Anteil; Slider-Minimum.' },
    { name: 'defaultTargetTWh', unit: 'TWh', description: 'Slider-Default.' },
    { name: 'maxTargetTWh', unit: 'TWh', description: 'Slider-Maximum.' },
    { name: 'stepTWh', unit: 'TWh', description: 'Slider-Schrittweite.' },
    { name: 'distribution', unit: 'Text', description: 'Verteilungstyp.' },
    { name: 'hourlyProfile', unit: 'Objekt', description: '24 Stundenmultiplikatoren Berlin-Zeit (alle 1,0, Summe 24); Quellen und Quell-URLs.' },
    { name: 'referenceScales', unit: 'Objekt', description: 'Größenanker zur Einordnung: 1 Slider-Einheit entspricht etwa DE-Kerosin-Inlandsbedarf 2022.' },
    { name: 'note', unit: 'Text', description: 'Rechenhinweis.' },
  ],
  caveats: [
    'DAC-CO2-Quelle ist physisch und energetisch noch offen; zusätzlicher Strombedarf für Direct Air Capture ist im pauschalen Wirkungsgrad nur teilweise enthalten — bei reiner DAC-Versorgung liegt der Wirkungsgrad eher im unteren Bereich (30–35 %).',
    'PtL-Wirkungsgrad ist Literaturmittel; reale Großanlagen können um ±5 Prozentpunkte abweichen, was die Zusatzlast um rund ±40 TWh verschiebt.',
    'Mengenrisiko Vor-Corona vs. Wachstum: Slider-Maximum unterstellt Rückkehr auf rund 10 Mio. t plus moderates Wachstum; politische Nachfragedämpfung (Kerosinsteuer, Kurzstrecken-Substitution Bahn) würde den Bedarf senken.',
    'Batterie-Elektrifizierung der Kurzstrecke (Inlandsflüge unter 500 km) ist nicht separat modelliert und im PtL-Anteil mitgerechnet.',
    'Hybrid-Pfade mit HEFA- oder Bio-SAF (kein Strombedarf, aber begrenzte Reststoffmenge) sind nicht abgebildet — ReFuelEU verlangt 70 % SAF bis 2050, davon 35 % synthetisch; Vollumstellung auf PtL ist daher Obergrenze.',
  ],
};

export const data: E100FlugData = {
  id: 'e100-flug',
  title: 'Flug Elektrifizierung',
  source: 'BAFA Mineralölabsatz 2023 (Flugturbinenkraftstoff schwer 9,47 Mio. t), Destatis Energiebilanz / AGEB 2023, BDL Verkehrsdaten; PtL-Wirkungsgrad 38 % nach Fraunhofer ISE PtL-Studie, DECHEMA E-Fuels-White-Paper, ICCT eFuel-Analysen, Öko-Institut RESCUE; ReFuelEU Aviation für Ziel-Pfade.',
  sourceUrls: [
    'https://www.bafa.de/DE/Energie/Rohstoffe/Mineraloelstatistik/mineraloel_node.html',
    'https://www.bafa.de/SharedDocs/Kurzmeldungen/DE/Energie/Mineraloel/2023_12_mineraloelinfo.html',
    'https://www.bafa.de/SharedDocs/Kurzmeldungen/DE/Energie/Mineraloel/2024_12_mineraloelinfo.html',
    'https://www.destatis.de/DE/Themen/Branchen-Unternehmen/Energie/Verwendung/_inhalt.html',
    'https://ag-energiebilanzen.de/wp-content/uploads/2024/04/AGEB_Jahresbericht2023_20240403_dt.pdf',
    'https://www.bdl.aero/de/publikation/report-luftverkehr-und-klima/',
    'https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-power-to-x.html',
    'https://dechema.de/dechema_media/Downloads/Positionspapiere/WhitePaper_E_Fuels-p-20002780.pdf',
    'https://theicct.org/publication/fuel-burn-of-new-commercial-jet-aircraft-1960-to-2019/',
    'https://www.oeko.de/publikationen/p-details/rescue-langfristszenarien-fuer-eine-treibhausgasneutrale-energieversorgung',
    'https://transport.ec.europa.eu/transport-modes/air/environment/refueleu-aviation_en',
  ],
  referenceScales: {
    activity: { value: 114, unit: 'TWh', label: 'DE-Kerosin-Inlandsbedarf 2022' },
  },
  referenceYear: 2023,
  kerosineDemandMioT: 9.47,
  kerosineEnergyTWh: 114,
  ptlEfficiency: 0.38,
  alreadyElectricTWh: 0,
  defaultTargetTWh: 300,
  maxTargetTWh: 380,
  stepTWh: 5,
  distribution: 'hourly-profile',
  hourlyProfile: {
    source: 'Konstantes Profil: PtL-Anlagen (Elektrolyse, Fischer-Tropsch- oder Methanol-to-Jet-Synthese, DAC) sind kontinuierlich gefahrene Industrieprozesse mit Wasserstoff- und Produktpuffer. Fraunhofer ISE und DECHEMA betonen Dauerbetrieb mit großen Puffern (Wasserstoff, Syngas, Wachs). Ein Tagesgang im Stromabruf der Endsynthese wäre ohne konkrete Anlagenfahrweise spekulativ. Multiplikator 1,0 je Stunde, Summe 24.',
    sourceUrls: [
      'https://www.ise.fraunhofer.de/de/veroeffentlichungen/studien/studie-power-to-x.html',
      'https://dechema.de/dechema_media/Downloads/Positionspapiere/WhitePaper_E_Fuels-p-20002780.pdf',
    ],
    multipliers: [
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    ],
  },
  note: 'Zusatzlast = max(0, Ziel-TWh − bereits elektrisch). Default-Ableitung: 9,47 Mio. t Kerosin × 12 MWh/t = 113,6 TWh thermisch (gerundet 114); 113,6 / 0,38 ≈ 299 TWh Strom, gerundet 300 TWh. Slider-Maximum 380 TWh deckt Rückkehr auf rund 10 Mio. t plus moderates Wachstum bzw. konservativere Wirkungsgrade (35 %) ab. Stundenverteilung konstant (24/7-Betrieb mit Speicherpuffern).',
  summary: 'PtL · η 38 %',
};

export function additionalTWh(targetTWh: number, model: E100FlugData = data) {
  return Math.max(0, targetTWh - model.alreadyElectricTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTWh: number, model: E100FlugData = data) {
  const annualTWh = additionalTWh(targetTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const demandModule: DemandScenarioModule = {
  id: 'e100-flug',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-flug']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-flug-target-twh'], context['e100-flug']);
  },
};
