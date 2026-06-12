import type { Scenario } from '../types/scenario';
import type { SimulationResult, SimHour } from '../types/simulation';
import { uiManifest } from './uiManifest';

export type Kosten = {
  capexEurPerKW?: number;
  // Getrennte Leistungs-CAPEX für Speicher mit unterschiedlichen Ein-/Ausspeise-
  // Anlagen (H₂: Elektrolyseur vs. Rückverstromungskraftwerk). Wenn gesetzt,
  // ersetzen sie capexEurPerKW/omFixEurPerKWa (max-Logik).
  capexChargeEurPerKW?: number;
  capexDischargeEurPerKW?: number;
  capexEurPerKWh?: number;
  omFixEurPerKWa?: number;
  omFixChargeEurPerKWa?: number;
  omFixDischargeEurPerKWa?: number;
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

// Eingangsgrößen hinter einer Technologie-Zeile — für die aufklappbare
// Detail-Ebene der Stromrechnung (datenexplorativ, rein additiv).
export type KostenTechDetail = {
  kind: 'gen' | 'storage' | 'h2import';
  gw?: number;
  chargeGW?: number;
  dischargeGW?: number;
  energyGWh?: number;
  genTWh?: number;
  crfValue?: number;
  kosten?: Kosten;
};
export type KostenTech = { key: string; label: string; capex: number; om: number; fuel: number; total: number; eurPerMWh: number | null; detail?: KostenTechDetail };
export type KostenResult = {
  total: number;
  perMWh: number;
  breakdown: { capex: number; om: number; fuel: number; h2Import: number; importNet: number; netz: number };
  importCost: number;
  exportRevenue: number;
  // Netz-Heuristik außerhalb des geeichten Bereichs (EE-Zubau > ~700 GW bzw.
  // Peak-Zuwachs > ~100 GW über Bestand): Posten nur als Richtungssignal lesen.
  netzExtrapolated: boolean;
  addedReGW: number;
  addedPeakLoadGW: number;
  // Export läuft praktisch dauerhaft am Cap: die Erlösgutschrift ist dann eine
  // Obergrenze (der eigene Caveat im strom-handel-Paket greift).
  exportAtCap: boolean;
  perTech: KostenTech[];
  // Eingangsgrößen der Systemposten für die Detail-Ebene der Stromrechnung.
  params: {
    wacc: number;
    h2ImportTWh: number;
    h2ImportEurPerMWh: number;
    importTWh: number;
    exportTWh: number;
    importEurPerMWh: number;
    exportEurPerMWh: number;
    netzEurPerKW: number;
    netzLastEurPerKW: number;
    netzLifetimeYears: number;
    netzCrf: number;
    netzBaselineGW: number;
    netzBaselinePeakGW: number;
  };
};

// ---------------------------------------------------------------------------
// Musterhaushalt: Verbrauch folgt den haushaltsrelevanten Last-Reglern
// (Grundbedarf + PKW-Strom + Wärmepumpen-Strom ÷ Haushalte), Preis über die
// Endkundenpreis-Brücke auf 2025-Niveau (BDEW) — Methodik im Wiki »preise«.
export type HaushaltBridgeRow = { key: 'netz' | 'steuern' | 'umlagen' | 'vertrieb'; label: string; ct: number };
export type HaushaltResult = {
  kwh: number;
  baseKwh: number;
  pkwKwh: number;
  heizKwh: number;
  abWerkCt: number;
  abWerkEurPerMonth: number;
  bridge: HaushaltBridgeRow[];
  mwstCt: number;
  endkundeCt: number;
  endkundeEurPerMonth: number;
};

export function computeHaushalt(k: KostenResult, pkwAddTWh: number, heizAddTWh: number): HaushaltResult {
  const P = uiManifest.prices as Record<string, number>;
  const households = P.households ?? 41_100_000;
  const baseKwh = P.householdConsumptionKWhPerA ?? 3000;
  const pkwKwh = Math.max(0, pkwAddTWh) * 1e9 / households;
  const heizKwh = Math.max(0, heizAddTWh) * 1e9 / households;
  const kwh = baseKwh + pkwKwh + heizKwh;
  const abWerkCt = k.perMWh / 10;
  const bridge: HaushaltBridgeRow[] = [
    { key: 'netz', label: 'Netzentgelte (Bestandsnetz)', ct: P.householdNetzentgeltCtPerKWh ?? 0 },
    { key: 'steuern', label: 'Stromsteuer & Konzession', ct: P.householdSteuernAbgabenCtPerKWh ?? 0 },
    { key: 'umlagen', label: 'Umlagen (KWKG, Offshore, §19)', ct: P.householdUmlagenCtPerKWh ?? 0 },
    { key: 'vertrieb', label: 'Vertrieb & Service', ct: P.householdVertriebCtPerKWh ?? 0 },
  ];
  const nettoCt = abWerkCt + bridge.reduce((sum, r) => sum + r.ct, 0);
  const mwstCt = nettoCt * (P.vatRate ?? 0.19);
  const endkundeCt = nettoCt + mwstCt;
  const perMonth = (ct: number) => ct / 100 * kwh / 12;
  return {
    kwh,
    baseKwh,
    pkwKwh,
    heizKwh,
    abWerkCt,
    abWerkEurPerMonth: perMonth(abWerkCt),
    bridge,
    mwstCt,
    endkundeCt,
    endkundeEurPerMonth: perMonth(endkundeCt),
  };
}

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
    const capex = (k.capexEurPerKW ?? 0) * gw * 1e6 * crf(wacc, k.lifetimeYears);
    const om = (k.omFixEurPerKWa ?? 0) * gw * 1e6 + (k.omVarEurPerMWh ?? 0) * genMWh;
    const fuel = k.fuelEurPerMWhTh ? k.fuelEurPerMWhTh / (k.efficiency ?? 1) * genMWh : 0;
    capexSum += capex; omSum += om; fuelSum += fuel;
    const total = capex + om + fuel;
    perTech.push({ key, label, capex, om, fuel, total, eurPerMWh: genMWh > 0 ? total / genMWh : null, detail: { kind: 'gen', gw, genTWh: genMWh / 1e6, crfValue: crf(wacc, k.lifetimeYears), kosten: k } });
  }

  // [key, label, Lade-GW, Entlade-GW, Energie-GWh]. Batterie/PSW haben EINE
  // Maschine für beide Richtungen (charge = discharge); H₂ hat getrennte
  // Anlagen (Elektrolyseur vs. Rückverstromungskraftwerk), beide kosten Capex.
  const storCaps: Array<[string, string, number, number, number]> = [
    ['batterie', 'Batterie', scenario.storage.batteriePowerGW, scenario.storage.batteriePowerGW, scenario.storage.batterieEnergyGWh],
    ['pumpspeicher', 'Pumpspeicher', scenario.storage.pumpspeicherPowerGW, scenario.storage.pumpspeicherPowerGW, scenario.storage.pumpspeicherEnergyGWh],
    ['h2', 'Wasserstoff', scenario.storage.h2ChargePowerGW, scenario.storage.h2DischargePowerGW, scenario.storage.h2EnergyGWh],
  ];
  for (const [key, label, chargeGW, dischargeGW, energy] of storCaps) {
    const k = stoPkg[key]?.kosten;
    if (!k || (chargeGW <= 0 && dischargeGW <= 0 && energy <= 0)) continue;
    const split = k.capexChargeEurPerKW != null || k.capexDischargeEurPerKW != null;
    const powerCapexEur = split
      ? (k.capexChargeEurPerKW ?? 0) * chargeGW * 1e6 + (k.capexDischargeEurPerKW ?? 0) * dischargeGW * 1e6
      : (k.capexEurPerKW ?? 0) * Math.max(chargeGW, dischargeGW) * 1e6;
    const capex = (powerCapexEur + (k.capexEurPerKWh ?? 0) * energy * 1e6) * crf(wacc, k.lifetimeYears);
    const om = split
      ? (k.omFixChargeEurPerKWa ?? 0) * chargeGW * 1e6 + (k.omFixDischargeEurPerKWa ?? 0) * dischargeGW * 1e6
      : (k.omFixEurPerKWa ?? 0) * Math.max(chargeGW, dischargeGW) * 1e6;
    capexSum += capex; omSum += om;
    perTech.push({ key, label, capex, om, fuel: 0, total: capex + om, eurPerMWh: null, detail: { kind: 'storage', chargeGW, dischargeGW, energyGWh: energy, crfValue: crf(wacc, k.lifetimeYears), kosten: k } });
  }

  // Wasserstoff-Import: importierte H2-Menge × Importpreis (LHV). Eigene Zeile,
  // weil es weder heimischer Brennstoff noch Stromhandel ist.
  const h2Import = scenario.import.h2TWh * 1e6 * (P.h2ImportEurPerMWh ?? 0);
  if (h2Import > 0) perTech.push({ key: 'h2import', label: 'Wasserstoff-Import', capex: 0, om: 0, fuel: h2Import, total: h2Import, eurPerMWh: P.h2ImportEurPerMWh ?? null, detail: { kind: 'h2import' } });

  // CO₂-Bepreisung bewusst NICHT enthalten: rein politisch gesetzter Transfer,
  // kein realer Ressourcenaufwand des Systems.
  const importCost = result.summary.importTWh * 1e6 * (P.importEurPerMWh ?? 0);
  const exportRevenue = result.summary.exportTWh * 1e6 * (P.exportEurPerMWh ?? 0);
  const importNet = importCost - exportRevenue;
  // Dauerhaft am Export-Cap (≥95 % der theoretischen Cap-Energie): Erlös als
  // Obergrenze flaggen — z.B. 100kern exportiert 25 GW × 8.760 h durchgehend.
  const exportCapTWh = (scenario.export?.stromGW ?? 0) * 8.76;
  const exportAtCap = exportCapTWh > 0 && result.summary.exportTWh >= 0.95 * exportCapTWh;

  // Netzausbau, zwei Treiber: (1) erzeugungsgetrieben am volatilen EE-Zubau
  // über den 2025-Bestand (Übertragungsnetz + EE-Anschluss im Verteilnetz),
  // (2) lastgetrieben am Zuwachs der Stromlast-Spitze (Verteilnetz für
  // E-Mobilität/Wärmepumpen/Industrie — fällt in jedem Elektrifizierungs-
  // Szenario an, egal welche Technologie liefert). Beide annuisiert wie CAPEX;
  // null im 2025-Bestand (Kupferplatte als Nullpunkt). Treiber des Last-Terms
  // ist die Spitze NACH H₂-Pool (Pool-Sektoren hängen nicht am Verteilnetz,
  // Elektrolyse zählt zum EE-Term). Aufteilung an IMK/ef.Ruhr geeicht — die
  // Summe beim O45-Anker bleibt ~545 Mrd € Invest (siehe Wiki »preise«).
  const reGW = scenario.generation.pvInstalledGW + scenario.generation.windOnInstalledGW + scenario.generation.windOffInstalledGW;
  const addedReGW = Math.max(0, reGW - (P.netzBaselineReCapacityGW ?? 0));
  const addedPeakLoadGW = Math.max(0, (result.summary.peakLoadGW ?? 0) - (P.netzBaselinePeakLoadGW ?? 0));
  const netzCrfValue = crf(wacc, P.netzLifetimeYears ?? 40);
  const netzEE = (P.netzCapexEurPerKwAddedRE ?? 0) * addedReGW * 1e6 * netzCrfValue;
  const netzLast = (P.netzCapexEurPerKwAddedPeakLoad ?? 0) * addedPeakLoadGW * 1e6 * netzCrfValue;
  const netz = netzEE + netzLast;
  const netzExtrapolated = addedReGW > (P.netzCalibratedMaxAddedReGW ?? 700)
    || addedPeakLoadGW > (P.netzCalibratedMaxAddedPeakLoadGW ?? 100);

  const total = capexSum + omSum + fuelSum + h2Import + importNet + netz;

  // Umlagebasis = gedeckte Stromlast PLUS die strom-äquivalent vom H₂-Pool
  // gedeckte Sektor-Nachfrage (Stahl/Chemie/Schiff/Flug): H₂-Produktion bzw.
  // -Import senkt die Stromlast, wird aber vom selben System bezahlt — ohne
  // diesen Term würden die Kosten nur auf die Rest-Stromlast umgelegt und
  // €/MWh in H₂-lastigen Szenarien überzeichnet.
  const servedMWh = Math.max(1, (result.summary.totalDemandTWh - result.summary.loadSheddingTWh + (result.summary.h2PoolStromReductionTWh ?? 0)) * 1e6);
  return {
    total,
    perMWh: total / servedMWh,
    breakdown: { capex: capexSum, om: omSum, fuel: fuelSum, h2Import, importNet, netz },
    importCost,
    exportRevenue,
    netzExtrapolated,
    addedReGW,
    addedPeakLoadGW,
    exportAtCap,
    perTech: perTech.sort((a, b) => b.total - a.total),
    params: {
      wacc,
      h2ImportTWh: scenario.import.h2TWh,
      h2ImportEurPerMWh: P.h2ImportEurPerMWh ?? 0,
      importTWh: result.summary.importTWh,
      exportTWh: result.summary.exportTWh,
      importEurPerMWh: P.importEurPerMWh ?? 0,
      exportEurPerMWh: P.exportEurPerMWh ?? 0,
      netzEurPerKW: P.netzCapexEurPerKwAddedRE ?? 0,
      netzLastEurPerKW: P.netzCapexEurPerKwAddedPeakLoad ?? 0,
      netzLifetimeYears: P.netzLifetimeYears ?? 40,
      netzCrf: netzCrfValue,
      netzBaselineGW: P.netzBaselineReCapacityGW ?? 0,
      netzBaselinePeakGW: P.netzBaselinePeakLoadGW ?? 0,
    },
  };
}

void STORAGE;
