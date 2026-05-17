import { describe, expect, it } from 'vitest';
import { computeDefaultResult } from '../simulation/precomputeDefault';

// CI-Gate für den Pre-Compute, der vom Vite-Build-Plugin nach
// `dist/default-result.json` geschrieben wird. Wenn die Engine, das Default-
// Szenario oder ein Daten-Modul auseinanderlaufen, schlägt dieser Test an
// und der Build-Artefakt würde dasselbe Problem zeigen.
describe('precomputeDefault', () => {
  it('rechnet das Default-Szenario zu einem plausiblen Result', async () => {
    const result = await computeDefaultResult();

    expect(result.hours).toHaveLength(8760);
    expect(result.summary).toBeDefined();
    expect(result.summary.totalDemandTWh).toBeGreaterThan(0);
    expect(result.summary.co2GperKWh).toBeGreaterThanOrEqual(0);
    expect(result.summary.renewableSharePct).toBeGreaterThanOrEqual(0);
    expect(result.summary.renewableSharePct).toBeLessThanOrEqual(100);
    // Erwartung 2025: rund 466 TWh Last; ±50 TWh toleranter Korridor.
    expect(result.summary.totalDemandTWh).toBeGreaterThan(400);
    expect(result.summary.totalDemandTWh).toBeLessThan(550);
  });
});
