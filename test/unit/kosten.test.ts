import { describe, expect, it } from 'vitest';
import { computeKosten, crf } from '../../app/src/ui/kosten';
import { defaultScenario, normalizeScenario } from '../../app/src/ui/scenarioPresets';
import type { Scenario } from '../../app/src/types/scenario';
import type { SimulationResult, SimHour } from '../../app/src/types/simulation';

// ---------------------------------------------------------------------------
// Paket-Zugriff (gleicher Glob wie dataPackages.test.ts)
// ---------------------------------------------------------------------------
type Pkg = { id: string; parameters: Record<string, any>; method: Record<string, any> };
const modules = import.meta.glob('../../model/**/package.json', { eager: true, import: 'default' }) as Record<string, Pkg>;
const byId: Record<string, Pkg> = {};
for (const p of Object.values(modules)) if (p?.id) byId[p.id] = p;
const kostenOf = (id: string) => byId[id]?.parameters?.kosten as Record<string, number> | undefined;
const prices = byId['preise'].parameters as Record<string, number>;

const GEN = ['pv', 'windon', 'windoff', 'biomasse', 'laufwasser', 'kernkraft', 'gas', 'kohle'];
const STORAGE = ['batterie', 'pumpspeicher', 'h2'];
const FUEL = ['biomasse', 'gas', 'kohle', 'kernkraft'];

// ---------------------------------------------------------------------------
// Synthetische Eingaben
// ---------------------------------------------------------------------------
function hour(o: Partial<SimHour>): SimHour {
  return { loadGW: 0, pvGW: 0, windOnGW: 0, windOffGW: 0, biomasseGW: 0, laufwasserGW: 0, kernkraftGW: 0, gasGW: 0, kohleGW: 0, ...o } as unknown as SimHour;
}
function result(hours: SimHour[], summary: Partial<SimulationResult['summary']>): SimulationResult {
  return { hours, summary: { totalDemandTWh: 0, loadSheddingTWh: 0, importTWh: 0, exportTWh: 0, co2MtPerYear: 0, ...summary } as SimulationResult['summary'] };
}
const ZGEN: Scenario['generation'] = { ...normalizeScenario(defaultScenario).generation, pvInstalledGW: 0, windOnInstalledGW: 0, windOffInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, kernkraftInstalledGW: 0, gasInstalledGW: 0, kohleInstalledGW: 0 };
const ZSTO: Scenario['storage'] = { ...normalizeScenario(defaultScenario).storage, batteriePowerGW: 0, batterieEnergyGWh: 0, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 };
function scen(gen: Partial<Scenario['generation']> = {}, sto: Partial<Scenario['storage']> = {}, h2TWh = 0): Scenario {
  const b = normalizeScenario(defaultScenario);
  return { ...b, generation: { ...ZGEN, ...gen }, storage: { ...ZSTO, ...sto }, import: { ...b.import, h2TWh } };
}

// ===========================================================================
// A — Datenintegrität
// ===========================================================================
describe('Kosten · A Datenintegrität', () => {
  it('jede Erzeugungs-/Speicher-Technologie hat valide kosten', () => {
    for (const id of [...GEN, ...STORAGE]) {
      const k = kostenOf(id);
      expect(k, id).toBeDefined();
      expect(k!.capexEurPerKW, id).toBeGreaterThan(0);
      expect(k!.omFixEurPerKWa, id).toBeGreaterThanOrEqual(0);
      expect(k!.lifetimeYears, id).toBeGreaterThan(0);
    }
  });
  it('Fuel-Technologien haben Wirkungsgrad ∈ (0,1] und Brennstoffpreis > 0', () => {
    for (const id of FUEL) {
      const k = kostenOf(id)!;
      expect(k.fuelEurPerMWhTh, id).toBeGreaterThan(0);
      expect(k.efficiency, id).toBeGreaterThan(0);
      expect(k.efficiency, id).toBeLessThanOrEqual(1);
    }
  });
  it('Speicher haben capexEurPerKWh; Pumpspeicher/H2 ≤ 1 (Einheits-Falle)', () => {
    for (const id of STORAGE) expect(kostenOf(id)!.capexEurPerKWh, id).toBeGreaterThan(0);
    expect(kostenOf('pumpspeicher')!.capexEurPerKWh).toBeLessThanOrEqual(1);
    expect(kostenOf('h2')!.capexEurPerKWh).toBeLessThanOrEqual(1);
  });
  it('method.kosten + fields-Eintrag vorhanden', () => {
    for (const id of [...GEN, ...STORAGE]) {
      const m = byId[id].method;
      expect(m.kosten?.source, id).toBeTruthy();
      expect(Array.isArray(m.kosten?.sourceUrls) && m.kosten.sourceUrls.length, id).toBeTruthy();
      expect((m.fields ?? []).some((f: any) => f.name === 'kosten'), id).toBe(true);
    }
  });
  it('Register preise: Keys vorhanden, KEIN co2EurPerT, jeder Param dokumentiert', () => {
    for (const key of ['wacc', 'gasFuelEurPerMWhTh', 'importEurPerMWh', 'exportEurPerMWh', 'h2ImportEurPerMWh', 'households', 'householdConsumptionKWhPerA']) {
      expect(typeof prices[key], key).toBe('number');
    }
    expect(prices.co2EurPerT).toBeUndefined();
    const documented = new Set((byId['preise'].method.fields ?? []).map((f: any) => f.name));
    for (const key of Object.keys(prices)) expect(documented.has(key), key).toBe(true);
  });
});

