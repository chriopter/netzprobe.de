// Geteilte Kosten-Hebel-Konfiguration für die Override-Funktion ("eigene
// Annahmen"). Eine Quelle der Wahrheit für: welche Slider eine Technologie hat
// (Default = Paketwert, Spanne quellennah), und wie der angezeigte Slider-Wert
// auf den echten kosten-Parameter abbildet (param + scale). Sowohl die Sidebar
// (Eingabe) als auch computeKosten (Merge) importieren von hier.

export type KostenLever = {
  key: string;        // stabiler Schlüssel (URL/State)
  label: string;
  unit: string;
  def: number;        // Default = Wert aus dem Technologie-Paket (Anzeige-Einheit)
  min: number;
  max: number;
  step: number;
  param: string;      // Feldname im kosten-Objekt der Technologie
  scale?: number;     // Param-Wert = Slider-Wert × scale (z. B. WACC %: 0.01)
  // Welches Spannen-Ende ist das »optimistische«: 'low' (Kosten, Zins, Bauzeit)
  // oder 'high' (Lebensdauer). Default 'low'.
  better?: 'low' | 'high';
};

export type CostOverrides = Record<string, Record<string, number>>;

// Globaler Optimismus-Regler (Sidebar-Karte »Kosten«): −100 (pessimistisch)
// … 0 (Paketwerte) … +100 (optimistisch). Jeder Kostenhebel wird zwischen
// seinem Paket-Default und dem quellennahen Spannen-Ende interpoliert —
// optimistisch Richtung günstig (CAPEX, WACC, Brennstoff, O&M, Bauzeit zum
// Minimum, Lebensdauer zum Maximum), pessimistisch spiegelbildlich. Symmetrisch
// über alle Technologien: der Regler bildet Rahmenbedingungen (Zinsumfeld,
// Genehmigung, Lieferketten, Betriebsdauer) ab, keine Technologiewertung.
export const OPTIMISM = { def: 0, min: -100, max: 100, step: 10 } as const;

// Dimensionen des Reglers. Der Hauptregler setzt alle vier; ein Sub-Regler
// überschreibt seine Dimension (null = folgt dem Hauptregler).
export type OptimismDim = 'zins' | 'preise' | 'bauzeit' | 'laufzeit';
export const OPTIMISM_DIMS: ReadonlyArray<{ key: OptimismDim; label: string; hint: string }> = [
  { key: 'zins', label: 'Zins (WACC)', hint: 'Finanzierungsregime: Markt-WACC ↔ abgesicherte/staatliche Finanzierung' },
  { key: 'preise', label: 'Anlagenpreise', hint: 'CAPEX, O&M und Brennstoff innerhalb der Quellen-Spannen' },
  { key: 'bauzeit', label: 'Bauzeit', hint: 'Genehmigung, Lieferketten, Serienbau ↔ Verzug' },
  { key: 'laufzeit', label: 'Lebensdauer', hint: 'Betriebsdauer bis Ersatz' },
];
export type Optimism = { main: number } & Partial<Record<OptimismDim, number | null>>;
export const OPTIMISM_DEFAULT: Optimism = { main: 0 };

export function optimismDim(lever: KostenLever): OptimismDim {
  if (lever.param === 'wacc') return 'zins';
  if (lever.param === 'constructionYears') return 'bauzeit';
  if (lever.param === 'lifetimeYears') return 'laufzeit';
  return 'preise';
}
export function effectiveOptimism(opt: Optimism, dim: OptimismDim): number {
  const v = opt[dim];
  return v == null ? opt.main : v;
}
export function isOptimismActive(opt: Optimism): boolean {
  return OPTIMISM_DIMS.some(d => effectiveOptimism(opt, d.key) !== 0);
}
// Stimmungswort statt Zahl (Badge, Bon, Sidebar).
export function optimismMood(value: number): string {
  if (value >= 80) return 'Euphorisch';
  if (value >= 40) return 'Sehr gute Laune';
  if (value > 0) return 'Gut gelaunt';
  if (value === 0) return 'Nüchtern';
  if (value > -40) return 'Leicht verstimmt';
  if (value > -80) return 'Miese Laune';
  return 'Weltuntergangsstimmung';
}
// Kurzlabel fuer Badge/Bon: Stimmungswort, wenn alle Dimensionen gleich sind, sonst »Gemischte Gefühle«.
export function optimismSummary(opt: Optimism): string {
  const vals = OPTIMISM_DIMS.map(d => effectiveOptimism(opt, d.key));
  if (vals.every(v => v === vals[0])) return optimismMood(vals[0]);
  return 'Gemischte Gefühle';
}

