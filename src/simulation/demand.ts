import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { e100DemandModules } from '../../data/presets/e100/model';
import type { DemandScenarioContext } from './demandContext';

// LHV von H2 in kWh/kg, als Konversion Strom → kg H2 für Stahl-DRI.
const H2_LHV_KWH_PER_KG = 33.33;

type SectorH2 = { stahl: number; chemie: number; schiff: number; flug: number };

function sectorStromPerH2(scenario: Scenario, context: DemandScenarioContext): SectorH2 {
  // Pfadspezifischer Konversionsfaktor "Strom-TWh / H2-TWh" pro Sektor. Wenn 1
  // TWh H2 importiert wird, wird der inländische Strom-Aufwand um diesen
  // Faktor verringert. System-Wirkungsgrade kommen aus den Sektor-data.json
  // (Single-Source-of-Truth statt Hardcoded-Konstanten):
  // - Stahl: 1 / (LHV / electrolyzerKwhPerKgH2) — ein Wert wie 33.3/52 ≈ 0.64 ergibt 1.56
  // - Chemie: 1 / h2SystemEfficiency (Strom→NH3/MeOH/Olefine-Mix)
  // - Schiff: 1 / eFuelSystemEfficiency (Strom→e-MeOH/e-Ammoniak)
  // - Flug:  1 / ptlEfficiency (Strom→PtL-Kerosin via Fischer-Tropsch)
  return {
    stahl: context['e100-stahl'].electrolyzerKwhPerKgH2 / H2_LHV_KWH_PER_KG,
    chemie: 1 / context['e100-chemie'].h2SystemEfficiency,
    schiff: 1 / context['e100-schiff'].eFuelSystemEfficiency,
    flug: 1 / context['e100-flug'].ptlEfficiency,
  };
}

function sectorH2StromTWh(scenario: Scenario, context: DemandScenarioContext): SectorH2 {
  // Strom-Aufwand in TWh/a den jeder aktive Sektor heute für seine inländische
  // H2-Erzeugung (inkl. nachgelagerter Synthese) anlegt — das ist der maximal
  // ersetzbare Wert durch H2-Import.
  const out: SectorH2 = { stahl: 0, chemie: 0, schiff: 0, flug: 0 };
  if (scenario.demand['e100-stahl']) {
    const m = context['e100-stahl'];
    const mioTon = Math.max(0, scenario.demand['e100-stahl-target-mio-ton']);
    out.stahl = (mioTon * m.electrolyzerKwhPerKgH2 * m.hydrogenKgPerTonSteel) / 1000;
  }
  if (scenario.demand['e100-chemie']) {
    const m = context['e100-chemie'];
    out.chemie = m.hydrogenAmmoniaTWh + m.hydrogenMethanolTWh + m.eOlefinsViaH2TWh;
  }
  if (scenario.demand['e100-schiff']) {
    const m = context['e100-schiff'];
    out.schiff = m.eFuelSynthesisTWh;
  }
  if (scenario.demand['e100-flug']) {
    const targetTWh = Math.max(0, scenario.demand['e100-flug-target-twh'] - context['e100-flug'].alreadyElectricTWh);
    out.flug = targetTWh;
  }
  return out;
}

function h2ImportReductionGW(scenario: Scenario, context: DemandScenarioContext): number {
  const importTWh = scenario.import.h2TWh ?? 0;
  if (importTWh <= 0) return 0;
  const sectorStrom = sectorH2StromTWh(scenario, context);
  const totalStromTWh = sectorStrom.stahl + sectorStrom.chemie + sectorStrom.schiff + sectorStrom.flug;
  if (totalStromTWh <= 0) return 0;
  const ratio = sectorStromPerH2(scenario, context);

  // Priority-Allokation: Import-H2 fließt zuerst in den Sektor mit dem
  // niedrigsten Wirkungsgrad (= höchster Strom-Hebel pro TWh Import). Das
  // entspricht der ökonomisch rationalen Allokation und dem Konsens in
  // BMWK/Ariadne-Studien: PtL/Flug zuerst, dann e-Methanol/Schiff, dann
  // H2-Chemie, zuletzt Stahl-DRI. Reihenfolge nach Konversionsfaktor sortiert,
  // sodass selbst wenn die data.json-Werte angepasst werden, automatisch der
  // Sektor mit dem höchsten Strom-pro-H2-Faktor priorisiert wird.
  const priorityOrder = (['flug', 'schiff', 'chemie', 'stahl'] as Array<keyof SectorH2>)
    .filter(id => sectorStrom[id] > 0)
    .sort((a, b) => ratio[b] - ratio[a]);

  let remainingImportH2 = importTWh;
  let reductionTWh = 0;
  for (const id of priorityOrder) {
    if (remainingImportH2 <= 0) break;
    const sectorMaxH2 = sectorStrom[id] / ratio[id];
    const used = Math.min(remainingImportH2, sectorMaxH2);
    reductionTWh += used * ratio[id];
    remainingImportH2 -= used;
  }
  return (reductionTWh * 1000) / 8760;
}

export function demandGW(row: HourlyInput, scenario: Scenario, context: DemandScenarioContext) {
  const last2025LoadGW = scenario.demand['last-2025'] ? row.loadMW / 1000 : 0;
  const additiveLoadGW = e100DemandModules.reduce((sum, module) => sum + module.loadGW(row, scenario, context), 0);
  const h2ImportReduction = h2ImportReductionGW(scenario, context);
  return Math.max(0, last2025LoadGW + additiveLoadGW - h2ImportReduction);
}
