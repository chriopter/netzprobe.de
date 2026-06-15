// Standalone-Prüfung des optionalen Netzausbau-Postens über 20 Mix-Szenarien.
// Liest die echten preise-Parameter und repliziert die kosten.ts-Formel nach
// Audit AP03 (zwei Terme): Netz = capexRE × max(0, ΣEE − baseRE) × crf
//                               + capexLast × max(0, Peak − basePeak) × crf.
// Peak-Spalte: e100-EE-Szenarien ~218 GW (H₂-Pool), Voll-Direktelektrifizierung
// ~302 GW, sonst grob lastproportional (Last/466 × 75,6) — Sanity-Näherung.
// Lauf: node test/scenarios/netz-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = JSON.parse(readFileSync(join(root, 'model/referenz/preise/package.json'), 'utf8')).parameters;
const crf = (wacc, life) => wacc <= 0 ? 1 / life : wacc / (1 - Math.pow(1 + wacc, -life));

const CAPEX = P.netzCapexEurPerKwAddedRE, LIFE = P.netzLifetimeYears, BASE = P.netzBaselineReCapacityGW, WACC = P.netzWacc;
const CAPEX_LAST = P.netzCapexEurPerKwAddedPeakLoad, BASE_PEAK = P.netzBaselinePeakLoadGW;
const netzAnnual = (pv, won, woff, peak) =>
  (CAPEX * Math.max(0, pv + won + woff - BASE) + CAPEX_LAST * Math.max(0, peak - BASE_PEAK)) * 1e6 * crf(WACC, LIFE);

// [Name, PV, WindOn, WindOff, grobe Jahreslast TWh, Peak GW] — spannt 2025-Ist bis Voll-e100.
const S = [
  ['01 Status quo 2025',            102.5,  62.8,   9.4,  466,  75.6],
  ['02 Minimal status quo',         100,    60,    10,    466,  75.6],
  ['03 PV-XL Tagesbatterie',        600,    80,    20,    900,  146],
  ['04 PV-only extrem',            1200,    40,    10,   1100,  178],
  ['05 Wind-XL minimal Speicher',   150,   500,    70,    900,  146],
  ['06 Wind-only extrem',            60,   900,    70,   1100,  178],
  ['07 Mix ausgewogen T45',         400,   160,    70,   1102,  150], // O45-Strom-Anker (Peak-Verdopplung)
  ['08 ee-85-h2-15 (e100)',        860,   435,    70,   1830,  218], // aktuelles Preset-Resolve
  ['09 ee-100 (e100)',      980,   885,    70,   1830,  218], // aktuelles Preset-Resolve
  ['10 EE-Befuerworter-Traum',      500,   250,    70,   1300,  211],
  ['11 EE-Gegner-Albtraum',         120,    70,    10,    600,   97],
  ['12 EE+PSP Massivausbau',        450,   300,    70,   1200,  195],
  ['13 EE Batterie Mega',           550,   220,    60,   1100,  178],
  ['14 EE Import-Buffer',           420,   180,    70,   1150,  187],
  ['15 Kernkraft-Comeback',         110,    65,    10,    700,  114],
  ['16 Kernkraft + Vollelek',       110,    65,    10,   1830,  302], // Sektor-Strom als Flachlast → Peak 302
  ['17 Kohle-Renaissance',          100,    60,     9,    600,   97],
  ['18 Deindustrialisierung',       150,    90,    20,    380,   62],
  ['19 Maximum Import-Buffer',      300,   120,    50,   1100,  178],
  ['20 Dunkelflaute 2017-Stress',   400,   200,    70,   1102,  150],
];

