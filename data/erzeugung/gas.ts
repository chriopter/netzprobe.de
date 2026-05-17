import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { ErzPackageDispatchable } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'gas',
  domain: 'erzeugung',
  kind: 'scenario',
  title: 'Gas',
  file: 'erzeugung/gas/data.json',
  scripts: [
    'erzeugung/gas/model.ts',
  ],
  source: 'Energy-Charts installed_power 2025 (Gas-Kraftwerke Deutschland); MTGermany energy-simulation-de (Verfügbarkeit, Min-Last, Emissionsfaktor).',
  sourceUrls: [
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
    'https://github.com/MTGermany/energy-simulation-de',
    'https://app.electricitymaps.com/zone/DE',
  ],
  period: '2025',
  resolution: 'stündlich (regelbar) / jährlich (installierte Leistung)',
  unit: 'GW, g/kWh',
  short: 'Installierte Gas-Kraftwerksleistung; dispatchable mit Min-Last 5 % der verfügbaren Leistung.',
  description: [
    '**Anlagenpark:** Erdgas-GuD, offene Gasturbinen und mit Erdgas befeuerte Kraft-Wärme-Kopplung mit installierter Gesamtleistung `35,5 GW` (Energy-Charts, Jahresmittel 2025) bilden den **Default**. Im Kraftwerkssicherheitsgesetz/KWSG-Pfad sind weitere `H2-Ready`-GuD im Zubau; das Slider-Maximum `360 GW` (Schritt `5 GW`) ist deutlich überdimensioniert, damit auch reine Backup-Welten und Wasserstoff-Konversionsszenarien rechenbar sind.',
    '**Einspeisecharakteristik:** das Modell bildet Gas als **dispatchable** ab — Min-Last `installedGW × 0,9 × 0,05` läuft immer mit, der Ramp-up greift bei Unterdeckung bis maximal `installedGW × 0,9`, also der Jahresverfügbarkeit von `90 %`. Im Lastfolge-Wettbewerb mit Kohle übernimmt Gas Hochlauf im **Verhältnis 2:1** (höhere Ramp-Rate von GuD und Gasturbinen). Spezifische Emissionen `494 g/kWh` (electricitymaps DE) als gewichteter Mix aus GuD (`~370 g/kWh`) und offenen Spitzenlast-Turbinen (`~550 g/kWh`).',
    '**Modellgrenze:** keine **Kaltstart-Restriktion** und keine Mindestvorhaltezeit — der Ramp ist im Wesentlichen instantan modelliert. Der Emissionsfaktor enthält keinen **Methan-Slip** aus Förderung und Transport (real `+10–25 %` Lebenszyklus-Aufschlag, je nach Importquelle); reale Marginal-Effizienz im Teillastbetrieb liegt unter dem hier verwendeten Mittel. Brennstoffwechsel auf H2 oder Biomethan ist nicht parametrisiert.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Slider:** `0` bis `360 GW`, Schritt `5 GW`. Default `35,5 GW` ist der Energy-Charts-Bestand Ende 2025; das Maximum dient als rechentechnischer Backup-Horizont und nicht als realistisches Ausbauziel (KWSG-Zubaupfad `~10 GW` H2-ready bis 2030).',
    },
    {
      label: 'Verteilung',
      value: '**Profil:** dispatchable. Min-Last `installedGW × 0,9 × 0,05` als Floor; Ramp-up bis `installedGW × 0,9` im Verhältnis Gas:Kohle `2:1`.',
    },
    {
      label: 'Formel',
      value: '**Rechnung:** `Emissionen(t) = supplyGW(t) × 494 g/kWh`. Bei Überschuss curtailed das Kernmodell Gas vor Biomasse und Laufwasser.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/erzeugung/gas/data.json, Adapter in data/erzeugung/gas/model.ts.',
    'Verfügbarkeit 90 % — Revisionsfenster und planbare Ausfälle.',
    'Min-Last minLoadFraction 0,05 als Floor auf die verfügbare Leistung: installedGW × 0,9 × 0,05 läuft immer mit, dispatcht nicht darunter.',
    'Ramp-Up bei Unterdeckung im Verhältnis 2:1 zu Kohle (höhere Ramp-Rate von Gas).',
    'Emissionsfaktor 494 g/kWh laut MTGermany (electricitymaps DE) — Mix aus GuD-Anlagen und Spitzenlast-Turbinen.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'installed2025GW', unit: 'GW', description: 'Installierte Leistung Stand Ende 2025.' },
    { name: 'defaultInstalledGW', unit: 'GW', description: 'Slider-Default.' },
    { name: 'minInstalledGW', unit: 'GW', description: 'Slider-Minimum.' },
    { name: 'maxInstalledGW', unit: 'GW', description: 'Slider-Maximum.' },
    { name: 'stepGW', unit: 'GW', description: 'Slider-Schrittweite.' },
    { name: 'mode', unit: 'Enum', description: 'dispatchable: Floor plus ramp-up.' },
    { name: 'availability', unit: 'Anteil', description: 'Jahresverfügbarkeit (0,9).' },
    { name: 'minLoadFraction', unit: 'Anteil', description: 'Min-Last als Anteil der verfügbaren Leistung (0,05).' },
    { name: 'emissionGperKWh', unit: 'g/kWh', description: 'Spezifische CO₂-Emissionen.' },
  ],
  caveats: [
    'Min-Last 5 % als Floor — keine Kaltstart-Restriktion oder Vorhaltezeit modelliert.',
    'Emissionsfaktor mischt GuD (370 g/kWh) und Gasturbine (550 g/kWh); reale Marginal-Effizienz variiert.',
    'Methan-Slip in Vorkette (Förderung, Transport) nicht im Emissionsfaktor enthalten — reale Lebenszyklus-Bilanz höher.',
  ],
};

export const data: ErzPackageDispatchable = {
  id: 'gas',
  name: 'Gas',
  installed2025GW: 35.5,
  defaultInstalledGW: 35.5,
  minInstalledGW: 0,
  maxInstalledGW: 360,
  stepGW: 5,
  mode: 'dispatchable',
  availability: 0.9,
  minLoadFraction: 0.05,
  emissionGperKWh: 494,
};
