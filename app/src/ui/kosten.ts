import type { Scenario } from '../types/scenario';
import type { SimulationResult, SimHour } from '../types/simulation';
import { uiManifest } from './uiManifest';
import { mergeTechKosten, hasActiveOverrides, netzAtOptimism, OPTIMISM_DEFAULT, type Optimism } from './costLevers';

export type Kosten = {
  // Realer, technologiespezifischer Kapitalkostensatz (Dezimal). Liegt je Paket
  // in parameters.kosten.wacc — kein globaler Default mehr.
  wacc: number;
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
  omEnergyEurPerKWhA?: number;
  omVarEurPerMWh?: number;
  lifetimeYears: number;
  // Bauzeit (a) fuer die Bauzeitverzinsung: CAPEX-Lump × idcFactor(wacc, T).
  constructionYears?: number;
  fuelEurPerMWhTh?: number;
  efficiency?: number;
  // Grenzkosten-CAPEX für Zubau über capexBaselineGW hinaus (EUR/kW). Wenn
  // gesetzt, wird capexEurPerKW zum mengengewichteten Flotten-MITTEL: der
  // Bestand bis capexBaselineGW kostet capexEurPerKW, jede weitere GW kostet
  // capexMarginalEurPerKW. Bei PV bildet das den Strukturwandel ab — heutige
  // Flotte rooftop-lastig (teuer), marginaler Zubau zunehmend Freifläche
  // (billig, ~Floor). Asymptotisch nähert sich der Mittelwert dem Marginalwert.
  capexMarginalEurPerKW?: number;
  capexBaselineGW?: number;
};

// Bauzeitverzinsung (interest during construction): Overnight-CAPEX wird bei
// gleichmaessiger Auszahlung ueber T Baujahre mit r aufgezinst —
// ((1+r)^T − 1)/(r·T) (DEA LCoE-Methodik, NREL ATB ConFinFactor). T ≤ 1 → 1.
export const idcFactor = (wacc: number, years: number | undefined): number => {
  const t = years ?? 0;
  if (t <= 1 || wacc <= 0) return 1;
  return (Math.pow(1 + wacc, t) - 1) / (wacc * t);
};

// Kapitalwiedergewinnungsfaktor (annuisiert das CAPEX über die Lebensdauer).
export const crf = (wacc: number, life: number) => wacc <= 0 ? 1 / life : wacc / (1 - Math.pow(1 + wacc, -life));

