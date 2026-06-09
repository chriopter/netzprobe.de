import type { Scenario } from '../types/scenario';
import type { SimulationResult, SimHour } from '../types/simulation';
import { uiManifest } from './uiManifest';

type Kosten = {
  capexEurPerKW: number;
  capexEurPerKWh?: number;
  omFixEurPerKWa: number;
  omVarEurPerMWh?: number;
  lifetimeYears: number;
  fuelEurPerMWhTh?: number;
  efficiency?: number;
};

// Kapitalwiedergewinnungsfaktor (annuisiert das CAPEX über die Lebensdauer).
export const crf = (wacc: number, life: number) => wacc <= 0 ? 1 / life : wacc / (1 - Math.pow(1 + wacc, -life));

// [uiManifest-Key, Label, Scenario-GW-Feld, SimHour-Feld]
const GEN: Array<[string, string, keyof Scenario['generation'], keyof SimHour]> = [
  ['pv', 'PV', 'pvInstalledGW', 'pvGW'],
  ['windon', 'Wind Onshore', 'windOnInstalledGW', 'windOnGW'],
  ['windoff', 'Wind Offshore', 'windOffInstalledGW', 'windOffGW'],
  ['biomasse', 'Biomasse', 'biomasseInstalledGW', 'biomasseGW'],
  ['laufwasser', 'Laufwasser', 'laufwasserInstalledGW', 'laufwasserGW'],
  ['kernkraft', 'Kernkraft', 'kernkraftInstalledGW', 'kernkraftGW'],
  ['gas', 'Gas', 'gasInstalledGW', 'gasGW'],
  ['kohle', 'Kohle', 'kohleInstalledGW', 'kohleGW'],
];

const STORAGE: Array<[string, string, () => number, number]> = [];

export type KostenTech = { key: string; label: string; capex: number; om: number; fuel: number; total: number; eurPerMWh: number | null };
export type KostenResult = {
  total: number;
  perMWh: number;
  perHousehold: number;
  breakdown: { capex: number; om: number; fuel: number; h2Import: number; importNet: number; netz: number };
  perTech: KostenTech[];
};

export function computeKosten(scenario: Scenario, result: SimulationResult): KostenResult {
  const P = uiManifest.prices as Record<string, number>;
  const wacc = P.wacc ?? 0.05;
  const genPkg = uiManifest.generation as Record<string, { kosten?: Kosten }>;
  const stoPkg = uiManifest.storage as Record<string, { kosten?: Kosten }>;

  // Erzeugung je Technologie aus der Simulationsreihe. Die Reihe kann in
  // Tagesschritten (365 Sätze) statt Stunden vorliegen — daher wird über das
  // Verhältnis zur Jahreslast auf echte Jahresenergie hochskaliert (selbst-
  // kalibrierend, unabhängig von der Zeitauflösung).
  const genSum: Record<string, number> = {};
  let loadSum = 0;
  for (const h of result.hours) {
    loadSum += h.loadGW;
    for (const [, , , hf] of GEN) genSum[hf] = (genSum[hf] ?? 0) + (h[hf] as number);
  }
  // GWh je aufsummiertem GW: macht die Lastsumme = Jahreslast (TWh → GWh).
  const annualScale = loadSum > 0 ? result.summary.totalDemandTWh * 1000 / loadSum : 1;

  const perTech: KostenTech[] = [];
  let capexSum = 0, omSum = 0, fuelSum = 0;

  for (const [key, label, gwField, hf] of GEN) {
    const k = genPkg[key]?.kosten;
    if (!k) continue;
    const gw = scenario.generation[gwField];
    const genMWh = (genSum[hf] ?? 0) * annualScale * 1000;
    const capex = k.capexEurPerKW * gw * 1e6 * crf(wacc, k.lifetimeYears);
    const om = k.omFixEurPerKWa * gw * 1e6 + (k.omVarEurPerMWh ?? 0) * genMWh;
    const fuel = k.fuelEurPerMWhTh ? k.fuelEurPerMWhTh / (k.efficiency ?? 1) * genMWh : 0;
    capexSum += capex; omSum += om; fuelSum += fuel;
    const total = capex + om + fuel;
    perTech.push({ key, label, capex, om, fuel, total, eurPerMWh: genMWh > 0 ? total / genMWh : null });
  }

  const storCaps: Array<[string, string, number, number]> = [
    ['batterie', 'Batterie', scenario.storage.batteriePowerGW, scenario.storage.batterieEnergyGWh],
    ['pumpspeicher', 'Pumpspeicher', scenario.storage.pumpspeicherPowerGW, scenario.storage.pumpspeicherEnergyGWh],
    ['h2', 'Wasserstoff', Math.max(scenario.storage.h2ChargePowerGW, scenario.storage.h2DischargePowerGW), scenario.storage.h2EnergyGWh],
  ];
  for (const [key, label, power, energy] of storCaps) {
    const k = stoPkg[key]?.kosten;
    if (!k || (power <= 0 && energy <= 0)) continue;
    const capex = (k.capexEurPerKW * power * 1e6 + (k.capexEurPerKWh ?? 0) * energy * 1e6) * crf(wacc, k.lifetimeYears);
    const om = k.omFixEurPerKWa * power * 1e6;
    capexSum += capex; omSum += om;
    perTech.push({ key, label, capex, om, fuel: 0, total: capex + om, eurPerMWh: null });
  }

  // Wasserstoff-Import: importierte H2-Menge × Importpreis (LHV). Eigene Zeile,
  // weil es weder heimischer Brennstoff noch Stromhandel ist.
  const h2Import = scenario.import.h2TWh * 1e6 * (P.h2ImportEurPerMWh ?? 0);
  if (h2Import > 0) perTech.push({ key: 'h2import', label: 'Wasserstoff-Import', capex: 0, om: 0, fuel: h2Import, total: h2Import, eurPerMWh: P.h2ImportEurPerMWh ?? null });

  // CO₂-Bepreisung bewusst NICHT enthalten: rein politisch gesetzter Transfer,
  // kein realer Ressourcenaufwand des Systems.
  const importNet = result.summary.importTWh * 1e6 * (P.importEurPerMWh ?? 0) - result.summary.exportTWh * 1e6 * (P.exportEurPerMWh ?? 0);

  // Netzausbau: gekoppelt an volatilen EE-Zubau über den 2025-Bestand hinaus,
  // annuisiert wie CAPEX. Null im 2025-Bestand (Kupferplatte als Nullpunkt),
  // wächst mit dem EE-Ausbau. Faktor an Vollnetz-Schätzungen (IMK/NEP/DIHK) geeicht.
  const reGW = scenario.generation.pvInstalledGW + scenario.generation.windOnInstalledGW + scenario.generation.windOffInstalledGW;
  const addedReGW = Math.max(0, reGW - (P.netzBaselineReCapacityGW ?? 0));
  const netz = (P.netzCapexEurPerKwAddedRE ?? 0) * addedReGW * 1e6 * crf(wacc, P.netzLifetimeYears ?? 40);

  const total = capexSum + omSum + fuelSum + h2Import + importNet + netz;

  const servedMWh = Math.max(1, (result.summary.totalDemandTWh - result.summary.loadSheddingTWh) * 1e6);
  return {
    total,
    perMWh: total / servedMWh,
    perHousehold: total / (P.households ?? 41_100_000),
    breakdown: { capex: capexSum, om: omSum, fuel: fuelSum, h2Import, importNet, netz },
    perTech: perTech.sort((a, b) => b.total - a.total),
  };
}

void STORAGE;
