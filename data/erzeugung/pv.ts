import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzPackageVariableRe } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'pv',
  domain: 'erzeugung',
  kind: 'scenario',
  title: 'PV',
  file: 'erzeugung/pv/data.json',
  scripts: [
    'erzeugung/pv/model.ts',
  ],
  source: 'Energy-Charts installed_power 2025 (installierte PV-Leistung Deutschland); MTGermany energy-simulation-de (Emissionsfaktor).',
  sourceUrls: [
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
    'https://github.com/MTGermany/energy-simulation-de',
    'https://app.electricitymaps.com/zone/DE',
  ],
  period: '2025',
  resolution: 'stündlich (Faktor) / jährlich (installierte Leistung)',
  unit: 'GW, g/kWh',
  short: 'Installierte Photovoltaik-Leistung; stündliche Einspeisung aus normierter Solarstrahlung.',
  description: [
    '**Anlagenpark:** rund zwei Millionen Aufdach- und Freiflächenanlagen mit einer installierten Wechselrichter-Gesamtleistung von `102,5 GW` (Energy-Charts, Jahresmittel 2025) bilden den **Default**. Der Bestand wuchs zuletzt mit etwa `15 GW/a`; das Slider-Maximum `2000 GW` (Schritt `10 GW`) ist bewusst weit über jeden realistischen Ausbaupfad gelegt, damit auch Vollversorgungs-Studien mit Süd-Überschuss durchgespielt werden können.',
    '**Einspeisecharakteristik:** die Stundenleistung folgt strikt der Solarstrahlung — `supplyGW(t) = installedGW × solarIrradiance[t]`. Der normierte Einspeisefaktor aus dem Paket `einspeisefaktoren-2025` deckt den deutschlandweit gewichteten Mittelwert ab und schwankt stündlich zwischen `0` (Nacht, Bewölkung) und etwa `0,5` (Sommer-Mittag, Mittelung über alle Standortorientierungen). Die Jahressumme der 8760 Stundenfaktoren liegt bei rund `700 h/a` Volllaststunden-Äquivalent — also etwa `72 TWh/a` Energieertrag beim Default-Bestand, im Korridor der realen 2025er Erzeugung (`60–75 TWh/a`, BDEW/AGEB). Die **Saisonsignatur** ist ausgeprägt: ein Juni-Tag liefert rund zehnmal so viel wie ein Dezember-Tag. Spezifische Emissionen sind mit `35 g/kWh` angesetzt (Modulfertigung und Wechselrichter-Verluste, electricitymaps DE).',
    '**Modellgrenze:** die installierte Leistung ist ein Jahresmittel — Inbetriebnahmen während des Jahres werden nicht stundenscharf ausgerollt. Der Einspeisefaktor ist ein **bundesweiter Mix**: Süd-Nord-Gradient, Ost-/West-Ausrichtung, Aufständerungswinkel und Verschattung sind aggregiert. Curtailment greift erst nach Wind Offshore und Onshore — Kernmodell schaltet PV bei Überschuss als drittes ab; redispatchbedingte Abregelung im realen Netz ist nicht abgebildet.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `2000 GW`, Schritt `10 GW`. Default `102,5 GW` ist der Energy-Charts-Bestand Ende 2025; das Maximum ist nicht als Prognose, sondern als Vollversorgungs-Spielraum gewählt (zum Vergleich: Ausbaupfad EEG `215 GW` bis 2030, Langfristszenarien Dena/BMWK bis rund `500 GW`).',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** `supplyGW(t) = installedGW × solarIrradiance[t]` mit normiertem Faktor aus `einspeisefaktoren-2025` (deutschlandweit gewichtet, Stundenwerte `0`–`0,5`, Jahressumme rund `700 h`). Tagesgang mit Mittagspeak und Nachtnull, ausgeprägte Sommer/Winter-Asymmetrie.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Emissionen(t) = supplyGW(t) × 35 g/kWh`. Bei Überschuss curtailed das Kernmodell PV als drittes nach Wind Offshore und Onshore.',
    },
  ],
  method: [
    'Datei: handgepflegt, kein Generator. Werte in data/erzeugung/pv/data.json, Adapter in data/erzeugung/pv/model.ts.',
    'Installierte Leistung Ende 2025 laut Energy-Charts (Jahresmittel).',
    'Einspeisefaktor solarIrradiance stündlich aus dem Paket einspeisefaktoren-2025; Wert pro Stunde zwischen 0 und etwa 0,5, Jahressumme rund 700 — entspricht 700 Volllaststunden pro GW installierter Leistung.',
    'Emissionsfaktor 35 g/kWh laut MTGermany (Quelle: electricitymaps DE) — beinhaltet Modulherstellung und Wechselrichter-Verluste.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'installed2025GW', unit: 'GW', description: 'Installierte Leistung Stand Ende 2025.' },
    { name: 'defaultInstalledGW', unit: 'GW', description: 'Slider-Default (entspricht installed2025GW).' },
    { name: 'minInstalledGW', unit: 'GW', description: 'Slider-Minimum.' },
    { name: 'maxInstalledGW', unit: 'GW', description: 'Slider-Maximum.' },
    { name: 'stepGW', unit: 'GW', description: 'Slider-Schrittweite.' },
    { name: 'mode', unit: 'Enum', description: 'variable-re: stündlich aus Einspeisefaktor berechnet.' },
    { name: 'factorPackage', unit: 'Text', description: 'Verweis auf das Paket mit Einspeisefaktoren.' },
    { name: 'factorField', unit: 'Text', description: 'Feld in den Einspeisefaktoren (solarIrradiance).' },
    { name: 'emissions', unit: 'Objekt', description: 'Spezifische CO₂e-Emissionen pro erzeugter kWh.' },
    { name: 'referenceScales', unit: 'Objekt', description: 'Größenanker zur Einordnung: 1 GW entspricht etwa Solarpark Witznitz (500 MW).' },
  ],
  caveats: [
    'PV-Einspeisefaktor ist deutschlandweiter Durchschnitt; regionale Unterschiede (Süd-Nord) nicht abgebildet.',
    'Default-Wert 102,5 GW ist Jahresmittel 2025 — Zuwachs während des Jahres nicht stundenaufgelöst.',
    'Emissionsfaktor 35 g/kWh enthält keine Recycling-Gutschrift; Lebenszyklus-Variation 15-50 g/kWh in der Literatur.',
  ],
};

export const data: ErzPackageVariableRe = {
  id: 'pv',
  name: 'Photovoltaik',
  installed2025GW: 102.5,
  defaultInstalledGW: 102.5,
  minInstalledGW: 0,
  maxInstalledGW: 2000,
  stepGW: 10,
  mode: 'variable-re',
  factorPackage: 'einspeisefaktoren-2025',
  factorField: 'solarIrradiance',
  emissions: { co2eGperKWh: 35 },
  referenceScales: { power: { value: 0.5, unit: 'GW', label: 'Solarpark Witznitz (500 MW)' } },
};