// Flotten-Durchschnitts-CAPEX bei gegebener installierter Leistung. Ohne
// Grenzkosten-Parameter konstant; mit ihnen ein mengengewichtetes Mittel aus
// Bestand (capexEurPerKW bis capexBaselineGW) und Zubau (capexMarginalEurPerKW).
export const effectiveCapexEurPerKW = (k: Kosten, gw: number): number => {
  const base = k.capexEurPerKW ?? 0;
  const baseGW = k.capexBaselineGW;
  if (k.capexMarginalEurPerKW == null || baseGW == null || gw <= baseGW) return base;
  return (baseGW * base + (gw - baseGW) * k.capexMarginalEurPerKW) / gw;
};

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
  dischargeTWh?: number;
  genTWh?: number;
  crfValue?: number;
  // Bauzeitverzinsung: Faktor auf den Overnight-CAPEX (1 = keine Bauzeit).
  idcFactor?: number;
  // Effektive Flotten-CAPEX nach Grenzkosten-Blend (EUR/kW); weicht von
  // kosten.capexEurPerKW ab, sobald capexMarginalEurPerKW greift.
  capexEffectiveEurPerKW?: number;
  kosten?: Kosten;
  // Unveraenderte Paketwerte (fuer »Paket: …«-Hinweise, wenn Regler/Override greifen).
  paket?: Kosten;
};
export type KostenTech = { key: string; label: string; capex: number; om: number; fuel: number; total: number; eurPerMWh: number | null; detail?: KostenTechDetail };
export type KostenResult = {
  total: number;
  perMWh: number;
  // Einmalige Bauinvestition (Neubauwert ohne Annuisierung) und die jährlichen
  // laufenden Kosten (O&M, Brennstoff, Handel) — für die Aufbau-pro-Jahr-Sicht.
  investEur: number;
  investParts: { erzeugung: number; speicher: number; netz: number };
  operatingEur: number;
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
  // Mindestens eine Technologie hat eine vom Default abweichende „eigene
  // Annahme" (Kosten-Override) — fürs Bon-Signal „eigene Annahmen aktiv".
  hasCostOverrides: boolean;
  perTech: KostenTech[];
  // Eingangsgrößen der Systemposten für die Detail-Ebene der Stromrechnung.
  params: {
    // Globaler Optimismus-Regler (−100 … +100 je Dimension) aus der Sidebar.
    optimism: Optimism;
    netzCapexFactor: number;
    netzWacc: number;
    h2ImportTWh: number;
    h2ImportEurPerMWh: number;
    importTWh: number;
    exportTWh: number;
    importEurPerMWh: number;
    exportEurPerMWh: number;
    // Effektiver, EE-abhängiger Export-Capture-Preis (€/MWh) und der zugrunde
    // liegende EE-Anteil — der flache exportEurPerMWh ist nur die Obergrenze.
    exportEffectiveEurPerMWh: number;
    exportReSharePct: number;
    netzEurPerKW: number;
    netzLastEurPerKW: number;
    netzLifetimeYears: number;
    netzConstructionYears: number;
    netzIdc: number;
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

export function computeKosten(scenario: Scenario, result: SimulationResult, optimism: Optimism = OPTIMISM_DEFAULT): KostenResult {
  const P = uiManifest.prices as Record<string, number>;
  const genPkg = uiManifest.generation as Record<string, { kosten?: Kosten }>;
  const stoPkg = uiManifest.storage as Record<string, { kosten?: Kosten }>;

  // Erzeugung je Technologie aus der Simulationsreihe. Die Reihe kann in
  // Tagesschritten (365 Sätze) statt Stunden vorliegen — daher wird über das
  // Verhältnis zur Jahreslast auf echte Jahresenergie hochskaliert (selbst-
  // kalibrierend, unabhängig von der Zeitauflösung).
  const genSum: Record<string, number> = {};
  const disSum: Record<string, number> = { batterie: 0, pumpspeicher: 0, h2: 0 };
  let loadSum = 0;
  for (const h of result.hours) {
    loadSum += h.loadGW;
    for (const [, , , hf] of GEN) genSum[hf] = (genSum[hf] ?? 0) + (h[hf] as number);
    disSum.batterie += h.batterieDischargeGW ?? 0;
    disSum.pumpspeicher += h.pumpspeicherDischargeGW ?? 0;
    disSum.h2 += h.h2DischargeGW ?? 0;
  }
  // GWh je aufsummiertem GW: macht die Lastsumme = Jahreslast (TWh → GWh).
  const annualScale = loadSum > 0 ? result.summary.totalDemandTWh * 1000 / loadSum : 1;

  const perTech: KostenTech[] = [];
  let capexSum = 0, omSum = 0, fuelSum = 0;
  // Einmalige Bauinvestition (Neubauwert, OHNE Annuisierung) — die Summe der
  // CAPEX-Lumps von Erzeugung, Speicher und Netz. Anders als capexSum (über die
  // Anlagenlebensdauer verteilt) ist das die Stock-Größe „was kostet es, die
  // Flotte einmal hinzustellen"; daraus die Aufbau-pro-Jahr-Annuität (UI).
  let investEur = 0;
  let investErzeugung = 0, investSpeicher = 0;

  for (const [key, label, gwField, hf] of GEN) {
    const k0 = genPkg[key]?.kosten;
    if (!k0) continue;
    const k = mergeTechKosten(key, k0, scenario.costOverrides?.[key], optimism);
    const gw = scenario.generation[gwField];
    const genMWh = (genSum[hf] ?? 0) * annualScale * 1000;
    const capexPerKW = effectiveCapexEurPerKW(k, gw);
    const capexLump = capexPerKW * gw * 1e6;
    investEur += capexLump; investErzeugung += capexLump;
    const idc = idcFactor(k.wacc, k.constructionYears);
    const capex = capexLump * idc * crf(k.wacc, k.lifetimeYears);
    const om = (k.omFixEurPerKWa ?? 0) * gw * 1e6 + (k.omVarEurPerMWh ?? 0) * genMWh;
    const fuel = k.fuelEurPerMWhTh ? k.fuelEurPerMWhTh / (k.efficiency ?? 1) * genMWh : 0;
    capexSum += capex; omSum += om; fuelSum += fuel;
    const total = capex + om + fuel;
    perTech.push({ key, label, capex, om, fuel, total, eurPerMWh: genMWh > 0 ? total / genMWh : null, detail: { kind: 'gen', gw, genTWh: genMWh / 1e6, crfValue: crf(k.wacc, k.lifetimeYears), idcFactor: idc, capexEffectiveEurPerKW: capexPerKW, kosten: k, paket: k0 } });
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
    const k0 = stoPkg[key]?.kosten;
    if (!k0 || (chargeGW <= 0 && dischargeGW <= 0 && energy <= 0)) continue;
    const k = mergeTechKosten(key, k0, scenario.costOverrides?.[key], optimism);
    const split = k.capexChargeEurPerKW != null || k.capexDischargeEurPerKW != null;
    const powerCapexEur = split
      ? (k.capexChargeEurPerKW ?? 0) * chargeGW * 1e6 + (k.capexDischargeEurPerKW ?? 0) * dischargeGW * 1e6
      : (k.capexEurPerKW ?? 0) * Math.max(chargeGW, dischargeGW) * 1e6;
    const capexLump = powerCapexEur + (k.capexEurPerKWh ?? 0) * energy * 1e6;
    investEur += capexLump; investSpeicher += capexLump;
    const idc = idcFactor(k.wacc, k.constructionYears);
    const capex = capexLump * idc * crf(k.wacc, k.lifetimeYears);
    // Variable O&M auf die tatsächlich entladene Energie (aus der Stundenreihe,
    // jahres-skaliert) — die Speicher-Pakete dokumentieren omVarEurPerMWh.
    // omEnergyEurPerKWhA: Energie-O&M je installierter kWh (NREL-ATB-Konvention
    // 2,5 %/a vom Energie-CAPEX — Augmentation/Kapazitätserhalt der Batterie).
    const dischargeMWh = (disSum[key] ?? 0) * annualScale * 1000;
    const om = (split
      ? (k.omFixChargeEurPerKWa ?? 0) * chargeGW * 1e6 + (k.omFixDischargeEurPerKWa ?? 0) * dischargeGW * 1e6
      : (k.omFixEurPerKWa ?? 0) * Math.max(chargeGW, dischargeGW) * 1e6)
      + (k.omEnergyEurPerKWhA ?? 0) * energy * 1e6
      + (k.omVarEurPerMWh ?? 0) * dischargeMWh;
    capexSum += capex; omSum += om;
    perTech.push({ key, label, capex, om, fuel: 0, total: capex + om, eurPerMWh: null, detail: { kind: 'storage', chargeGW, dischargeGW, energyGWh: energy, dischargeTWh: dischargeMWh / 1e6, crfValue: crf(k.wacc, k.lifetimeYears), idcFactor: idc, kosten: k, paket: k0 } });
  }

  // Wasserstoff-Import: importierte H2-Menge × Importpreis (LHV). Eigene Zeile,
  // weil es weder heimischer Brennstoff noch Stromhandel ist.
  const h2Import = scenario.import.h2TWh * 1e6 * (P.h2ImportEurPerMWh ?? 0);
  if (h2Import > 0) perTech.push({ key: 'h2import', label: 'Wasserstoff-Import', capex: 0, om: 0, fuel: h2Import, total: h2Import, eurPerMWh: P.h2ImportEurPerMWh ?? null, detail: { kind: 'h2import' } });

  // CO₂-Bepreisung bewusst NICHT enthalten: rein politisch gesetzter Transfer,
  // kein realer Ressourcenaufwand des Systems.
  const importCost = result.summary.importTWh * 1e6 * (P.importEurPerMWh ?? 0);
  // Export-Capture-Preis: der mengengewichtete Exporterlös fällt mit steigendem
  // EE-Anteil (Kannibalisierung). Export passiert in Überschussstunden mit
  // niedrigen/negativen Preisen, und die Nachbarn haben korreliert Überschuss
  // (PV mittags räumlich gekoppelt) — Interkonnektion rettet den Solarwert nicht.
  // Lineares Modell mit Boden, kalibriert an: 2023 realisiert ~0,81×Baseload bei
  // ~58 % EE; S&P/arXiv 2405.17166 (Solar-Marktwert→0 bei hoher VRE-Durchdringung);
  // struktureller Dauerüberschuss → ~0. Anker: 60 %→60, 70 %→45, 80 %→30, 100 %→0.
  // Quellen + Caveat in referenz/preise/package.json.
  const exportCaptureMax = P.exportEurPerMWh ?? 0;
  const exportReSharePct = result.summary.renewableSharePct ?? 0;
  const exportEffectiveEurPerMWh = Math.min(exportCaptureMax, Math.max(
    P.exportFloorEurPerMWh ?? 0,
    exportCaptureMax - (P.exportCaptureSlopeEurPerPp ?? 1.5) * Math.max(0, exportReSharePct - (P.exportCaptureReThresholdPct ?? 60)),
  ));
  const exportRevenue = result.summary.exportTWh * 1e6 * exportEffectiveEurPerMWh;
  const importNet = importCost - exportRevenue;
  // Dauerhaft am Export-Cap (≥95 % der theoretischen Cap-Energie): auch mit dem
  // Capture-Preis ein Hinweis, dass der Export strukturell limitiert ist.
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
  // Netzausbau nutzt den regulierten Netz-WACC (BNetzA ARegV), nicht die
  // technologiespezifischen Erzeuger-/Speicher-WACCs — das Netz ist eine
  // regulierte Infrastruktur, kein einzeltechnologisches Asset.
  const netzOpt = netzAtOptimism(P.netzWacc ?? 0.05, optimism);
  const netzWacc = netzOpt.wacc;
  const netzCrfValue = crf(netzWacc, P.netzLifetimeYears ?? 40);
  const netzLumpEur = ((P.netzCapexEurPerKwAddedRE ?? 0) * addedReGW + (P.netzCapexEurPerKwAddedPeakLoad ?? 0) * addedPeakLoadGW) * 1e6 * netzOpt.capexFactor;
  investEur += netzLumpEur;
  const netzIdc = idcFactor(netzWacc, P.netzConstructionYears);
  const netz = netzLumpEur * netzIdc * netzCrfValue;
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
    // Einmalige Bauinvestition (Neubauwert ohne Annuisierung) für die
    // Aufbau-pro-Jahr-Sicht; laufende Kosten = total minus annuisierte CAPEX.
    investEur,
    investParts: { erzeugung: investErzeugung, speicher: investSpeicher, netz: netzLumpEur },
    operatingEur: omSum + fuelSum + h2Import + importNet,
    breakdown: { capex: capexSum, om: omSum, fuel: fuelSum, h2Import, importNet, netz },
    importCost,
    exportRevenue,
    netzExtrapolated,
    addedReGW,
    addedPeakLoadGW,
    exportAtCap,
    // Nur explizite Einzel-Overrides — der Optimismus-Regler steht separat im Bon-Kopf.
    hasCostOverrides: hasActiveOverrides(scenario.costOverrides),
    perTech: perTech.sort((a, b) => b.total - a.total),
    params: {
      optimism,
      netzCapexFactor: netzOpt.capexFactor,
      netzWacc,
      h2ImportTWh: scenario.import.h2TWh,
      h2ImportEurPerMWh: P.h2ImportEurPerMWh ?? 0,
      importTWh: result.summary.importTWh,
      exportTWh: result.summary.exportTWh,
      importEurPerMWh: P.importEurPerMWh ?? 0,
      exportEurPerMWh: P.exportEurPerMWh ?? 0,
      exportEffectiveEurPerMWh,
      exportReSharePct,
      netzEurPerKW: P.netzCapexEurPerKwAddedRE ?? 0,
      netzLastEurPerKW: P.netzCapexEurPerKwAddedPeakLoad ?? 0,
      netzLifetimeYears: P.netzLifetimeYears ?? 40,
      netzConstructionYears: P.netzConstructionYears ?? 0,
      netzIdc,
      netzCrf: netzCrfValue,
      netzBaselineGW: P.netzBaselineReCapacityGW ?? 0,
      netzBaselinePeakGW: P.netzBaselinePeakLoadGW ?? 0,
    },
  };
}

void STORAGE;
