import { describe, expect, it } from 'vitest';
import { DEFAULT_MIX_VISIBILITY, buildMixChartOption } from '../ui/chartOptions';
import type { SimHour } from '../simulation/engine';

const hour = (loadSheddingGW: number): SimHour => ({
  time: '2025-01-01T00:00:00Z',
  loadGW: 80,
  solarGW: 7,
  windOnGW: 11,
  windOffGW: 3,
  biomassGW: 2,
  hydroGW: 1,
  wasteGW: 0.5,
  oilGW: 0.25,
  geothermalGW: 0.1,
  otherGW: 0.15,
  coalGW: 10,
  gasGW: 6,
  nuclearGW: 0,
  importGW: 0,
  exportGW: 0,
  storageChargeGW: 0,
  storageDischargeGW: 0,
  curtailmentGW: 0,
  loadSheddingGW,
  batteryGWh: 0,
  h2GWh: 0,
  supplyGW: 40,
  balanceGW: 0,
  co2Tonnes: 0,
});

describe('mix chart options', () => {
  it('orders combined supply groups from firm lower layers to solar top layer', () => {
    const option = buildMixChartOption([hour(0)]);
    const series = option.series as Array<Record<string, unknown>>;
    expect(series.slice(0, 4).map((s) => s.name)).toEqual([
      'CO₂-freie Grundlast',
      'Fossil',
      'Wind',
      'Solar',
    ]);
  });

  it('keeps plotted areas combined while summing visible leaves', () => {
    const visibility = { ...DEFAULT_MIX_VISIBILITY, coalGW: false };
    const option = buildMixChartOption([hour(0)], visibility);
    const series = option.series as Array<Record<string, unknown>>;
    const fossil = series.find((s) => s.name === 'Fossil');
    expect(fossil?.data).toEqual([6.9]);
  });

  it('splits grouped areas into leaf series on hover mode', () => {
    const option = buildMixChartOption([hour(0)], DEFAULT_MIX_VISIBILITY, 'split');
    const series = option.series as Array<Record<string, unknown>>;
    expect(series.slice(0, 11).map((s) => s.name)).toEqual([
      'Wasser',
      'Biomasse',
      'Geo',
      'Kohle',
      'Öl',
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
    expect(underdecked?.itemStyle).toMatchObject({ color: '#dc2626' });
  });
});