// ===========================================================================
// 0 — Realismus der Zahlen
// ===========================================================================
describe('Kosten · 0 Realismus', () => {
  const CAPEX: Record<string, [number, number]> = {
    pv: [600, 1300], windon: [1300, 1900], windoff: [2600, 3400], laufwasser: [2000, 7000],
    biomasse: [3500, 5000], gas: [700, 1200], kohle: [1500, 2200], kernkraft: [6000, 16000],
  };
  it('0.1 CAPEX je Erzeugungstechnologie im Literatur-Korridor', () => {
    for (const [id, [lo, hi]] of Object.entries(CAPEX)) {
      const c = kostenOf(id)!.capexEurPerKW;
      expect(c, `${id} CAPEX ${c}`).toBeGreaterThanOrEqual(lo);
      expect(c, `${id} CAPEX ${c}`).toBeLessThanOrEqual(hi);
    }
  });
  it('0.1 O&M fix plausibel (>0, < 300 €/kW·a) und Lebensdauer 15–80 a', () => {
    for (const id of GEN) {
      const k = kostenOf(id)!;
      expect(k.omFixEurPerKWa, id).toBeGreaterThan(0);
      expect(k.omFixEurPerKWa, id).toBeLessThan(300);
      expect(k.lifetimeYears, id).toBeGreaterThanOrEqual(15);
      expect(k.lifetimeYears, id).toBeLessThanOrEqual(80);
    }
  });
  it('0.2 Speicher-Energie-CAPEX: Batterie 200–350, Pumpspeicher/H2 ≤ 0,6 €/kWh', () => {
    expect(kostenOf('batterie')!.capexEurPerKWh).toBeGreaterThanOrEqual(200);
    expect(kostenOf('batterie')!.capexEurPerKWh).toBeLessThanOrEqual(350);
    expect(kostenOf('pumpspeicher')!.capexEurPerKWh).toBeLessThanOrEqual(0.6);
    expect(kostenOf('h2')!.capexEurPerKWh).toBeLessThanOrEqual(0.6);
  });
  it('0.3 zentrale Preise im Korridor', () => {
    expect(prices.wacc).toBeGreaterThanOrEqual(0.03);
    expect(prices.wacc).toBeLessThanOrEqual(0.08);
    expect(prices.gasFuelEurPerMWhTh).toBeGreaterThanOrEqual(25);
    expect(prices.gasFuelEurPerMWhTh).toBeLessThanOrEqual(45);
    expect(prices.uraniumEurPerMWhEl).toBeGreaterThanOrEqual(18);
    expect(prices.uraniumEurPerMWhEl).toBeLessThanOrEqual(25);
    expect(prices.importEurPerMWh).toBeGreaterThanOrEqual(70);
    expect(prices.importEurPerMWh).toBeLessThanOrEqual(120);
    expect(prices.h2ImportEurPerMWh).toBeGreaterThanOrEqual(90);
    expect(prices.h2ImportEurPerMWh).toBeLessThanOrEqual(210);
    expect(prices.households).toBeGreaterThanOrEqual(40e6);
    expect(prices.households).toBeLessThanOrEqual(42e6);
  });
});

