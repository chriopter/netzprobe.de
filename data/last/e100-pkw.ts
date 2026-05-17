import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { E100PkwData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandContext';

export const description: DatasetDoc = {
  id: 'e100-pkw',
  parentId: 'e100',
  domain: 'last',
  kind: 'scenario',
  title: 'PKW Elektrifizierung',
  source: 'Destatis Pkw-Fahrleistung 2023 (472,2 Mrd. km), KBA/BMWK Fahrzeugbestand, KIT-IIP Heinz 2018.',
  sourceUrls: [
    'https://www.destatis.de/DE/Presse/Pressemitteilungen/Zahl-der-Woche/2025/PD25_37_p002.html',
    'https://www.bmwk.de/Redaktion/DE/Publikationen/Energie/20241129-erneuerbare-energien-in-zahlen-2023.html',
    'https://www.umweltbundesamt.de/daten/umweltzustand-trends/verkehr/verkehrsinfrastruktur-fahrzeugbestand',
    'https://publikationen.bibliothek.kit.edu/1000086372',
    'https://www.iip.kit.edu/3559.php',
  ],
  period: '2023',
  resolution: 'Jahr × Stunde',
  unit: 'Mio. km, kWh/100 km, TWh',
  short: 'Zusatzlast aus elektrifizierten privaten Pkw-Kilometern.',
  description: [
    '**Bezugsjahr 2023:** private Pkw fahren rund `472.200 Mio. km`. Davon sind etwa `20.000 Mio. km` bereits elektrisch gefahren und damit schon in der historischen Stromlast enthalten; dieser Sockel ist das Slider-Minimum.',
    '**Verbrauch:** das Modell setzt `20 kWh/100 km` Strom ab Netz an, inklusive AC-Ladeverlusten. Der Wert liegt im Flottenmittel-Korridor (`18–22 kWh/100 km`); Einzelmodelle streuen segment- und wetterabhängig zwischen `14` und `28 kWh/100 km`. Eine vollständige Elektrifizierung der 2023er privaten Pkw-Fahrleistung ergibt so rund `90 TWh/a` Zusatzlast — sie ersetzt etwa das Dreifache an fossiler Kraftstoff-Endenergie, weil der **Antriebsstrang-Wirkungsgrad** vom Verbrenner (`~25 %`) zum BEV (`75–85 %`) um Faktor 3 steigt.',
    '**Lastform:** die Stundenlast folgt nicht dem Zeitpunkt der Fahrt, sondern dem Laden. Das hinterlegte 24-h-Heimladeprofil bildet ungesteuertes Laden mit Abendpeak `17–21 Uhr` und Nachttal `4–6 Uhr` ab; Smart Charging, öffentliches Laden und saisonal höherer Winterverbrauch bleiben außen vor.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `20.000` bis `708.300 Mio. km`. Der Default `472.200 Mio. km` steht für die private Pkw-Fahrleistung im Bezugsjahr; das Minimum ist der bereits elektrische Sockel. Das Maximum lässt Kopfraum für Mobilitätswachstum und gewerbliche Pkw (~`120.000 Mio. km/a`), die im Default nicht enthalten sind.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** 24-h-Heimladeprofil als Wochenmittel. Hauptlast am Abend `17–21 Uhr`, Nachttal `4–6 Uhr`; keine saisonale Modulation.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Zusatzlast = max(0, Ziel − 20.000) × 20 / 100.000`. Default: `(472.200 − 20.000) × 20 / 100.000 = 90,44 TWh/a`.',
    },
  ],
  method: [
    'Datei: handgepflegt, kein Generator-Skript. Konstanten und Rechenlogik liegen in data/last/e100-pkw.ts.',
    'Referenz-Fahrleistung referenceMillionKm: Destatis-Pkw-Fahrleistung privater Haushalte 2023, 472.200 Mio. km.',
    'Slider-Mindestwert alreadyElectricMillionKm: 1,4 Mio. BEV (KBA-Bestand Ende 2023) × rund 11.000 km/a plus 0,9 Mio. PHEV × rund 14.000 km/a × 40 % elektrischer Anteil ≈ 20.000 Mio. km. Strom für diese Kilometer ist bereits in der historischen Last enthalten; das Szenario modelliert nur die darüber hinausgehende Elektrifizierung.',
    'Flottenverbrauch kwhPer100Km: 20 kWh/100 km ab Netz, inklusive AC-Ladeverlusten. Reale BEV liegen zwischen 18 und 22 kWh/100 km; Saison- und Temperatureffekte (höherer Winterverbrauch durch Heizung) sind nicht modelliert.',
    "Stundenverteilung hourlyProfile.multipliers: Heinz 2018 (KIT-IIP Working Paper No. 30), Sheet 'Alle_Werktag' und 'Alle_Wochenende', Ladeszenario 'Zuhause laden' (Spalte 'Durchschnittliche Ladeleistung kW/Fahrzeug'). 10-Min-Werte auf 24 Stunden gemittelt, auf Tagesmittel 1,0 normiert. Wochenmittel = (5 × Werktag + 2 × Wochenende) / 7. Summe der 24 Werte exakt 24.",
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'title', unit: 'Text', description: 'Anzeigename.' },
    { name: 'source', unit: 'Text', description: 'Quellenkurzname.' },
    { name: 'sourceUrls', unit: 'Liste', description: 'Belege.' },
    { name: 'referenceYear', unit: 'Jahr', description: 'Bezugsjahr.' },
    { name: 'referenceMillionKm', unit: 'Mio. km', description: 'Pkw-Fahrleistung privater Haushalte.' },
    { name: 'alreadyElectricMillionKm', unit: 'Mio. km', description: 'Bereits elektrisch gefahren; Slider-Minimum.' },
    { name: 'defaultTargetMillionKm', unit: 'Mio. km', description: 'Slider-Default.' },
    { name: 'maxTargetMillionKm', unit: 'Mio. km', description: 'Slider-Maximum.' },
    { name: 'stepMillionKm', unit: 'Mio. km', description: 'Slider-Schrittweite.' },
    { name: 'kwhPer100Km', unit: 'kWh/100 km', description: 'Flottenverbrauch ab Netz inklusive Ladeverluste.' },
    { name: 'distribution', unit: 'Text', description: 'Verteilungstyp.' },
    { name: 'hourlyProfile', unit: 'Objekt', description: '24 Stundenmultiplikatoren Berlin-Zeit (Summe 24); Quellen und Quell-URLs.' },
    { name: 'note', unit: 'Text', description: 'Rechenhinweis.' },
  ],
  caveats: [
    'Modelliert sind nur private Pkw (~472 Mrd. km/a, Destatis Haushalte); gewerbliche und dienstliche Pkw (~120 Mrd. km/a Differenz zur KBA-Gesamtfahrleistung) bleiben außen vor.',
    'Ungesteuertes Heimladen — Smart-Charging und §14a-Steuerung würden Last in die Nacht verschieben.',
    'Kein Saisonprofil; realer Winterverbrauch liegt 20–30 % höher (Heizung, Kalt-Batterie).',
    'PHEV-Stromquote pauschal 40 % — am oberen Rand der Realweltdaten (ICCT/Plötz: faktisch 20–35 %).',
    'Arbeitsplatz- und öffentliche Ladung sind nicht modelliert; Mieter ohne Heim-Wallbox laden in der Praxis mit anderem Tagesprofil.',
  ],
};

