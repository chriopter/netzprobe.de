// Pre-computed Default-Result: rechnet die Engine einmal mit dem Default-Szenario
// durch. Das Resultat wird beim Build als `dist/default-result.json` abgelegt
// (siehe vite.config.ts) und beim Initial-Render der App geladen, damit der
// Chart sofort sichtbar ist, bevor der Worker hochgefahren hat.
import { loadDefaultData } from '../ui/defaultData';
import { defaultScenario, normalizeScenario } from '../ui/scenarioPresets';
import { runSimulation, type SimulationContext, type SimulationResult } from './engine';

export async function computeDefaultResult(): Promise<SimulationResult> {
  const data = await loadDefaultData();
  const scenario = { ...normalizeScenario(defaultScenario), supplyPreset: 'custom' as const };
  const context: SimulationContext = {
    'e100-pkw': data['e100-pkw'],
    'e100-heiz': data['e100-heiz'],
    'e100-lkw': data['e100-lkw'],
    'e100-bahn': data['e100-bahn'],
    'e100-schiff': data['e100-schiff'],
    'e100-flug': data['e100-flug'],
    'e100-ghd': data['e100-ghd'],
    'e100-industrie-waerme': data['e100-industrie-waerme'],
    'e100-stahl': data['e100-stahl'],
    'e100-chemie': data['e100-chemie'],
    'erzeugungs-modell': data['erzeugungs-modell'],
    'speicher-modell': data['speicher-modell'],
    'aussenhandel-modell': data['aussenhandel-modell'],
  };
  return runSimulation(data.hours, scenario, context);
}

// CLI-Entry für das Vite-Plugin: `tsx src/simulation/precomputeDefault.ts <out>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const outPath = process.argv[2] ?? 'dist/default-result.json';
  const { writeFileSync } = await import('node:fs');
  const result = await computeDefaultResult();
  const json = JSON.stringify(result);
  writeFileSync(outPath, json);
  console.log(`✓ ${outPath}: ${(json.length / 1024).toFixed(0)} KB`);
}