// ===========================================================================
// B — Rechenlogik & Invarianten
// ===========================================================================
describe('Kosten · B Invarianten', () => {
  it('8 CRF korrekt', () => {
    expect(crf(0.05, 30)).toBeCloseTo(0.06505, 4);
    expect(crf(0.05, 25)).toBeCloseTo(0.07095, 4);
    expect(crf(0.05, 15)).toBeCloseTo(0.09634, 4);
    expect(crf(0.05, 60)).toBeCloseTo(0.05283, 4);
    expect(crf(0.05, 45)).toBeCloseTo(0.05626, 4);
    expect(crf(0, 40)).toBeCloseTo(1 / 40, 6); // wacc→0 ⇒ 1/life
  });

  it('9 Hand-Szenario PV 100 GW (leere Reihe) → reine CAPEX+O&M', () => {
    const k = computeKosten(scen({ pvInstalledGW: 100 }), result([], {}));
    const kp = kostenOf('pv')!;
    const capex = kp.capexEurPerKW * 100e6 * crf(0.05, kp.lifetimeYears);
    const om = kp.omFixEurPerKWa * 100e6;
    expect(k.breakdown.capex).toBeCloseTo(capex, -3);
    expect(k.breakdown.om).toBeCloseTo(om, -3);
    expect(k.breakdown.fuel).toBe(0);
    expect(k.total).toBeCloseTo(capex + om, -3);
  });

  it('10 Hand-Szenario Batterie 10 GW / 40 GWh', () => {
    const k = computeKosten(scen({}, { batteriePowerGW: 10, batterieEnergyGWh: 40 }), result([], {}));
    const kb = kostenOf('batterie')!;
    const capex = (kb.capexEurPerKW * 10e6 + kb.capexEurPerKWh * 40e6) * crf(0.05, kb.lifetimeYears);
    expect(k.breakdown.capex).toBeCloseTo(capex, -3);
  });

  it('11 Total = capex + om + fuel + h2Import + importNet + netz (kein CO2)', () => {
    const hours = Array.from({ length: 365 }, () => hour({ loadGW: 60, gasGW: 10, pvGW: 30 }));
    const k = computeKosten(scen({ pvInstalledGW: 200, gasInstalledGW: 20 }, { batteriePowerGW: 5, batterieEnergyGWh: 20 }, 50),
      result(hours, { totalDemandTWh: 525.6, importTWh: 10, exportTWh: 4 }));
    const b = k.breakdown;
    expect(b.netz).toBeGreaterThan(0); // PV 200 GW > 174,7 GW Basis ⇒ Netz-Posten aktiv
    expect(b.capex + b.om + b.fuel + b.h2Import + b.importNet + b.netz).toBeCloseTo(k.total, -2);
  });

  it('16 H2-Import nur bei h2TWh>0; Wert = TWh × Preis', () => {
    const withImport = computeKosten(scen({ pvInstalledGW: 100 }, {}, 50), result([], { totalDemandTWh: 1 }));
    expect(withImport.breakdown.h2Import).toBeCloseTo(50e6 * prices.h2ImportEurPerMWh, -2);
    expect(withImport.perTech.some(t => t.key === 'h2import')).toBe(true);
    const noImport = computeKosten(scen({ pvInstalledGW: 100 }, {}, 0), result([], { totalDemandTWh: 1 }));
    expect(noImport.breakdown.h2Import).toBe(0);
    expect(noImport.perTech.some(t => t.key === 'h2import')).toBe(false);
  });

  it('17 Strom-Import-Saldo: Netto-Export ⇒ negativ', () => {
    const k = computeKosten(scen({ pvInstalledGW: 100 }), result([hour({ loadGW: 50, pvGW: 50 })], { totalDemandTWh: 0.438, importTWh: 2, exportTWh: 20 }));
    expect(k.breakdown.importNet).toBeLessThan(0);
    expect(k.breakdown.importNet).toBeCloseTo((2 - 20) * 1e6 * prices.importEurPerMWh, -2);
  });

  it('19/20 annualScale + Brennstoff: 365-Tagesreihe ⇒ Jahresenergie korrekt hochskaliert', () => {
    // 10 GW Gas konstant, loadGW 10 → annualScale = 24, Jahres-Erzeugung = 10·8760 = 87,6 GWh·... = 87,6 TWh
    const hours = Array.from({ length: 365 }, () => hour({ loadGW: 10, gasGW: 10 }));
    const k = computeKosten(scen({ gasInstalledGW: 10 }), result(hours, { totalDemandTWh: 87.6 }));
    const kg = kostenOf('gas')!;
    const expectedFuel = kg.fuelEurPerMWhTh / kg.efficiency * 87.6e6; // 87,6 TWh in MWh
    expect(k.breakdown.fuel).toBeCloseTo(expectedFuel, -4);
    const gasTech = k.perTech.find(t => t.key === 'gas')!;
    expect(gasTech.eurPerMWh).toBeGreaterThan(40); // sane LCOE, nicht 24×-Bug
    expect(gasTech.eurPerMWh).toBeLessThan(400);
  });

  it('21 Resolutions-Unabhängigkeit: 365-Tages- vs 8760-Stundenreihe < 2 %', () => {
    const s = scen({ pvInstalledGW: 200, gasInstalledGW: 20 }, {}, 0);
    const daily = computeKosten(s, result(Array.from({ length: 365 }, () => hour({ loadGW: 50, pvGW: 80, gasGW: 8 })), { totalDemandTWh: 438 }));
    const hourly = computeKosten(s, result(Array.from({ length: 8760 }, () => hour({ loadGW: 50, pvGW: 80, gasGW: 8 })), { totalDemandTWh: 438 }));
    expect(Math.abs(daily.total - hourly.total) / hourly.total).toBeLessThan(0.02);
  });

  it('13 Ø Stromkosten endlich auch bei voller Lastunterdeckung', () => {
    const k = computeKosten(scen({ pvInstalledGW: 100 }), result([hour({ loadGW: 50 })], { totalDemandTWh: 100, loadSheddingTWh: 100 }));
    expect(Number.isFinite(k.perMWh)).toBe(true);
  });
});

