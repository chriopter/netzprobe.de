import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { E100BahnData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandContext';

export const description: DatasetDoc = {
  id: 'e100-bahn',
  parentId: 'e100',
  domain: 'last',
  kind: 'scenario',
  title: 'Bahn Elektrifizierung',
  file: 'last/e100-bahn/data.json',
  scripts: [
    'last/e100-bahn/model.ts',
  ],
  source: 'DB Konzern Integrierter Bericht 2023 (Bahnstrom rund 11 TWh, bereits in der historischen Last), DB Energie (rund 450 Mio. l Diesel/a DB-Konzern), BMWK Langfristszenarien 3 Modul Verkehr (T45-Strom: Endenergiebedarf Bahn bis 2045 nahezu konstant, Verkehrsleistung +26-62 %), BMDV Verkehr in Zahlen 2024, Allianz pro Schiene, Deutschlandtakt und Klimaschutzprogramm Bundesregierung.',
  sourceUrls: [
    'https://ibir.deutschebahn.com/2023/de/lagebericht/zusaetzliche-informationen/energie-und-klimaschutz/',
    'https://langfristszenarien.de/enertile-explorer-wAssets/docs/LFS3_T45_Verkehr_V2_0_barrierefrei.pdf',
    'https://bmdv.bund.de/SharedDocs/DE/Publikationen/G/verkehr-in-zahlen-2024.html',
    'https://www.allianz-pro-schiene.de/themen/umwelt/energieverbrauch/',
    'https://www.deutschlandtakt.de/',
    'https://www.bundesregierung.de/breg-de/themen/klimaschutz/klimaschutzprogramm-2030-1673502',
  ],
  period: '2023 (Bezug), 2045 (Zielhorizont Deutschlandtakt)',
  resolution: 'Stunde',
  unit: 'TWh Strom',
  short: 'Zusätzliche Bahnstromlast aus Diesel-Substitution und Modal Shift on top der historischen Traktion.',
  description: [
    '**Bezugsjahr 2023:** der DB-Konzern setzt rund `11 TWh` Bahnstrom für die elektrische Traktion ab; diese Last steckt bereits in der historischen Stromreihe und ist nicht Teil des Sliders. Hinzu kommen rund `500–600 Mio. l Diesel/a` (DB plus NE-Bahnen) für die verbleibende Dieseltraktion, was etwa `5–6 TWh` thermischer Endenergie entspricht (`9,86 kWh/l`).',
    '**Faktor:** der **Wirkungsgradhebel** Diesellok → E-Lok liegt bei rund `3` (Antriebseffizienz plus Rekuperation), sodass die Substitution der gesamten Dieseltraktion mit rund `2 TWh` Strom auskommt. Hinzu addiert das Szenario `8 TWh` Modal Shift: BMWK Langfristszenarien T45-Strom rechnen mit `+26–62 %` Verkehrsleistung Schiene bis 2045 bei nahezu konstantem Endenergiebedarf (Effizienzgewinne); ambitioniertere Deutschlandtakt-Ziele (Verdopplung Personenverkehr, `+50 %` Güter) liegen darüber. Default-Zusatzlast: `10 TWh/a`.',
    '**Lastform:** die Stundenlast folgt einem typischen Bahnstrom-Tagesgang aus dem `16,7-Hz`-Netz mit Morgenpeak `7–9 Uhr` (Berufs- und Schülerverkehr), Mittagsdelle, Nachmittagspeak `16–18 Uhr` und Nachttal `1–4 Uhr` (nur Güter- und Nachtzüge). Werktag-/Wochenend-Differenzierung und Saisongang bleiben außen vor.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `25 TWh` Zusatzlast. Default `10 TWh` = `2 TWh` Diesel-Substitution + `8 TWh` Modal Shift. Das Maximum deckt aggressive Modal-Shift- und Wasserstoff-Triebzug-Szenarien ab, in denen Brennstoffzellen-Pfade mehr Strom je Trkm brauchen als reine Oberleitung.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** 24-h-Bahnstrom-Tagesgang nach DB Energie und BNetzA-Standardlastprofil Traktion. Morgenpeak `7–9 Uhr`, Nachmittagspeak `16–18 Uhr`, Nachttal `1–4 Uhr`; kein Saisongang.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Zusatzlast = max(0, Ziel-TWh)`. Default: `2 + 8 = 10 TWh/a`, stündlich nach Bahnstromprofil verteilt.',
    },
  ],
  method: [
    'Datei: handgepflegt, kein Generator-Skript. Konstanten direkt in data/e100-bahn/data.json; Rechenlogik in data/e100-bahn/model.ts.',
    'Diesel-Substitution dieselSubstitutionTWh: DB Energie meldet rund 450 Mio. l Diesel/a im Konzern; zusammen mit NE-Bahnen rund 500-600 Mio. l/a entsprechend rund 5-6 TWh thermisch (9,86 kWh/l). Umstellung auf Oberleitungsausbau, Batterie- und Wasserstofftriebzüge ergibt mit Wirkungsgradfaktor rund 3 (Antriebseffizienz plus Rekuperation E-Lok vs. Diesellok) rund 2 TWh elektrische Traktion.',
    'Modal Shift modalShiftTWh: BMWK Langfristszenarien T45-Strom: Verkehrsleistung Schiene steigt bis 2045 um 26-62 % gegenüber 2019, der Endenergiebedarf bleibt durch Effizienzgewinne nahezu konstant. Deutschlandtakt und Klimaschutzprogramm sind ambitionierter (Verdopplung Personenverkehr, +50 % Güter). Mittlerer Wert 8 TWh deckt diese Bandbreite ab.',
    'Default-Ziel defaultTargetTWh: 2 TWh Diesel-Substitution + 8 TWh Modal Shift = 10 TWh.',
    'Stundenverteilung hourlyProfile.multipliers: typischer Bahnstrom-Tagesgang (DB Energie 16,7-Hz-Bahnstromnetz, Lastwechsel 350 MW/min, nachts deutlich geringer). Morgenpeak 7-9 Uhr durch Berufs- und Schülerverkehr, Mittagsdelle, Nachmittagspeak 16-18 Uhr durch Pendlerrückverkehr, Nachttal 1-4 Uhr (nur Güter- und Nachtzüge). Summe der 24 Werte exakt 24.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'title', unit: 'Text', description: 'Anzeigename.' },
    { name: 'source', unit: 'Text', description: 'Quellenkurzname.' },
    { name: 'sourceUrls', unit: 'Liste', description: 'Belege.' },
    { name: 'referenceYear', unit: 'Jahr', description: 'Bezugsjahr.' },
    { name: 'dieselSubstitutionTWh', unit: 'TWh', description: 'Strombedarf für Ersatz der verbleibenden Dieseltraktion.' },
    { name: 'modalShiftTWh', unit: 'TWh', description: 'Zusätzliche Traktionslast aus Verkehrsverlagerung auf die Schiene.' },
    { name: 'defaultTargetTWh', unit: 'TWh', description: 'Slider-Default.' },
    { name: 'maxTargetTWh', unit: 'TWh', description: 'Slider-Maximum.' },
    { name: 'stepTWh', unit: 'TWh', description: 'Slider-Schrittweite.' },
    { name: 'distribution', unit: 'Text', description: 'Verteilungstyp.' },
    { name: 'hourlyProfile', unit: 'Objekt', description: '24 Stundenmultiplikatoren Berlin-Zeit (Summe 24); Quellen und Quell-URLs.' },
    { name: 'note', unit: 'Text', description: 'Rechenhinweis.' },
  ],
  caveats: [
    'Historische Bahnstromlast aus elektrischer Traktion ist bereits in der Last 2025 enthalten und wird hier nicht doppelt gezählt.',
    'Konstanter Tagesgang ohne Werktag-/Wochenend-Differenzierung und ohne Saisonalität, obwohl der reale Bahnverkehr im Berufs- und Schülerverkehr werktags stark ausgeprägt ist.',
    'Wirkungsgradannahme Diesel zu elektrisch (Faktor 3) ist ein typischer Mittelwert; Oberleitung, Akku und Wasserstoff unterscheiden sich in der tatsächlichen Effizienz.',
    'Modal-Shift-Volumen ist politisch gesetzt (Deutschlandtakt); reale Umsetzung hängt von Infrastrukturausbau und Fahrplandichte ab.',
    'Wasserstoff-Brennstoffzellenzüge haben deutlich höhere Stromaufwendungen je Trkm als Oberleitungsbetrieb; das Szenario unterstellt überwiegend Oberleitung und Batteriebetrieb.',
  ],
};

