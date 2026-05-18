import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { SpeicherH2Data } from '../../src/types/data';

export const description: DatasetDoc = {
  id: 'h2',
  domain: 'speicher',
  kind: 'scenario',
  title: 'Wasserstoff',
  file: 'speicher/h2/data.json',
  scripts: [
    'speicher/h2/model.ts',
  ],
  source: 'Energy-Charts (H₂-Bestand 2025 quasi null); Fraunhofer IKTS Faktencheck Wasserstoff (Roundtrip-Korridor 30-42 %); Fraunhofer ISE Wasserstoff-Balance (Power-to-Power); IEA Future of Hydrogen 2019 (30-42 % je nach Pfad); BNetzA Szenariorahmen 2025.',
  sourceUrls: [
    'https://www.energy-charts.info/',
    'https://www.ikts.fraunhofer.de/content/dam/ikts/abteilungen/umwelt_und_verfahrenstechnik/technologieoekonomik_nachhaltigkeitsanalyse/oekonomische_analyse_nachhaltigkeit/Fraunhofer_IKTS_Faktencheck_Wasserstoff.pdf',
    'https://www.ise.fraunhofer.de/de/forschungsprojekte/wasserstoff-balance-im-energiesystem.html',
    'https://www.iea.org/reports/the-future-of-hydrogen',
    'https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/Versorgungssicherheit/NEP_Strom/start.html',
  ],
  period: '2025',
  resolution: 'stündlich',
  unit: 'GW, GWh',
  short: 'H2-Pool für Industrie und Rückverstromung; Slider für Elektrolyse-, Rückverstromungs-Leistung und Kavernen-Energie; `~34 %` Power-to-Power-Roundtrip.',
  description: [
    '**Auslegung:** der H₂-Speicher dient als zentraler **H₂-Pool** (Architektur nach PyPSA-Eur/REMod/Agora KNDE2045-Konsens). **Zuflüsse:** Stromüberschuss-Elektrolyse aus Erzeugungsüberschuss (Slider `0–300 GW`, Default `0,1 GW`, η = `0,34` roundtrip) und H₂-Import (siehe `aussenhandel/h2-handel`, verlustfrei). **Abflüsse:** stündlicher H₂-Bedarf der vier Industrie-Sektoren (Stahl/Chemie/Schiff/Flug, priority-basiert nach niedrigstem System-η) und Rückverstromung im Defizit (Slider `0–300 GW`, Default `0 GW`). Kavernen-Energie `0–500 TWh` (Default `0,1 GWh`). Das `500 TWh`-Maximum schöpft das norddeutsche Kavernen-Volumen (DEEP.KBB) aus.',
    '**Wirkungsgradkette:** die `34 %` Roundtrip gelten für den Power-to-Power-Pfad und ergeben sich aus Elektrolyse `~65 %` × Kavernen-Speicher `~95 %` × Rückverstromung `~55 %`; Quellen-Korridor `30–42 %` (Fraunhofer IKTS/ISE, IEA). Im Pool-Modell schreibt die Bilanz `SoC(t+1) = SoC(t) + 0,34·ΔStromLaden + ΔImport − ΔSektorBedarf − ΔRückverstromung` die Lade-Verluste nur dem Stromüberschuss-Pfad zu — importierter und für Industrie genutzter H₂ ist verlustfrei (kein Power-to-Power-Pfad).',
    '**Modellgrenze:** **Dispatch-Priorität** `3` ordnet die Rückverstromung hinter Batterie/Pumpspeicher ein — H₂ übernimmt damit den **saisonalen Ausgleich**. Sektor-H₂-Bedarf wird im Pool-Schritt vor der Strom-Bilanz gedeckt: ungedeckter Bedarf bei leerem Pool fällt auf inländische Direkt-Elektrolyse als Stromlast zurück (entspricht der heutigen Sektor-Last). Eine Mindest-SoC-Restriktion und Temperatur-/Druckverluste der Kaverne bleiben außen vor.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Drei Slider:** Elektrolyse `0`–`300 GW` (Default `0,1 GW`, Schritt `5 GW`), Rückverstromung `0`–`300 GW` (Default `0 GW`, Schritt `5 GW`), Kavernen-Energie `0`–`500.000 GWh` ≈ `500 TWh` (Default `0,1 GWh`, Schritt `5.000 GWh`). Defaults spiegeln den effektiv leeren Bestand Ende `2025`.',
    },
    {
      label: 'Verteilung',
      value: '**H₂-Pool-Dispatch:** Zuflüsse aus Stromüberschuss-Elektrolyse (η = 0,34) + Import (verlustfrei). Abflüsse: Sektor-H₂-Bedarf priority-basiert + Rückverstromung (Priorität `3`, nach Batterie und Pumpspeicher; saisonaler Hub).',
    },
    {
      label: 'Formel',
      value: '**Bilanz:** `SoC(t+1) = SoC(t) + 0,34·ΔStromLaden + ΔImport − ΔSektorBedarf − ΔRückverstromung`. Lade-Verluste nur auf dem Power-to-Power-Pfad.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/speicher/h2/data.json, Adapter in data/speicher/h2/model.ts.',
    'Roundtrip-Wirkungsgrad 34 % als Konsens moderner Anlagen 2025+: Elektrolyse 65 % (PEM/Alkali Stand 2024-2025) × Speicher 95 % (Kavernen-Wirkungsgrad inkl. Verdichtung) × Rückverstromung 55 % (H2-ready GuD, Brennstoffzelle Schnitt). Quellen-Korridor 30-42 % (Fraunhofer IKTS/ISE: 32-40 %, IEA Future of Hydrogen: 30-42 %). Frühere Annahme 24 % entsprach altem BHKW-Stand (40 % Rückverstromung) und ist für Neuanlagen 2025+ zu pessimistisch.',
    'Getrennte Lade- und Entlade-Leistung: Elektrolyseure und Rückverstromungs-Turbinen sind separate Anlagen.',
    'Initial-SoC wird per 2-Pass-Lauf kalibriert: Pass 1 startet leer (`initialStateOfChargeFraction = 0`), simuliert das Jahr und übergibt den Year-End-SoC als Anfangswert an Pass 2. Damit beginnt der ausgegebene Pass mit dem natürlichen saisonalen Anfangszustand — Sommer-Überschüsse füllen den Speicher, Winter-Defizite entladen ihn, ohne dass eine geratene Initial-Füllung das Ergebnis verfälscht.',
    'Dispatch-Priorität 3 — saisonal, nach Batterie/Pumpspeicher.',
  ],
  fields: [
    { name: 'id', unit: 'Text', description: 'Technische Kennung.' },
    { name: 'name', unit: 'Text', description: 'Anzeigename.' },
    { name: 'chargePower2025GW', unit: 'GW', description: 'Elektrolyse-Leistung Ende 2025.' },
    { name: 'defaultChargePowerGW', unit: 'GW', description: 'Slider-Default Elektrolyse.' },
    { name: 'minChargePowerGW', unit: 'GW', description: 'Slider-Minimum Elektrolyse.' },
    { name: 'maxChargePowerGW', unit: 'GW', description: 'Slider-Maximum Elektrolyse.' },
    { name: 'stepChargePowerGW', unit: 'GW', description: 'Slider-Schrittweite Elektrolyse.' },
    { name: 'dischargePower2025GW', unit: 'GW', description: 'Rückverstromungs-Leistung Ende 2025.' },
    { name: 'defaultDischargePowerGW', unit: 'GW', description: 'Slider-Default Rückverstromung.' },
    { name: 'minDischargePowerGW', unit: 'GW', description: 'Slider-Minimum Rückverstromung.' },
    { name: 'maxDischargePowerGW', unit: 'GW', description: 'Slider-Maximum Rückverstromung.' },
    { name: 'stepDischargePowerGW', unit: 'GW', description: 'Slider-Schrittweite Rückverstromung.' },
    { name: 'energy2025GWh', unit: 'GWh', description: 'Speicherenergie Ende 2025.' },
    { name: 'defaultEnergyGWh', unit: 'GWh', description: 'Slider-Default Energie.' },
    { name: 'minEnergyGWh', unit: 'GWh', description: 'Slider-Minimum Energie.' },
    { name: 'maxEnergyGWh', unit: 'GWh', description: 'Slider-Maximum Energie (500 TWh).' },
    { name: 'stepEnergyGWh', unit: 'GWh', description: 'Slider-Schrittweite Energie.' },
    { name: 'roundtripEfficiency', unit: 'Anteil', description: 'Roundtrip-Wirkungsgrad (0,34).' },
    { name: 'initialStateOfChargeFraction', unit: 'Anteil', description: 'Seed-SoC für 2-Pass-Lauf (0).' },
    { name: 'dispatchPriority', unit: 'Rang', description: 'Reihenfolge im Dispatch (3).' },
    { name: 'referenceScales', unit: 'Objekt', description: 'Größenanker zur Einordnung: 1 Einheit entspricht etwa Salzkavernen-Speicher (200 GWh).' },
  ],
  caveats: [
    'Roundtrip-Wirkungsgrad 34 % gilt für Power-to-Power-Pfad; bei stofflicher Nutzung von H₂ (Stahl, Chemie) ist der Pfad-Wirkungsgrad höher.',
    'Plausibler Korridor 30-42 %: Worst-Case 30 % (alte Elektrolyse + 50 % BHKW) bis Best-Case 42 % (PEM-Hochtemperatur + 65 % Brennstoffzelle/H2-GuD); aktuelle Großanlagen liegen bei 33-36 %.',
    'Default praktisch null — bis Slider hochgesetzt, ist H₂ in der Simulation inaktiv.',
    'Maximum 500 TWh Speicherenergie entspricht potenziellem deutschen Kavernen-Volumen (DEEP.KBB).',
    'Modell trennt Lade-/Entlade-Leistung, nicht aber Elektrolyseur-Effizienz vs. Rückverstromung — Verluste vollständig beim Laden.',
  ],
};

export const data: SpeicherH2Data = {
  id: 'h2',
  name: 'Wasserstoff',
  chargePower2025GW: 0.1,
  defaultChargePowerGW: 0.1,
  minChargePowerGW: 0,
  maxChargePowerGW: 300,
  stepChargePowerGW: 5,
  dischargePower2025GW: 0,
  defaultDischargePowerGW: 0,
  minDischargePowerGW: 0,
  maxDischargePowerGW: 300,
  stepDischargePowerGW: 5,
  energy2025GWh: 0.1,
  defaultEnergyGWh: 0.1,
  minEnergyGWh: 0,
  maxEnergyGWh: 500000,
  stepEnergyGWh: 5000,
  roundtripEfficiency: 0.34,
  initialStateOfChargeFraction: 0,
  dispatchPriority: 3,
  referenceScales: {
    energy: { value: 200, unit: 'GWh', label: 'Salzkavernen-Speicher (200 GWh)' },
  },
};

export const speicherH2Data = data;
export default speicherH2Data;