// ===========================================================================
// C — Netzausbau (standardmäßig enthalten, an EE-Zubau über 2025-Basis gekoppelt,
//     Faktor an Vollnetz-Schätzungen IMK/NEP/DIHK geeicht)
// ===========================================================================
describe('Kosten · C Netzausbau', () => {
  const netz = { capex: prices.netzCapexEurPerKwAddedRE, life: prices.netzLifetimeYears, base: prices.netzBaselineReCapacityGW };
  const netzAnnual = (pv: number, won: number, woff: number) =>
    netz.capex * Math.max(0, pv + won + woff - netz.base) * 1e6 * crf(prices.wacc, netz.life);

  it('C.0 Netz-Parameter vorhanden, dokumentiert & plausibel', () => {
    expect(netz.capex).toBeGreaterThan(0);
    expect(netz.life).toBeGreaterThanOrEqual(30);
    expect(netz.life).toBeLessThanOrEqual(60);
    expect(netz.base).toBeGreaterThan(150);
    expect(netz.base).toBeLessThan(200);
  });

  it('C.1 standardmäßig enthalten: oberhalb Basis ⇒ netz > 0, Formel korrekt', () => {
    const s = scen({ pvInstalledGW: 400, windOnInstalledGW: 160, windOffInstalledGW: 70 });
    const k = computeKosten(s, result([], {}));
    expect(k.breakdown.netz).toBeCloseTo(netzAnnual(400, 160, 70), -3);
    expect(k.breakdown.netz).toBeGreaterThan(0);
  });

  it('C.2 2025-Basis & darunter: Zubau ≤ 0 ⇒ Netz 0', () => {
    const basis = scen({ pvInstalledGW: 102.5, windOnInstalledGW: 62.8, windOffInstalledGW: 9.4 });
    expect(computeKosten(basis, result([], {})).breakdown.netz).toBeCloseTo(0, 3);
    const unter = scen({ pvInstalledGW: 50, windOnInstalledGW: 20, windOffInstalledGW: 5 });
    expect(computeKosten(unter, result([], {})).breakdown.netz).toBe(0);
  });

  it('C.3 O45-Strom-Pfad: Eichung ~0,8 Bio € (Aufbau bis 2050)', () => {
    const s = scen({ pvInstalledGW: 400, windOnInstalledGW: 160, windOffInstalledGW: 70 });
    const k = computeKosten(s, result([], {}));
    // Zentralanker IMK-Vollnetz (~651 Mrd Invest) .. DIHK all-in (~1,2 Bio); O45 ergibt ~0,8 Bio
    const total2050 = k.breakdown.netz * (2050 - 2025);
    expect(total2050).toBeGreaterThan(0.65e12);
    expect(total2050).toBeLessThan(0.95e12);
  });

  it('C.4 nur volatile EE zählt — Gas/Kohle/Kern ohne Netzwirkung', () => {
    const re = computeKosten(scen({ pvInstalledGW: 300, windOnInstalledGW: 100, windOffInstalledGW: 40 }), result([], {}));
    const rePlusFirm = computeKosten(scen({ pvInstalledGW: 300, windOnInstalledGW: 100, windOffInstalledGW: 40, gasInstalledGW: 50, kernkraftInstalledGW: 20, kohleInstalledGW: 30 }), result([], {}));
    expect(rePlusFirm.breakdown.netz).toBeCloseTo(re.breakdown.netz, -2);
  });

  it('C.5 Netz steckt genau einmal in total (Summe der Bestandteile = total)', () => {
    const k = computeKosten(scen({ pvInstalledGW: 400, windOnInstalledGW: 160, windOffInstalledGW: 70 }), result([], {}));
    const b = k.breakdown;
    expect(b.netz).toBeGreaterThan(0);
    expect(b.capex + b.om + b.fuel + b.h2Import + b.importNet + b.netz).toBeCloseTo(k.total, -2);
  });

  it('C.6 Netz wächst streng monoton mit volatilem EE-Zubau', () => {
    const lo = computeKosten(scen({ pvInstalledGW: 200, windOnInstalledGW: 80, windOffInstalledGW: 30 }), result([], {}));
    const hi = computeKosten(scen({ pvInstalledGW: 500, windOnInstalledGW: 200, windOffInstalledGW: 70 }), result([], {}));
    expect(hi.breakdown.netz).toBeGreaterThan(lo.breakdown.netz);
  });
});
