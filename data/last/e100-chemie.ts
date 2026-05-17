import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { E100ChemieData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandContext';

export const description: DatasetDoc = {
  id: 'e100-chemie',
  parentId: 'e100',
  domain: 'last',
  kind: 'scenario',
  title: 'Chemie Elektrifizierung',
  file: 'last/e100-chemie/data.json',
  scripts: [
    'last/e100-chemie/model.ts',
  ],
  source: "VCI/DECHEMA/FutureCamp/Prognos Roadmap 2050 'Treibhausgasneutralität Chemieindustrie Deutschland' (2019, H2-Maximalpfad rund 685 TWh — Default des Szenarios); VCI/VDI Chemistry4Climate (C4C) 2023 und Update 2024 als alternative Pfade (258–508 TWh nach teilweiser CCS-/Recycling-Mitnahme und Produktionsrückgang); BMWK Langfristszenarien 3 T45-Strom Modul Industrie (Fraunhofer ISI); DECHEMA Technology Study Low Carbon Energy and Feedstock for the European Chemical Industry; VCI Chemiewirtschaft in Zahlen 2024; AGEB Anwendungsbilanz; produktionsseitig: Statistisches Bundesamt / VCI Mengengerüst (Ammoniak ~2,0 Mt 2023, Ethylen 4,1 Mt, Propylen 3,0 Mt, BTX ~2,8 Mt).",
  sourceUrls: [
    'https://www.vci.de/services/publikationen/broschueren-faltblaetter/vci-dechema-futurecamp-studie-roadmap-2050-treibhausgasneutralitaet-chemieindustrie-deutschland-langfassung.jsp',
    'https://www.vci.de/vci/downloads-vci/publikation/broschueren-und-faltblaetter/2024-11-07-c4c-update-publikation-kurzfassung-doppelseiten.pdf',
    'https://dechema.de/chemie2050-path-123211,124930.html',
    'https://dechema.de/Low_carbon_chemical_industry.html',
    'https://www.isi.fraunhofer.de/content/dam/isi/dokumente/cce/2024/LFS3_T45-Bericht_Szenarien_Industrie_final.pdf',
    'https://langfristszenarien.de/enertile-explorer-de/szenario-explorer/das-projekt.php',
    'https://ag-energiebilanzen.de/daten-und-fakten/anwendungsbilanzen/',
    'https://www.vci.de/vci/downloads-vci/publikation/chiz-historisch/chemiewirtschaft-in-zahlen-2024.pdf',
  ],
  period: '2023 (Mengen), Roadmap-Zielhorizont 2045',
  resolution: 'Jahr × Stunde',
  unit: 'TWh Strom',
  short: 'Zusatzlast aus vollständiger Elektrifizierung und Defossilisierung der Chemie- und Petrochemie-Industrie (inkl. H2-Feedstock für NH3, MeOH, Olefine).',
  description: [
    '**Bezugsjahr 2023:** die Chemie- und Petrochemie-Industrie verbraucht heute rund `55 TWh` Strom (AGEB-Anwendungsbilanz), der bereits in der historischen Last steckt und das Slider-Minimum bildet. Mengenanker für die Defossilisierungs-Rechnung sind die inländischen Produktionsmengen 2023: `~2,0 Mt NH3`, `~1,3 Mt MeOH` sowie der HVC-Naphtha-Output mit `4,1 Mt` Ethylen, `3,0 Mt` Propylen und `~2,8 Mt` BTX.',
    '**Verbrauch:** der Slider liefert den **Ziel-Gesamtstromverbrauch** der Branche. Das Modell summiert drei Sektorgruppen — Bestand und Hilfsenergie `85 TWh` (`55 TWh` Status quo, `30 TWh` Direktstrom-Zuwachs für Antriebe und IKT), Prozesswärme `75 TWh` (HT-WP bis `200 °C` und E-Dampfkessel) sowie H2-basierte Synthese `275 TWh` (`35 TWh` Ammoniak, `60 TWh` Methanol inkl. CO2-Bereitstellung, `180 TWh` e-Olefine via Methanol-to-Olefins/-Aromatics). Die sechs hinterlegten Bausteine summieren auf `435 TWh`; der Default `440 TWh` enthält zusätzlich rund `5 TWh` Puffer für Sonderprodukte und Aufrundung. Das entspricht dem C4C-Update-2024-Pfad nach Produktionsrückgang seit Energiepreiskrise (Ammoniak `−32 %`, Methanol `−40 %`, Chlor `−26 %`); der VCI/DECHEMA-2019-Pfad mit voller Inlandsproduktion liegt bei `~685 TWh`. **System-η** Strom → H2-Endprodukt-Mix `0,55` — `1 TWh` H2-Import ersetzt `1,82 TWh` inländischen Synthese-Strom.',
    '**Lastform:** Chemie ist `24/7`-Kontibetrieb (BDEW-Industrielast G3): konstantes Tagesprofil, Multiplikatoren alle `1,0`. Elektrolyseur-Flexibilität, H2-Speicherung und zeitliche Entkopplung von Stromabnahme und Stoffsynthese bleiben außen vor.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `55` bis `700 TWh` Ziel-Gesamtstrom. Default `440 TWh` entspricht dem VCI/VDI Chemistry4Climate Update 2024 (H2-max-Mix nach Produktionsrückgang); der frühere VCI/DECHEMA-Pfad mit voller Inlandsproduktion (`~685 TWh`) und der C4C-Original-2023-Korridor (`258–508 TWh`) lassen sich per Slider anfahren.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** konstantes 24-h-Dauerlastprofil (BDEW-Industrielast G3, Multiplikatoren `1,0`, Summe `24`). Kein Tagesgang, kein Saisongang.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Zusatzstrom = max(0, Ziel − 55)`. Default: `440 − 55 = 385 TWh/a`.',
    },
  ],
  method: [
    'Datei: handgepflegt, kein Generator-Skript. Konstanten direkt in data/e100-chemie/data.json; Rechenlogik in data/e100-chemie/model.ts.',
    'Prozesswärme-Substitution processHeatSubstitutionTWh ~75 TWh: fossile Niedrig- bis Hochtemperatur-Prozesswärme (Erdgas-Dampfkessel, Prozessgas) wird durch Hochtemperatur-Wärmepumpen (bis 200 °C) und elektrische Dampfkessel ersetzt.',
    'H2-Elektrolyse für Ammoniak hydrogenAmmoniaTWh ~35 TWh: rund 2,0 Mio. t NH3/a Inlandsproduktion (Statistisches Bundesamt 2023) über grünen Wasserstoff; im C4C-Update-2024-Pfad mit Produktionsrückgang −32 %. Elektrolyse-Pfad inkl. PEM-/Alkali-Stack-Verluste und Haber-Bosch-Hilfsenergie.',
    'H2-Elektrolyse für Methanol hydrogenMethanolTWh ~60 TWh: rund 1,3 Mio. t MeOH/a Direktbedarf plus zusätzliche MeOH-Vorstufe für die MTO-Olefin-Route; Stromaufwand inkl. CO2-Bereitstellung und Methanol-Synthese (C4C 2024 nach −40 % Produktionsrückgang).',
    'e-Olefine via Methanol-to-Olefins/Aromatics eOlefinsViaH2TWh ~180 TWh: Substitution des Naphtha-Cracker-Outputs (Ethylen 4,1 Mt + Propylen 3,0 Mt + Butylene ~1,9 Mt + BTX ~2,8 Mt) durch e-Methanol mit anschließender MtO/MtA-Route; größter Einzelblock wegen H2-intensivem Pfad und MtO-Selektivitätsverlusten. Im C4C-Update-2024-Pfad teils durch Recycling und Importverlagerung gedämpft.',
    'Direktstrom-Zuwachs additionalDirectElectricityTWh ~30 TWh über die heutigen 55 TWh hinaus: Pumpen, Kompressoren, Hilfsantriebe, IKT-Last bei wachsender Elektrifizierung des Anlagenparks.',
    'Default-Summe: 55 + 75 + 30 + 35 + 60 + 180 = 435 TWh hinterlegte Bausteine; defaultTargetTotalTWh 440 TWh enthält rund 5 TWh Puffer für nicht-bilanzierte Sonderprodukte (Industriegase, Spezialchemie) und Aufrundung auf den C4C-Update-2024-H2-max-Wert.',
    'Quellen: VCI/DECHEMA/FutureCamp/Prognos Roadmap 2050 (2019, ~685 TWh), Chemistry4Climate 2023 (Strom max 464 / H2 max 508 TWh) und Update 2024 (258–440 TWh nach Produktionsrückgang), BMWK Langfristszenarien T45-Strom Modul Industrie (Fraunhofer ISI), DECHEMA Technology Study Low Carbon Energy, AGEB Anwendungsbilanz Chemie+Petrochemie 2023, VCI Chemiewirtschaft in Zahlen 2024.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'title', unit: 'Text', description: 'Anzeigename.' },
    { name: 'source', unit: 'Text', description: 'Quellenkurzname.' },
    { name: 'sourceUrls', unit: 'Liste', description: 'Belege.' },
    { name: 'referenceYear', unit: 'Jahr', description: 'Bezugsjahr.' },
    { name: 'currentElectricityTWh', unit: 'TWh', description: 'Heutiger Strombedarf Chemie+Petrochemie (in historischer Last enthalten).' },
    { name: 'processHeatSubstitutionTWh', unit: 'TWh', description: 'Strombedarfsanteil Prozesswärme-Elektrifizierung (HT-WP, E-Kessel).' },
    { name: 'hydrogenAmmoniaTWh', unit: 'TWh', description: 'Strombedarf für grüne Ammoniak-Synthese (Elektrolyse).' },
    { name: 'hydrogenMethanolTWh', unit: 'TWh', description: 'Strombedarf für grüne Methanol-Synthese (Elektrolyse + Synthese).' },
    { name: 'eOlefinsViaH2TWh', unit: 'TWh', description: 'Strombedarf für e-Olefine/Aromaten über Methanol-to-Olefins/MTA-Route.' },
    { name: 'additionalDirectElectricityTWh', unit: 'TWh', description: 'Strom-Direktzuwachs (Antriebe, IKT) über heutigen Bedarf hinaus.' },
    { name: 'h2SystemEfficiency', unit: 'Anteil', description: 'System-η Strom → H2-Endprodukt-Mix (NH3 via Haber-Bosch, MeOH via Methanol-Synthese, Olefine via MtO). Default 0,55 als gewichteter Mittelwert über die drei chemischen Pfade (DEA Technology Catalogue 2024, Fraunhofer ISE PtX-Atlas). Wird vom kernmodell für die H2-Import-Substitutionslogik verwendet: 1 TWh importierter H2 ersetzt (1/0,55)=1,82 TWh inländischen Synthese-Strom.' },
    { name: 'defaultTargetTotalTWh', unit: 'TWh', description: 'Slider-Default als Ziel-Gesamtstromverbrauch.' },
    { name: 'maxTargetTotalTWh', unit: 'TWh', description: 'Slider-Maximum.' },
    { name: 'stepTWh', unit: 'TWh', description: 'Slider-Schrittweite.' },
    { name: 'alreadyElectricTWh', unit: 'TWh', description: 'Heutiger Stromanteil = Slider-Minimum (kein Ausbau über Status quo).' },
    { name: 'distribution', unit: 'Text', description: 'Verteilungstyp.' },
    { name: 'hourlyProfile', unit: 'Objekt', description: '24 Stundenmultiplikatoren Berlin-Zeit (Summe 24); Quellen und Quell-URLs.' },
    { name: 'referenceScales', unit: 'Objekt', description: 'Größenanker zur Einordnung: 1 Slider-Einheit entspricht etwa BASF-Ludwigshafen-Stromverbrauch.' },
    { name: 'note', unit: 'Text', description: 'Rechenhinweis.' },
  ],
  caveats: [
    'Sehr große Bandbreite zwischen den Studien: VCI/DECHEMA Roadmap 2050 (2019, voller H2-Pfad mit Naphtha- und Ammoniak-Substitution) rund 685 TWh; C4C Original 2023 (Strom max 464 / H2 max 508 / Sekundär max 325 TWh); C4C Update 2024 mit Produktionsrückgang seit Energiepreiskrise 400 / 440 / 258 TWh — Default 440 TWh des Szenarios. Per Slider lassen sich die anderen Pfade direkt anfahren.',
    'Wasserstoff-Speicherung, Elektrolyseur-Flexibilität und mögliche zeitliche Entkopplung von Stromabnahme und Stoffsynthese sind nicht modelliert (24/7-Profil).',
    'CCS-Alternative für Steamcracker und Ammoniak-Reformer (blauer Wasserstoff) ist nicht modelliert; sie würde den Strombedarf erheblich senken.',
    'Importchemie-Verlagerung: ein Teil von NH3/MeOH/Olefinen könnte als Import grüner Grundstoffe statt als Inlandsproduktion realisiert werden (C4C Update zeigt: Strombedarf für Wasserstoff allein 287 TWh bei voller Inlandsproduktion könnte teilweise durch H2-/Derivate-Importe verlagert werden). Das Modell unterstellt vollständige Inlandsproduktion.',
    'Produktionsrückgang seit 2020 (Ammoniak −32 %, Methanol −40 %, Chlor −26 %) ist im C4C Update 2024 bereits eingepreist; weitere Verlagerungen würden Default-Wert weiter senken.',
    'Roadmap-Annahme bis 2045 (THG-Neutralität); Zwischenstände 2030/2040 sind nicht aufgelöst — Slider gibt nur Zielwert wieder.',
  ],
};

