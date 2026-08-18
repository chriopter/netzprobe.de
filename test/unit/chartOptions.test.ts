import { describe, expect, it } from 'vitest';
import { DEFAULT_MIX_VISIBILITY, buildMixChartOption, mixReferenceScaleMaxGW, mixScaleMaxGW, mixScalePeakGW } from '../../app/src/ui/chartOptions';
import type { SimHour } from '../../app/src/types/simulation';

const hour = (loadSheddingGW: number): SimHour => ({
  time: '2025-01-01T00:00:00Z',
  loadGW: 80,
  pvGW: 7,
  windOnGW: 11,
  windOffGW: 3,
  kernkraftGW: 0,
  biomasseGW: 2,
  laufwasserGW: 1,
  gasGW: 6,
  kohleGW: 10,
  pvCurtailedGW: 0,
  windOnCurtailedGW: 0,
  windOffCurtailedGW: 0,
  kernkraftCurtailedGW: 0,
  importGW: 0,
  exportGW: 0,
  storageChargeGW: 0,
  storageDischargeGW: 0,
  batterieChargeGW: 0,
  batterieDischargeGW: 0,
  pumpspeicherChargeGW: 0,
  pumpspeicherDischargeGW: 0,
  h2ChargeGW: 0,
  h2DischargeGW: 0,
  batterieSocGWh: 0,
  pumpspeicherSocGWh: 0,
  h2SocGWh: 0,
  curtailmentGW: 0,
  loadSheddingGW,
  h2PoolReductionGW: 0,
  h2PoolImportGW: 0,
  h2PoolLhvGW: 0,
  h2PoolImportLhvGW: 0,
  supplyGW: 40,
  balanceGW: 0,
  co2Tph: 0,
  solarGW: 7,
  biomassGW: 2,
  hydroGW: 1,
  geothermalGW: 0.1,
  wasteGW: 0.5,
  oilGW: 0.25,
  otherGW: 0.15,
  coalGW: 10,
  nuclearGW: 0,
  historicalImportGW: 0,
  historicalExportGW: 0,
  dataBoundaryResidualGW: 0,
  batteryGWh: 0,
  h2GWh: 0,
});

const hourAt = (date: string, loadGW = 80): SimHour => ({ ...hour(0), time: `${date}T00:00:00Z`, loadGW });

