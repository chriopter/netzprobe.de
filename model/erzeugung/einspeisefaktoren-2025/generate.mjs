import { readFileSync, writeFileSync } from 'node:fs';

const generationHoursPath = 'model/erzeugung/2025/hours.json';
const outputPath = 'model/erzeugung/einspeisefaktoren-2025/data.json';
const installedPowerUrl = 'https://api.energy-charts.info/installed_power?country=de&time_step=monthly';
const installedPowerPath = process.argv[2];

// erzeugung-2025 was split: hours array lives in model/erzeugung/2025/hours.json,
// stamp/source URLs live in package.json. Re-create the minimal slice we need.
const generation = {
  hours: JSON.parse(readFileSync(generationHoursPath, 'utf8')),
  sourceUrl: 'https://api.energy-charts.info/public_power?country=de&start=2025-01-01&end=2026-01-01',
};
const installed = installedPowerPath
  ? JSON.parse(readFileSync(installedPowerPath, 'utf8'))
  : await fetch(installedPowerUrl).then((response) => {
      if (!response.ok) throw new Error(`installed_power API failed: ${response.status} ${response.statusText}`);
      return response.json();
    });

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
  const windOnFactor = round(factor(hour.windOnMW, windOn[index]));
  const windOffFactor = round(factor(hour.windOffMW, windOff[index]));
  return {
    time: hour.time,
    solarIrradiance: [solarFactor],
    windOn100m: [windOnFactor],
    windOff100m: [windOffFactor],
  };
});

writeFileSync(outputPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  year: 2025,
  source: 'Locally derived feed-in factors from Energy-Charts public_power and installed_power APIs.',
  sourceUrls: [
    generation.sourceUrl,
    installedPowerUrl,
  ],
  notes: [
    'Regenerated locally from repository generation data and freshly fetched Energy-Charts installed_power data.',
    'solarIrradiance = observed pvMW / monthly Solar AC installed MW.',
    'windOn100m = observed windOnMW / monthly Wind onshore installed MW.',
    'windOff100m = observed windOffMW / monthly Wind offshore installed MW.',
    'Values are clipped to 0..1 and are feed-in factors, not raw weather measurements.',
    'Curtailment is not added back — offshore in particular embeds grid-connection curtailment.',
  ],
  hours,
})}\n`);
