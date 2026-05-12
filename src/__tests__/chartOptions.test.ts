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

const hourAt = (date: string, loadGW = 80): SimHour => ({ ...hour(0), time: `${date}T00:00:00Z`, loadGW });

describe('mix chart options', () => {
  it('orders visible supply leaves like Energy-Charts from firm lower layers to solar top layer', () => {
    const option = buildMixChartOption([hour(0)]);
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

  it('keeps hidden leaves out of the plotted stack', () => {
    const visibility = { ...DEFAULT_MIX_VISIBILITY, coalGW: false };
    const option = buildMixChartOption([hour(0)], visibility);
    const series = option.series as Array<Record<string, unknown>>;
    expect(series.map((s) => s.name)).not.toContain('Kohle');
    expect(series.find((s) => s.name === 'Gas')?.data).toEqual([6]);
  });

  it('orders full-year daily buckets by day of month first, then month', () => {
    const yearHours: SimHour[] = [];
    for (let month = 0; month < 12; month += 1) {
      const days = new Date(Date.UTC(2025, month + 1, 0)).getUTCDate();
      for (let day = 1; day <= days; day += 1) {
        const date = `2025-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        yearHours.push(hourAt(date), hourAt(date));
      }
    }
    const option = buildMixChartOption(yearHours);
    const xAxis = option.xAxis as { data: string[] };

    expect(xAxis.data.slice(0, 13)).toEqual([
      '01.01.', '01.02.', '01.03.', '01.04.', '01.05.', '01.06.',
      '01.07.', '01.08.', '01.09.', '01.10.', '01.11.', '01.12.',
      '02.01.',
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
