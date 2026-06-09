// Standalone-Prüfung des optionalen Netzausbau-Postens über 20 Mix-Szenarien.
// Liest die echten preise-Parameter und repliziert die kosten.ts-Formel
// (Netz = capex × max(0, PV+WindOn+WindOff − base) × crf(wacc, life)).
// Lauf: node test/scenarios/netz-check.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = JSON.parse(readFileSync(join(root, 'model/referenz/preise/package.json'), 'utf8')).parameters;
const crf = (wacc, life) => wacc <= 0 ? 1 / life : wacc / (1 - Math.pow(1 + wacc, -life));

const CAPEX = P.netzCapexEurPerKwAddedRE, LIFE = P.netzLifetimeYears, BASE = P.netzBaselineReCapacityGW, WACC = P.wacc;
const netzAnnual = (pv, won, woff) => CAPEX * Math.max(0, pv + won + woff - BASE) * 1e6 * crf(WACC, LIFE);

// [Name, PV, WindOn, WindOff, grobe Jahreslast TWh] — spannt 2025-Ist bis Voll-e100.
const S = [
  ['01 Status quo 2025',            102.5,  62.8,   9.4,  466],
  ['02 Minimal status quo',         100,    60,    10,    466],
  ['03 PV-XL Tagesbatterie',        600,    80,    20,    900],
  ['04 PV-only extrem',            1200,    40,    10,   1100],
  ['05 Wind-XL minimal Speicher',   150,   500,    70,    900],
  ['06 Wind-only extrem',            60,   900,    70,   1100],
  ['07 Mix ausgewogen T45',         400,   160,    70,   1102], // O45-Strom-Anker
  ['08 100ee-import (e100)',        640,   730,    70,   1830],
  ['09 100ee-noimport (e100)',     1050,   500,    70,   1830],
  ['10 EE-Befuerworter-Traum',      500,   250,    70,   1300],
  ['11 EE-Gegner-Albtraum',         120,    70,    10,    600],
  ['12 EE+PSP Massivausbau',        450,   300,    70,   1200],
  ['13 EE Batterie Mega',           550,   220,    60,   1100],
  ['14 EE Import-Buffer',           420,   180,    70,   1150],
  ['15 Kernkraft-Comeback',         110,    65,    10,    700],
  ['16 Kernkraft + Vollelek',       110,    65,    10,   1830],
  ['17 Kohle-Renaissance',          100,    60,     9,    600],
  ['18 Deindustrialisierung',       150,    90,    20,    380],
  ['19 Maximum Import-Buffer',      300,   120,    50,   1100],
  ['20 Dunkelflaute 2017-Stress',   400,   200,    70,   1102],
];

console.log(`# Netzausbau-Posten — Prüfung über ${S.length} Szenarien`);
console.log(`Faktor ${CAPEX} €/kW · Lebensdauer ${LIFE} a · Basis ${BASE} GW · WACC ${(WACC*100).toFixed(0)} % · crf=${crf(WACC,LIFE).toFixed(5)}\n`);
const pad = (s, n) => String(s).padEnd(n);
const r = (s, n) => String(s).padStart(n);
console.log(pad('Szenario', 30), r('ΣEE', 6), r('Δ2025', 7), r('Netz/a', 9), r('@2045', 8), r('@2050', 8), r('€/MWh', 7));
console.log('-'.repeat(82));
// Szenarien mit ΣEE > 850 GW sind bewusste Sandbox-Extreme (Überbau weit jenseits
// jedes Studienpfads) — dort ist der lineare Adder nur Richtungssignal, nicht Absolutwert.
const EXTREME_GW = 850;
const rows = [];
for (const [name, pv, won, woff, demand] of S) {
  const reGW = pv + won + woff;
  const added = Math.max(0, reGW - BASE);
  const ann = netzAnnual(pv, won, woff);
  const t45 = ann * (2045 - 2025), t50 = ann * (2050 - 2025);
  const perMWh = ann / (demand * 1e6);
  rows.push({ name, reGW, added, ann, t45, t50, perMWh, extreme: reGW > EXTREME_GW });
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
ok(rows.filter(x => x.added === 0).every(x => x.ann === 0), 'Δ=0 ⇒ Netz=0');
const sorted = [...rows].sort((a,b) => a.reGW - b.reGW);
ok(sorted.every((x,i) => i === 0 || x.ann >= sorted[i-1].ann - 1), 'Monotonie: mehr ΣEE ⇒ nie weniger Netz');
ok(rows.every(x => x.perMWh >= 0), 'Netz-Adder nie negativ');
ok(realistic.every(x => x.perMWh < 50), `Realistische Pfade (ΣEE ≤ ${EXTREME_GW} GW): Adder < 50 €/MWh (max ${Math.max(...realistic.map(x=>x.perMWh)).toFixed(1)})`);
console.log(`INFO Sandbox-Extreme (ΣEE > ${EXTREME_GW} GW, nur Richtungssignal): ${extremes.map(x=>x.name.slice(0,2)).join(', ')} — Adder bis ${Math.max(...extremes.map(x=>x.perMWh)).toFixed(0)} €/MWh`);
