// Generator: holt 2017 Erzeugung + Last + Cross-Border aus Energy-Charts public_power API,
// aggregiert 15-min auf 1h, schreibt data/erzeugung-2017/data.json und data/last-2017/data.json.
// Run: node data/erzeugung-2017/generate.mjs
import { writeFileSync } from 'node:fs';

const url = 'https://api.energy-charts.info/public_power?country=de&start=2017-01-01T00:00%2B01:00&end=2018-01-01T00:00%2B01:00';
console.log('fetching', url);
const response = await fetch(url);
if (!response.ok) throw new Error(`API failed: ${response.status}`);
const raw = await response.json();
const seconds = raw.unix_seconds;
const seriesByName = new Map(raw.production_types.map((p) => [p.name, p.data]));

const get = (name) => {
  const data = seriesByName.get(name);
  if (!data) throw new Error(`missing series: ${name}`);
  return data;
};

const solar = get('Solar');
const windOn = get('Wind onshore');
const windOff = get('Wind offshore');
const nuclear = get('Nuclear');
const hydroRoR = get('Hydro Run-of-River');
const hydroRes = get('Hydro water reservoir');
const biomass = get('Biomass');
const coalBrown = get('Fossil brown coal / lignite');
const coalHard = get('Fossil hard coal');
const coalGas = get('Fossil coal-derived gas');
const oil = get('Fossil oil');
const gas = get('Fossil gas');
const geothermal = get('Geothermal');
const others = get('Others');
const waste = get('Waste');
const importExport = get('Cross border electricity trading');
const load = get('Load');

// Aggregate 15-min to hourly: 4 quarter-hour values per hour, average.
const hours = [];
const lastHours = [];
const numericSum = { pv: 0, windOn: 0, windOff: 0, nuclear: 0, gas: 0, coal: 0, hydro: 0, biomass: 0, waste: 0, oil: 0, geothermal: 0, other: 0, load: 0, import: 0, export: 0 };

for (let i = 0; i + 3 < seconds.length; i += 4) {
  const ts = seconds[i];
  // Skip non-aligned quarter-hours (shouldn't happen with this API but safety).
  if (ts % 3600 !== 0) continue;
  const isoTime = new Date(ts * 1000).toISOString().replace('.000', '');
  const avg = (arr) => (arr[i] + arr[i + 1] + arr[i + 2] + arr[i + 3]) / 4;
  const pvMW = Math.max(0, avg(solar));
  const windOnMW = Math.max(0, avg(windOn));
  const windOffMW = Math.max(0, avg(windOff));
  const nuclearMW = Math.max(0, avg(nuclear));
  const gasMW = Math.max(0, avg(gas));
  const coalMW = Math.max(0, avg(coalBrown) + avg(coalHard));
  const hydroMW = Math.max(0, avg(hydroRoR));
  const biomassMW = Math.max(0, avg(biomass));
  const wasteMW = Math.max(0, avg(waste));
  const oilMW = Math.max(0, avg(oil));
  const geothermalMW = Math.max(0, avg(geothermal));
  // "Others" inkl. Hydro Reservoir + Coal-derived gas (kleine Anteile, oft in Anwendungen unter "Sonstige" gepackt)
  const otherMW = Math.max(0, avg(others) + avg(hydroRes) + avg(coalGas));
  const importExportMW = avg(importExport);
  const loadMW = Math.max(0, avg(load));

  hours.push({ time: isoTime, pvMW: r(pvMW), windOnMW: r(windOnMW), windOffMW: r(windOffMW), nuclearMW: r(nuclearMW), gasMW: r(gasMW), coalMW: r(coalMW), hydroMW: r(hydroMW), biomassMW: r(biomassMW), wasteMW: r(wasteMW), oilMW: r(oilMW), geothermalMW: r(geothermalMW), otherMW: r(otherMW), importExportMW: r(importExportMW) });
  lastHours.push({ time: isoTime, loadMW: r(loadMW) });

  numericSum.pv += pvMW; numericSum.windOn += windOnMW; numericSum.windOff += windOffMW;
  numericSum.nuclear += nuclearMW; numericSum.gas += gasMW; numericSum.coal += coalMW;
  numericSum.hydro += hydroMW; numericSum.biomass += biomassMW; numericSum.waste += wasteMW;
  numericSum.oil += oilMW; numericSum.geothermal += geothermalMW; numericSum.other += otherMW;
  numericSum.load += loadMW;
  numericSum.import += Math.max(0, importExportMW);
  numericSum.export += Math.max(0, -importExportMW);
}

function r(v) { return Math.round(v * 10) / 10; }
function twh(mw) { return Math.round(mw / 1_000_000 * 10) / 10; }

const supplyTotalTWh = twh(numericSum.pv + numericSum.windOn + numericSum.windOff + numericSum.nuclear + numericSum.gas + numericSum.coal + numericSum.hydro + numericSum.biomass + numericSum.waste + numericSum.oil + numericSum.geothermal + numericSum.other);

const erz = {
  generatedAt: new Date().toISOString(),
  year: 2017,
  source: 'Energy-Charts public_power API: hourly public generation, nuclear and import/export for Germany 2017, averaged from 15-minute values.',
  sourceUrl: url,
  unit: 'MW',
  sumTWh: supplyTotalTWh,
  sumPartsTWh: {
    pvTWh: twh(numericSum.pv), windOnTWh: twh(numericSum.windOn), windOffTWh: twh(numericSum.windOff),
    nuclearTWh: twh(numericSum.nuclear), gasTWh: twh(numericSum.gas), coalTWh: twh(numericSum.coal),
    hydroTWh: twh(numericSum.hydro), biomassTWh: twh(numericSum.biomass), wasteTWh: twh(numericSum.waste),
    oilTWh: twh(numericSum.oil), geothermalTWh: twh(numericSum.geothermal), otherTWh: twh(numericSum.other),
  },
  sumImportTWh: twh(numericSum.import),
  sumExportTWh: twh(numericSum.export),
  sumNote: 'Erzeugung: alle Energy-Charts-Erzeugungsarten inkl. Kernkraft 2017 (vor Atomausstieg).',
  hours,
};

const lst = {
  generatedAt: new Date().toISOString(),
  year: 2017,
  source: 'Energy-Charts public_power API: hourly load for Germany 2017, averaged from 15-minute values.',
  sourceUrl: url,
  unit: 'MW',
  sumTWh: twh(numericSum.load),
  sumNote: 'Stündliche Last 2017 aus 15-min Werten gemittelt.',
  hours: lastHours,
};

writeFileSync('data/erzeugung-2017/data.json', JSON.stringify(erz));
writeFileSync('data/last-2017/data.json', JSON.stringify(lst));
console.log(`wrote ${hours.length} hours. erzeugung sum=${supplyTotalTWh} TWh, last sum=${twh(numericSum.load)} TWh, import=${twh(numericSum.import)} TWh, export=${twh(numericSum.export)} TWh`);