export const data: E100PkwData = {
  id: 'e100-pkw',
  title: 'PKW Elektrifizierung',
  source: 'Destatis Pkw-Fahrleistung privater Haushalte 2023; KBA/BMWK Fahrzeugbestand und durchschnittliche Fahrleistung alternativer Antriebe 2023.',
  sourceUrls: [
    'https://www.destatis.de/DE/Presse/Pressemitteilungen/Zahl-der-Woche/2025/PD25_37_p002.html',
    'https://data.gov.de/suche/daten/verkehr-in-kilometern-vk-fahrleistungen-2014-2023',
    'https://www.bmwk.de/Redaktion/DE/Publikationen/Energie/20241129-erneuerbare-energien-in-zahlen-2023.html',
    'https://www.umweltbundesamt.de/daten/umweltzustand-trends/verkehr/verkehrsinfrastruktur-fahrzeugbestand',
  ],
  referenceYear: 2023,
  referenceMillionKm: 472200,
  alreadyElectricMillionKm: 20000,
  defaultTargetMillionKm: 472200,
  maxTargetMillionKm: 708300,
  stepMillionKm: 1000,
  kwhPer100Km: 20,
  distribution: 'hourly-profile',
  hourlyProfile: {
    source: "Heinz (2018), KIT-IIP Working Paper No. 30: Standardlastprofile Elektrofahrzeuge aus dem Deutschen Mobilitätspanel (MOP), Welle 2015/16. Ladeszenario 'Zuhause laden', Wochenmittel (5x Werktag + 2x Wochenende)/7. Ungesteuertes Laden (Auto wird beim Heimkommen sofort geladen). Stunde 0 = 00:00-01:00 Berlin-Zeit, Summe = 24.",
    sourceUrls: [
      'https://publikationen.bibliothek.kit.edu/1000086372',
      'https://www.iip.kit.edu/3559.php',
      'https://www.ffe.de/publikationen/veroeffentlichungen/316-standardlastprofile-fuer-kunden-mit-elektrostrassenfahrzeugen',
      'https://www.bdew.de/energie/standardlastprofile-strom/',
    ],
    multipliers: [
      0.786, 0.503, 0.332, 0.222, 0.140, 0.096, 0.124, 0.197,
      0.252, 0.275, 0.457, 0.704, 0.921, 1.100, 1.223, 1.560,
      2.137, 2.542, 2.549, 2.225, 1.812, 1.548, 1.279, 1.016,
    ],
  },
  note: 'Zusatzlast = max(0, Ziel-Pkw-km - bereits elektrisch gefahrene Pkw-km 2023) * 20 kWh/100 km. Der Slider beginnt beim bereits elektrischen Mindestwert. Bereits elektrisch gefahrene Pkw-km 2023 sind als Modellwert abgeleitet: rund 1,4 Mio. BEV Ende 2023 (KBA) mit etwa 11.000 km/a Fahrleistung plus rund 0,9 Mio. Plug-in-Hybride mit etwa 14.000 km/a, davon im Mittel 40 % elektrisch gefahren — zusammen rund 20 Mrd. km bereits elektrisch. Stundenverteilung folgt empirischem MOP-Heimladeprofil (ungesteuertes Laden, Abendpeak 17-21 Uhr).',
  summary: '20 kWh/100 km',
};

export function additionalMillionKm(targetMillionKm: number, model: E100PkwData = data) {
  return Math.max(0, targetMillionKm - model.alreadyElectricMillionKm);
}

export function additionalTWh(targetMillionKm: number, model: E100PkwData = data) {
  return additionalMillionKm(targetMillionKm, model) * model.kwhPer100Km / 100_000;
}

export function hourlyLoadGW(row: HourlyInput, targetMillionKm: number, model: E100PkwData = data) {
  const annualTWh = additionalTWh(targetMillionKm, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualTWh * 1000 * hourMultiplier / 8760;
}

export const demandModule: DemandScenarioModule = {
  id: 'e100-pkw',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-pkw']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-pkw-million-km'], context['e100-pkw']);
  },
};