console.log(`# Netzausbau-Posten — Prüfung über ${S.length} Szenarien`);
console.log(`EE ${CAPEX} €/kW (Basis ${BASE} GW) + Last ${CAPEX_LAST} €/kW (Basis ${BASE_PEAK} GW Peak) · ${LIFE} a · WACC ${(WACC*100).toFixed(0)} % · crf=${crf(WACC,LIFE).toFixed(5)}\n`);
const pad = (s, n) => String(s).padEnd(n);
const r = (s, n) => String(s).padStart(n);
console.log(pad('Szenario', 30), r('ΣEE', 6), r('Δ2025', 7), r('Netz/a', 9), r('@2045', 8), r('@2050', 8), r('€/MWh', 7));
console.log('-'.repeat(82));
// Szenarien mit ΣEE > 850 GW sind bewusste Sandbox-Extreme (Überbau weit jenseits
// jedes Studienpfads) — dort ist der lineare Adder nur Richtungssignal, nicht Absolutwert.
const EXTREME_GW = 850;
const rows = [];
for (const [name, pv, won, woff, demand, peak] of S) {
  const reGW = pv + won + woff;
  const added = Math.max(0, reGW - BASE);
  const addedPeak = Math.max(0, peak - BASE_PEAK);
  const annEE = CAPEX * added * 1e6 * crf(WACC, LIFE);
  const annLast = CAPEX_LAST * addedPeak * 1e6 * crf(WACC, LIFE);
  const ann = netzAnnual(pv, won, woff, peak);
  const t45 = ann * (2045 - 2025), t50 = ann * (2050 - 2025);
  const perMWh = ann / (demand * 1e6);
  rows.push({ name, reGW, added, addedPeak, annEE, annLast, ann, t45, t50, perMWh, extreme: reGW > EXTREME_GW });
  console.log(
    pad(name, 30),
    r(reGW.toFixed(0), 6),
    r(added.toFixed(0), 7),
    r((ann/1e9).toFixed(1)+'Md', 9),
    r((t45/1e12).toFixed(2)+'Bio', 8),
    r((t50/1e12).toFixed(2)+'Bio', 8),
    r(perMWh.toFixed(1), 7),
  );
}

// Eich- und Invarianten-Checks
console.log('\n# Checks');
const o45 = rows.find(x => x.name.startsWith('07'));
const realistic = rows.filter(x => !x.extreme);
const extremes = rows.filter(x => x.extreme);
const ok = (cond, msg) => console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`);
ok(o45.t50 >= 0.65e12 && o45.t50 <= 0.95e12, `Eichung O45-Strom @2050 = ${(o45.t50/1e12).toFixed(2)} Bio € ∈ [0,65; 0,95] (IMK-zentral, DIHK oben)`);
ok(rows.find(x => x.name.startsWith('01')).ann < 1e8, `Status-quo 2025 ≈ 0 Netz (${(rows.find(x=>x.name.startsWith('01')).ann/1e9).toFixed(2)} Md/a)`);
ok(rows.filter(x => x.added === 0 && x.addedPeak === 0).every(x => x.ann === 0), 'ΔEE=0 UND ΔPeak=0 ⇒ Netz=0');
ok(rows.filter(x => x.added === 0).every(x => x.annEE === 0), 'ΔEE=0 ⇒ EE-Term=0 (Last-Term darf bleiben — AP03)');
const sorted = [...rows].sort((a,b) => a.reGW - b.reGW);
ok(sorted.every((x,i) => i === 0 || x.annEE >= sorted[i-1].annEE - 1), 'Monotonie: mehr ΣEE ⇒ nie weniger EE-Term');
const sortedPeak = [...rows].sort((a,b) => a.addedPeak - b.addedPeak);
ok(sortedPeak.every((x,i) => i === 0 || x.annLast >= sortedPeak[i-1].annLast - 1), 'Monotonie: mehr Peak ⇒ nie weniger Last-Term');
ok(rows.every(x => x.perMWh >= 0), 'Netz-Adder nie negativ');
ok(realistic.every(x => x.perMWh < 50), `Realistische Pfade (ΣEE ≤ ${EXTREME_GW} GW): Adder < 50 €/MWh (max ${Math.max(...realistic.map(x=>x.perMWh)).toFixed(1)})`);
console.log(`INFO Sandbox-Extreme (ΣEE > ${EXTREME_GW} GW, nur Richtungssignal): ${extremes.map(x=>x.name.slice(0,2)).join(', ')} — Adder bis ${Math.max(...extremes.map(x=>x.perMWh)).toFixed(0)} €/MWh`);