export const data: E100ChemieData = {
  id: 'e100-chemie',
  title: 'Chemie Elektrifizierung',
  source: "VCI/DECHEMA/FutureCamp/Prognos Roadmap 2050 'Treibhausgasneutralität Chemieindustrie Deutschland' (2019, H2-Maximalpfad rund 685 TWh); VCI/VDI Chemistry4Climate (C4C) Roadmap 2023 und Update 2024 (Strombedarf Chemie 2045 je nach Szenario 258–508 TWh; Update 2024 Szenario 2 H2 max: 440 TWh inkl. 287 TWh für H2 nach Produktionsrückgang); BMWK Langfristszenarien 3 T45-Strom Modul Industrie; Fraunhofer ISI; DECHEMA Technology Study Low Carbon Energy; VCI Chemiewirtschaft in Zahlen 2024; AGEB Anwendungsbilanz Chemie+Petrochemie 2023 (Strom ~55 TWh).",
  sourceUrls: [
    'https://www.vci.de/services/publikationen/broschueren-faltblaetter/vci-dechema-futurecamp-studie-roadmap-2050-treibhausgasneutralitaet-chemieindustrie-deutschland-langfassung.jsp',
    'https://www.vci.de/vci/downloads-vci/publikation/broschueren-und-faltblaetter/2024-11-07-c4c-update-publikation-kurzfassung-doppelseiten.pdf',
    'https://dechema.de/chemie2050-path-123211,124930.html',
    'https://dechema.de/Low_carbon_chemical_industry.html',
    'https://www.isi.fraunhofer.de/content/dam/isi/dokumente/cce/2024/LFS3_T45-Bericht_Szenarien_Industrie_final.pdf',
    'https://langfristszenarien.de/enertile-explorer-de/szenario-explorer/das-projekt.php',
    'https://ag-energiebilanzen.de/daten-und-fakten/anwendungsbilanzen/',
    'https://www.vci.de/vci/downloads-vci/publikation/chiz-historisch/chemiewirtschaft-in-zahlen-2024.pdf',
  ],
  referenceScales: {
    activity: { value: 22, unit: 'TWh', label: 'BASF-Ludwigshafen-Stromverbrauch' },
  },
  referenceYear: 2023,
  currentElectricityTWh: 55,
  processHeatSubstitutionTWh: 75,
  hydrogenAmmoniaTWh: 35,
  hydrogenMethanolTWh: 60,
  eOlefinsViaH2TWh: 180,
  additionalDirectElectricityTWh: 30,
  h2SystemEfficiency: 0.55,
  defaultTargetTotalTWh: 440,
  maxTargetTotalTWh: 700,
  stepTWh: 10,
  alreadyElectricTWh: 55,
  distribution: 'hourly-profile',
  hourlyProfile: {
    source: 'Chemie 24/7-Dauerbetrieb (BDEW Industrielast G3): kontinuierliche Produktionsweise mit weitgehend konstanter Stundenlast. Tagesgang-Multiplikatoren alle 1,0; Summe 24.',
    sourceUrls: [
      'https://www.bdew.de/energie/standardlastprofile-strom/',
      'https://www.vde.com/de/fnn/themen/tar/tar-mittelspannung-vde-ar-n-4110',
    ],
    multipliers: [
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
      1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
    ],
  },
  note: 'Slider zeigt den Ziel-Gesamtstromverbrauch der Chemie inkl. der heutigen 55 TWh. Zusatzlast = max(0, Ziel − 55 TWh). Default 440 TWh entspricht dem VCI/VDI Chemistry4Climate Update 2024 im H2-Maximalpfad nach Produktionsrückgang seit Energiepreiskrise (Ammoniak −32 %, Methanol −40 %, Chlor −26 %). Sektorgruppen: 55 TWh Status quo + 30 TWh Direktstrom-Zuwachs (Antriebe/IKT) + 75 TWh Prozesswärme (HT-WP/E-Kessel) + 35 TWh H2 für Ammoniak + 60 TWh H2 für Methanol (~1,3 Mt MeOH plus zusätzliche MtO-Vorstufe) + 180 TWh e-Olefine über Methanol-to-Olefins/MTA (HVC: Ethylen 4,1 Mt, Propylen 3,0 Mt, BTX ~2,8 Mt — größter H2-Block) = 435 TWh hinterlegt; defaultTargetTotalTWh 440 enthält rund 5 TWh Puffer für Sonderprodukte/Aufrundung. Bandbreite alternativer Studien: VCI/DECHEMA Roadmap 2050 (2019) im vollen H2-Pfad bei rund 685 TWh; VCI/VDI C4C 2023 bei 325–508 TWh durch teilweise CCS- und Recycling-Mitnahme; C4C Update 2024 bei 258–440 TWh. Slider lässt sich auf alle Pfade einstellen. Tagesgang ist Dauerlast (24/7-Kontibetrieb).',
  summary: 'VCI C4C 2024 · H2-max-Mix',
};

export function additionalTWh(targetTotalTWh: number, model: E100ChemieData = data) {
  return Math.max(0, targetTotalTWh - model.alreadyElectricTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTotalTWh: number, model: E100ChemieData = data) {
  const annualAdditionalTWh = additionalTWh(targetTotalTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualAdditionalTWh * 1000 * hourMultiplier / 8760;
}

export const demandModule: DemandScenarioModule = {
  id: 'e100-chemie',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-chemie']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-chemie-target-twh'], context['e100-chemie']);
  },
};
