import { describe, expect, it } from 'vitest';
import { uiManifest } from '../../app/src/ui/uiManifest';

describe('ui manifest', () => {
  it('contains all factors needed for sidebar demand totals', () => {
    const lkwTWh = Math.max(0, uiManifest.e100.lkw.defaultTargetBnKm - uiManifest.e100.lkw.alreadyElectricBnKm)
      * uiManifest.e100.lkw.kwhPerKm;
    const ghdTWh = Math.max(0, uiManifest.e100.ghd.defaultTargetHeatTWh - uiManifest.e100.ghd.alreadyElectricHeatTWh)
      / uiManifest.e100.ghd.seasonalCop;
    const industrieTWh = Math.max(
      0,
      uiManifest.e100['industrie-waerme'].defaultTargetHeatTWh
        - uiManifest.e100['industrie-waerme'].alreadyElectricHeatTWh,
    ) * uiManifest.e100['industrie-waerme'].electricityPerHeat;
    const stahlTWh = Math.max(
      0,
      uiManifest.e100.stahl.defaultTargetMioTon * uiManifest.e100.stahl.mwhPerTon
        - uiManifest.e100.stahl.alreadyElectricTWh,
    );
    const chemieTWh = Math.max(0, uiManifest.e100.chemie.defaultTargetTotalTWh - uiManifest.e100.chemie.alreadyElectricTWh);

    for (const value of [lkwTWh, ghdTWh, industrieTWh, stahlTWh, chemieTWh]) {
      expect(Number.isFinite(value)).toBe(true);
    }
    expect(uiManifest.e100.chemie.defaultTargetTotalTWh).toBe(685);
  });
});
