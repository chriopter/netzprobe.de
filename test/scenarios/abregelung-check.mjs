// Kupferplatten-Abregelung vs. Realität 2025 (SMARD/BNetzA + Montel).
//
// Realer Anker: 2025 wurden 9,4 TWh Wind+PV netzbedingt abgeregelt (SMARD
// Netzengpassmanagement) plus ~1,75 TWh marktlich bei Negativpreisen (Montel/
// pv-magazine) — zusammen ~5 % der Wind+PV-Erzeugung von ~201 TWh. Redispatch
// kostete ~3,1 Mrd EUR (davon 433 Mio EUR Abregelungs-Entschädigung).
//
// Erwartung an die Kupferplatte: mit 2025-Kapazitäten entsteht auf Bundesebene
// nie EE > Last + Export-Cap, also exakt 0 TWh Bilanz-Abregelung. Das ist die
// dokumentierte Modellgrenze (kern, pv, windon, windoff Wiki-Texte): jede vom
// Modell gezeigte Abregelung bei höherem Ausbau kommt ZUSÄTZLICH zu den real
// existierenden Netzengpass-Verlusten.
//
// Voraussetzung: lokale API läuft (bin/api). Lauf: node test/scenarios/abregelung-check.mjs
const API = process.env.NETZPROBE_LOCAL_API ?? 'http://localhost:8080';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkgParams = (p) => JSON.parse(readFileSync(join(root, 'model', p, 'package.json'), 'utf8')).parameters;

const h2025 = pkgParams('erzeugung/historisch-2025');
const stromHandel = pkgParams('aussenhandel/strom-handel');
const e = (id, key, val) => ({ [`e100-${id}`]: false, [`e100-${id}-${key}`]: val });
const scenario = {
  id: 'abregelung-check', name: 'abregelung-check', description: '', supplyPreset: 'custom', loadYear: 2025,
  demand: {
    'last-2025': true,
    ...e('pkw', 'million-km', pkgParams('last/e100-pkw').defaultTargetMillionKm),
    ...e('heiz', 'target-heat-twh', pkgParams('last/e100-heiz').defaultTargetHeatTWh),
    ...e('lkw', 'target-bn-km', pkgParams('last/e100-lkw').defaultTargetBnKm),
    ...e('bahn', 'target-twh', pkgParams('last/e100-bahn').defaultTargetTWh),
    ...e('schiff', 'target-twh', pkgParams('last/e100-schiff').defaultTargetTWh),
    ...e('flug', 'target-twh', pkgParams('last/e100-flug').defaultTargetTWh),
    ...e('ghd', 'target-heat-twh', pkgParams('last/e100-ghd').defaultTargetHeatTWh),
    ...e('industrie-waerme', 'target-heat-twh', pkgParams('last/e100-industrie-waerme').defaultTargetHeatTWh),
    ...e('stahl', 'target-mio-ton', pkgParams('last/e100-stahl').defaultTargetMioTon),
    ...e('chemie', 'target-twh', pkgParams('last/e100-chemie').defaultTargetTotalTWh),
  },
  generation: {
    pvInstalledGW: h2025.pvInstalledGW, windOnInstalledGW: h2025.windOnInstalledGW, windOffInstalledGW: h2025.windOffInstalledGW,
    kernkraftInstalledGW: h2025.kernkraftInstalledGW, biomasseInstalledGW: h2025.biomasseInstalledGW, laufwasserInstalledGW: h2025.laufwasserInstalledGW,
    gasInstalledGW: h2025.gasInstalledGW, kohleInstalledGW: h2025.kohleInstalledGW,
    pvCapacityFactorMultiplier: 1.0, windOnCapacityFactorMultiplier: 1.0, windOffCapacityFactorMultiplier: 1.8,
  },
  storage: {
    batteriePowerGW: h2025.batteriePowerGW, batterieEnergyGWh: h2025.batterieEnergyGWh,
    pumpspeicherPowerGW: h2025.pumpspeicherPowerGW, pumpspeicherEnergyGWh: h2025.pumpspeicherEnergyGWh,
    h2ChargePowerGW: h2025.h2ChargePowerGW, h2DischargePowerGW: h2025.h2DischargePowerGW, h2EnergyGWh: h2025.h2EnergyGWh,
  },
  import: { stromGW: h2025.importStromGW, stromEmissionGperKWh: stromHandel.import.emissionGperKWh, h2TWh: h2025.importH2TWh },
  export: { stromGW: h2025.exportStromGW },
};

