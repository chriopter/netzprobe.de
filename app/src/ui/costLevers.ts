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
};

export type CostOverrides = Record<string, Record<string, number>>;

// Globaler Kapitalkosten-Regler (Sidebar, unter dem Kostenzeitraum): verschiebt
// den realen WACC ALLER Technologien und des Netzes um n Prozentpunkte. Die
// technologiespezifischen Aufschläge (Kernkraft 7,8 % vs. PV 3,5 %) bleiben
// erhalten — der Regler bildet das Zinsumfeld ab, nicht die Risikoprämie.
export const WACC_SHIFT = { def: 0, min: -3, max: 3, step: 0.5, floorWacc: 0.005 } as const;

export function shiftWacc(wacc: number, shiftPp: number): number {
  if (!shiftPp) return wacc;
  return Math.max(WACC_SHIFT.floorWacc, wacc + shiftPp / 100);
}

export const KOSTEN_LEVERS: Record<string, KostenLever[]> = {
  pv: [
    // PV rechnet CAPEX als Blend (Bestand 1.000 €/kW bis 102,5 GW, Zubau zum
    // Freiflaeche-Grenzwert). Der Hebel steuert den ZUBAU-Wert — der Bestand ist
    // gebaut und bleibt fix; frueher zeigte der Slider 850, ein Wert, mit dem nie
    // gerechnet wurde, und ueberschrieb beim Anfassen nur den Bestandsast.
    { key: 'capexZubau', label: 'CAPEX Zubau (Freifläche)', unit: '€/kW', def: 560, min: 350, max: 1200, step: 10, param: 'capexMarginalEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 3.5, min: 2, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
  ],
  windon: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 1700, min: 1300, max: 2200, step: 25, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 3.9, min: 2, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'omfix', label: 'Fix-O&M', unit: '€/kW/a', def: 32, min: 20, max: 50, step: 1, param: 'omFixEurPerKWa' },
  ],
  windoff: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 2800, min: 2200, max: 4000, step: 50, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.0, min: 3, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'omfix', label: 'Fix-O&M', unit: '€/kW/a', def: 39, min: 25, max: 60, step: 1, param: 'omFixEurPerKWa' },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 4, min: 2, max: 8, step: 0.5, param: 'constructionYears' },
  ],
  biomasse: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 4600, min: 3000, max: 6000, step: 50, param: 'capexEurPerKW' },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh_th', def: 60, min: 40, max: 100, step: 1, param: 'fuelEurPerMWhTh' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 4.2, min: 2.5, max: 8, step: 0.1, param: 'wacc', scale: 0.01 },
  ],
  laufwasser: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 4000, min: 2500, max: 6000, step: 50, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 3.5, min: 2, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
  ],
  kernkraft: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 8000, min: 6500, max: 12000, step: 100, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 7.8, min: 4, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh', def: 11, min: 9, max: 19, step: 0.5, param: 'fuelEurPerMWhTh' },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 7, min: 4, max: 17, step: 0.5, param: 'constructionYears' },
  ],
  gas: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 1100, min: 700, max: 1500, step: 25, param: 'capexEurPerKW' },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh_th', def: 38, min: 20, max: 80, step: 1, param: 'fuelEurPerMWhTh' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.5, min: 4, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
  ],
  kohle: [
    { key: 'capex', label: 'CAPEX', unit: '€/kW', def: 2000, min: 1500, max: 2800, step: 25, param: 'capexEurPerKW' },
    { key: 'fuel', label: 'Brennstoff', unit: '€/MWh_th', def: 5, min: 2, max: 30, step: 1, param: 'fuelEurPerMWhTh' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.8, min: 4, max: 9, step: 0.1, param: 'wacc', scale: 0.01 },
  ],
  batterie: [
    { key: 'capexEnergy', label: 'CAPEX Energie', unit: '€/kWh', def: 280, min: 120, max: 500, step: 10, param: 'capexEurPerKWh' },
    { key: 'capexPower', label: 'CAPEX Leistung', unit: '€/kW', def: 150, min: 50, max: 300, step: 10, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 5.0, min: 3, max: 8, step: 0.1, param: 'wacc', scale: 0.01 },
  ],
  pumpspeicher: [
    { key: 'capexPower', label: 'CAPEX Leistung', unit: '€/kW', def: 1140, min: 600, max: 2000, step: 20, param: 'capexEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 4.5, min: 3, max: 7, step: 0.1, param: 'wacc', scale: 0.01 },
    { key: 'bauzeit', label: 'Bauzeit', unit: 'a', def: 7, min: 4, max: 12, step: 0.5, param: 'constructionYears' },
  ],
  h2: [
    { key: 'capexCharge', label: 'CAPEX Elektrolyse', unit: '€/kW', def: 1500, min: 800, max: 2500, step: 50, param: 'capexChargeEurPerKW' },
    { key: 'capexDischarge', label: 'CAPEX Rückverstromung', unit: '€/kW', def: 1100, min: 600, max: 1800, step: 50, param: 'capexDischargeEurPerKW' },
    { key: 'wacc', label: 'WACC real', unit: '%', def: 6.0, min: 4, max: 8, step: 0.1, param: 'wacc', scale: 0.01 },
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
export function mergeTechKosten<T extends Record<string, unknown>>(tech: string, base: T, ov?: Record<string, number>): T {
  if (!ov) return base;
  const levers = KOSTEN_LEVERS[tech];
  if (!levers) return base;
  let out: T | null = null;
  for (const lever of levers) {
    const v = ov[lever.key];
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
