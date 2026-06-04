import { describe, expect, it } from 'vitest';
import { annualByMaterial, groupSums, BULK, FUEL, VLH } from '../../app/src/ui/ressourcen';
import { defaultScenario, normalizeScenario } from '../../app/src/ui/scenarioPresets';
import type { Scenario } from '../../app/src/types/scenario';

// ---------------------------------------------------------------------------
// Paket-Zugriff
// ---------------------------------------------------------------------------
type Pkg = { id: string; parameters: Record<string, any>; method: Record<string, any> };
const modules = import.meta.glob('../../model/**/package.json', { eager: true, import: 'default' }) as Record<string, Pkg>;
const byId: Record<string, Pkg> = {};
for (const p of Object.values(modules)) if (p?.id) byId[p.id] = p;
const materials = byId['weltfoerderung'].parameters.materials as Record<string, { label: string; globalProductionTPerYear: number; germanyDemandTPerYear?: number; sourceUrls?: string[]; confidence?: string }>;
const resourcesOf = (id: string) => byId[id]?.parameters?.resources as Record<string, any> | undefined;
const TECHS = ['pv', 'windon', 'windoff', 'biomasse', 'laufwasser', 'kernkraft', 'gas', 'kohle', 'batterie', 'pumpspeicher', 'h2', 'e100-pkw', 'e100-lkw', 'e100-heiz', 'e100-ghd', 'e100-bahn'];
const BASES = ['tPerGW', 'tPerGWh', 'tPerTWh'];

// Szenario-Helper (alle Kapazitäten 0, gezielt überschreiben)
const ZGEN: Scenario['generation'] = { ...normalizeScenario(defaultScenario).generation, pvInstalledGW: 0, windOnInstalledGW: 0, windOffInstalledGW: 0, biomasseInstalledGW: 0, laufwasserInstalledGW: 0, kernkraftInstalledGW: 0, gasInstalledGW: 0, kohleInstalledGW: 0 };
const ZSTO: Scenario['storage'] = { ...normalizeScenario(defaultScenario).storage, batteriePowerGW: 0, batterieEnergyGWh: 0, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 };
function scen(gen: Partial<Scenario['generation']> = {}, sto: Partial<Scenario['storage']> = {}): Scenario {
  const b = normalizeScenario(defaultScenario);
  return { ...b, generation: { ...ZGEN, ...gen }, storage: { ...ZSTO, ...sto } };
}

// ===========================================================================
// A — Datenintegrität
// ===========================================================================
describe('Ressourcen · A Datenintegrität', () => {
  it('jeder resources-Materialschlüssel existiert im Register', () => {
    for (const id of TECHS) {
      const r = resourcesOf(id); if (!r) continue;
      for (const m of Object.keys(r)) expect(materials[m], `${id}: ${m}`).toBeDefined();
    }
  });
  it('genau eine Basis (tPerGW XOR tPerGWh XOR tPerTWh), Wert > 0', () => {
    for (const id of TECHS) {
      const r = resourcesOf(id); if (!r) continue;
      for (const [m, e] of Object.entries(r)) {
        const present = BASES.filter(b => e[b] != null);
        expect(present.length, `${id}.${m}`).toBe(1);
        expect(e[present[0]], `${id}.${m}`).toBeGreaterThan(0);
      }
    }
  });
  it('jeder Eintrag: confidence ∈ {hoch,mittel,niedrig} + Quelle je Eintrag oder auf Paketebene', () => {
    for (const id of TECHS) {
      const r = resourcesOf(id); if (!r) continue;
      const pkgUrls = byId[id].method?.ressourcen?.sourceUrls as string[] | undefined;
      const hasPkgUrls = Array.isArray(pkgUrls) && pkgUrls.length > 0;
      for (const [m, e] of Object.entries(r)) {
        const hasEntryUrls = Array.isArray(e.sourceUrls) && e.sourceUrls.length > 0;
        expect(hasEntryUrls || hasPkgUrls, `${id}.${m}: keine Quelle`).toBe(true);
        expect(['hoch', 'mittel', 'niedrig'], `${id}.${m}`).toContain(e.confidence);
      }
    }
  });
  it('jedes Paket mit resources hat method.ressourcen + fields-Eintrag', () => {
    for (const id of TECHS) {
      if (!resourcesOf(id)) continue;
      const m = byId[id].method;
      expect(m.ressourcen?.source, id).toBeTruthy();
      expect(Array.isArray(m.ressourcen?.sourceUrls) && m.ressourcen.sourceUrls.length, id).toBeTruthy();
      expect((m.fields ?? []).some((f: any) => f.name === 'resources'), id).toBe(true);
    }
  });
  it('Register: jedes Material globalProduction > 0, DE ≥ 0, label + sourceUrls', () => {
    for (const [m, v] of Object.entries(materials)) {
      expect(v.globalProductionTPerYear, m).toBeGreaterThan(0);
      expect(v.germanyDemandTPerYear ?? 0, m).toBeGreaterThanOrEqual(0);
      expect(v.label, m).toBeTruthy();
      expect(Array.isArray(v.sourceUrls) && v.sourceUrls!.length, m).toBeTruthy();
    }
  });
});