const res = await fetch(`${API}/api/simulate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ scenario }) });
if (!res.ok) { console.error(`API-Fehler ${res.status} — läuft bin/api?`); process.exit(1); }
const sim = await res.json();

let pvCur = 0, wCur = 0, pvGen = 0, wGen = 0;
const byMonth = {};
for (const h of sim.hours) {
  const m = h.time.slice(5, 7);
  byMonth[m] ??= { pv: 0, wind: 0 };
  byMonth[m].pv += h.pvCurtailedGW / 1000;
  byMonth[m].wind += (h.windOnCurtailedGW + h.windOffCurtailedGW) / 1000;
  pvCur += h.pvCurtailedGW / 1000;
  wCur += (h.windOnCurtailedGW + h.windOffCurtailedGW) / 1000;
  pvGen += h.pvGW / 1000;
  wGen += (h.windOnGW + h.windOffGW) / 1000;
}

const REAL = { netzTWh: 9.4, marktTWh: 1.75, windPvTWh: 201, redispatchMrd: 3.071, abregelungMio: 433 };
console.log('# Abregelung: Kupferplatte (historisch-2025) vs. Realität 2025\n');
console.log(`Modell:  Abregelung ${sim.summary.curtailmentTWh.toFixed(2)} TWh (PV ${pvCur.toFixed(2)}, Wind ${wCur.toFixed(2)}) · Wind+PV eingespeist ${(pvGen + wGen).toFixed(0)} TWh`);
console.log(`Real:    ${REAL.netzTWh} TWh netzbedingt (SMARD) + ${REAL.marktTWh} TWh marktlich (Montel) = ${(REAL.netzTWh + REAL.marktTWh).toFixed(1)} TWh ≈ ${((REAL.netzTWh + REAL.marktTWh) / REAL.windPvTWh * 100).toFixed(1)} % von ${REAL.windPvTWh} TWh Wind+PV`);
console.log(`Kosten:  Redispatch real ~${REAL.redispatchMrd.toFixed(1)} Mrd EUR/a (davon ${REAL.abregelungMio} Mio EUR Abregelung) · Modell 0 EUR\n`);

console.log('# Selbst-Checks');
const ok = (cond, msg) => console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`);
ok(sim.hours.length >= 8760, `volle Stundenauflösung (${sim.hours.length})`);
// Die dokumentierte Modellgrenze: Kupferplatte zeigt mit 2025-Kapazitäten ~0 Abregelung.
// Steigt dieser Wert durch Modelländerungen deutlich, müssen die Wiki-Texte
// (kern, pv, windon, windoff: »0 TWh«) nachgezogen werden.
ok(sim.summary.curtailmentTWh < 0.5, `Bilanz-Abregelung ≈ 0 TWh wie im Wiki dokumentiert (${sim.summary.curtailmentTWh.toFixed(2)})`);
ok(Math.abs((pvGen + wGen) - REAL.windPvTWh) / REAL.windPvTWh < 0.15, `Wind+PV-Einspeisung ±15 % an Realität (${(pvGen + wGen).toFixed(0)} vs. ${REAL.windPvTWh} TWh)`);

console.log('\n# Einordnung');
console.log('Bei 2025-Kapazitäten ist 100 % der realen Abregelung netz-/marktgetrieben, 0 % bilanzgetrieben.');
console.log('Simulierte Abregelung bei höherem EE-Ausbau kommt also ZUSÄTZLICH zu ~5 % Netzengpass-Verlusten.');
