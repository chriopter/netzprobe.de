#!/usr/bin/env node
// Online-vs-Local Parity-Report.
//
// Faehrt 20 Parameter-Konstellationen gegen
//   - lokale Rust-API auf http://localhost:8080/api/simulate
//   - live netzprobe.de (TS-Worker, KPIs aus DOM gescraped per Headless-Chromium)
// und gibt einen Differenz-Report aus.
//
// Bewusst NICHT failing: der Exit-Code ist immer 0. Der Report ist fuer das
// pruefende LLM gedacht — wenn Modellaenderungen vorgenommen wurden, sind
// kleine Differenzen erwartbar; ein Mensch oder LLM kann beurteilen, ob die
// Differenzen plausibel sind.
//
// Voraussetzungen:
//   - Lokaler Rust-API-Server laeuft auf :8080 (z. B. `bin/api`)
//   - Internet-Zugriff auf netzprobe.de
//   - Chromium oder Headless-Shell verfuegbar (System-/Playwright-Cache)
//
// Bei fehlenden Voraussetzungen gibt der Test eine WARNUNG aus und beendet
// trotzdem mit 0. Aufruf: `node test/parity/online-vs-local.mjs`

import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');

const LOCAL_API = process.env.NETZPROBE_LOCAL_API ?? 'http://localhost:8080/api/simulate';
const ONLINE_URL = process.env.NETZPROBE_ONLINE_URL ?? 'https://netzprobe.de/';

function warn(message) {
  console.error(`\n⚠  ${message}\n`);
}

