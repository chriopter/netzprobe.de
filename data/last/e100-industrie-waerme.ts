import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { E100IndustrieWaermeData, HourlyInput } from '../../src/types/data';
import type { DemandScenarioModule } from '../../src/simulation/demandContext';

export const description: DatasetDoc = {
  id: 'e100-industrie-waerme',
  parentId: 'e100',
  domain: 'last',
  kind: 'scenario',
  title: 'Prozesswärme Elektrifizierung',
  file: 'last/e100-industrie-waerme/data.json',
  scripts: [
    'last/e100-industrie-waerme/model.ts',
  ],
  source: 'AGEB Anwendungsbilanz Industrie 2023 (sonstige Industrie ohne Stahl/Chemie rund 220 TWh Endenergie Wärme); Fraunhofer ISI/RWTH IOB Wärmewende-Studie 2023; Wuppertal Institut/sci4climate.NRW 4-Stufen-Modell 2023; IEA HPT Annex 58 (Hochtemperatur-Wärmepumpen); dena Technologie-Fakten HT-WP; BV Glas; VDP Papierindustrie.',
  sourceUrls: [
    'https://ag-energiebilanzen.de/wp-content/uploads/2024/11/Anwendungsbilanz_Industrie_2023_final_20250324.pdf',
    'https://www.isi.fraunhofer.de/de/presse/2023/presseinfo-19-waermewende-in-der-industrie.html',
    'https://www.umweltbundesamt.de/themen/industrielle-prozesswaerme-kann-bis-2045-co2',
    'https://wupperinst.org/p/wi/p/s/pd/938',
    'https://sci4climate.nrw/wp-content/uploads/2023/12/Schuewer_Holtz_2023_Bereitstellung-klimaneutraler-Prozesswaerme-fuer-die-Industrie.-Ein-4-Stufen-Modell.pdf',
    'https://heatpumpingtechnologies.org/publications/annex-58-high-temperature-heat-pumps-final-report/',
    'https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2022/Technologie-Fakten_Klimaschutz_in_der_Industrie_Hochtemperatur-Waermepumpen.pdf',
    'https://www.bvglas.de/presse/presseinformation/news/glasindustrie-steigende-energiekosten-gefaehrden-energiewende/',
    'https://www.papierindustrie-transformation.de/transformation',
  ],
  period: '2023',
  resolution: 'Jahr × Stunde',
  unit: 'TWh Wärme, TWh Strom',
  short: 'Zusatzlast aus Elektrifizierung der Prozesswärme in sonstiger Industrie (ohne Stahl, ohne Chemie).',
  description: [
    '**Bezugsjahr 2023:** die AGEB-Anwendungsbilanz Industrie weist `506 TWh` Endenergie Prozesswärme aus. Davon sind Eisen/Stahl `~120 TWh` (e100-stahl) und Chemie `~165 TWh` (e100-chemie) ausgegliedert; verbleibend sonstige Industrie `~220 TWh` — Papier/Zellstoff `~18 TWh`, Glas/Keramik `~19 TWh`, NE-Metalle/Gießereien, Lebensmittel, Maschinenbau, Bauindustrie, Trocknung. Bereits elektrisch gedeckt sind `~25 TWh` (Glas-Elektroschmelze `~4 TWh`, Papier-E-Kessel-Pilot, Al-Sekundär-Induktion, Lebensmittel-/Pharma-Elektrobeheizung) und Teil der historischen Last; das ist das Slider-Minimum.',
    '**Faktor:** der **Strom-pro-Wärme-Faktor** `0,55` mittelt über die Temperaturschichtung (Fraunhofer ISI/Wuppertal): `30 %` NT (<`100 °C`) → Großwärmepumpen COP `3,5`; `45 %` MT (`100–500 °C`) → 50/50-Mix HT-WP COP `2,0` (IEA HPT Annex 58 zeigt `1,6–5,8` je nach Lift) und E-Dampfkessel η `0,98`; `25 %` HT (>`500 °C`) → Lichtbogen/Induktion/Plasma/Widerstand η `0,95`. Roh-Mix `0,30/3,5 + 0,45 × 0,75 + 0,25/0,95 ≈ 0,69`; mit pauschalem Abwärme-Recycling- und Prozessintegrations-Bonus (`~20 %` Wärmerückgewinnung über Mehrstufen-HT-WP, Brüden- und Rauchgaskondensation) sinkt der effektive Brutto-Faktor auf `0,55`. Default-Zusatzlast: `(220 − 25) × 0,55 ≈ 107 TWh/a`. Materialsubstitution und Wirkungsgrad-Drift einzelner Anlagen sind nicht modelliert.',
    '**Lastform:** kein Saisonprofil — Industrieprozesse sind witterungsunabhängig. 24-h-Tagesgang als Schichtbetrieb-Mittelung (`50 %` 24/7-Kontibetrieb wie Papier/Glas/Al-Sekundär + `50 %` Werktag-Tagschicht wie Lebensmittel/Maschinenbau/Bau) ergibt Nacht `0,86–0,88` (`22–5 Uhr`) und Tagplateau `1,05–1,13` (`6–21 Uhr`). Werktag-/Wochenend-Differenzierung einzelner Branchen entfällt.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `25` bis `320 TWh` Wärme in `5-TWh`-Schritten. Default `220 TWh` = AGEB sonstige Industrie 2023 (`506` − Stahl `120` − Chemie `165`). Das Maximum deckt Wachstumspfade bis 2045 ab (Re-Industrialisierung, Sanierungsstau).',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** Schichtbetrieb-Mittelung BDEW G3 + G1, Nacht `0,86–0,88`, Tag `1,05–1,13`, Summe `24`. Kein Saisongang.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Zusatzstrom = (Ziel − 25) × 0,55`. Default: `(220 − 25) × 0,55 ≈ 107 TWh/a`.',
    },
  ],
  method: [
    'Datei: handgepflegt, kein Generator-Skript. Konstanten direkt in data/e100-industrie-waerme/data.json; Rechenlogik in data/e100-industrie-waerme/model.ts.',
    "Sektorabgrenzung: AGEB-Anwendungsbilanz Industrie 2023 (Fraunhofer ISI im Auftrag der AGEB, März 2025) weist 506 TWh Endenergie Prozesswärme für die Gesamtindustrie aus. Davon Eisen/Stahl rund 120 TWh und Chemie (Grundstoffchemie und sonst. chem. Industrie) rund 165 TWh in separaten Paketen (e100-stahl, e100-chemie). Verbleibend sonstige Industrie rund 220 TWh — Papier/Zellstoff (rund 18 TWh Endenergie Wärme; VDP), Glas/Keramik (rund 19 TWh; BV Glas), NE-Metalle/Gießereien (Aluminium-Sekundär, Kupfer, Zink), Ernährung+Tabak (Dampf, Sterilisation, Trocknung), Maschinenbau, Bauindustrie/Steine+Erden (ohne Zement, der überwiegend Chemie/Mineralien-Klinker zugerechnet ist), Sonstiges Verarbeitendes Gewerbe und Trocknung.",
    'Temperaturschichtung temperatureMix (Fraunhofer ISI/RWTH IOB Wärmewende-Studie 2023, Wuppertal Institut sci4climate 4-Stufen-Modell 2023): Niedertemperatur < 100 °C rund 30 % (Trocknung, Waschen, Vorwärmung, Sterilisation) → Großwärmepumpen COP 3,5. Mitteltemperatur 100–500 °C rund 45 % (Lebensmittel-Dampf, Papier-Eindampfung, Trocknung, Lackieren, Galvanik-Bad) → 50/50-Mix aus Hochtemperatur-Wärmepumpen (IEA HPT Annex 58: COP 1,6–5,8 je nach Lift; konservative Annahme COP 2,0 bei rund 150 °C) und E-Dampfkesseln (Bosch ELSB / Babcock Wanson VAP-EL: η > 0,98), ergibt Strom-pro-Wärme-Faktor 0,75. Hochtemperatur > 500 °C rund 25 % (Glas-/Keramik-Schmelzwannen, NE-Sintern, Backöfen, Trocknungsöfen Bau) → Lichtbogen/Induktion/Plasma/Widerstand η 0,95 (Branchenmittel; reale Glasschmelze-Wirkungsgrade liegen niedriger und werden durch Hybridschmelzen kompensiert).',
    'Strom-pro-Wärme-Faktor electricityPerHeat: 0,55 effektiv. Roher Temperaturmix-Mittelwert = 0,30/3,5 + 0,45×0,75 + 0,25/0,95 ≈ 0,086 + 0,338 + 0,263 ≈ 0,69; ein pauschaler Abwärme-/Prozessintegrations-Bonus (rund 20 % Rückgewinnung über Mehrstufen-HT-WP, Brüden- und Rauchgaskondensation, Wärmenetz-Kopplung) zieht den Brutto-Faktor auf 0,55. Default-Strom: (220 − 25) × 0,55 ≈ 107 TWh Zusatzstrom.',
    'Slider-Mindestwert alreadyElectricHeatTWh: rund 25 TWh aus AGEB Strom-Anwendungsbilanz Prozesswärme der relevanten Branchen — Glas-Elektroschmelze (rund 4 TWh, BV Glas), Papier-Elektrokessel-Pilotanlagen, NE-Aluminium-Sekundär (Induktion), Lebensmittel-Sterilisation und Pharma-Elektrobeheizung. Strom dafür ist bereits in der historischen Last.',
    "24-h-Tagesgang hourlyProfile.multipliers: Schichtbetrieb-Mittelung in Anlehnung an BDEW Standardlastprofile (G3 'Gewerbe durchlaufend' ≈ flach, G1 'Werktag 8–18') — Annahme 50 % der sonstigen Industrie läuft 24/7 (Papier-Maschinen, Glas-Wannen, Aluminium-Sekundär), 50 % nur Werktag-Tagschicht (Lebensmittel, Maschinenbau, Bau). Mittelung ergibt leichten Spread mit Nachtniveau 0,86–0,88 (22–5 Uhr) und Tagplateau 1,05–1,13 (6–21 Uhr) mit flachem Vor-/Nachmittagspeak. Summe 24, Tagesmittel 1,0. Kein Saisonprofil — Industrieprozesse sind witterungsunabhängig.",
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'title', unit: 'Text', description: 'Anzeigename.' },
    { name: 'source', unit: 'Text', description: 'Quellenkurzname.' },
    { name: 'sourceUrls', unit: 'Liste', description: 'Belege.' },
    { name: 'referenceYear', unit: 'Jahr', description: 'Bezugsjahr.' },
    { name: 'referenceHeatTWh', unit: 'TWh', description: 'Endenergie Prozesswärme sonstige Industrie (ohne Stahl, ohne Chemie).' },
    { name: 'alreadyElectricHeatTWh', unit: 'TWh', description: 'Bereits elektrisch gedeckte Prozesswärme; Slider-Minimum.' },
    { name: 'defaultTargetHeatTWh', unit: 'TWh', description: 'Slider-Default.' },
    { name: 'maxTargetHeatTWh', unit: 'TWh', description: 'Slider-Maximum.' },
    { name: 'stepHeatTWh', unit: 'TWh', description: 'Slider-Schrittweite.' },
    { name: 'electricityPerHeat', unit: 'TWh Strom / TWh Wärme', description: 'Gewichteter Strom-pro-Wärme-Faktor aus Temperaturmix.' },
    { name: 'temperatureMix', unit: 'Objekt', description: 'Anteile NT/MT/HT und ihre Effizienzparameter (COP, Strom-pro-Wärme-Faktor, Wirkungsgrad).' },
    { name: 'distribution', unit: 'Text', description: 'Verteilungstyp.' },
    { name: 'hourlyProfile', unit: 'Objekt', description: '24 Stundenmultiplikatoren Berlin-Zeit (Summe 24); Schichtbetrieb-Mittelung.' },
    { name: 'note', unit: 'Text', description: 'Rechenhinweis.' },
  ],
  caveats: [
    'Stahl und Chemie sind ausdrücklich nicht enthalten — sie werden in den separaten Paketen e100-stahl und e100-chemie modelliert; doppelte Zählung vermeiden.',
    'Die AGEB-Anwendungsbilanz weist Prozesswärme nicht direkt nach Temperaturniveau aus; die 30/45/25-Aufteilung NT/MT/HT ist eine Literatur-Mittelung aus Fraunhofer ISI Wärmewende-Studie 2023, Wuppertal Institut sci4climate 4-Stufen-Modell und Branchen-Roadmaps. Unsicherheit der Temperaturschichtung rund ±5 Prozentpunkte.',
    'Mix-Wirkungsgrade von HT-Wärmepumpen (IEA Annex 58 zeigt COP 1,6–5,8 je nach Lift), E-Dampfkesseln (η > 0,98) und Lichtbogen/Plasma (reale Wannen-Wirkungsgrade in der Glasindustrie liegen unter den hier angenommenen 0,95) sind Literaturmittel; reale Anlagenwirkungsgrade können um mehrere Prozentpunkte abweichen und den Strom-pro-Wärme-Faktor um rund ±0,05 verschieben.',
    'Schichtbetrieb-Tagesgang ist eine Mittelung aus 24/7- und Tagschichtanlagen; einzelne Branchen (Lebensmittel mit ausgeprägtem Werktag-Tagesgang vs. Papier/Glas mit konstantem 24/7-Lauf) sind nicht differenziert.',
    'Wachstumspfad sonstiger Industrie bis 2045 ist unsicher (De-Industrialisierung vs. Re-Industrialisierung); der Slider deckt bis 320 TWh Upside ab.',
    'Effizienzgewinne durch Prozessoptimierung, Abwärmenutzung und Materialsubstitution sind nicht separat modelliert und würden den Wärmebedarf vor Elektrifizierung senken.',
  ],
};

export const data: E100IndustrieWaermeData = {
  id: 'e100-industrie-waerme',
  title: 'Industrie-Prozesswärme Elektrifizierung',
  source: 'AGEB Anwendungsbilanz Industrie 2023 (Industrie-Prozesswärme insgesamt rund 506 TWh; ohne Eisen/Stahl rund 120 TWh und Chemie rund 165 TWh verbleibt sonstige Industrie rund 220 TWh). Temperaturschichtung 30/45/25 % NT/MT/HT abgeleitet aus Fraunhofer ISI/RWTH IOB Wärmewende-Studie (2023), Wuppertal Institut sci4climate.NRW 4-Stufen-Modell (2023) und IEA HPT Annex 58.',
  sourceUrls: [
    'https://ag-energiebilanzen.de/wp-content/uploads/2024/11/Anwendungsbilanz_Industrie_2023_final_20250324.pdf',
    'https://www.isi.fraunhofer.de/de/presse/2023/presseinfo-19-waermewende-in-der-industrie.html',
    'https://www.umweltbundesamt.de/themen/industrielle-prozesswaerme-kann-bis-2045-co2',
    'https://wupperinst.org/p/wi/p/s/pd/938',
    'https://sci4climate.nrw/wp-content/uploads/2023/12/Schuewer_Holtz_2023_Bereitstellung-klimaneutraler-Prozesswaerme-fuer-die-Industrie.-Ein-4-Stufen-Modell.pdf',
    'https://heatpumpingtechnologies.org/publications/annex-58-high-temperature-heat-pumps-final-report/',
    'https://www.dena.de/fileadmin/dena/Publikationen/PDFs/2022/Technologie-Fakten_Klimaschutz_in_der_Industrie_Hochtemperatur-Waermepumpen.pdf',
    'https://www.bvglas.de/presse/presseinformation/news/glasindustrie-steigende-energiekosten-gefaehrden-energiewende/',
    'https://www.papierindustrie-transformation.de/transformation',
  ],
  referenceYear: 2023,
  referenceHeatTWh: 220,
  alreadyElectricHeatTWh: 25,
  defaultTargetHeatTWh: 220,
  maxTargetHeatTWh: 320,
  stepHeatTWh: 5,
  electricityPerHeat: 0.55,
  temperatureMix: {
    ntShare: 0.30,
    mtShare: 0.45,
    htShare: 0.25,
    ntCop: 3.5,
    mtElectricFactor: 0.75,
    htEfficiency: 0.95,
  },
  distribution: 'hourly-profile',
  hourlyProfile: {
    source: "Schichtbetrieb-Mittelung in Anlehnung an BDEW Standardlastprofile (G3 'Gewerbe durchlaufend' ≈ flach; G1 'Werktag 8–18'): Annahme 50 % der sonstigen Industrie 24/7 (Papier, Glas-Schmelze, Aluminium-Sekundär — kontinuierlich), 50 % Werktag-Tagschicht (Lebensmittel, Maschinenbau, Trocknung, Bau). Mittelung ergibt leichten Tag/Nacht-Spread mit Nacht 0,86–0,88 (22–5 Uhr) und Tagplateau 1,05–1,13 (6–21 Uhr). Stunde 0 = 00:00–01:00 Berlin-Zeit, Summe = 24,000. Keine Saisonkomponente — Industrieprozesse sind witterungsunabhängig.",
    sourceUrls: [
      'https://www.bdew.de/energie/standardlastprofile-strom/',
      'https://www.bdew.de/media/documents/1999_Repraesentative-VDEW-Lastprofile.pdf',
      'https://www.isi.fraunhofer.de/de/presse/2023/presseinfo-19-waermewende-in-der-industrie.html',
    ],
    multipliers: [
      0.86, 0.86, 0.86, 0.86, 0.86, 0.88, 0.95, 1.02,
      1.08, 1.10, 1.12, 1.13, 1.13, 1.13, 1.12, 1.10,
      1.08, 1.07, 1.06, 1.04, 1.00, 0.95, 0.86, 0.88,
    ],
  },
  note: 'Zusatzlast = max(0, Ziel-TWh-Wärme − bereits elektrisch gedeckt) × electricityPerHeat. Default-Ableitung: AGEB 2023 Anwendungsbilanz Industrie weist 506 TWh Prozesswärme aus (Endenergie, Brennstoffe + Strom). Davon Eisen/Stahl rund 120 TWh und Chemie (Grundstoff- + sonstige chem. Industrie) rund 165 TWh separat in e100-stahl bzw. e100-chemie. Verbleibend sonstige Industrie rund 220 TWh — Papier/Zellstoff (rund 18 TWh Endenergie Wärme), Glas+Keramik (rund 19 TWh), NE-Metalle/Gießereien, Lebensmittel (Dampf+Trocknung), Maschinenbau, Bauindustrie, Trocknung. Temperaturmix Fraunhofer ISI/Wuppertal: 30 % NT (<100 °C) → Großwärmepumpen COP 3,5 / 45 % MT (100–500 °C) → 50/50 HT-WP COP 2,0 + E-Dampfkessel η 0,98, Faktor 0,75 / 25 % HT (>500 °C) → Lichtbogen/Induktion/Plasma η 0,95. Roher Mix-Mittelwert 0,30/3,5 + 0,45×0,75 + 0,25/0,95 ≈ 0,69; mit pauschalem Abwärme-/Prozessintegrations-Bonus (rund 20 % Rückgewinnung über Mehrstufen-HT-WP, Brüden-/Rauchgaskondensation) effektiv 0,55. Default-Strom: (220 − 25) × 0,55 ≈ 107 TWh. Mindestwert 25 TWh bereits elektrisch entspricht Glas-Elektroschmelze (rund 4 TWh), Papier-Elektrokessel-Pilotanlagen, NE-Aluminium-Sekundär und Lebensmittel-Sterilisation.',
  summary: 'Strom/Wärme 0,55',
};

export function additionalHeatTWh(targetHeatTWh: number, model: E100IndustrieWaermeData = data) {
  return Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh);
}

export function additionalElectricityTWh(targetHeatTWh: number, model: E100IndustrieWaermeData = data) {
  return additionalHeatTWh(targetHeatTWh, model) * model.electricityPerHeat;
}

export function hourlyLoadGW(row: HourlyInput, targetHeatTWh: number, model: E100IndustrieWaermeData = data) {
  const annualElectricityTWh = additionalElectricityTWh(targetHeatTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualElectricityTWh * 1000 * hourMultiplier / 8760;
}

export const demandModule: DemandScenarioModule = {
  id: 'e100-industrie-waerme',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-industrie-waerme']) return 0;
    return hourlyLoadGW(
      row,
      scenario.demand['e100-industrie-waerme-target-heat-twh'],
      context['e100-industrie-waerme'],
    );
  },
};
