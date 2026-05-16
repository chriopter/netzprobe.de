#!/usr/bin/env node
/**
 * Szenario-Test-Runner.
 *
 * Liest alle *.md Dateien im scenarios/-Ordner, extrahiert den JSON-Block
 * unter `## Szenario-Definition` als Partial-Scenario, mergt mit Defaults,
 * läuft die Simulation und vergleicht mit "## Erwartete Ergebnisse".
 *
 * Aufruf:
 *   node test/scenarios/run.mjs          # alle
 *   node test/scenarios/run.mjs 03-      # nur Datei beginnend mit 03-
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(here, '..', '..');

// Dynamic ESM-Loader für TS-Quellen via tsx
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS ?? '') + ' --import tsx';

const filter = process.argv[2] ?? '';
const files = readdirSync(here)
  .filter(f => f.endsWith('.md') && f !== 'README.md')
  .filter(f => !filter || f.startsWith(filter))
  .sort();

if (!files.length) {
  console.error(`Keine Szenarien gefunden (Filter: ${filter || '*'})`);
  process.exit(1);
}

// Engine-Imports via dynamic import von TS-Modul-URL
const engineUrl = pathToFileURL(resolve(rootDir, 'src/simulation/engine.ts')).href;
const presetsUrl = pathToFileURL(resolve(rootDir, 'src/ui/scenarioPresets.ts')).href;
const { runSimulation } = await import(engineUrl);
const { defaultScenario, normalizeScenario } = await import(presetsUrl);

// Daten laden — gleiche Pipeline wie engineFullYear.test.ts
function readJson(pkg) {
  return JSON.parse(readFileSync(join(rootDir, 'data', pkg, 'data.json'), 'utf8'));
}

const loadData = readJson('last/2025');
const generationData = readJson('erzeugung/2025');
const factorData = readJson('erzeugung/einspeisefaktoren-2025');
const e100Pkw = readJson('last/e100-pkw');
const e100Heiz = readJson('last/e100-heiz');
const e100Lkw = readJson('last/e100-lkw');
const e100Bahn = readJson('last/e100-bahn');
const e100Schiff = readJson('last/e100-schiff');
const e100Flug = readJson('last/e100-flug');
const e100Ghd = readJson('last/e100-ghd');
const e100IndustrieWaerme = readJson('last/e100-industrie-waerme');
const e100Stahl = readJson('last/e100-stahl');
const e100Chemie = readJson('last/e100-chemie');
const erzPv = readJson('erzeugung/pv');
const erzWindOn = readJson('erzeugung/windon');
const erzWindOff = readJson('erzeugung/windoff');
const erzKernkraft = readJson('erzeugung/kernkraft');
const erzBiomasse = readJson('erzeugung/biomasse');
const erzLaufwasser = readJson('erzeugung/laufwasser');
const erzGas = readJson('erzeugung/gas');
const erzKohle = readJson('erzeugung/kohle');
const erzHandel = readJson('erzeugung/handel');
const speicherBatterie = readJson('speicher/batterie');
const speicherPumpspeicher = readJson('speicher/pumpspeicher');
const speicherH2 = readJson('speicher/h2');

const stripId = (o) => { const { id: _, ...r } = o; return r; };

const erzeugungsModell = {
  sources: {
    pv: stripId(erzPv), windOn: stripId(erzWindOn), windOff: stripId(erzWindOff),
    kernkraft: stripId(erzKernkraft), biomasse: stripId(erzBiomasse), laufwasser: stripId(erzLaufwasser),
    gas: stripId(erzGas), kohle: stripId(erzKohle),
  },
  import: erzHandel.import, export: erzHandel.export, dispatchOrder: erzHandel.dispatchOrder,
};
const speicherModell = {
  storages: {
    batterie: stripId(speicherBatterie),
    pumpspeicher: stripId(speicherPumpspeicher),
    h2: stripId(speicherH2),
  },
};

const berlinFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
});
const berlinDateAndHour = (iso) => {
  const parts = Object.fromEntries(berlinFmt.formatToParts(new Date(iso)).map(p => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
};
const generationByTime = new Map(generationData.hours.map(h => [h.time, h]));
const factorsByTime = new Map(factorData.hours.map(h => [h.time, h]));
const heatingByDate = new Map(e100Heiz.degreeDayProfile.days.map(d => [d.date, d]));

const hours = loadData.hours.map(loadHour => {
  const generation = generationByTime.get(loadHour.time);
  const factors = factorsByTime.get(loadHour.time);
  const { date, hour } = berlinDateAndHour(loadHour.time);
  const heatingDegreeDay = heatingByDate.get(date);
  if (!generation || !factors || !heatingDegreeDay) throw new Error(`missing data for ${loadHour.time}`);
  const { time: _t, ...observed } = generation;
  return {
    time: loadHour.time, loadMW: loadHour.loadMW,
    solarIrradiance: factors.solarIrradiance, wind100m: factors.wind100m,
    heatingDegreeDayWeight: heatingDegreeDay.weight, hourOfDayBerlin: hour, observed,
  };
});

const context = {
  'e100-pkw': e100Pkw, 'e100-heiz': e100Heiz, 'e100-lkw': e100Lkw, 'e100-bahn': e100Bahn,
  'e100-schiff': e100Schiff, 'e100-flug': e100Flug, 'e100-ghd': e100Ghd,
  'e100-industrie-waerme': e100IndustrieWaerme, 'e100-stahl': e100Stahl, 'e100-chemie': e100Chemie,
  'erzeugungs-modell': erzeugungsModell, 'speicher-modell': speicherModell,
};

const baselineScenario = { ...normalizeScenario(defaultScenario), supplyPreset: 'custom' };

function extractJsonBlock(md) {
  const match = md.match(/##\s+Szenario-Definition\s*\n```json\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error('Kein ## Szenario-Definition JSON-Block gefunden');
  return JSON.parse(match[1]);
}

function extractExpectations(md) {
  const m = md.match(/##\s+Erwartete Ergebnisse\s*\n([\s\S]*?)(?=\n##\s|$)/);
  return m ? m[1].trim() : '';
}

function mergeScenario(partial) {
  return {
    ...baselineScenario,
    ...partial,
    demand: { ...baselineScenario.demand, ...(partial.demand ?? {}) },
    generation: { ...baselineScenario.generation, ...(partial.generation ?? {}) },
    storage: { ...baselineScenario.storage, ...(partial.storage ?? {}) },
  };
}

function fmt(x, digits = 1) {
  return typeof x === 'number' ? x.toFixed(digits) : String(x);
}

let allOk = true;
for (const file of files) {
  const path = join(here, file);
  const md = readFileSync(path, 'utf8');
  const title = (md.match(/^#\s+(.+)$/m) ?? [, file])[1];
  console.log(`\n══════════════ ${file} ══════════════`);
  console.log(title);

  let scenario;
  try {
    const partial = extractJsonBlock(md);
    scenario = mergeScenario(partial);
  } catch (e) {
    console.error(`  PARSE-ERROR: ${e.message}`);
    allOk = false;
    continue;
  }

  const t0 = performance.now();
  const result = runSimulation(hours, scenario, context);
  const elapsedMs = (performance.now() - t0).toFixed(0);
  const s = result.summary;
  console.log(`  computed in ${elapsedMs} ms`);
  console.log(`  Demand:           ${fmt(s.totalDemandTWh)} TWh`);
  console.log(`  EE-Anteil:        ${fmt(s.renewableSharePct, 2)} %  (${fmt(s.renewableTWh)} TWh erneuerbar)`);
  console.log(`  Curtailment:      ${fmt(s.curtailmentTWh)} TWh`);
  console.log(`  Import:           ${fmt(s.importTWh)} TWh`);
  console.log(`  Export:           ${fmt(s.exportTWh)} TWh`);
  console.log(`  Load-Shedding:    ${fmt(s.loadSheddingTWh)} TWh   (${s.hoursWithLoadShedding} h)`);
  console.log(`  CO2:              ${fmt(s.co2MtPerYear)} Mt/a  · ${fmt(s.co2GperKWh, 0)} g/kWh`);
  console.log(`  Peak-Load:        ${fmt(s.peakLoadGW)} GW`);
  console.log(`  Security-Status:  ${s.securityStatus}`);
  // SoC-Ranges aus den hours
  const minMax = (key) => {
    let mn = Infinity, mx = -Infinity;
    for (const h of result.hours) { const v = h[key]; if (v < mn) mn = v; if (v > mx) mx = v; }
    return [mn, mx];
  };
  const [bMin, bMax] = minMax('batterieSocGWh');
  const [pMin, pMax] = minMax('pumpspeicherSocGWh');
  const [h2Min, h2Max] = minMax('h2SocGWh');
  console.log(`  SoC-Range Batt:   ${fmt(bMin, 1)} – ${fmt(bMax, 1)} GWh`);
  console.log(`  SoC-Range PSP:    ${fmt(pMin, 1)} – ${fmt(pMax, 1)} GWh`);
  console.log(`  SoC-Range H2:     ${fmt(h2Min, 1)} – ${fmt(h2Max, 1)} GWh`);
  console.log();
  console.log('  Erwartung:');
  console.log(extractExpectations(md).split('\n').map(l => `    ${l}`).join('\n'));
}

console.log(`\n${files.length} Szenario(s) verarbeitet.`);
process.exit(allOk ? 0 : 1);
