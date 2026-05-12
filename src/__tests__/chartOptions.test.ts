import { describe, expect, it } from 'vitest';
import { DEFAULT_MIX_VISIBILITY, buildMixChartOption, buildStorageChartOption } from '../ui/chartOptions';
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
      'Bio',
      'Geo',
      'Kohle',
      'Öl',
      'Sonstige',
      'Müll',
      'Gas',
      'Wind Offshore',
      'Wind Onshore',
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

  it('renders the main mix as a radial polar chart by default and can switch back to line mode', () => {
    const radial = buildMixChartOption([hour(0)]);
    const linear = buildMixChartOption([hour(0)], DEFAULT_MIX_VISIBILITY, 'linie');
    const radialSeries = radial.series as Array<Record<string, unknown>>;
    const linearSeries = linear.series as Array<Record<string, unknown>>;
    const radiusAxis = radial.radiusAxis as { axisLabel: { show: boolean } };

    expect(radial.polar).toBeDefined();
    expect(radial.angleAxis).toBeDefined();
    expect(radial.radiusAxis).toBeDefined();
    expect(radiusAxis.axisLabel.show).toBe(false);
    expect(radial.xAxis).toBeUndefined();
    expect(radialSeries.find((s) => s.name === 'Solar')?.coordinateSystem).toBe('polar');
    expect(radialSeries.find((s) => s.name === 'Last')?.coordinateSystem).toBe('polar');
    expect(linear.xAxis).toBeDefined();
    expect(linear.yAxis).toBeDefined();
    expect(linear.polar).toBeUndefined();
    expect(linearSeries.find((s) => s.name === 'Solar')?.coordinateSystem).toBeUndefined();
  });

  it('orders full-year daily buckets by day of month first and spreads month labels across the axis', () => {
    const yearHours: SimHour[] = [];
    for (let month = 0; month < 12; month += 1) {
      const days = new Date(Date.UTC(2025, month + 1, 0)).getUTCDate();
      for (let day = 1; day <= days; day += 1) {
        const date = `2025-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        yearHours.push(hourAt(date), hourAt(date));
      }
    }
    const option = buildMixChartOption(yearHours);
    const angleAxis = option.angleAxis as { data: string[] };
    const series = option.series as Array<Record<string, unknown>>;

    expect((series.find((s) => s.name === 'Last')?.data as number[]).slice(0, 13)).toHaveLength(13);
    expect(angleAxis.data.filter(Boolean)).toEqual([
      'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
      'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
    ]);
    expect(angleAxis.data[0]).toBe('');
    expect(angleAxis.data.at(-1)).toBe('');

    const linear = buildMixChartOption(yearHours, DEFAULT_MIX_VISIBILITY, 'linie');
    const xAxis = linear.xAxis as { data: string[] };
    expect(xAxis.data.filter(Boolean)).toContain('Januar');
    expect(xAxis.data.filter(Boolean)).toContain('Dezember');
  });

  it('always renders storage as a linear chart', () => {
    const option = buildStorageChartOption([hour(0)]);
    const series = option.series as Array<Record<string, unknown>>;

    expect(option.polar).toBeUndefined();
    expect(option.radiusAxis).toBeUndefined();
    expect(option.xAxis).toBeDefined();
    expect(option.yAxis).toBeDefined();
    expect(series.find((s) => s.name === 'Batterie')?.coordinateSystem).toBeUndefined();
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
