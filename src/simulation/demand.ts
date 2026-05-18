import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { e100DemandModules } from '../../data/presets/e100';
import type { DemandScenarioContext } from './demandContext';

// LHV von H2 in kWh/kg, als Konversion Strom → kg H2 für Stahl-DRI.
const H2_LHV_KWH_PER_KG = 33.33;

export type SectorH2 = { stahl: number; chemie: number; schiff: number; flug: number };

export function sectorStromPerH2(_scenario: Scenario, context: DemandScenarioContext): SectorH2 {
  // Pfadspezifischer Konversionsfaktor "Strom-TWh / H2-TWh" pro Sektor. Wenn 1
  // TWh H2 aus dem Pool gedeckt wird, sinkt der inländische Strom-Aufwand um
  // diesen Faktor. System-Wirkungsgrade kommen aus den Sektor-data.json:
  // - Stahl: electrolyzerKwhPerKgH2 / LHV (= 1/η_electrolysis)
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

export function sectorH2StromTWh(scenario: Scenario, context: DemandScenarioContext): SectorH2 {
  // Strom-Aufwand in TWh/a den jeder aktive Sektor inländisch für seine H2-
  // Erzeugung (inkl. Synthese) anlegt, wenn der H2-Pool ihn NICHT deckt. Das
  // ist die maximal durch Pool-Bezug ersetzbare Strommenge.
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

// Jährlicher Sektor-H2-Bedarf in TWh H2 (LHV). Wird vom Kernmodell als
// stündlich konstante Pool-Senke verwendet (Industrie läuft 24/7).
export function sectorH2DemandTWh(scenario: Scenario, context: DemandScenarioContext): SectorH2 {
  const strom = sectorH2StromTWh(scenario, context);
  const ratio = sectorStromPerH2(scenario, context);
  return {
    stahl: ratio.stahl > 0 ? strom.stahl / ratio.stahl : 0,
    chemie: ratio.chemie > 0 ? strom.chemie / ratio.chemie : 0,
    schiff: ratio.schiff > 0 ? strom.schiff / ratio.schiff : 0,
    flug: ratio.flug > 0 ? strom.flug / ratio.flug : 0,
  };
}

// Strom-Reduktion in GW, die sich aus einer stündlichen Pool-Cover-Menge
// (poolCoverH2GW, in GW H2 LHV) ergibt. Priority-Allokation nach niedrigstem
// System-η (höchster Strom-Hebel pro H2): Flug → Schiff → Chemie → Stahl.
// Diese Reihenfolge ergibt sich automatisch aus der ratio[id]-Sortierung —
// falls die data.json-Werte angepasst werden, folgt die Priority dem Konsens
// in BMWK/Ariadne-Studien.
export function h2PoolStromReductionGW(
  poolCoverH2GW: number,
  scenario: Scenario,
  context: DemandScenarioContext,
): number {
  if (poolCoverH2GW <= 0) return 0;
  const sectorDemandTWh = sectorH2DemandTWh(scenario, context);
  const total = sectorDemandTWh.stahl + sectorDemandTWh.chemie + sectorDemandTWh.schiff + sectorDemandTWh.flug;
  if (total <= 0) return 0;
  const ratio = sectorStromPerH2(scenario, context);
  const priorityOrder = (['flug', 'schiff', 'chemie', 'stahl'] as Array<keyof SectorH2>)
    .filter(id => sectorDemandTWh[id] > 0)
    .sort((a, b) => ratio[b] - ratio[a]);

  let remainingH2 = poolCoverH2GW;
  let reductionGW = 0;
  for (const id of priorityOrder) {
    if (remainingH2 <= 0) break;
    // Sektor-max GW = jährliche TWh × 1000 / 8760 (kontinuierlicher Industrie-Bedarf)
    const sectorMaxGW = (sectorDemandTWh[id] * 1000) / 8760;
    const used = Math.min(remainingH2, sectorMaxGW);
    reductionGW += used * ratio[id];
    remainingH2 -= used;
  }
  return reductionGW;
}

// Gesamtbedarf der Sektoren an H2 in GW (kontinuierlich, Industrie 24/7).
export function totalSectorH2DemandGW(scenario: Scenario, context: DemandScenarioContext): number {
  const d = sectorH2DemandTWh(scenario, context);
  return ((d.stahl + d.chemie + d.schiff + d.flug) * 1000) / 8760;
}

export function demandGW(
  row: HourlyInput,
  scenario: Scenario,
  context: DemandScenarioContext,
  poolCoverH2GW = 0,
) {
  const last2025LoadGW = scenario.demand['last-2025'] ? row.loadMW / 1000 : 0;
  const additiveLoadGW = e100DemandModules.reduce((sum, module) => sum + module.loadGW(row, scenario, context), 0);
  const h2PoolReduction = h2PoolStromReductionGW(poolCoverH2GW, scenario, context);
  return Math.max(0, last2025LoadGW + additiveLoadGW - h2PoolReduction);
}
