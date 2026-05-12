import { readFileSync, writeFileSync } from 'node:fs';

const generationPath = 'data/erzeugung/energy-charts-stuendlich-2025.json';
const outputPath = 'data/modell/einspeisefaktoren-stuendlich-2025.json';
const installedPowerPath = process.argv[2];

if (!installedPowerPath) {
  console.error('Usage: node data/modell/generate-feed-in-factors.mjs <installed_power.json>');
  process.exit(1);
}

const generation = JSON.parse(readFileSync(generationPath, 'utf8'));
const installed = JSON.parse(readFileSync(installedPowerPath, 'utf8'));

const seriesByName = new Map(installed.production_types.map((series) => [series.name, series.data]));
const solar = seriesByName.get('Solar AC');
const windOn = seriesByName.get('Wind onshore');
const windOff = seriesByName.get('Wind offshore');

if (!solar || !windOn || !windOff) {
  throw new Error('installed_power JSON does not contain Solar AC, Wind onshore and Wind offshore');
}

function monthIndex(isoTime) {
  const date = new Date(isoTime);
  const key = `${String(date.getUTCMonth() + 1).padStart(2, '0')}.${date.getUTCFullYear()}`;
  const index = installed.time.indexOf(key);
  if (index === -1) throw new Error(`No installed power entry for ${key}`);
  return index;
}

function factor(valueMW, installedGW) {
  if (!installedGW) return 0;
  return Math.max(0, Math.min(1, valueMW / (installedGW * 1000)));
}

function round(value) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

const hours = generation.hours.map((hour) => {
  const index = monthIndex(hour.time);
  const solarFactor = round(factor(hour.pvMW, solar[index]));
  const windFactor = round(factor(hour.windOnMW + hour.windOffMW, windOn[index] + windOff[index]));
  return {
    time: hour.time,
    solarIrradiance: [solarFactor],
    wind100m: [windFactor],
  };
});

writeFileSync(outputPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  year: 2025,
  source: 'Locally derived feed-in factors from Energy-Charts public_power and installed_power APIs.',
  sourceUrls: [
    generation.sourceUrl,
    'https://api.energy-charts.info/installed_power?country=de&time_step=monthly',
  ],
  notes: [
    'Regenerated locally from repository generation data and freshly fetched Energy-Charts installed_power data.',
    'solarIrradiance = observed pvMW / monthly Solar AC installed MW.',
    'wind100m = (observed windOnMW + windOffMW) / monthly installed wind MW.',
    'Values are clipped to 0..1 and are feed-in factors, not raw weather measurements.',
    'Curtailment is not added back.',
  ],
  hours,
})}\n`);