export function leverValueAtOptimism(lever: KostenLever, optimism: number): number {
  const t = Math.max(-1, Math.min(1, optimism / 100));
  if (t === 0) return lever.def;
  const good = lever.better === 'high' ? lever.max : lever.min;
  const bad = lever.better === 'high' ? lever.min : lever.max;
  return t > 0 ? lever.def + t * (good - lever.def) : lever.def + (-t) * (bad - lever.def);
}

// Netz: reguliertes Asset ohne eigene Hebel — Optimismus verschiebt den
// Netz-WACC (5 % → 3 % … 7 %) und den Netz-CAPEX (×0,7 … ×1,3; Spanne
// NEP-Nur-Übertragung bis Frontier/DIHK all-in, siehe Wiki »preise«).
export const NETZ_OPTIMISM = { waccLow: 0.03, waccHigh: 0.07, capexLow: 0.7, capexHigh: 1.3 } as const;
export function netzAtOptimism(baseWacc: number, opt: Optimism): { wacc: number; capexFactor: number } {
  const tz = Math.max(-1, Math.min(1, effectiveOptimism(opt, 'zins') / 100));
  const tp = Math.max(-1, Math.min(1, effectiveOptimism(opt, 'preise') / 100));
  const wacc = tz > 0 ? baseWacc + tz * (NETZ_OPTIMISM.waccLow - baseWacc) : baseWacc + (-tz) * (NETZ_OPTIMISM.waccHigh - baseWacc);
  const capexFactor = tp > 0 ? 1 + tp * (NETZ_OPTIMISM.capexLow - 1) : 1 + (-tp) * (NETZ_OPTIMISM.capexHigh - 1);
  return { wacc, capexFactor };
}

