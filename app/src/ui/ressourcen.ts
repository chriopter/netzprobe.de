import type { Scenario } from '../types/scenario';
import { uiManifest } from './uiManifest';

// Pure Rechenlogik der Ressourcen-Sektion — ausgelagert für Unit-Tests.

// material-relevante e100-Sektoren: [uiManifest-Key, additionalTWh-Key]
export const E100_SECTORS: Array<[string, string]> = [
  ['pkw', 'e100-pkw'], ['lkw', 'e100-lkw'], ['heiz', 'e100-heiz'], ['ghd', 'e100-ghd'], ['bahn', 'e100-bahn'],
];

// Gruppen: Beton/Stahl/Alu = Bau-Massenmaterial; Brennstoff = Kohle/Erdgas/
// Import-H2; "Spezial" = alle uebrigen Mineralien inkl. Uran.
export const BULK = new Set(['Beton/Zement', 'Stahl', 'Aluminium']);
export const FUEL = new Set(['Kohle', 'Erdgas', 'Wasserstoff']);

// Import-H2 als Brennstoff-Massenstrom: 33,33 kWh/kg LHV → 30.000 t je TWh.
const H2_TONS_PER_TWH = 1e6 / 33.33;

// Brennstoff analytisch (Kapazitaet × realistische Volllaststunden) — fuer Basis UND
// Szenario gleich gerechnet, damit das Default-Szenario sauber 1× ergibt.
export const VLH: Record<string, number> = { kohle: 3000, gas: 1500, kernkraft: 7500 };

export type ResourceEntry = { tPerGW?: number; tPerGWh?: number; tPerTWh?: number };
export type MaterialInfo = { label: string; globalProductionTPerYear: number; germanyDemandTPerYear?: number };

export const genCaps = (s: Scenario): Array<[string, number]> => [
  ['pv', s.generation.pvInstalledGW],
  ['windon', s.generation.windOnInstalledGW],
  ['windoff', s.generation.windOffInstalledGW],
  ['biomasse', s.generation.biomasseInstalledGW],
  ['laufwasser', s.generation.laufwasserInstalledGW],
  ['kernkraft', s.generation.kernkraftInstalledGW],
  ['gas', s.generation.gasInstalledGW],
  ['kohle', s.generation.kohleInstalledGW],
];

export const storCaps = (s: Scenario): Array<[string, number, number]> => [
  ['batterie', s.storage.batteriePowerGW, s.storage.batterieEnergyGWh],
  ['pumpspeicher', s.storage.pumpspeicherPowerGW, s.storage.pumpspeicherEnergyGWh],
  ['h2', Math.max(s.storage.h2ChargePowerGW, s.storage.h2DischargePowerGW), s.storage.h2EnergyGWh],
];

// Renewal-Faktor: über lange Horizonte wird die Bau-Material-Flotte ersetzt
// (Batterie 15 a, PV 30 a, Wind 25 a …). max(1, years/lifetime) entspricht
// kontinuierlich der Zahl der Bauzyklen im Aufbauzeitraum — analog zur
// annuisierten Kostenseite (crf×horizon = bauen + ersetzen).
const renewalFactor = (years: number, lifetimeYears: number | undefined) =>
  lifetimeYears && lifetimeYears > 0 ? Math.max(1, years / lifetimeYears) : 1;

// Jaehrlicher Materialbedarf je Rohstoff (t/a): Bau-Material erneuerungs-aware
// annualisiert (Bestand × Renewal-Faktor ÷ Aufbaujahre), Brennstoff pro Jahr
// (tPerTWh × installierte GW × Volllaststunden).
export function annualByMaterial(s: Scenario, years: number, e100TWh: Record<string, number>): Record<string, number> {
  const stock: Record<string, number> = {};
  const fuel: Record<string, number> = {};
  const addS = (m: string, t: number) => { stock[m] = (stock[m] ?? 0) + t; };
  const addF = (m: string, t: number) => { fuel[m] = (fuel[m] ?? 0) + t; };
  for (const [id, gw] of genCaps(s)) {
    const pkg = (uiManifest.generation as Record<string, any>)[id];
    const res = pkg?.resources as Record<string, ResourceEntry> | undefined;
    if (!res) continue;
    const rf = renewalFactor(years, pkg?.kosten?.lifetimeYears);
    for (const m in res) {
      const e = res[m];
      if (e.tPerGW) addS(m, e.tPerGW * gw * rf);
      if (e.tPerTWh) addF(m, e.tPerTWh * gw * (VLH[id] ?? 0) / 1000);
    }
  }
  for (const [id, power, energy] of storCaps(s)) {
    const pkg = (uiManifest.storage as Record<string, any>)[id];
    const res = pkg?.resources as Record<string, ResourceEntry> | undefined;
    if (!res) continue;
    const rf = renewalFactor(years, pkg?.kosten?.lifetimeYears);
    for (const m in res) {
      const e = res[m];
      if (e.tPerGW) addS(m, e.tPerGW * power * rf);
      if (e.tPerGWh) addS(m, e.tPerGWh * energy * rf);
    }
  }
  // Importierter Wasserstoff als Brennstoff-Massenstrom (t/a). Nur der Import:
  // inlaendische Elektrolyse ist kein externer Materialfluss — ihr Strom und
  // ihre Anlagen sind bereits oben erfasst.
  const h2ImportTWh = s.import.h2TWh ?? 0;
  if (h2ImportTWh > 0) addF('Wasserstoff', h2ImportTWh * H2_TONS_PER_TWH);

  // Elektrifizierte Last: Material je TWh zusaetzlicher elektrischer Nachfrage (Bestand).
  for (const [umKey, twhKey] of E100_SECTORS) {
    const res = (uiManifest.e100 as Record<string, any>)[umKey]?.resources as Record<string, ResourceEntry> | undefined;
    const twh = e100TWh[twhKey] ?? 0;
    if (!res || twh <= 0) continue;
    for (const m in res) {
      const e = res[m];
      if (e.tPerTWh) addS(m, e.tPerTWh * twh);
    }
  }
  const out: Record<string, number> = {};
  for (const m of new Set([...Object.keys(stock), ...Object.keys(fuel)])) out[m] = (stock[m] ?? 0) / years + (fuel[m] ?? 0);
  return out;
}

export function groupSums(annual: Record<string, number>) {
  let bulk = 0, spezial = 0, brennstoff = 0;
  for (const m in annual) {
    if (FUEL.has(m)) brennstoff += annual[m];
    else if (BULK.has(m)) bulk += annual[m];
    else spezial += annual[m];
  }
  return { bulk, spezial, brennstoff };
}