async function localReachable() {
  const url = LOCAL_API.replace('/simulate', '/health');
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function onlineReachable() {
  try {
    const res = await fetch(ONLINE_URL, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

function findChromium() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    `${process.env.HOME}/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`,
    `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell`,
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  for (const path of candidates) {
    if (path && existsSync(path)) return path;
  }
  return null;
}

if (!(await localReachable())) {
  warn(`Lokale API nicht erreichbar (${LOCAL_API.replace('/simulate', '/health')}). Bitte vorher \`bin/api\` starten.`);
  console.log('Parity-Report uebersprungen.');
  process.exit(0);
}

if (!(await onlineReachable())) {
  warn(`netzprobe.de nicht erreichbar (${ONLINE_URL}). Internet-Zugriff fehlt.`);
  console.log('Parity-Report uebersprungen.');
  process.exit(0);
}

const chromiumPath = findChromium();
if (!chromiumPath) {
  warn('Kein Chromium-/Headless-Shell-Binary gefunden. Setze CHROMIUM_PATH oder installiere via `npx playwright install chromium`.');
  console.log('Parity-Report uebersprungen.');
  process.exit(0);
}

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch (err) {
  warn(`playwright-core nicht installiert: ${err.message}`);
  console.log('Parity-Report uebersprungen.');
  process.exit(0);
}

// Baseline direkt aus den package.json-Defaults bauen — vermeidet Vite-Magic
// (import.meta.glob), damit der Test in reinem Node laeuft.
import { readFileSync } from 'node:fs';

function pkgParams(id) {
  // id → relativer Pfad. Spezialfaelle: `pv` liegt unter erzeugung/pv,
  // `e100-pkw` unter last/e100-pkw, `strom-handel` unter aussenhandel/strom-handel.
  const map = {
    pv: 'erzeugung/pv', windon: 'erzeugung/windon', windoff: 'erzeugung/windoff',
    kernkraft: 'erzeugung/kernkraft', biomasse: 'erzeugung/biomasse',
    laufwasser: 'erzeugung/laufwasser', gas: 'erzeugung/gas', kohle: 'erzeugung/kohle',
    batterie: 'speicher/batterie', pumpspeicher: 'speicher/pumpspeicher', h2: 'speicher/h2',
    'strom-handel': 'aussenhandel/strom-handel', 'h2-handel': 'aussenhandel/h2-handel',
    'e100-pkw': 'last/e100-pkw', 'e100-heiz': 'last/e100-heiz', 'e100-lkw': 'last/e100-lkw',
    'e100-bahn': 'last/e100-bahn', 'e100-schiff': 'last/e100-schiff', 'e100-flug': 'last/e100-flug',
    'e100-ghd': 'last/e100-ghd', 'e100-industrie-waerme': 'last/e100-industrie-waerme',
    'e100-stahl': 'last/e100-stahl', 'e100-chemie': 'last/e100-chemie',
  };
  const path = resolve(repoRoot, 'model', map[id], 'package.json');
  return JSON.parse(readFileSync(path, 'utf8')).parameters;
}

const stromHandel = pkgParams('strom-handel');
const h2Handel = pkgParams('h2-handel');

const base = {
  supplyPreset: 'custom',
  loadYear: 2025,
  demand: {
    'last-2025': true,
    'e100-pkw': false, 'e100-pkw-million-km': pkgParams('e100-pkw').defaultTargetMillionKm,
    'e100-heiz': false, 'e100-heiz-target-heat-twh': pkgParams('e100-heiz').defaultTargetHeatTWh,
    'e100-lkw': false, 'e100-lkw-target-bn-km': pkgParams('e100-lkw').defaultTargetBnKm,
    'e100-bahn': false, 'e100-bahn-target-twh': pkgParams('e100-bahn').defaultTargetTWh,
    'e100-schiff': false, 'e100-schiff-target-twh': pkgParams('e100-schiff').defaultTargetTWh,
    'e100-flug': false, 'e100-flug-target-twh': pkgParams('e100-flug').defaultTargetTWh,
    'e100-ghd': false, 'e100-ghd-target-heat-twh': pkgParams('e100-ghd').defaultTargetHeatTWh,
    'e100-industrie-waerme': false, 'e100-industrie-waerme-target-heat-twh': pkgParams('e100-industrie-waerme').defaultTargetHeatTWh,
    'e100-stahl': false, 'e100-stahl-target-mio-ton': pkgParams('e100-stahl').defaultTargetMioTon,
    'e100-chemie': false, 'e100-chemie-target-twh': pkgParams('e100-chemie').defaultTargetTotalTWh,
  },
  generation: {
    pvInstalledGW: pkgParams('pv').defaultInstalledGW,
    windOnInstalledGW: pkgParams('windon').defaultInstalledGW,
    windOffInstalledGW: pkgParams('windoff').defaultInstalledGW,
    kernkraftInstalledGW: pkgParams('kernkraft').defaultInstalledGW,
    biomasseInstalledGW: pkgParams('biomasse').defaultInstalledGW,
    laufwasserInstalledGW: pkgParams('laufwasser').defaultInstalledGW,
    gasInstalledGW: pkgParams('gas').defaultInstalledGW,
    kohleInstalledGW: pkgParams('kohle').defaultInstalledGW,
    // Defaults der CapacityFactorMultiplier liegen in scenarioPresets.ts —
    // hardcoded weil nicht in package.json (Offshore-Korrektur fuer 4000+ VLH).
    pvCapacityFactorMultiplier: 1.0,
    windOnCapacityFactorMultiplier: 1.0,
    windOffCapacityFactorMultiplier: 1.8,
  },
  storage: {
    batteriePowerGW: pkgParams('batterie').defaultPowerGW,
    batterieEnergyGWh: pkgParams('batterie').defaultEnergyGWh,
    pumpspeicherPowerGW: pkgParams('pumpspeicher').defaultPowerGW,
    pumpspeicherEnergyGWh: pkgParams('pumpspeicher').defaultEnergyGWh,
    h2ChargePowerGW: pkgParams('h2').defaultChargePowerGW,
    h2DischargePowerGW: pkgParams('h2').defaultDischargePowerGW,
    h2EnergyGWh: pkgParams('h2').defaultEnergyGWh,
  },
  import: {
    stromGW: stromHandel.import.defaultMaxGW,
    stromEmissionGperKWh: stromHandel.import.emissionGperKWh,
    h2TWh: h2Handel.import.defaultTWh,
  },
  export: {
    stromGW: stromHandel.export.defaultMaxGW,
  },
};

const variants = [
  { name: 'A baseline (historisch 2025)',  patch: {} },
  { name: 'B PV-XL 400 GW',                patch: { generation: { pvInstalledGW: 400 } } },
  { name: 'C PV-XXL 600 GW',               patch: { generation: { pvInstalledGW: 600 } } },
  { name: 'D WindOn-XL 200 GW',            patch: { generation: { windOnInstalledGW: 200 } } },
  { name: 'E WindOff-XL 70 GW',            patch: { generation: { windOffInstalledGW: 70 } } },
  { name: 'F EE-Vollausbau T45',           patch: { generation: { pvInstalledGW: 400, windOnInstalledGW: 160, windOffInstalledGW: 70 } } },
  { name: 'G Kernkraft 20 GW',             patch: { generation: { kernkraftInstalledGW: 20 } } },
  { name: 'H Kohle-Renaissance',           patch: { generation: { kohleInstalledGW: 30, gasInstalledGW: 40 } } },
  { name: 'I Gas-only Backup',             patch: { generation: { gasInstalledGW: 60, kohleInstalledGW: 0 } } },
  { name: 'J Batterie-Mega 100/400',       patch: { storage: { batteriePowerGW: 100, batterieEnergyGWh: 400 } } },
  { name: 'K H2-Saisonal 50/20000',        patch: { storage: { h2ChargePowerGW: 50, h2DischargePowerGW: 30, h2EnergyGWh: 20000 } } },
  { name: 'L PSP-Massiv 30/300',           patch: { storage: { pumpspeicherPowerGW: 30, pumpspeicherEnergyGWh: 300 } } },
  { name: 'M Speicher Null',               patch: { storage: { batteriePowerGW: 0, batterieEnergyGWh: 0, pumpspeicherPowerGW: 0, pumpspeicherEnergyGWh: 0, h2ChargePowerGW: 0, h2DischargePowerGW: 0, h2EnergyGWh: 0 } } },
  { name: 'N Import-Heavy 40 GW',          patch: { import: { stromGW: 40 } } },
  { name: 'O Autark 0 Import/Exp',         patch: { import: { stromGW: 0 }, export: { stromGW: 0 } } },
  { name: 'P E-Mobilitaet (Pkw+Lkw+Bahn)', patch: { demand: { 'e100-pkw': true, 'e100-lkw': true, 'e100-bahn': true } } },
  { name: 'Q Waerme (Heiz+GHD+IndWaerme)', patch: { demand: { 'e100-heiz': true, 'e100-ghd': true, 'e100-industrie-waerme': true } } },
  { name: 'R Vollelektrifizierung 100%',   patch: { demand: { 'e100-pkw': true, 'e100-heiz': true, 'e100-lkw': true, 'e100-bahn': true, 'e100-schiff': true, 'e100-flug': true, 'e100-ghd': true, 'e100-industrie-waerme': true, 'e100-stahl': true, 'e100-chemie': true } } },
  { name: 'S 100%EE-Vollelek + XL-Speicher', patch: {
      generation: { pvInstalledGW: 400, windOnInstalledGW: 160, windOffInstalledGW: 70, gasInstalledGW: 0, kohleInstalledGW: 0 },
      storage: { batteriePowerGW: 100, batterieEnergyGWh: 400, h2ChargePowerGW: 50, h2DischargePowerGW: 30, h2EnergyGWh: 20000 },
      demand: { 'e100-pkw': true, 'e100-heiz': true, 'e100-lkw': true, 'e100-bahn': true, 'e100-ghd': true, 'e100-industrie-waerme': true, 'e100-stahl': true, 'e100-chemie': true },
  }},
  { name: 'T Kohle+Gas Phase-Out',         patch: { generation: { gasInstalledGW: 0, kohleInstalledGW: 0 } } },
];

function merge(base, patch) {
  return {
    ...base,
    ...patch,
    demand: { ...base.demand, ...(patch.demand ?? {}) },
    generation: { ...base.generation, ...(patch.generation ?? {}) },
    storage: { ...base.storage, ...(patch.storage ?? {}) },
    import: { ...base.import, ...(patch.import ?? {}) },
    export: { ...base.export, ...(patch.export ?? {}) },
  };
}

// URL-Kodierung fuer die deployte Live-Site (siehe Bundle: EF/uF/dF/fF/pF/mF).
const GEN_MAP = [
  ['pvGW', 'pvInstalledGW'], ['windOnGW', 'windOnInstalledGW'], ['windOffGW', 'windOffInstalledGW'],
  ['kernGW', 'kernkraftInstalledGW'], ['bioGW', 'biomasseInstalledGW'], ['hydroGW', 'laufwasserInstalledGW'],
  ['gasGW', 'gasInstalledGW'], ['kohleGW', 'kohleInstalledGW'],
];
const STO_MAP = [
  ['battP', 'batteriePowerGW'], ['battE', 'batterieEnergyGWh'],
  ['psP', 'pumpspeicherPowerGW'], ['psE', 'pumpspeicherEnergyGWh'],
  ['h2cP', 'h2ChargePowerGW'], ['h2dP', 'h2DischargePowerGW'], ['h2E', 'h2EnergyGWh'],
];
const IMP_MAP = [['impGW', 'stromGW'], ['impEmis', 'stromEmissionGperKWh'], ['h2ImpTWh', 'h2TWh']];
const EXP_MAP = [['expGW', 'stromGW']];
const DEMAND_KEYS = ['e100-pkw', 'e100-heiz', 'e100-lkw', 'e100-bahn', 'e100-schiff', 'e100-flug', 'e100-ghd', 'e100-industrie-waerme', 'e100-stahl', 'e100-chemie'];

function liveUrl(scenario) {
  const params = new URLSearchParams();
  params.set('sp', scenario.supplyPreset);
  const enabled = DEMAND_KEYS.filter(k => scenario.demand[k]);
  if (enabled.length === DEMAND_KEYS.length) params.set('e', 'e100');
  else if (enabled.length) params.set('e', enabled.join('.'));
  for (const [k, v] of GEN_MAP) params.set(k, String(scenario.generation[v]));
  for (const [k, v] of STO_MAP) params.set(k, String(scenario.storage[v]));
  for (const [k, v] of IMP_MAP) params.set(k, String(scenario.import[v]));
  for (const [k, v] of EXP_MAP) params.set(k, String(scenario.export[v]));
  return `${ONLINE_URL}?${params.toString()}`;
}

function parseNum(s) {
  if (s == null) return null;
  const m = s.match(/-?\d{1,3}(\.\d{3})*(,\d+)?/);
  if (!m) return null;
  return Number(m[0].replace(/\./g, '').replace(',', '.'));
}

const KPI_LABELS = ['Jahreslast', 'EE-Anteil', 'Import', 'Fehlend', 'Abregelung', 'CO‒2-Intensität', 'CO‒2 Jahr', 'Export', 'Peak-Last', 'Stunden Fehlend'];
const KPI_TO_SUMMARY = {
  'Jahreslast': 'totalDemandTWh',
  'EE-Anteil': 'renewableSharePct',
  'Import': 'importTWh',
  'Fehlend': 'loadSheddingTWh',
  'Abregelung': 'curtailmentTWh',
  'CO‒2-Intensität': 'co2GperKWh',
  'CO‒2 Jahr': 'co2MtPerYear',
  'Export': 'exportTWh',
  'Peak-Last': 'peakLoadGW',
  'Stunden Fehlend': 'hoursWithLoadShedding',
};

async function readLiveKpis(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction((labels) =>
    Array.from(document.querySelectorAll('span')).some(s => s.textContent && labels.includes(s.textContent.trim())),
    KPI_LABELS, { timeout: 30000 }
  );
  await page.waitForTimeout(2500);
  return page.evaluate((labels) => {
    const out = {};
    for (const label of labels) {
      const elems = Array.from(document.querySelectorAll('span'));
      const labelEl = elems.find(s => s.textContent?.trim() === label);
      if (!labelEl) { out[label] = null; continue; }
      const sib = labelEl.parentElement?.querySelectorAll('span')[1];
      out[label] = sib?.textContent?.trim() ?? null;
    }
    return out;
  }, KPI_LABELS);
}

async function runLocal(scenario) {
  const res = await fetch(LOCAL_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error(`local ${res.status}: ${await res.text()}`);
  return (await res.json()).summary;
}

// Die Live-Werte sind aus dem DOM gescraped und damit nach UI-Formatierung
// gerundet (siehe app/src/ui/format.ts: Intl.NumberFormat 'de-DE',
// maximumFractionDigits 0 oder 1). Damit der Vergleich ehrlich ist,
// quantisieren wir die local-Werte mit derselben Formatierung — keine
// Toleranzen, sondern beidseitig identische Rundung.
const FMT_0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
const FMT_1 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
const KPI_FORMATTER = {
  totalDemandTWh: FMT_1,        // twh()
  renewableSharePct: FMT_1,     // pct()
  importTWh: FMT_1,             // twh()
  exportTWh: FMT_1,             // twh()
  curtailmentTWh: FMT_1,        // twh()
  loadSheddingTWh: FMT_1,       // twh()
  co2MtPerYear: FMT_1,          // fmt
  hoursWithLoadShedding: FMT_0, // fmt0
  co2GperKWh: FMT_0,            // fmt0
  peakLoadGW: FMT_0,            // fmt0
};
const cmpKeys = Object.keys(KPI_FORMATTER);

// Wendet die UI-Formatierung an und parst zurueck zu Number, damit der
// quantisierte Wert direkt mit dem aus dem DOM gescrapten Live-Wert
// verglichen werden kann.
function quantize(value, fmt) {
  return Number(fmt.format(value).replace(/\./g, '').replace(',', '.'));
}

const verbose = process.argv.includes('--verbose');
const log = (...args) => console.log(...args);
const vlog = (...args) => { if (verbose) console.log(...args); };

vlog(`\n┌─ Parity Online (netzprobe.de) vs Local (${LOCAL_API}) ─┐\n`);

const browser = await chromium.launch({ executablePath: chromiumPath, headless: true });
const ctx = await browser.newContext();
await ctx.route('**/static.cloudflareinsights.com/**', r => r.abort());
const page = await ctx.newPage();

const results = [];
for (const v of variants) {
  const scenario = merge(base, v.patch);
  let local = null, live = null, err = null;
  try { local = await runLocal(scenario); } catch (e) { err = `local: ${e.message}`; }
  try {
    const dom = await readLiveKpis(page, liveUrl(scenario));
    live = {};
    for (const [label, key] of Object.entries(KPI_TO_SUMMARY)) live[key] = parseNum(dom[label]);
  } catch (e) { err = (err ? err + '; ' : '') + `live: ${e.message}`; }
  results.push({ name: v.name, local, live, err });
  vlog(`  ${err ? '✗' : '✓'} ${v.name}`);
}
await browser.close();

// Vergleiche local (UI-gerundet) gegen live (DOM-gescraped, schon gerundet).
const numericRows = results.filter(r => r.local && r.live);
const errored = results.filter(r => r.err);
const realDiffs = numericRows.flatMap(r => {
  const i = results.indexOf(r) + 1;
  return cmpKeys.flatMap(k => {
    const rv = r.local[k], lv = r.live[k];
    if (rv == null || lv == null) return [];
    const localQuantized = quantize(rv, KPI_FORMATTER[k]);
    if (localQuantized === lv) return [];
    return [{ idx: i, name: r.name, key: k, local: rv, localQuantized, live: lv, delta: lv - localQuantized }];
  });
});

if (errored.length) {
  log(`Parity-Report: ${errored.length}/${results.length} Varianten mit Fehler`);
  for (const r of errored) log(`  ✗ ${r.name}: ${r.err}`);
}

if (realDiffs.length === 0) {
  log(`Parity-Report: ${numericRows.length}/${results.length} Varianten OK (KPIs nach UI-Rundung identisch)`);
} else {
  log(`Parity-Report: ${realDiffs.length} echte Differenzen (lokal UI-gerundet ≠ live):`);
  for (const d of realDiffs.slice(0, 40)) {
    const pct = d.localQuantized === 0 ? '—' : `${(d.delta / d.localQuantized * 100).toFixed(2)}%`.padStart(8);
    log(`  #${String(d.idx).padStart(2)} ${d.name.padEnd(36)} ${d.key.padEnd(22)} local=${String(d.localQuantized).padStart(10)} live=${String(d.live).padStart(10)} Δ=${d.delta.toFixed(3).padStart(8)} ${pct}`);
  }
  if (realDiffs.length > 40) log(`  … ${realDiffs.length - 40} weitere`);
  log('Bewertung dem pruefenden LLM ueberlassen — Modellaenderungen koennen erwartbare Differenzen erzeugen.');
}

process.exit(0);
