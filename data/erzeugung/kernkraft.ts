import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzPackageBaseload } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'kernkraft',
  domain: 'erzeugung',
  kind: 'scenario',
  title: 'Kernkraft',
  file: 'erzeugung/kernkraft/data.json',
  scripts: [
    'erzeugung/kernkraft/model.ts',
  ],
  source: 'Energy-Charts installed_power 2025 (Kernkraft Deutschland nach Abschaltung 15.04.2023 = 0 GW); IPCC AR6 WG3 Annex III (Lebenszyklus-Emissionen Kernkraft Median 12 g/kWh, Range 5-110); UBA Climate Change 13/2025 (Vorketten-Faktoren Strom).',
  sourceUrls: [
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
    'https://www.ipcc.ch/report/ar6/wg3/downloads/report/IPCC_AR6_WGIII_Annex-III.pdf',
    'https://www.umweltbundesamt.de/sites/default/files/medien/11850/publikationen/13_2025_cc.pdf',
    'https://app.electricitymaps.com/zone/DE',
  ],
  period: '2025',
  resolution: 'stündlich (Verfügbarkeitsmittel) / jährlich (installierte Leistung)',
  unit: 'GW, g/kWh',
  short: 'Hypothetische installierte Kernkraftleistung; Baseload mit Verfügbarkeit 0,9.',
  description: [
    '**Anlagenpark:** Deutschland hat den letzten Reaktor (Isar 2, Emsland, Neckarwestheim 2) am `15.04.2023` vom Netz genommen — installierter Bestand 2025 ist `0 GW`, der **Default**. Der Slider erlaubt eine hypothetische Wiederinbetriebnahme bis `50 GW` (Schritt `0,5 GW`); das Maximum entspricht in etwa der historischen Spitzenkapazität Deutschlands (rund `21 GW`) zuzüglich Spielraum für Szenarien mit Neubauten oder europäischer Importperspektive.',
    '**Einspeisecharakteristik:** das Modell bildet Kernkraft als **Baseload** ab — `supplyGW(t) = installedGW × 0,9` konstant über alle `8760 h/a`. Bei einer Verfügbarkeit von `0,9` ergibt das Volllaststunden von rund `7900 h/a` und beim Maximum `50 GW` einen Jahresertrag von etwa `395 TWh/a` — zum Vergleich: die deutsche Gesamt-Bruttostromerzeugung liegt bei rund `500 TWh/a`. Spezifische Emissionen sind mit `12 g/kWh` als **IPCC-AR6-Median** angesetzt (Spannweite `5–110 g/kWh`); enthalten sind Uran-Bergbau, Anreicherung, Brennstoff-Lebenszyklus, Anlagenbau und Rückbau.',
    '**Modellgrenze:** die Verfügbarkeit ist konstant `0,9` als Jahresmittel — Revisionsfenster, planbare Stillstände und Lastfolgebetrieb (in DE historisch kaum, in FR üblich) sind nicht stundenscharf modelliert. Endlager-Kosten und Versicherungsrisiken bleiben außen vor. Im Curtailment-Stack des Kernmodells wird Kernkraft nach Wind und PV abgeregelt, läuft also bei Überschuss länger als die volatilen Erneuerbaren.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `50 GW`, Schritt `0,5 GW`. Default `0 GW` reflektiert den Status nach Abschaltung der letzten drei Reaktoren am `15.04.2023`; das Maximum liegt jenseits der historischen Spitzenkapazität (`~21 GW`) und bedient explizit hypothetische Neubau- oder SMR-Szenarien.',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** `supplyGW(t) = installedGW × 0,9` als konstanter Baseload. Keine Stundenstruktur, keine Saisonmodulation.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Emissionen(t) = supplyGW(t) × 12 g/kWh` (IPCC-AR6-Median inkl. Vorketten und Anlagenbau). Bei Überschuss curtailed das Kernmodell Kernkraft nach Wind und PV als letztes.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/erzeugung/kernkraft/data.json, Adapter in data/erzeugung/kernkraft/model.ts.',
    'Verfügbarkeit 90 % als konstanter Jahresanteil — entspricht typischer Revisionsbilanz.',
    'Emissionsfaktor 12 g/kWh als Median IPCC AR6 / UBA-Vorkettenwert — beinhaltet Uran-Bergbau, Anreicherung, Brennstoff-Lebenszyklus, Anlagenbau und Rückbau.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'installed2025GW', unit: 'GW', description: 'Installierte Leistung Stand Ende 2025 (= 0).' },
    { name: 'defaultInstalledGW', unit: 'GW', description: 'Slider-Default.' },
    { name: 'minInstalledGW', unit: 'GW', description: 'Slider-Minimum.' },
    { name: 'maxInstalledGW', unit: 'GW', description: 'Slider-Maximum.' },
    { name: 'stepGW', unit: 'GW', description: 'Slider-Schrittweite.' },
    { name: 'mode', unit: 'Enum', description: 'baseload: konstante Leistung × Verfügbarkeit.' },
    { name: 'availability', unit: 'Anteil', description: 'Jahresverfügbarkeit (0,9).' },
    { name: 'emissionGperKWh', unit: 'g/kWh', description: 'Spezifische CO₂-Emissionen.' },
  ],
  caveats: [
    'Default 0 GW reflektiert den Status Deutschland 2025 — Szenarien mit Kernkraft-Wiederinbetriebnahme sind hypothetisch.',
    'Verfügbarkeit konstant 0,9 — Revisionsfenster und planbare Ausfälle nicht stundenaufgelöst.',
    'Emissionsfaktor 12 g/kWh entspricht IPCC-AR6-Median (Spannweite 5-110 g/kWh, je nach Methodik); konservativer Wert inkl. Vorketten und Anlagenbau. Frühere Annahme 5 g/kWh war pro-nuklear-optimistisch.',
  ],
};

export const data: ErzPackageBaseload = {
  id: 'kernkraft',
  name: 'Kernkraft',
  installed2025GW: 0,
  defaultInstalledGW: 0,
  minInstalledGW: 0,
  maxInstalledGW: 500,
  stepGW: 0.5,
  mode: 'baseload',
  availability: 0.9,
  emissionGperKWh: 12,
  // UI-Anker: 1,4 GW ≈ ein Block der Konvoi-Baureihe (Isar 2, Brokdorf, Emsland);
  // wird im Sidebar-Slider als „≈ X × Isar 2" gerendert.
  comparison: { divisor: 1.4, label: 'Isar 2' },
};