// ===========================================================================
// 0 — Realismus der Zahlen
// ===========================================================================
describe('Ressourcen · 0 Realismus', () => {
  const WORLD: Record<string, [number, number]> = {
    Lithium: [100e3, 400e3], Kobalt: [200e3, 350e3], Nickel: [2.5e6, 5e6], Kupfer: [18e6, 26e6],
    Silber: [20e3, 30e3], Mangan: [12e6, 25e6], Chrom: [30e6, 55e6], Molybdaen: [200e3, 320e3],
    Zink: [9e6, 15e6], Silizium: [7e6, 9.5e6], Stahl: [1.7e9, 2.0e9], Aluminium: [65e6, 80e6],
    'Beton/Zement': [20e9, 40e9], Uran: [50e3, 70e3], Kohle: [7e9, 10e9], Erdgas: [2.5e9, 3.8e9],
  };
  it('0.1 Weltförderung je Material im USGS/worldsteel/WNA-Korridor', () => {
    for (const [m, [lo, hi]] of Object.entries(WORLD)) {
      const w = materials[m].globalProductionTPerYear;
      expect(w, `${m} Welt ${w.toLocaleString()}`).toBeGreaterThanOrEqual(lo);
      expect(w, `${m} Welt ${w.toLocaleString()}`).toBeLessThanOrEqual(hi);
    }
    expect(materials['Neodym'].globalProductionTPerYear).toBeLessThan(120e3);
    expect(materials['Dysprosium'].globalProductionTPerYear).toBeLessThan(10e3);
  });
  it('0.2 DE-Jahresverbrauch (hohe Konfidenz) im Korridor; Uran = 0', () => {
    expect(materials['Kupfer'].germanyDemandTPerYear).toBeGreaterThanOrEqual(1.1e6);
    expect(materials['Kupfer'].germanyDemandTPerYear).toBeLessThanOrEqual(1.4e6);
    expect(materials['Aluminium'].germanyDemandTPerYear).toBeGreaterThanOrEqual(2.4e6);
    expect(materials['Stahl'].germanyDemandTPerYear).toBeGreaterThanOrEqual(24e6);
    expect(materials['Stahl'].germanyDemandTPerYear).toBeLessThanOrEqual(30e6);
    expect(materials['Kohle'].germanyDemandTPerYear).toBeGreaterThanOrEqual(100e6);
    expect(materials['Uran'].germanyDemandTPerYear).toBe(0);
  });
  it('0.3 Schlüssel-Intensitäten im LCA/IEA-Korridor', () => {
    const I = (id: string, m: string) => { const e = resourcesOf(id)![m]; return e[BASES.find(b => e[b] != null)!]; };
    expect(I('pv', 'Silber')).toBeGreaterThanOrEqual(8); expect(I('pv', 'Silber')).toBeLessThanOrEqual(25);
    expect(I('pv', 'Kupfer')).toBeLessThanOrEqual(5000);
    expect(I('windon', 'Stahl')).toBeGreaterThanOrEqual(100e3); expect(I('windon', 'Stahl')).toBeLessThanOrEqual(160e3);
    expect(I('windon', 'Neodym')).toBeLessThanOrEqual(50);
    expect(I('windoff', 'Kupfer')).toBeGreaterThanOrEqual(5000); expect(I('windoff', 'Kupfer')).toBeLessThanOrEqual(15000);
    expect(I('batterie', 'Lithium')).toBeGreaterThanOrEqual(80); expect(I('batterie', 'Lithium')).toBeLessThanOrEqual(130);
    expect(I('kernkraft', 'Uran')).toBeLessThanOrEqual(40);
    expect(I('pumpspeicher', 'Beton/Zement')).toBeGreaterThanOrEqual(6.7e6); expect(I('pumpspeicher', 'Beton/Zement')).toBeLessThanOrEqual(11e6);
    expect(I('kohle', 'Kohle')).toBeGreaterThanOrEqual(850e3); expect(I('kohle', 'Kohle')).toBeLessThanOrEqual(1050e3);
    expect(I('gas', 'Erdgas')).toBeGreaterThanOrEqual(125e3); expect(I('gas', 'Erdgas')).toBeLessThanOrEqual(180e3);
  });
  it('0.4 E-Pkw materialintensivster Sektor: pkw.Lithium / lkw.Lithium ≈ 3–4', () => {
    const pkwLi = resourcesOf('e100-pkw')!['Lithium'].tPerTWh;
    const lkwLi = resourcesOf('e100-lkw')!['Lithium'].tPerTWh;
    expect(pkwLi / lkwLi).toBeGreaterThanOrEqual(3);
    expect(pkwLi / lkwLi).toBeLessThanOrEqual(4);
    expect(pkwLi).toBeGreaterThanOrEqual(1500); expect(pkwLi).toBeLessThanOrEqual(4000);
    expect(resourcesOf('e100-pkw')!['Kupfer'].tPerTWh).toBeLessThanOrEqual(50000);
  });
});

