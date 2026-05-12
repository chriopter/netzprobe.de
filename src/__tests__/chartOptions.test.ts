import { describe, expect, it } from 'vitest';
import { buildMixChartOption } from '../ui/chartOptions';
import type { SimHour } from '../simulation/engine';

const hour = (loadSheddingGW: number): SimHour => ({
  time: '2025-01-01T00:00:00Z',
  loadGW: 80,
  solarGW: 0,
  windOnGW: 0,
  windOffGW: 0,
  biomassGW: 0,
  hydroGW: 0,
  wasteGW: 0,
  oilGW: 0,
  geothermalGW: 0,
  otherGW: 0,
  coalGW: 10,
  gasGW: 10,
  nuclearGW: 0,
  importGW: 0,
  exportGW: 0,
  storageChargeGW: 0,
  storageDischargeGW: 0,
  curtailmentGW: 0,
  loadSheddingGW,
  batteryGWh: 0,
  h2GWh: 0,
  supplyGW: 20,
  balanceGW: 0,
  co2Tonnes: 0,
});

describe('mix chart options', () => {
  it('orders the supply stack like Energy-Charts from firm lower layers to solar top layer', () => {
    const option = buildMixChartOption([hour(0)]);
    const series = option.series as Array<Record<string, unknown>>;
    expect(series.slice(0, 11).map((s) => s.name)).toEqual([
      'Wasser',
      'Biomasse',
      'Kohle',
      'Öl',
      'Geo',
      'Sonstige',
      'Müll',
      'Gas',
      'Wind See',
      'Wind an Land',
      'Solar',
    ]);
  });

  it('marks uncovered load as a red area series', () => {
    const option = buildMixChartOption([hour(0), hour(12)]);
    const series = option.series as Array<Record<string, unknown>>;
    const underdecked = series.find((s) => s.name === 'Unterdeckung');

    expect(underdecked).toBeDefined();
    expect(underdecked?.type).toBe('line');
    expect(underdecked?.data).toEqual([0, 12]);
    expect(underdecked?.stack).toBe('supply');
    expect(underdecked?.areaStyle).toMatchObject({ opacity: expect.any(Number) });
    expect(underdecked?.itemStyle).toMatchObject({ color: '#ef4444' });
  });
});
