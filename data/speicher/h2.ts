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
  short: 'Slider für Elektrolyse-, Rückverstromungs- und Kavernen-Energie; saisonaler Speicher mit `~34 %` Roundtrip-Wirkungsgrad.',
  description: [
    '**Auslegung:** der Baustein bildet einen Power-to-Power-Pfad mit drei unabhängigen Slidern ab — **Elektrolyse-Leistung** (Laden, Default `0,1 GW`, Max `300 GW`), **Rückverstromungs-Leistung** (Entladen, Default `0 GW`, Max `300 GW`) und Kavernen-Energie (Default `0,1 GWh`, Max `500 TWh`). Die Defaults bilden den effektiv leeren Bestand Ende `2025` ab. Das Slider-Maximum `500 TWh` schöpft das in Norddeutschland geologisch erschließbare Kavernen-Volumen (DEEP.KBB) aus; ohne aktiv gesetzte Slider bleibt H₂ in der Simulation inaktiv.',
    '**Wirkungsgradkette:** die `34 %` Roundtrip ergeben sich als Produkt aus Elektrolyse `~65 %` (PEM/Alkali Stand 2024–2025) × Kavernen-Speicher `~95 %` (inkl. Verdichtung) × Rückverstromung `~55 %` (H₂-ready GuD bzw. Brennstoffzelle); der publizierte Quellen-Korridor liegt bei `30–42 %` (Fraunhofer IKTS/ISE, IEA). Die getrennten Lade- und Entlade-Slider tragen der Realität Rechnung, dass Elektrolyseure und Rückverstromer physikalisch unterschiedliche Anlagen mit eigenen Investitionskosten sind. Die Bilanz `SoC(t+1) = SoC(t) + 0,34 · ΔLaden − ΔEntladen` schreibt die kompletten Roundtrip-Verluste der Ladeseite zu — eine bilanzielle Vereinfachung, die die reale Aufteilung zwischen Elektrolyseur und Rückverstromer nicht abbildet.',
    '**Modellgrenze:** **Dispatch-Priorität** `3` ordnet H₂ hinter Batterie und Pumpspeicher ein: er ist die letzte Reserve und übernimmt damit faktisch den **saisonalen Ausgleich** zwischen Sommerüberschüssen und Winterspitzen. Der `34 %`-Wert gilt nur für Power-to-Power; bei stofflicher Nutzung in Stahl oder Chemie ist der Pfad-Wirkungsgrad höher, weil die Rückverstromungsstufe entfällt. Eine Mindest-SoC-Restriktion und Temperatur- bzw. Druckverluste der Kaverne bleiben außen vor.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Drei Slider:** Elektrolyse `0`–`300 GW` (Default `0,1 GW`, Schritt `5 GW`), Rückverstromung `0`–`300 GW` (Default `0 GW`, Schritt `5 GW`), Kavernen-Energie `0`–`500.000 GWh` ≈ `500 TWh` (Default `0,1 GWh`, Schritt `5.000 GWh`). Defaults spiegeln den effektiv leeren Bestand Ende `2025`.',
    },
    {
      label: 'Verteilung',
      value: '**Greedy-Dispatch:** Laden in H₂-Kavernen bei Überschuss, Rückverstromung bei Unterdeckung. **Priorität** `3` — letzter Speicher nach Batterie und Pumpspeicher; übernimmt damit den saisonalen Hub.',
    },
    {
      label: 'Formel',
      value: '**Bilanz:** `SoC(t+1) = SoC(t) + 0,34 · ΔLaden − ΔEntladen`. Roundtrip-Verluste fallen vollständig auf der Ladeseite an.',
    },
  ],
  method: [
    'Datei: handgepflegt. Werte in data/speicher/h2/data.json, Adapter in data/speicher/h2/model.ts.',
    'Roundtrip-Wirkungsgrad 34 % als Konsens moderner Anlagen 2025+: Elektrolyse 65 % (PEM/Alkali Stand 2024-2025) × Speicher 95 % (Kavernen-Wirkungsgrad inkl. Verdichtung) × Rückverstromung 55 % (H2-ready GuD, Brennstoffzelle Schnitt). Quellen-Korridor 30-42 % (Fraunhofer IKTS/ISE: 32-40 %, IEA Future of Hydrogen: 30-42 %). Frühere Annahme 24 % entsprach altem BHKW-Stand (40 % Rückverstromung) und ist für Neuanlagen 2025+ zu pessimistisch.',
    'Getrennte Lade- und Entlade-Leistung: Elektrolyseure und Rückverstromungs-Turbinen sind separate Anlagen.',
    'Initial-SoC wird per zyklischem Warm-Up-Pass kalibriert: die Engine simuliert das Jahr zweimal, der erste Pass dient nur dazu, den Anfangs-SoC auf den Steady-State zu bringen. Konfigurierter `initialStateOfChargeFraction` (0,5) ist nur Seed für den Warm-up und beeinflusst das zurückgegebene Ergebnis nicht. Ohne Warm-up würde der konfigurierte SoC × Kapazität (bei H₂ bis zu 500 TWh × 50 % = 250 TWh) als Phantasie-Energie ins Modell laufen, auch wenn das Szenario gar keinen Überschuss zum Laden bietet.',
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
    { name: 'initialStateOfChargeFraction', unit: 'Anteil', description: 'Start-SoC (0,5).' },
    { name: 'dispatchPriority', unit: 'Rang', description: 'Reihenfolge im Dispatch (3).' },
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
  initialStateOfChargeFraction: 0.5,
  dispatchPriority: 3,
};

export const speicherH2Data = data;
export default speicherH2Data;
