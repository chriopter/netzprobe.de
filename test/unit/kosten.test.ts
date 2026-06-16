import { describe, expect, it } from 'vitest';
import { computeHaushalt, computeKosten, crf } from '../../app/src/ui/kosten';
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
      if (k!.capexChargeEurPerKW != null || k!.capexDischargeEurPerKW != null) {
        // Getrennte Ein-/Ausspeise-Anlagen (H2: Elektrolyseur + Rückverstromung).
        expect(k!.capexChargeEurPerKW, id).toBeGreaterThan(0);
        expect(k!.capexDischargeEurPerKW, id).toBeGreaterThan(0);
        expect(k!.omFixChargeEurPerKWa, id).toBeGreaterThanOrEqual(0);
        expect(k!.omFixDischargeEurPerKWa, id).toBeGreaterThanOrEqual(0);
      } else {
        expect(k!.capexEurPerKW, id).toBeGreaterThan(0);
        expect(k!.omFixEurPerKWa, id).toBeGreaterThanOrEqual(0);
      }
      expect(k!.lifetimeYears, id).toBeGreaterThan(0);
      // Technologiespezifischer realer WACC — kein globaler Default mehr.
      expect(k!.wacc, id).toBeGreaterThanOrEqual(0.02);
      expect(k!.wacc, id).toBeLessThanOrEqual(0.12);
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
  it('Speicher haben capexEurPerKWh; H2-Kaverne ≤ 1 (Einheits-Falle), PSW-Reservoir 20–100', () => {
    for (const id of STORAGE) expect(kostenOf(id)!.capexEurPerKWh, id).toBeGreaterThan(0);
    // PSW-Energiekomponente: Reservoir-Bau 20–100 €/kWh (Viswanathan/PNNL via PyPSA 71,8).
    expect(kostenOf('pumpspeicher')!.capexEurPerKWh).toBeGreaterThanOrEqual(20);
    expect(kostenOf('pumpspeicher')!.capexEurPerKWh).toBeLessThanOrEqual(100);
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
    for (const key of ['netzWacc', 'gasFuelEurPerMWhTh', 'importEurPerMWh', 'exportEurPerMWh', 'h2ImportEurPerMWh', 'households', 'householdConsumptionKWhPerA']) {
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
  it('0.2 Speicher-Energie-CAPEX: Batterie 200–350, PSW 20–100, H2-Kaverne ≤ 0,6 €/kWh', () => {
    expect(kostenOf('batterie')!.capexEurPerKWh).toBeGreaterThanOrEqual(200);
    expect(kostenOf('batterie')!.capexEurPerKWh).toBeLessThanOrEqual(350);
    expect(kostenOf('pumpspeicher')!.capexEurPerKWh).toBeGreaterThanOrEqual(20);
    expect(kostenOf('pumpspeicher')!.capexEurPerKWh).toBeLessThanOrEqual(100);
    expect(kostenOf('h2')!.capexEurPerKWh).toBeLessThanOrEqual(0.6);
  });
  it('0.3 zentrale Preise im Korridor', () => {
    expect(prices.netzWacc).toBeGreaterThanOrEqual(0.03);
    expect(prices.netzWacc).toBeLessThanOrEqual(0.08);
    expect(prices.gasFuelEurPerMWhTh).toBeGreaterThanOrEqual(25);
    expect(prices.gasFuelEurPerMWhTh).toBeLessThanOrEqual(45);
    // Marktbasierter Front-End-Vollzyklus (WNA/NEA-Korridor 9–13; Spot bis ~19)
    expect(prices.uraniumEurPerMWhEl).toBeGreaterThanOrEqual(9);
    expect(prices.uraniumEurPerMWhEl).toBeLessThanOrEqual(19);
    expect(prices.importEurPerMWh).toBeGreaterThanOrEqual(70);
    expect(prices.importEurPerMWh).toBeLessThanOrEqual(120);
    expect(prices.h2ImportEurPerMWh).toBeGreaterThanOrEqual(90);
    expect(prices.h2ImportEurPerMWh).toBeLessThanOrEqual(210);
    expect(prices.households).toBeGreaterThanOrEqual(40e6);
    expect(prices.households).toBeLessThanOrEqual(42e6);
  });
  it('0.4 technologiespezifischer WACC risikodifferenziert (ISE 2024: EE < Dispatchable < Kernkraft)', () => {
    const w = (id: string) => kostenOf(id)!.wacc;
    // Erneuerbare unter den thermischen Dispatchables.
    expect(w('pv')).toBeLessThan(w('gas'));
    expect(w('windon')).toBeLessThan(w('kohle'));
    // Kernkraft trägt das höchste Bau-/Vorlaufrisiko.
    expect(w('kernkraft')).toBeGreaterThanOrEqual(Math.max(w('gas'), w('kohle'), w('windoff')));
    // Offshore-Wind über Onshore (größeres Capex-/Bau-Risiko).
    expect(w('windoff')).toBeGreaterThan(w('windon'));
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
    const capex = kp.capexEurPerKW * 100e6 * crf(kp.wacc, kp.lifetimeYears);
    const om = kp.omFixEurPerKWa * 100e6;
    expect(k.breakdown.capex).toBeCloseTo(capex, -3);
    expect(k.breakdown.om).toBeCloseTo(om, -3);
    expect(k.breakdown.fuel).toBe(0);
    expect(k.total).toBeCloseTo(capex + om, -3);
  });

  it('10 Hand-Szenario Batterie 10 GW / 40 GWh', () => {
    const k = computeKosten(scen({}, { batteriePowerGW: 10, batterieEnergyGWh: 40 }), result([], {}));
    const kb = kostenOf('batterie')!;
    const capex = (kb.capexEurPerKW * 10e6 + kb.capexEurPerKWh * 40e6) * crf(kb.wacc, kb.lifetimeYears);
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
    // Asymmetrische Preise: Import zum Day-Ahead-Mittel, Export-Erlös darunter.
    expect(k.breakdown.importNet).toBeCloseTo(2e6 * prices.importEurPerMWh - 20e6 * prices.exportEurPerMWh, -2);
    // Bon-Aufschlüsselung: Saldo = Importkosten − Exporterlös, beide einzeln ausgewiesen
    expect(k.importCost).toBeCloseTo(2e6 * prices.importEurPerMWh, -2);
    expect(k.exportRevenue).toBeCloseTo(20e6 * prices.exportEurPerMWh, -2);
    expect(k.importCost - k.exportRevenue).toBeCloseTo(k.breakdown.importNet, -2);
  });

  it('18 Export-Capture-Preis fällt mit dem EE-Anteil (Kannibalisierung)', () => {
    const at = (reShare: number) => computeKosten(
      scen({ pvInstalledGW: 100 }),
      result([hour({ loadGW: 50, pvGW: 50 })], { totalDemandTWh: 0.438, exportTWh: 20, renewableSharePct: reShare }),
    );
    // ≤60 % EE: voller Capture-Preis (= exportEurPerMWh, Pauschal-Obergrenze)
    expect(at(55).params.exportEffectiveEurPerMWh).toBeCloseTo(prices.exportEurPerMWh, 6);
    // 80 % EE: 60 − 1,5·20 = 30 €/MWh
    expect(at(80).params.exportEffectiveEurPerMWh).toBeCloseTo(30, 6);
    // 100 % EE: Boden ~20 €/MWh (Flex-gestützter Marktwert, nicht 0)
    expect(at(100).params.exportEffectiveEurPerMWh).toBeCloseTo(20, 6);
    expect(at(100).exportRevenue).toBeGreaterThan(0);
    // Monoton fallend bis zum Boden; ab ~87 % EE konstant 20
    expect(at(70).exportRevenue).toBeLessThan(at(60).exportRevenue);
    expect(at(80).exportRevenue).toBeLessThan(at(70).exportRevenue);
    expect(at(100).params.exportEffectiveEurPerMWh).toBeCloseTo(at(90).params.exportEffectiveEurPerMWh, 6);
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
    netz.capex * Math.max(0, pv + won + woff - netz.base) * 1e6 * crf(prices.netzWacc, netz.life);

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

  // Lastgetriebener Term (AP03): Verteilnetz für E-Mobilität/WP/Industrie folgt
  // dem Zuwachs der Stromlast-Spitze über die 2025-Basis — technologieneutral.
  const lastAnnual = (peakGW: number) =>
    prices.netzCapexEurPerKwAddedPeakLoad * Math.max(0, peakGW - prices.netzBaselinePeakLoadGW) * 1e6 * crf(prices.netzWacc, netz.life);

  it('C.7 Last-Term: Peak ≤ 2025-Basis ⇒ 0; darüber Formel & Monotonie', () => {
    expect(prices.netzBaselinePeakLoadGW).toBeGreaterThan(70);
    expect(prices.netzBaselinePeakLoadGW).toBeLessThan(80);
    const basis = computeKosten(scen({}), result([], { peakLoadGW: 75.6 }));
    expect(basis.breakdown.netz).toBeCloseTo(0, 3);
    const k150 = computeKosten(scen({}), result([], { peakLoadGW: 150 }));
    expect(k150.breakdown.netz).toBeCloseTo(lastAnnual(150), -3);
    const k300 = computeKosten(scen({}), result([], { peakLoadGW: 302.4 }));
    expect(k300.breakdown.netz).toBeGreaterThan(k150.breakdown.netz);
  });

  it('C.8 Großkraftwerks-Szenario ohne EE-Zubau zahlt den Last-Term (kein netz=0 mehr)', () => {
    // 100kern-artig: Peak vervierfacht, keine volatile EE — vor AP03 war netz 0.
    const k = computeKosten(scen({ kernkraftInstalledGW: 333 }), result([], { peakLoadGW: 302.4 }));
    expect(k.breakdown.netz).toBeCloseTo(lastAnnual(302.4), -3);
    expect(k.breakdown.netz).toBeGreaterThan(10e9);
    expect(k.addedPeakLoadGW).toBeCloseTo(302.4 - prices.netzBaselinePeakLoadGW, 3);
  });

  it('C.10 exportAtCap: Flag nur bei ≥95 % der Cap-Energie (Erlös als Obergrenze)', () => {
    const withExport = (capGW: number): Scenario => {
      const s = scen({ kernkraftInstalledGW: 333 });
      return { ...s, export: { ...s.export, stromGW: capGW } };
    };
    // 100kern-artig: 25 GW Cap, 218,9 TWh ≈ dauerhaft am Cap.
    expect(computeKosten(withExport(25), result([], { exportTWh: 218.9 })).exportAtCap).toBe(true);
    // Deutlich unter Cap-Energie: kein Flag.
    expect(computeKosten(withExport(25), result([], { exportTWh: 100 })).exportAtCap).toBe(false);
    // Kein Cap gesetzt: nie flaggen.
    expect(computeKosten(withExport(0), result([], { exportTWh: 50 })).exportAtCap).toBe(false);
  });

  it('C.9 Eichanker bleibt: O45-EE-Zubau + Peak-Verdopplung ⇒ ~0,8 Bio € bis 2050', () => {
    // NEP-2045B/O45-Welt ist elektrifiziert: Δ-EE 455,3 GW UND Peak ~150 GW.
    const k = computeKosten(scen({ pvInstalledGW: 400, windOnInstalledGW: 160, windOffInstalledGW: 70 }), result([], { peakLoadGW: 150 }));
    const total2050 = k.breakdown.netz * (2050 - 2025);
    expect(total2050).toBeGreaterThan(0.65e12);
    expect(total2050).toBeLessThan(0.95e12);
    // Invest-Summe zwischen NEP (~320 Mrd, nur ÜN) und IMK (651 Mrd ÜN+VN).
    const invest = k.breakdown.netz / crf(prices.netzWacc, netz.life);
    expect(invest).toBeGreaterThan(0.32e12);
    expect(invest).toBeLessThan(0.651e12);
  });
});

// ===========================================================================
// D — Erneuerung über Lebensdauer (Lock-in: Annuität × Horizont bildet Ersatz
//     auslaufender Anlagen bereits korrekt ab; kein separater Posten nötig.)
// ===========================================================================
describe('Kosten · D Erneuerung', () => {
  const annualCapex = (id: 'pv' | 'batterie', gw: number, gwh = 0) => {
    const k = (id === 'batterie' ? byId['batterie'].parameters.kosten : byId['pv'].parameters.kosten) as Record<string, number>;
    return (k.capexEurPerKW * gw * 1e6 + (k.capexEurPerKWh ?? 0) * gwh * 1e6) * crf(k.wacc, k.lifetimeYears);
  };

  it('D.1 CAPEX × Horizont skaliert linear über Lebensdauer hinaus (impliziter Ersatz)', () => {
    // Batterie 10 GW / 40 GWh, Lebensdauer 15 a, kein Brennstoff/Import.
    const s = scen({}, { batteriePowerGW: 10, batterieEnergyGWh: 40 });
    const k = computeKosten(s, result([], {}));
    const a = annualCapex('batterie', 10, 40);
    expect(k.breakdown.capex).toBeCloseTo(a, -3);
    // Über 15 a (= Lebensdauer): genau eine finanzierte Anlage = sticker × CRF(15) × 15.
    // Über 30 a (= 2× Lebensdauer): exakt 2× — Ersatz nach Jahr 15 steckt im Annuitätsstrom.
    const cap15 = k.breakdown.capex * 15;
    const cap30 = k.breakdown.capex * 30;
    expect(cap30 / cap15).toBeCloseTo(2, 6);
    expect(cap30).toBeCloseTo(a * 30, -3);
  });

  it('D.2 Kurze Lebensdauer ⇒ mehr Ersatz im Horizont: Batterie kostet je Sticker mehr als PV', () => {
    // Gleicher Power-Sticker (100 GW), nur CAPEX-Anteil je Technologie.
    // Über Horizont 30 a: PV (life 30) wird einmal finanziert; Batterie (life 15) effektiv zweimal.
    const sPV = scen({ pvInstalledGW: 100 });
    const sBatt = scen({}, { batteriePowerGW: 100, batterieEnergyGWh: 0 });
    const kPV = computeKosten(sPV, result([], {}));
    const kBatt = computeKosten(sBatt, result([], {}));
    const horizon = 30;
    // PV-Annuität × 30 ≈ 1× über die Lebensdauer (sticker × CRF(30) × 30).
    // Batterie-Annuität × 30 ≈ 2× über die Lebensdauer (sticker × CRF(15) × 30 = 2× sticker × CRF(15) × 15).
    // Verhältnis Batterie/PV (je €-Sticker) > 1 — eindeutiger Ersatzaufschlag.
    const pvSticker = (byId['pv'].parameters.kosten as Record<string, number>).capexEurPerKW;
    const battSticker = (byId['batterie'].parameters.kosten as Record<string, number>).capexEurPerKW;
    // Capex-Anteil je Sticker (€/€/kW): annuisiert × horizon / Sticker
    const pvCapexShare = kPV.breakdown.capex * horizon / (pvSticker * 100 * 1e6);
    const battCapexShare = kBatt.breakdown.capex * horizon / (battSticker * 100 * 1e6);
    expect(battCapexShare / pvCapexShare).toBeGreaterThan(1.4); // kürzeres Leben = klar mehr Ersatz
  });

  it('D.3 Identität: Annuität × Lebensdauer = finanzierte CAPEX (sticker × CRF × life)', () => {
    // Für jede Tech sollte gelten: capex_annual × lifetime = sticker × CRF × lifetime
    // (mathematische Identität der CRF-Definition — sichert, dass Erneuerung pro Tech über die EIGENE Lebensdauer skaliert).
    for (const id of ['pv', 'windon', 'kernkraft', 'batterie'] as const) {
      const isStorage = id === 'batterie';
      const k = (isStorage ? byId['batterie'].parameters.kosten : byId[id].parameters.kosten) as Record<string, number>;
      const annuityFactor = crf(k.wacc, k.lifetimeYears);
      const overLife = annuityFactor * k.lifetimeYears;
      // Über die Lebensdauer summiert > 1 (Finanzierungs-Aufschlag), aber endlich.
      // Obergrenze 4: hohe-WACC-Langläufer (Kernkraft 7,8 % × 45 a) ⇒ ~3,6.
      expect(overLife, id).toBeGreaterThan(1);
      expect(overLife, id).toBeLessThan(4);
    }
  });
});

// ===========================================================================
// E — Musterhaushalt & Endkundenpreis-Bruecke
// ===========================================================================
describe('Kosten · E Musterhaushalt', () => {
  const k = computeKosten(
    scen({ gasInstalledGW: 50 }),
    result([hour({ loadGW: 50, gasGW: 50 })], { totalDemandTWh: 100 }),
  );

  it('E.1 Grundbedarf ohne Elektrifizierung = householdConsumptionKWhPerA', () => {
    const hh = computeHaushalt(k, 0, 0);
    expect(hh.kwh).toBe(prices.householdConsumptionKWhPerA);
    expect(hh.pkwKwh).toBe(0);
    expect(hh.heizKwh).toBe(0);
  });

  it('E.2 Sektor-TWh werden exakt auf Haushalte umgelegt', () => {
    // pkwAddTWh so gewaehlt, dass je Haushalt exakt 1.000 kWh ankommen.
    const pkwTWh = prices.households * 1000 / 1e9;
    const hh = computeHaushalt(k, pkwTWh, pkwTWh / 2);
    expect(hh.pkwKwh).toBeCloseTo(1000, 6);
    expect(hh.heizKwh).toBeCloseTo(500, 6);
    expect(hh.kwh).toBeCloseTo(prices.householdConsumptionKWhPerA + 1500, 6);
  });

  it('E.3 Bruecke: Endkundenpreis = (ab Werk + Bestandteile) × (1 + MwSt)', () => {
    const hh = computeHaushalt(k, 0, 0);
    const nettoCt = hh.abWerkCt
      + prices.householdNetzentgeltCtPerKWh
      + prices.householdSteuernAbgabenCtPerKWh
      + prices.householdUmlagenCtPerKWh
      + prices.householdVertriebCtPerKWh;
    expect(hh.abWerkCt).toBeCloseTo(k.perMWh / 10, 9);
    expect(hh.endkundeCt).toBeCloseTo(nettoCt * (1 + prices.vatRate), 9);
    expect(hh.endkundeEurPerMonth).toBeCloseTo(hh.endkundeCt / 100 * hh.kwh / 12, 9);
    expect(hh.abWerkEurPerMonth).toBeCloseTo(hh.abWerkCt / 100 * hh.kwh / 12, 9);
  });

  it('E.4 Bruecken-Bestandteile decken alle dokumentierten Preisfelder ab', () => {
    const hh = computeHaushalt(k, 0, 0);
    const sum = hh.bridge.reduce((acc, r) => acc + r.ct, 0);
    expect(sum).toBeCloseTo(
      prices.householdNetzentgeltCtPerKWh + prices.householdSteuernAbgabenCtPerKWh + prices.householdUmlagenCtPerKWh + prices.householdVertriebCtPerKWh,
      9,
    );
  });
});