export const data: E100BahnData = {
  id: 'e100-bahn',
  title: 'Bahn Elektrifizierung',
  source: 'DB Konzern Integrierter Bericht 2023 (Bahnstrombedarf rund 11 TWh, bereits in der historischen Last); DB Energie (rund 450 Mio. l Diesel/a im Konzern, dazu NE-Bahnen); BMWK Langfristszenarien 3 (Modul Verkehr, T45-Strom: Endenergiebedarf Bahnverkehr bis 2045 nahezu konstant durch Effizienzgewinne, Verkehrsleistung Schiene +26-62 % bis 2045); BMDV Verkehrsverflechtungsprognose und Deutschlandtakt (Verdopplung Personenverkehr, +50 % Güterverkehr); Allianz pro Schiene (90 % der Verkehrsleistung bereits elektrisch).',
  sourceUrls: [
    'https://ibir.deutschebahn.com/2023/de/lagebericht/zusaetzliche-informationen/energie-und-klimaschutz/',
    'https://langfristszenarien.de/enertile-explorer-wAssets/docs/LFS3_T45_Verkehr_V2_0_barrierefrei.pdf',
    'https://bmdv.bund.de/SharedDocs/DE/Publikationen/G/verkehr-in-zahlen-2024.html',
    'https://www.allianz-pro-schiene.de/themen/umwelt/energieverbrauch/',
    'https://www.deutschlandtakt.de/',
    'https://www.bundesregierung.de/breg-de/themen/klimaschutz/klimaschutzprogramm-2030-1673502',
  ],
  referenceYear: 2023,
  dieselSubstitutionTWh: 2,
  modalShiftTWh: 8,
  defaultTargetTWh: 10,
  maxTargetTWh: 25,
  stepTWh: 0.5,
  distribution: 'hourly-profile',
  hourlyProfile: {
    source: 'Typischer Bahnstrom-Tagesgang nach DB Energie und Bundesnetzagentur-Standardlastprofil Traktion (16,7 Hz Bahnstromnetz). Morgenpeak 7-9 Uhr (Berufs- und Schülerverkehr), Mittagsdelle, Nachmittagspeak 16-18 Uhr (Pendlerrückverkehr), Nachttal 1-4 Uhr (nur Güter- und Nachtzüge). Stunde 0 = 00:00-01:00 Berlin-Zeit, Summe = 24.',
    sourceUrls: [
      'https://www.dbenergie.de/dbenergie-de/produkte/bahnstrom',
      'https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Versorgungssicherheit/Erzeugungskapazitaeten/start.html',
      'https://ibir.deutschebahn.com/2023/de/lagebericht/zusaetzliche-informationen/energie-und-klimaschutz/',
    ],
    multipliers: [
      0.50, 0.45, 0.40, 0.40, 0.45, 0.65, 1.00, 1.45,
      1.75, 1.30, 1.10, 1.05, 1.05, 1.05, 1.10, 1.30,
      1.60, 1.55, 1.50, 1.25, 1.00, 0.85, 0.70, 0.55,
    ],
  },
  note: 'Zusatzlast = max(0, Ziel-TWh) zusätzlich zum historischen Bahnstrom 2025 (rund 11 TWh DB Konzern Integrierter Bericht 2023, bereits in der Last enthalten). Default 10 TWh = 2 TWh Diesel-Substitution (rund 450 Mio. l Diesel/a DB Konzern plus NE-Bahnen Anteil, in Summe rund 500-600 Mio. l/a entsprechend rund 5-6 TWh thermisch; mit Wirkungsgradfaktor rund 3 für elektrische Traktion inklusive Rekuperation ergibt sich rund 2 TWh Strom) + 8 TWh Modal Shift (Verkehrsleistung Schiene laut BMWK Langfristszenarien T45 plus 26-62 % bis 2045, plus Effizienzgewinne kompensieren den Bedarf weitgehend; Deutschlandtakt-Ziele Verdopplung Personenverkehr und plus 50 % Güter sind ambitionierter, daher mittlerer Wert 8 TWh). Maximum 25 TWh deckt aggressive Modal-Shift- und Wasserstoff-Szenarien ab. Stundenverteilung folgt typischem Bahnstrom-Tagesgang mit Morgen- und Nachmittagspeak laut DB Energie.',
  summary: 'Diesel + Modal Shift',
};

export function additionalTWh(targetTWh: number, _model: E100BahnData = data) {
  return Math.max(0, targetTWh);
}

export function hourlyLoadGW(row: HourlyInput, targetTWh: number, model: E100BahnData = data) {
  const annualTWh = additionalTWh(targetTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const demandModule: DemandScenarioModule = {
  id: 'e100-bahn',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-bahn']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-bahn-target-twh'], context['e100-bahn']);
  },
};