// Wirkung des Reglers je Technologie (fuer die Sidebar): Delta gegen Paket
// plus resultierender Absolutwert, z. B. »Laufzeit +9 a (54 a)«.
export type OptimismEffect = { key: string; tech: string; parts: string[] };
export const EFFECT_TECHS: ReadonlyArray<[string, string]> = [
  ['pv', 'PV'], ['windon', 'Wind onshore'], ['windoff', 'Wind offshore'], ['biomasse', 'Biomasse'], ['laufwasser', 'Laufwasser'],
  ['kernkraft', 'Kernkraft'], ['gas', 'Gas'], ['kohle', 'Kohle'], ['batterie', 'Batterie'], ['pumpspeicher', 'Pumpspeicher'], ['h2', 'Wasserstoff'],
];
export function optimismEffects(opt: Optimism): OptimismEffect[] {
  const num = (v: number, digits: number) => v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const delta = (v: number, digits: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${num(Math.abs(v), digits)}`;
  return EFFECT_TECHS.map(([tech, label]) => {
    const levers = KOSTEN_LEVERS[tech] ?? [];
    const at = (key: string) => { const l = levers.find(x => x.key === key); return l ? [l, leverValueAtOptimism(l, effectiveOptimism(opt, optimismDim(l)))] as const : null; };
    const parts: string[] = [];
    const w = at('wacc'); if (w) parts.push(`Zins ${delta(w[1] - w[0].def, 1)} pp (${num(w[1], 1)} %)`);
    const c = at('capex') ?? at('capexZubau') ?? at('capexEnergy') ?? at('capexCharge') ?? at('capexPower');
    if (c) parts.push(`CAPEX ${delta((c[1] / c[0].def - 1) * 100, 0)} % (${num(c[1], 0)} ${c[0].unit})`);
    const f = at('fuel'); if (f) parts.push(`Brennstoff ${delta((f[1] / f[0].def - 1) * 100, 0)} % (${num(f[1], 0)} ${f[0].unit})`);
    const b = at('bauzeit'); if (b) parts.push(`Bauzeit ${delta(b[1] - b[0].def, 1)} a (${num(b[1], 1)} a)`);
    const l = at('lifetime'); if (l) parts.push(`Laufzeit ${delta(l[1] - l[0].def, 0)} a (${num(l[1], 0)} a)`);
    return { key: tech, tech: label, parts };
  });
}

// Resultierende Werte einer Dimension fuer ALLE Technologien (Anzeige unter
// dem jeweiligen Sub-Regler).
export function optimismDimValues(dim: OptimismDim, value: number): Array<{ key: string; label: string; text: string }> {
  const num = (v: number, digits: number) => v.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const out: Array<{ key: string; label: string; text: string }> = [];
  for (const [tech, label] of EFFECT_TECHS) {
    const levers = KOSTEN_LEVERS[tech] ?? [];
    const pick = (keys: string[]) => { for (const k of keys) { const l = levers.find(x => x.key === k); if (l) return l; } return undefined; };
    const l = dim === 'zins' ? pick(['wacc'])
      : dim === 'bauzeit' ? pick(['bauzeit'])
      : dim === 'laufzeit' ? pick(['lifetime'])
      : pick(['capex', 'capexZubau', 'capexEnergy', 'capexCharge', 'capexPower']);
    if (!l) continue;
    const v = leverValueAtOptimism(l, value);
    const text = dim === 'zins' ? `${num(v, 1)} %` : dim === 'preise' ? `${num(v, 0)} ${l.unit}` : dim === 'bauzeit' ? `${num(v, 1)} a` : `${num(v, 0)} a`;
    out.push({ key: tech, label, text });
  }
  return out;
}

// Text-Stufen unter dem Regler.
export function optimismLabel(optimism: number): string {
  if (optimism >= 70) return 'Niedrige Zinsen, günstige Anlagen, kurze Bauzeiten, lange Laufzeiten.';
  if (optimism > 0) return 'Zinsen, Preise, Bauzeiten und Laufzeiten anteilig günstiger als heute.';
  if (optimism === 0) return 'Heutige Werte (Paket).';
  if (optimism > -70) return 'Zinsen, Preise, Bauzeiten und Laufzeiten anteilig ungünstiger als heute.';
  return 'Hohe Zinsen, teure Anlagen, lange Bauzeiten, kurze Laufzeiten.';
}

export const KOSTEN_LEVERS: Record<string, KostenLever[]> = {
  pv: [
    // PV rechnet CAPEX als Blend (Bestand 1.000 €/kW bis 102,5 GW, Zubau zum
    // Freiflaeche-Grenzwert). Der Hebel steuert den ZUBAU-Wert — der Bestand ist
    // gebaut und bleibt fix; frueher zeigte der Slider 850, ein Wert, mit dem nie
    // gerechnet wurde, und ueberschrieb beim Anfassen nur den Bestandsast.
    { key: 'capexZubau', label: 'CAPEX Zubau (Freifläche)', unit: '€/kW', def: 560, min: 350, max: 1200, step: 10, param: 'capexMarginalEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 3.5, min: 2, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 1, min: 0.5, max: 2, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 30, min: 25, max: 40, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  windon: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 1700, min: 1300, max: 2200, step: 25, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 3.9, min: 2, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'omfix', label: 'Fix-O&M', unit: '€/kW/a', def: 32, min: 20, max: 50, step: 1, param: 'omFixEurPerKWa' },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 2, min: 1.5, max: 3, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 25, min: 20, max: 30, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  windoff: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 2800, min: 2200, max: 4000, step: 50, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.0, min: 3, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'omfix', label: 'Fix-O&M', unit: '€/kW/a', def: 39, min: 25, max: 60, step: 1, param: 'omFixEurPerKWa' },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 4, min: 2, max: 8, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 25, min: 20, max: 30, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  biomasse: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 4600, min: 3000, max: 6000, step: 50, param: 'capexEurPerKW' },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh_th', def: 60, min: 40, max: 100, step: 1, param: 'fuelEurPerMWhTh' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 4.2, min: 2.5, max: 8, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 2, min: 1.5, max: 3, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 25, min: 20, max: 30, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  laufwasser: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 4000, min: 2500, max: 6000, step: 50, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 3.5, min: 2, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 6, min: 4, max: 8, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 60, min: 50, max: 80, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  kernkraft: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 8000, min: 6500, max: 12000, step: 100, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 7.8, min: 4, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh', def: 11, min: 9, max: 19, step: 0.5, param: 'fuelEurPerMWhTh' },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 7, min: 4, max: 17, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 45, min: 40, max: 60, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  gas: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 1100, min: 700, max: 1500, step: 25, param: 'capexEurPerKW' },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh_th', def: 38, min: 20, max: 80, step: 1, param: 'fuelEurPerMWhTh' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.5, min: 4, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 3, min: 2, max: 4, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 30, min: 25, max: 35, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  kohle: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 2000, min: 1500, max: 2800, step: 25, param: 'capexEurPerKW' },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh_th', def: 5, min: 2, max: 30, step: 1, param: 'fuelEurPerMWhTh' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.8, min: 4, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 4, min: 3.5, max: 6, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 35, min: 30, max: 40, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  batterie: [
    { key: 'capexEnergy', label: 'CAPEX Energie', unit: '€/kWh', def: 280, min: 120, max: 500, step: 10, param: 'capexEurPerKWh' },
    { key: 'capexPower', label: 'CAPEX Leistung', unit: '€/kW', def: 150, min: 50, max: 300, step: 10, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 5.0, min: 3, max: 8, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 1, min: 0.5, max: 1.5, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 15, min: 10, max: 20, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  pumpspeicher: [
    { key: 'capexPower', label: 'CAPEX Leistung', unit: '€/kW', def: 1140, min: 600, max: 2000, step: 20, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 4.5, min: 3, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 7, min: 4, max: 12, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 60, min: 50, max: 80, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
  h2: [
    { key: 'capexCharge', label: 'CAPEX Elektrolyse', unit: '€/kW', def: 1500, min: 800, max: 2500, step: 50, param: 'capexChargeEurPerKW' },
    { key: 'capexDischarge', label: 'CAPEX Rückverstromung', unit: '€/kW', def: 1100, min: 600, max: 1800, step: 50, param: 'capexDischargeEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.0, min: 4, max: 8, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 3, min: 2, max: 4, step: 0.5, param: 'constructionYears' },
    { key: 'lifetime', label: 'Lebensdauer', unit: 'a', def: 30, min: 20, max: 35, step: 1, param: 'lifetimeYears', better: 'high' },
  ],
};

// Erzeugungs-Slider-Feld → Technologie-Key (Sidebar bindet die Sektion pro Feld an).
export const FIELD_TO_TECH: Record<string, string> = {
  pvInstalledGW: 'pv', windOnInstalledGW: 'windon', windOffInstalledGW: 'windoff',
  biomasseInstalledGW: 'biomasse', laufwasserInstalledGW: 'laufwasser',
  kernkraftInstalledGW: 'kernkraft', gasInstalledGW: 'gas', kohleInstalledGW: 'kohle',
};

// Merge der Overrides EINER Technologie über deren Paket-Default-Kosten. Werte
// gleich dem Default werden ignoriert; ohne aktive Abweichung wird base
// unverändert (gleiche Referenz) zurückgegeben.
// Reihenfolge: expliziter Einzel-Override schlägt den Optimismus-Regler,
// dieser schlägt den Paketwert.
export function mergeTechKosten<T extends Record<string, unknown>>(tech: string, base: T, ov?: Record<string, number>, opt: Optimism = OPTIMISM_DEFAULT): T {
  const levers = KOSTEN_LEVERS[tech];
  if (!levers || (!ov && !isOptimismActive(opt))) return base;
  let out: T | null = null;
  for (const lever of levers) {
    const explicit = ov?.[lever.key];
    const o = effectiveOptimism(opt, optimismDim(lever));
    const v = explicit != null && explicit !== lever.def ? explicit : o !== 0 ? leverValueAtOptimism(lever, o) : null;
    if (v == null || v === lever.def) continue;
    if (!out) out = { ...base };
    (out as Record<string, unknown>)[lever.param] = v * (lever.scale ?? 1);
  }
  return out ?? base;
}

// Hat mindestens ein Override eine echte Abweichung vom Default?
export function hasActiveOverrides(co?: CostOverrides): boolean {
  if (!co) return false;
  for (const tech of Object.keys(co)) {
    const levers = KOSTEN_LEVERS[tech];
    if (!levers) continue;
    for (const lever of levers) {
      const v = co[tech]?.[lever.key];
      if (v != null && v !== lever.def) return true;
    }
  }
  return false;
}
