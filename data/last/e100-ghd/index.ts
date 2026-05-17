import type { DatasetDoc } from '../../../src/ui/dataCatalog';
import type { E100GhdData, HourlyInput } from '../../../src/types/data';
import type { DemandScenarioModule } from '../../../src/simulation/demandContext';
import dataJson from './data.json';

export const description: DatasetDoc = {
  id: "e100-ghd",
  parentId: "e100",
  domain: "last",
  kind: "scenario",
  title: "GHD Elektrifizierung",
  file: "last/e100-ghd/data.json",
  scripts: [
    "last/e100-ghd/generate.mjs",
    "last/e100-ghd/model.ts",
  ],
  source: "BDEW Statusreport Wärme 09/2025 (Raumwärme 153 TWh + Warmwasser 10 TWh = 163 TWh GHD 2023), AGEB, UBA, BMWK Energiedaten, BWP, Fraunhofer ISE Annex 28, BDEW SLP G0, DWD.",
  sourceUrls: [
    "https://www.bdew.de/media/documents/2025_09_24_Statusreport_Waerme_final.pdf",
    "https://ag-energiebilanzen.de/daten-und-fakten/anwendungsbilanzen/",
    "https://www.umweltbundesamt.de/daten/energie/energieverbrauch-nach-energietraegern-sektoren",
    "https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Publikationen/Energie/energiedaten-gesamtausgabe.html",
    "https://www.waermepumpe.de/normen-technik/grossanlagen-gewerbe/",
    "https://www.ise.fraunhofer.de/de/forschungsprojekte/wpsmart-im-bestand.html",
    "https://www.bdew.de/energie/standardlastprofile-strom/",
    "https://www.dwd.de/DE/leistungen/klimadatendeutschland/vielj_mittelwerte.html",
  ],
  period: "2023 (Mengen), reale Tagesmitteltemperaturen 2025 (Profil)",
  resolution: "Tag x Stunde",
  unit: "TWh Waerme, TWh Strom, JAZ",
  short: "Zusatzlast aus Umstellung der GHD-Heizung und Warmwasser auf Wärmepumpen.",
  description: [
    "**Bezugsjahr 2023:** der GHD-Sektor benötigt `153 TWh` Raumwärme + `10 TWh` Warmwasser = `163 TWh` Endenergie (BDEW Statusreport Wärme 09/2025); kompatibel mit AGEB-Anwendungsbilanz GHD (`~314 TWh` Endenergie, davon `~59,9 %` Wärmeanwendungen). Bereits elektrisch gedeckt sind rund `7 TWh` aus Direktheizung, kleinen Bestands-WPs und Boilern (Gastronomie, Pflege, Krankenhaus); dieser Strom steckt in der historischen Last und ist das Slider-Minimum.",
    "**Faktor:** Wärmepumpen heben den Strombedarf über die **Jahresarbeitszahl** `2,8` — gewichteter Bestandsmix Großgebäude (Fraunhofer-ISE-Feldtest weist `3,1` für Wohngebäude aus; GHD liegt konservativ darunter wegen höherer Vorlauftemperaturen, Multisplit-Anteilen und nicht-modernisierter Hülle). Default-Zusatzlast: `(163 − 7) / 2,8 ≈ 55,71 TWh/a`.",
    "**Lastform:** Tagesgewichte folgen realen Gradtagszahlen `2025` (Open-Meteo ERA5, 8-Städte-Mittel, auf DWD-Gebietsmittel kalibriert), identische Klimareihe wie e100-heiz. Innerhalb des Tages moduliert das **BDEW-SLP G0** mit Nachtabsenkung `0–5 Uhr` (`~0,4`), Ramp `6–8 Uhr` und Plateau `8–18 Uhr` (`~1,45–1,50`). Sommer-Heizspitzen `Jun–Aug` (`~1 TWh` Gesamt, einzelne Tage bis `~7 GW`) sind Modellartefakt der starren `15 °C`-Heizgrenze; Werktag-/Wochenend-Differenzierung fehlt.",
  ],
  overview: [
    {
      label: "Verwendung",
      value: "**Slider:** `7` bis `220 TWh` Wärme in `1-TWh`-Schritten. Default `163 TWh` = Raumwärme + Warmwasser GHD 2023 (BDEW). Werte oberhalb decken Upside-Szenarien (Sanierungsstau, Lüftungs- und Prozesswärme-Mitnahme) ab.",
    },
    {
      label: "Verteilung",
      value: "**Profil:** Gradtagszahl-Tageskette aus realen Tagesmitteltemperaturen `2025` × BDEW-SLP-G0-Büroprofil (Nachtabsenkung, Plateau `8–18 Uhr`).",
    },
    {
      label: "Formel",
      value: "**Rechnung:** `Zusatzstrom = (Ziel − 7) / JAZ`. Default: `(163 − 7) / 2,8 ≈ 55,71 TWh/a`.",
    },
  ],
  method: [
    "Datei: erzeugt durch data/e100-ghd/generate.mjs. Skript ausfuehren mit `node data/e100-ghd/generate.mjs > data/e100-ghd/data.json`; Rechenlogik in data/e100-ghd/model.ts.",
    "Referenz-Waermebedarf referenceHeatDemandTWh: BDEW Statusreport Waerme 09/2025 weist GHD 2023 mit 153 TWh Raumwaerme und 10 TWh Warmwasser = 163 TWh Endenergie aus; AGEB Anwendungsbilanz GHD-Endenergie 2023 rund 314 TWh, Waermeanwendungen rund 59,9 %, kompatibel mit dem BDEW-Wert.",
    "Slider-Mindestwert alreadyElectricHeatTWh: rund 7 TWh aus Direktheizung, kleinen Bestands-Waermepumpen und elektrischen Boilern (Gastronomie, Pflege, Krankenhaus). Strom dafuer ist bereits in der historischen Last.",
    "Jahresarbeitszahl seasonalCop: 2,8 als gewichteter Bestandsmix Grossgebaeude. Fraunhofer-ISE-Feldtest weist fuer Bestandsgebaeude im Mittel JAZ 3,1 (Luft/Wasser 3,4, Sole 4,3) aus; GHD-Bestand mit hoeheren Vorlauftemperaturen, Multisplit-Anteil und nicht-modernisierter Gebaeudehuelle liegt konservativ darunter. Quellen: Fraunhofer ISE WP-Feldtest Bestand und BWP-Branchenstudie.",
    "Gradtagszahl-Tagesprofil degreeDayProfile: reale Tagesmitteltemperaturen 2025 aus Open-Meteo ERA5-Reanalyse, 8 deutsche Großstädte gemittelt, additiv kalibriert pro Monat auf das DWD-Gebietsmittel DE 2025; HDD = max(0, 20 - T) wenn T < 15. Identische Klimareihe wie e100-heiz (Symlink temperatures-2025.json), weil GHD-Raumwaerme dieselbe Klimaabhaengigkeit hat.",
    "24-h-Tagesgang hourlyProfile.multipliers: BDEW-SLP G0 (Gewerbe allgemein) — starke Nachtabsenkung 0-5 Uhr (~0,4), Ramp 6-8 Uhr, Plateau 8-18 Uhr (~1,45-1,50), Abfall 19-23 Uhr. Summe 24, Tagesmittel 1,0.",
  ],
  fields: [
    {
      name: "id",
      unit: "Text",
      description: "Technische Kennung.",
    },
    {
      name: "title",
      unit: "Text",
      description: "Anzeigename.",
    },
    {
      name: "source",
      unit: "Text",
      description: "Quellenkurzname.",
    },
    {
      name: "sourceUrls",
      unit: "Liste",
      description: "Belege.",
    },
    {
      name: "referenceYear",
      unit: "Jahr",
      description: "Bezugsjahr.",
    },
    {
      name: "referenceHeatDemandTWh",
      unit: "TWh",
      description: "Raumwaerme + Warmwasser GHD-Sektor.",
    },
    {
      name: "alreadyElectricHeatTWh",
      unit: "TWh",
      description: "Bereits elektrisch gedeckte Waerme (Direktheizung, kleine WPs, Boiler); Slider-Minimum.",
    },
    {
      name: "defaultTargetHeatTWh",
      unit: "TWh",
      description: "Slider-Default.",
    },
    {
      name: "maxTargetHeatTWh",
      unit: "TWh",
      description: "Slider-Maximum.",
    },
    {
      name: "stepHeatTWh",
      unit: "TWh",
      description: "Slider-Schrittweite.",
    },
    {
      name: "seasonalCop",
      unit: "JAZ",
      description: "Jahresarbeitszahl GHD-Bestandsmix.",
    },
    {
      name: "distribution",
      unit: "Text",
      description: "Verteilungstyp.",
    },
    {
      name: "degreeDayProfile",
      unit: "Objekt",
      description: "Monatsmittel-Ankerpunkte, Heizgrenze, Innenreferenz, 365 Tageseintraege mit Datum, Tagesmitteltemperatur, Gradtagszahl und Gewicht.",
    },
    {
      name: "hourlyProfile",
      unit: "Objekt",
      description: "24 Stundenmultiplikatoren Berlin-Zeit (Summe 24) nach BDEW SLP G0; Quellen und Quell-URLs.",
    },
    {
      name: "note",
      unit: "Text",
      description: "Rechenhinweis.",
    },
  ],
  caveats: [
    "Nur GHD-Sektor — Haushalte (e100-heiz) und Industrieprozesswaerme nicht enthalten.",
    "JAZ 2,8 als Jahresmittel; Grossgebaeude mit hohen Vorlauftemperaturen und Multisplit liegen real teils darunter, der Winterpeak ist daher leicht unterschaetzt.",
    "Profil-Basis ist das reale Wetterjahr 2025; ein anderes Jahr ergäbe einen anderen Tagesgang.",
    "8-Städte-Mittel ist additiv auf DWD-Gebietsmittel DE pro Monat kalibriert; ländliche GHD-Standorte liegen ggf. leicht unter dem Großstadt-Niveau.",
    "Tagesgang G0 ist ein Misch-SLP ueber alle Gewerbearten; Schichtbetriebe (Krankenhaus 24/7) und Einzelhandel (Spitze 10-20 Uhr) werden gemittelt.",
    "Sommer-Heizspitzen (Jun–Aug ~1 TWh Gesamt, einzelne Tage bis ~7 GW Peak-Stunden-Last) sind ein Modellartefakt der starren DIN-Heizgrenze 15 °C — identische Mechanik wie bei e100-heiz auf demselben Klima-Profil. Reale Beispieltage 2025: 8.–11. Juni, 8. Juli, 22.–25. August mit Tagesmittel 12,6–15,0 °C. GHD-Anlagen wären saisonal aus, Gebäudemasse dämpft kurze Kühl-Stöße. Bewusst nicht gefixt (Überschlagsrechnung).",
    "Slider-Werte oberhalb 163 TWh decken Upside-Szenarien (Sanierungsstau, Lueftungs- und Prozesswaerme-Mitnahme) ab.",
    "Methodenwechsel Klimanormale → Wetterjahr 2025: das alte Verfahren (DWD-Klimanormale 1991–2020 als 12 Monatsanker + lineare Interpolation, identische Klimareihe wie e100-heiz) legte Jun–Aug exakt auf 0 TWh. Das neue Verfahren teilt die Klimareihe mit e100-heiz (Symlink temperatures-2025.json, Open-Meteo ERA5, 8 Großstädte additiv auf DWD-Gebietsmittel DE kalibriert) und hält die Jahressumme bei 55,7 TWh Strom (HDD 3.486 → 3.461, −0,7 %; Heiztage 266 → 262). Monatsverlauf TWh alt→neu u. a.: Feb 7,7→8,4 (Kältewelle), Apr 5,0→4,5 (warmer Apr), Jun–Aug 0,0→0,4/0,1/0,5, Sep 2,6→1,9. Peak-Tag wandert vom 16. Jan (T=1,5 °C, HDD 18,5) auf den 18. Feb (T=−3,6 °C, HDD 23,6); Peak-Stunden-Leistung steigt von 18,5 auf 23,8 GW (+29 %) — gleiche Mechanik wie bei e100-heiz, Klimanormalen unterschätzen den realen Worst-Case-Heiztag deutlich.",
  ],
};

export const data = dataJson as E100GhdData;

export function additionalHeatTWh(targetHeatTWh: number, model: E100GhdData = data) {
  return Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh);
}

export function additionalElectricityTWh(targetHeatTWh: number, model: E100GhdData = data) {
  return additionalHeatTWh(targetHeatTWh, model) / model.seasonalCop;
}

export function hourlyLoadGW(row: HourlyInput, targetHeatTWh: number, model: E100GhdData = data) {
  const annualElectricityTWh = additionalElectricityTWh(targetHeatTWh, model);
  const hourMultiplier = model.hourlyProfile.multipliers[row.hourOfDayBerlin];
  return annualElectricityTWh * 1000 * row.heatingDegreeDayWeight * hourMultiplier / 24;
}

export const demandModule: DemandScenarioModule = {
  id: 'e100-ghd',
  loadGW(row, scenario, context) {
    if (!scenario.demand['e100-ghd']) return 0;
    return hourlyLoadGW(row, scenario.demand['e100-ghd-target-heat-twh'], context['e100-ghd']);
  },
};