// ===========================================================================
// B — Rechenlogik & Invarianten
// ===========================================================================
describe('Ressourcen · B Invarianten', () => {
  it('7 Hand-Szenario: nur Batterie 100 GWh, bis 2045 (20 J.) → Lithium = 485 t/a', () => {
    const out = annualByMaterial(scen({}, { batterieEnergyGWh: 100 }), 20, {});
    expect(out['Lithium']).toBeCloseTo(97 * 100 / 20, 6); // 485
  });
  it('10 Gruppensumme = Σ der Materialien je Gruppe', () => {
    const annual = annualByMaterial(scen({ windOnInstalledGW: 10, kohleInstalledGW: 5 }), 20, {});
    const g = groupSums(annual);
    let bulk = 0, fuel = 0;
    for (const [m, v] of Object.entries(annual)) { if (BULK.has(m)) bulk += v; else if (FUEL.has(m)) fuel += v; }
    expect(g.bulk).toBeCloseTo(bulk, 3);
    expect(g.brennstoff).toBeCloseTo(fuel, 3);
  });
  it('11 Annualisierung: Bau ∝ 1/Jahre, Brennstoff NICHT', () => {
    const s = scen({ windOnInstalledGW: 10, kohleInstalledGW: 5 });
    const a20 = annualByMaterial(s, 20, {});
    const a40 = annualByMaterial(s, 40, {});
    expect(a20['Stahl']).toBeCloseTo(a40['Stahl'] * 2, 3); // Bau halbiert sich
    expect(a20['Kohle']).toBeCloseTo(a40['Kohle'], 3);     // Brennstoff unverändert
    // exakter Brennstoffwert: kohle 950000 t/TWh × 5 GW × 3000 VLh / 1000
    expect(a20['Kohle']).toBeCloseTo(950000 * 5 * VLH['kohle'] / 1000, 3);
  });
  it('13 kein Kohle/Gas → Brennstoff-Gruppe 0; nur PV → keine Brennstoffe', () => {
    const g = groupSums(annualByMaterial(scen({ pvInstalledGW: 100 }), 20, {}));
    expect(g.brennstoff).toBe(0);
    expect(g.bulk).toBeGreaterThan(0);
  });
  it('12 Default-Szenario gegen sich selbst → Faktor exakt 1', () => {
    const base = annualByMaterial(normalizeScenario(defaultScenario), 20, {});
    const scenA = annualByMaterial(normalizeScenario(defaultScenario), 20, {});
    for (const m of Object.keys(base)) if (base[m] > 0) expect(scenA[m] / base[m]).toBeCloseTo(1, 9);
  });
});