describe('mix chart options', () => {
  it('aggregates the stack into one area per legend group in chip order', () => {
    const option = buildMixChartOption([hour(0)]);
    const series = option.series as Array<Record<string, unknown>>;
    expect(series.slice(0, 5).map((s) => s.name)).toEqual([
      'EE',
      'Fossil',
      'Kern',
      'Speicher',
      'Import',
    ]);
  });

  it('expands only the hovered group into its technology areas', () => {
    const option = buildMixChartOption([hour(0)], DEFAULT_MIX_VISIBILITY, 'linie', undefined, undefined, 'light', false, 'netzlast', 'renewable');
    const names = (option.series as Array<Record<string, unknown>>).map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['Laufwasser', 'Biomasse', 'Wind Onshore', 'PV', 'Fossil', 'Import']));
    expect(names).not.toContain('Erneuerbar');
    expect(names).not.toContain('Kohle');
  });

  it('keeps the H2 amount in the reference line even when the legend chip hides the area', () => {
    const h = { ...hour(0), loadGW: 60, h2PoolLhvGW: 20, h2PoolImportLhvGW: 20 };
    const on = buildMixChartOption([h], DEFAULT_MIX_VISIBILITY, 'linie', undefined, undefined, 'light', false, 'netzlast', 'import')
      .series as Array<Record<string, unknown>>;
    expect((on.find((s) => s.name === 'H₂-Import')?.data as number[])[0]).toBe(20);
    expect((on.find((s) => s.name === 'Last')?.data as number[])[0]).toBe(80);

    // Chip aus: Flaeche weg, Linie unveraendert — die Luecke ist sichtbar statt still.
    const off = buildMixChartOption([h], { ...DEFAULT_MIX_VISIBILITY, h2PoolImportGW: false }, 'linie', undefined, undefined, 'light', false, 'netzlast', 'import')
      .series as Array<Record<string, unknown>>;
    expect(off.some((s) => s.name === 'H₂-Import')).toBe(false);
    expect((off.find((s) => s.name === 'Last')?.data as number[])[0]).toBe(80);
  });

  it('endverbrauch view scales technologies to direct coverage and closes with the line', () => {
    const h = { ...hour(0), loadGW: 50, importGW: 5, storageDischargeGW: 10, batterieDischargeGW: 6, h2DischargeGW: 4 };
    const series = buildMixChartOption([h], DEFAULT_MIX_VISIBILITY, 'linie', undefined, undefined, 'light', false, 'endverbrauch')
      .series as Array<Record<string, unknown>>;
    const names = series.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['EE', 'Speicher', 'Import']));
    expect(names).not.toContain('Netzstrom');
    // Alle Deckungs-Flaechen zusammen ergeben exakt die Last der Stunde:
    // Technologien skaliert auf netzstrom (50-5-10=35) + Entladung 10 + Import 5.
    const stacked = series.filter((s) => s.stack === 'supply');
    const sum = stacked.reduce((acc, s) => acc + (s.data as number[])[0], 0);
    expect(sum).toBeCloseTo(50, 6);
  });

  it('uses full pool coverage in the Bedarf line but only the import share in Netzlast', () => {
    // 20 GW Pool-Deckung, davon 5 importiert; 15 stammen aus Elektrolyse (im Laden enthalten).
    const h = { ...hour(0), loadGW: 60, storageChargeGW: 30, h2PoolLhvGW: 20, h2PoolImportLhvGW: 5 };
    const bedarf = buildMixChartOption([h], DEFAULT_MIX_VISIBILITY, 'linie', undefined, undefined, 'light', false, 'endverbrauch', 'import')
      .series as Array<Record<string, unknown>>;
    expect((bedarf.find((s) => s.name === 'Last')?.data as number[])[0]).toBe(80);
    expect((bedarf.find((s) => s.name === 'Industrie-H₂')?.data as number[])[0]).toBe(20);

    const netzlast = buildMixChartOption([h], DEFAULT_MIX_VISIBILITY, 'linie', undefined, undefined, 'light', false, 'netzlast', 'import')
      .series as Array<Record<string, unknown>>;
    expect((netzlast.find((s) => s.name === 'Last')?.data as number[])[0]).toBe(95);
    expect((netzlast.find((s) => s.name === 'H₂-Import')?.data as number[])[0]).toBe(5);
  });

  it('keeps hidden leaves out of the plotted stack', () => {
    const visibility = { ...DEFAULT_MIX_VISIBILITY, coalGW: false };
    const h = { ...hour(0), coalGW: 30 };
    const withCoal = buildMixChartOption([h]).series as Array<Record<string, unknown>>;
    const withoutCoal = buildMixChartOption([h], visibility).series as Array<Record<string, unknown>>;
    const fossil = (name: string, list: Array<Record<string, unknown>>) => (list.find((s) => s.name === name)?.data as number[])[0];
    expect(fossil('Fossil', withCoal) - fossil('Fossil', withoutCoal)).toBeCloseTo(30, 6);
    // Expandiert fehlt das versteckte Leaf auch als Einzel-Flaeche.
    const expanded = buildMixChartOption([h], visibility, 'linie', undefined, undefined, 'light', false, 'netzlast', 'fossil')
      .series as Array<Record<string, unknown>>;
    expect(expanded.map((s) => s.name)).not.toContain('Kohle');
  });

  it('plots import as a red fill in the production chart', () => {
    const sample = { ...hour(0), importGW: 2, exportGW: 1, dataBoundaryResidualGW: -0.5 };
    const option = buildMixChartOption([sample], DEFAULT_MIX_VISIBILITY, 'linie', undefined, undefined, 'light', false, 'netzlast', 'import');
    const series = option.series as Array<Record<string, unknown>>;
    const imported = series.find((s) => s.name === 'Strom');

    expect(series.map((s) => s.name)).toContain('Strom');
    expect(series.map((s) => s.name)).toContain('Fossil');
    expect(imported?.itemStyle).toMatchObject({ color: '#ef4444' });
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
    expect(radiusAxis.axisLabel.show).toBe(true);
    expect(radial.xAxis).toBeUndefined();
    expect(radialSeries.find((s) => s.name === 'EE')?.coordinateSystem).toBe('polar');
    expect(radialSeries.find((s) => s.name === 'Last')?.coordinateSystem).toBe('polar');
    expect(linear.xAxis).toBeDefined();
    expect(linear.yAxis).toBeDefined();
    expect(linear.polar).toBeUndefined();
    expect(linearSeries.find((s) => s.name === 'EE')?.coordinateSystem).toBeUndefined();
  });

  it('keeps compact radial charts inset enough for mobile labels', () => {
    const option = buildMixChartOption([hour(0)], DEFAULT_MIX_VISIBILITY, 'sunburst', { width: 390, height: 420 });
    const polar = option.polar as { center: string[]; radius: string[] };
    const angleAxis = option.angleAxis as { axisLabel: { fontSize: number; margin: number } };

    expect(polar.center).toEqual(['50%', '50%']);
    expect(polar.radius).toEqual(['3%', '88%']);
    expect(angleAxis.axisLabel).toMatchObject({ fontSize: 8, margin: 3 });
  });

  it('can pin the radial and linear GW scale to the whole simulation result', () => {
    const fullYearMax = mixScaleMaxGW([hourAt('2025-01-01', 72), hourAt('2025-02-01', 113)]);
    const radial = buildMixChartOption([hourAt('2025-01-01', 72)], DEFAULT_MIX_VISIBILITY, 'sunburst', undefined, fullYearMax);
    const linear = buildMixChartOption([hourAt('2025-01-01', 72)], DEFAULT_MIX_VISIBILITY, 'linie', undefined, fullYearMax);

    expect(fullYearMax).toBe(125);
    expect(radial.radiusAxis).toMatchObject({ max: 125 });
    expect(linear.yAxis).toMatchObject({ max: 125 });
  });

  it('can derive a stable reference scale with headroom for scenario comparisons', () => {
    const initialMax = mixScalePeakGW([hourAt('2025-01-01', 76)]);

    expect(initialMax).toBe(76);
    expect(mixReferenceScaleMaxGW(initialMax)).toBe(100);
    expect(mixReferenceScaleMaxGW(280)).toBe(400);
    expect(mixReferenceScaleMaxGW(330)).toBe(400);
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

  it('shows import as the combined balance fill area', () => {
    const option = buildMixChartOption([{ ...hour(0), importGW: 2 }, { ...hour(0), importGW: 12 }], DEFAULT_MIX_VISIBILITY, 'linie');
    const series = option.series as Array<Record<string, unknown>>;
    const imported = series.find((s) => s.name === 'Import');

    expect(imported).toBeDefined();
    expect(imported?.type).toBe('line');
    expect(imported?.data).toEqual([2, 12]);
    expect(imported?.stack).toBe('supply');
    expect(imported?.areaStyle).toMatchObject({ opacity: expect.any(Number) });
    expect(imported?.itemStyle).toMatchObject({ color: '#dc2626' });
    expect(series.find((s) => s.name === 'Unterdeckung')).toBeUndefined();
  });
});
