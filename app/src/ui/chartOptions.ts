import type { EChartsOption } from 'echarts';
import type { SimHour } from '../types/simulation';
import { fmt, fmt0 } from './format';

export type MixLeafKey = 'hydroGW' | 'biomassGW' | 'geothermalGW' | 'nuclearGW' | 'coalGW' | 'oilGW' | 'otherGW' | 'wasteGW' | 'gasGW' | 'windOffGW' | 'windOnGW' | 'solarGW' | 'importGW' | 'batterieDischargeGW' | 'pumpspeicherDischargeGW' | 'h2DischargeGW' | 'loadGW' | 'loadSheddingGW';
export type MixVisibility = Record<MixLeafKey, boolean>;
export type ExtraLeaf = { key: MixLeafKey; label: string; color: string; glyph: '●' | '▨' };
export const EXTRA_LEAVES: ExtraLeaf[] = [
  { key: 'loadGW', label: 'Last', color: '#111827', glyph: '●' },
  { key: 'importGW', label: 'Import', color: '#dc2626', glyph: '●' },
  { key: 'loadSheddingGW', label: 'Fehlend', color: '#b91c1c', glyph: '▨' },
];
export type ChartMode = 'sunburst' | 'linie';
// Zwei Sichten auf die Last:
//  - 'verbrauch': wann Energie gebraucht wird (Direktlast + Industrie-H₂-Verbrauch).
//    Kann über dem Strom-Stapel liegen (im Winter aus Sommer-H₂ gedeckt).
//  - 'erzeugung': wann der Strom gezogen wird (Direktlast + Elektrolyse + Speicher-
//    Laden). Liegt immer im Erzeugungs-Stapel.
export type LoadView = 'verbrauch' | 'erzeugung';
export type ChartViewport = { width: number; height: number };
export type ChartTheme = 'light' | 'dark';
export type MixGroup = { id: string; label: string; color: string; leaves: Array<{ key: MixLeafKey; label: string; color: string }> };

// Stack-Reihenfolge im Chart (Energy-Charts-Konvention: firme Layer unten, Solar oben).
// Unabhaengig von der Legenden-Gruppierung in MIX_GROUPS — die ist nur fuer
// die UI-Pillen relevant.
export const STACK_ORDER: MixLeafKey[] = [
  'hydroGW', 'biomassGW', 'geothermalGW', 'nuclearGW',
  'coalGW', 'oilGW', 'otherGW', 'wasteGW', 'gasGW',
  'windOffGW', 'windOnGW', 'solarGW',
];

export const MIX_GROUPS: MixGroup[] = [
  { id: 'renewable', label: 'Erneuerbar', color: '#16a34a', leaves: [
    { key: 'hydroGW', label: 'Laufwasser', color: '#4338ca' },
    { key: 'biomassGW', label: 'Biomasse', color: '#16a34a' },
    { key: 'geothermalGW', label: 'Geothermie', color: '#3730a3' },
    { key: 'windOffGW', label: 'Wind Offshore', color: '#8aa37f' },
    { key: 'windOnGW', label: 'Wind Onshore', color: '#c5d8bc' },
    { key: 'solarGW', label: 'PV', color: '#facc15' },
  ] },
  { id: 'fossil', label: 'Fossil', color: '#fb923c', leaves: [
    { key: 'coalGW', label: 'Kohle', color: '#57534e' },
    { key: 'oilGW', label: 'Öl', color: '#92400e' },
    { key: 'gasGW', label: 'Gas', color: '#fb923c' },
    { key: 'wasteGW', label: 'Müll', color: '#78350f' },
    { key: 'otherGW', label: 'Sonstige', color: '#8b5cf6' },
  ] },
  { id: 'nuclear', label: 'Kernkraft', color: '#ec4899', leaves: [
    { key: 'nuclearGW', label: 'Kernkraft', color: '#ec4899' },
  ] },
  { id: 'storage', label: 'Speicher', color: '#14b8a6', leaves: [
    { key: 'batterieDischargeGW', label: 'Batterie', color: '#14b8a6' },
    { key: 'pumpspeicherDischargeGW', label: 'Pumpspeicher', color: '#0284c7' },
    { key: 'h2DischargeGW', label: 'Wasserstoff', color: '#06b6d4' },
  ] },
];

export const DEFAULT_MIX_VISIBILITY: MixVisibility = {
  ...Object.fromEntries(MIX_GROUPS.flatMap(group => group.leaves.map(leaf => [leaf.key, true]))),
  ...Object.fromEntries(EXTRA_LEAVES.map(leaf => [leaf.key, true])),
} as MixVisibility;

const shortDateLabel = (hour: SimHour) => new Date(hour.time).toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit', timeZone: 'Europe/Berlin' });
const dayLabels = (hours: SimHour[]) => hours.map(shortDateLabel);
const dateKey = (hour: SimHour) => new Date(hour.time).toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
const berlinHourLabel = (hour: SimHour) => new Date(hour.time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin', hour12: false });
// Datum + Uhrzeit, sobald das Fenster stündlich aufgelöst ist (mehr Punkte als Tage).
const hourlyLabels = (hours: SimHour[]) => hours.map(hour => `${shortDateLabel(hour)} ${berlinHourLabel(hour)}`);
const isHourlyResolution = (hours: SimHour[]) => hours.length > new Set(hours.map(dateKey)).size;
const dateParts = (date: string) => ({ month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) });

const averageBucket = (bucket: SimHour[], numericKeys: (keyof SimHour)[]): SimHour => {
  const row: Record<string, string | number> = { time: `${dateKey(bucket[0])}T00:00:00Z` };
  for (const key of numericKeys) row[key] = bucket.reduce((sum, hour) => sum + Number(hour[key]), 0) / bucket.length;
  return row as unknown as SimHour;
};

const chronologicalDailyAverages = (hours: SimHour[], numericKeys: (keyof SimHour)[]) => {
  const buckets = new Map<string, SimHour[]>();
  for (const hour of hours) {
    const date = dateKey(hour);
    buckets.set(date, [...(buckets.get(date) ?? []), hour]);
  }
  return [...buckets.entries()]
    .map(([, bucket]) => averageBucket(bucket, numericKeys))
    .sort((a, b) => {
      const left = dateParts(dateKey(a));
      const right = dateParts(dateKey(b));
      return left.month - right.month || left.day - right.day;
    });
};

const compressHours = (hours: SimHour[], maxPoints = 744) => {
  if (hours.length <= maxPoints) return hours;
  const numericKeys = Object.keys(hours[0]).filter((key) => key !== 'time') as (keyof SimHour)[];
  const uniqueDates = new Set(hours.map(dateKey));
  if (uniqueDates.size >= 360) return chronologicalDailyAverages(hours, numericKeys);
  const step = Math.ceil(hours.length / maxPoints);
  const compressed: SimHour[] = [];
  for (let start = 0; start < hours.length; start += step) {
    const bucket = hours.slice(start, start + step);
    compressed.push(averageBucket(bucket, numericKeys));
  }
  return compressed;
};

const isFullYearView = (hours: SimHour[], chartHours: SimHour[]) => new Set([...hours, ...chartHours].map(dateKey)).size >= 360;
const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const shortMonthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const xAxisLabels = (hours: SimHour[], chartHours: SimHour[]) => {
  if (!isFullYearView(hours, chartHours)) return isHourlyResolution(chartHours) ? hourlyLabels(chartHours) : dayLabels(chartHours);
  const slots = new Map<number, string>();
  monthNames.forEach((label, index) => slots.set(Math.round(index * (chartHours.length - 1) / (monthNames.length - 1)), label));
  return chartHours.map((_, index) => slots.get(index) ?? '');
};

const angleAxisLabels = (hours: SimHour[], chartHours: SimHour[]) => {
  if (!isFullYearView(hours, chartHours)) return isHourlyResolution(chartHours) ? hourlyLabels(chartHours) : dayLabels(chartHours);
  const slots = new Map<number, string>();
  shortMonthNames.forEach((label, index) => slots.set(Math.min(chartHours.length - 1, Math.round((index + 0.5) * chartHours.length / shortMonthNames.length)), label));
  return chartHours.map((_, index) => slots.get(index) ?? '');
};

const chartTheme = (theme: ChartTheme = 'light') => theme === 'dark'
  ? {
      axisText: '#a1a1aa',
      axisLine: '#3f3f46',
      splitLine: 'rgba(244,244,245,.10)',
      tooltipBg: 'rgba(24,24,27,.97)',
      tooltipBorder: '#3f3f46',
      tooltipText: '#f4f4f5',
      tooltipMuted: '#a1a1aa',
      tooltipBold: '#fafafa',
      tooltipShadow: '0 12px 30px rgba(0,0,0,.38)',
      loadColor: '#fafafa',
      loadDot: '#e4e4e7',
    }
  : {
      axisText: '#71717a',
      axisLine: '#e4e4e7',
      splitLine: 'rgba(24,24,27,.08)',
      tooltipBg: 'rgba(255,255,255,.96)',
      tooltipBorder: '#e5e7eb',
      tooltipText: '#111827',
      tooltipMuted: '#71717a',
      tooltipBold: '#111827',
      tooltipShadow: '0 12px 30px rgba(24,24,27,.12)',
      loadColor: '#111827',
      loadDot: '#111827',
    };

const xAxis = (hours: SimHour[], chartHours: SimHour[], theme: ChartTheme = 'light') => {
  const colors = chartTheme(theme);
  // Bei stündlicher Auflösung gibt es zu viele Labels für eine horizontale Achse:
  // angewinkelt (Excel-Style) und automatisch ausdünnen statt überlappen lassen.
  const hourly = !isFullYearView(hours, chartHours) && isHourlyResolution(chartHours);
  return {
  type: 'category' as const,
  data: xAxisLabels(hours, chartHours),
  axisTick: { show: false },
  axisLabel: hourly
    ? { color: colors.axisText, interval: 0, hideOverlap: true, rotate: 45, fontSize: 9, margin: 10 }
    : { color: colors.axisText, interval: 0, hideOverlap: false, fontSize: 10, margin: 14 },
  axisLine: { lineStyle: { color: colors.axisLine } },
  };
};

const angleAxis = (hours: SimHour[], chartHours: SimHour[], compact = false, theme: ChartTheme = 'light') => {
  const colors = chartTheme(theme);
  return {
  type: 'category' as const,
  data: angleAxisLabels(hours, chartHours),
  boundaryGap: false,
  startAngle: 90,
  clockwise: true,
  axisTick: { show: false },
  axisLabel: { color: colors.axisText, interval: 0, hideOverlap: true, fontSize: compact ? 8 : 10, margin: compact ? 3 : 18 },
  axisLine: { lineStyle: { color: colors.axisLine } },
  splitLine: { show: true, lineStyle: { color: colors.splitLine } },
  };
};

const roundedAxisMax = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  if (value <= 10) return Math.ceil(value);
  const step = value <= 100 ? 10 : 25;
  return Math.ceil(value / step) * step;
};

export function roundedMixScaleMaxGW(value: number) {
  return roundedAxisMax(value);
}

export function mixReferenceScaleMaxGW(peakGW: number, headroom = 1.5) {
  if (!Number.isFinite(peakGW) || peakGW <= 0) return undefined;
  const target = peakGW * headroom;
  const step = target <= 100 ? 10 : target <= 250 ? 25 : 100;
  const roundedDownTarget = Math.floor(target / step) * step;
  const peakCeiling = roundedAxisMax(peakGW);
  if (!peakCeiling) return undefined;
  return Math.max(roundedDownTarget, peakCeiling);
}

export function mixScalePeakGW(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY) {
  return hours.reduce((currentMax, hour) => {
    const supply = MIX_GROUPS.reduce((sum, group) => sum + group.leaves.reduce((groupSum, leaf) => groupSum + (visibility[leaf.key] ? valueOf(hour, leaf.key) : 0), 0), 0)
      + (visibility.importGW ? hour.importGW : 0)
      + (visibility.loadSheddingGW ? hour.loadSheddingGW : 0);
    const load = visibility.loadGW ? hour.loadGW : 0;
    return Math.max(currentMax, supply, load);
  }, 0);
}

export function mixScaleMaxGW(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY) {
  return roundedAxisMax(mixScalePeakGW(hours, visibility));
}

const radiusAxis = (unit = 'GW', max?: number, theme: ChartTheme = 'light') => {
  const colors = chartTheme(theme);
  return {
  type: 'value' as const,
  ...(max ? { max } : {}),
  axisLabel: { show: true, color: colors.axisText, fontSize: 9, formatter: `{value} ${unit}` },
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: colors.splitLine } },
  };
};

const yAxis = (unit = 'GW', max?: number, theme: ChartTheme = 'light') => {
  const colors = chartTheme(theme);
  return {
  type: 'value' as const,
  ...(max ? { max } : {}),
  axisLabel: { color: colors.axisText, formatter: `{value} ${unit}` },
  splitLine: { lineStyle: { color: colors.splitLine } },
  };
};

const isCompactChart = (viewport?: ChartViewport) => (viewport?.width ?? 9999) < 640;
const compactPolarOuterRadius = (viewport?: ChartViewport) => {
  const width = viewport?.width ?? 0;
  if (width > 0 && width < 380) return '86%';
  if (width > 0 && width < 430) return '88%';
  return '90%';
};
const mixCoordinate = (mode: ChartMode, hours: SimHour[], chartHours: SimHour[], viewport?: ChartViewport, scaleMaxGW?: number, theme: ChartTheme = 'light') => {
  if (mode === 'sunburst') {
    const compact = isCompactChart(viewport);
    return {
      polar: {
        center: ['50%', compact ? '50%' : '52%'],
        // Außenradius ~20 % kleiner als zuvor (96 %): mehr Luft links/rechts.
        radius: compact ? ['3%', compactPolarOuterRadius(viewport)] : ['5%', '77%'],
      },
      angleAxis: angleAxis(hours, chartHours, compact, theme),
      radiusAxis: radiusAxis('GW', scaleMaxGW, theme),
    };
  }
  const compact = isCompactChart(viewport);
  return {
    grid: compact
      ? { left: 4, right: 4, top: 6, bottom: 24, containLabel: true }
      : { left: 44, right: 20, top: 10, bottom: 48 },
    xAxis: xAxis(hours, chartHours, theme),
    yAxis: yAxis('GW', scaleMaxGW, theme),
  };
};

const valueOf = (hour: SimHour, key: MixLeafKey) => Number((hour as unknown as Record<string, number>)[key] ?? 0);
const tooltipMaxWidth = (viewport?: ChartViewport) => {
  const width = viewport?.width ?? 0;
  if (width > 0 && width < 420) return Math.max(244, width - 28);
  if (width > 0 && width < 640) return Math.min(320, width - 32);
  return 360;
};

const tooltipPosition = (viewport?: ChartViewport) => (
  point: [number, number],
  _params: unknown,
  _dom: unknown,
  _rect: unknown,
  size: { contentSize: [number, number]; viewSize: [number, number] },
) => {
  const margin = isCompactChart(viewport) ? 8 : 12;
  const [contentWidth, contentHeight] = size.contentSize;
  const [viewWidth, viewHeight] = size.viewSize;
  const x = Math.min(Math.max(point[0] + margin, margin), Math.max(margin, viewWidth - contentWidth - margin));
  const y = Math.min(Math.max(point[1] + margin, margin), Math.max(margin, viewHeight - contentHeight - margin));
  return [x, y];
};

const areaSeries = (name: string, color: string, data: number[], mode: ChartMode) => ({
  name,
  type: 'line' as const,
  ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
  stack: 'supply',
  showSymbol: false,
  smooth: false,
  areaStyle: { opacity: .28 },
  lineStyle: { width: .8, opacity: .9 },
  itemStyle: { color },
  data,
});

export function buildMixChartOption(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY, mode: ChartMode = 'sunburst', viewport?: ChartViewport, scaleMaxGW?: number, theme: ChartTheme = 'light', withStorage = false, loadView: LoadView = 'verbrauch'): EChartsOption {
  const chartHours = compressHours(hours);
  const colors = chartTheme(theme);
  // Last je Sicht: verbrauchsorientiert (Direktlast + Industrie-H₂-Verbrauch)
  // oder erzeugungsorientiert (Direktlast + Elektrolyse + Speicher-Laden).
  const loadValue = (h: SimHour) => loadView === 'erzeugung'
    ? h.loadGW + h.storageChargeGW
    : h.loadGW + h.h2PoolReductionGW;
  const leafMeta = new Map(MIX_GROUPS.flatMap(group => group.leaves).map(leaf => [leaf.key, leaf]));
  const supplySeries = STACK_ORDER
    .filter(key => visibility[key] && leafMeta.has(key))
    .map(key => {
      const leaf = leafMeta.get(key)!;
      return areaSeries(leaf.label, leaf.color, chartHours.map(h => valueOf(h, key)), mode);
    });
  const baseCoordinate = mixCoordinate(mode, hours, chartHours, viewport, scaleMaxGW, theme);
  // Speicher-Füllstand als Overlay: zweite, unsichtbare 0–100-%-Achse über
  // derselben Winkel- bzw. Zeitachse; Linien normiert auf das jeweilige
  // Speichermaximum des Szenarios.
  const batData = chartHours.map(h => h.batteryGWh);
  const h2Data = chartHours.map(h => h.h2GWh);
  const batMax = Math.max(1e-9, ...batData);
  const h2Max = Math.max(1e-9, ...h2Data);
  const coordinate: EChartsOption = withStorage
    ? (mode === 'sunburst'
      ? (() => {
        const c = baseCoordinate as { polar: object; angleAxis: object; radiusAxis: object };
        return {
          polar: [c.polar, { ...c.polar }],
          angleAxis: [c.angleAxis, { ...c.angleAxis, polarIndex: 1, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
          radiusAxis: [c.radiusAxis, { polarIndex: 1, type: 'value', min: 0, max: 104, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
        } as EChartsOption;
      })()
      : (() => {
        const c = baseCoordinate as { grid: object; xAxis: object; yAxis: object };
        return {
          grid: c.grid,
          xAxis: c.xAxis,
          yAxis: [c.yAxis, { type: 'value', min: 0, max: 104, axisLabel: { show: false }, axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false } }],
        } as EChartsOption;
      })())
    : baseCoordinate as EChartsOption;
  const storageFillSeries = (name: string, color: string, data: number[], max: number) => ({
    name,
    type: 'line' as const,
    ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const, polarIndex: 1 } : { yAxisIndex: 1 }),
    showSymbol: false,
    smooth: false,
    z: 6,
    lineStyle: { width: 1.6, type: 'dashed' as const, color },
    itemStyle: { color },
    data: data.map(v => v / max * 100),
  });
  // HTML-Tooltip via DOM-Overlay: nativ über ECharts, läuft im Main-Thread
  // und rendert mit echter Typografie + selektierbarem Text. Helfer für
  // farbige Punkte / Bold / Muted-Zeilen.
  const compactTooltip = isCompactChart(viewport);
  const maxTooltipWidth = tooltipMaxWidth(viewport);
  const hourlyTooltip = isHourlyResolution(chartHours);
  const dot = (color: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle"></span>`;
  const square = (color: string) => `<span style="display:inline-block;width:8px;height:8px;background:${color};margin-right:4px;vertical-align:middle"></span>`;
  const bold = (text: string) => `<b style="color:${colors.tooltipBold}">${text}</b>`;
  const muted = (text: string) => `<span style="color:${colors.tooltipMuted}">${text}</span>`;
  const row = (content: string) => `<div style="margin-top:4px">${content}</div>`;
  const detailLine = (content: string) => compactTooltip ? '' : `<div style="margin-left:12px;margin-top:2px;color:${colors.tooltipMuted}">${content}</div>`;
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      triggerOn: 'mousemove|click',
      confine: true,
      appendToBody: false,
      enterable: false,
      position: tooltipPosition(viewport),
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      padding: compactTooltip ? [8, 9] : [10, 12],
      textStyle: { color: colors.tooltipText, fontSize: 12 },
      extraCssText: [
        `max-width:${maxTooltipWidth}px`,
        'white-space:normal',
        'overflow-wrap:anywhere',
        'line-height:1.35',
        `box-shadow:${colors.tooltipShadow}`,
      ].join(';'),
      formatter: (raw: unknown) => {
        const params = Array.isArray(raw) ? raw as Array<{ dataIndex: number }> : [];
        const index = params[0]?.dataIndex ?? 0;
        const hour = chartHours[index];
        if (!hour) return '';
        const headerLabel = hourlyTooltip ? `${shortDateLabel(hour)} ${berlinHourLabel(hour)} Uhr` : shortDateLabel(hour);
        const lines = [`<div>${bold(headerLabel)}</div>`];
        for (const group of MIX_GROUPS) {
          const active = group.leaves.filter(leaf => visibility[leaf.key]);
          if (!active.length) continue;
          const total = active.reduce((sum, leaf) => sum + valueOf(hour, leaf.key), 0);
          const leafDetails = active.map(leaf => `${dot(leaf.color)}${leaf.label} ${fmt.format(valueOf(hour, leaf.key))}`).join(' · ');
          lines.push(row(`${dot(group.color)}${group.label}: ${bold(`${fmt.format(total)} GW`)}${detailLine(muted(leafDetails))}`));
        }
        {
          const parts: string[] = [];
          if (visibility.batterieDischargeGW && hour.batterieDischargeGW > 0) parts.push(`${dot('#14b8a6')}Batterie ${fmt.format(hour.batterieDischargeGW)}`);
          if (visibility.pumpspeicherDischargeGW && hour.pumpspeicherDischargeGW > 0) parts.push(`${dot('#0284c7')}Pumpspeicher ${fmt.format(hour.pumpspeicherDischargeGW)}`);
          if (visibility.h2DischargeGW && hour.h2DischargeGW > 0) parts.push(`${dot('#06b6d4')}Wasserstoff ${fmt.format(hour.h2DischargeGW)}`);
          if (parts.length) {
            const total = (visibility.batterieDischargeGW ? hour.batterieDischargeGW : 0)
              + (visibility.pumpspeicherDischargeGW ? hour.pumpspeicherDischargeGW : 0)
              + (visibility.h2DischargeGW ? hour.h2DischargeGW : 0);
            lines.push(row(`${dot('#0d9488')}Speicher: ${bold(`${fmt.format(total)} GW`)}${detailLine(muted(parts.join(' · ')))}`));
          }
        }
        if (visibility.importGW) lines.push(row(`${dot('#dc2626')}Import: ${bold(`${fmt.format(hour.importGW)} GW`)}`));
        if (visibility.loadSheddingGW && hour.loadSheddingGW > 0) lines.push(row(`${square('#b91c1c')}Fehlend: ${bold(`${fmt.format(hour.loadSheddingGW)} GW`)}`));
        if (hour.exportGW > 0) lines.push(row(`${dot('#94a3b8')}Export: ${bold(`${fmt.format(hour.exportGW)} GW`)}`));
        if (hour.dataBoundaryResidualGW !== 0) lines.push(row(`${dot('#64748b')}Abgrenzungsrest: ${bold(`${fmt.format(hour.dataBoundaryResidualGW)} GW`)}`));
        if (withStorage) lines.push(row(`${dot('#10b981')}Füllstand: ${bold(`${fmt0.format(hour.batteryGWh / batMax * 100)} %`)} ${muted('Batterie')} · ${bold(`${fmt0.format(hour.h2GWh / h2Max * 100)} %`)} ${muted('H₂')}`));
        if (visibility.loadGW) {
          const extra = loadView === 'erzeugung' ? hour.storageChargeGW : hour.h2PoolReductionGW;
          const extraLabel = loadView === 'erzeugung' ? 'Elektrolyse/Speicher-Laden' : 'Industrie-H₂';
          lines.push(row(`${dot(colors.loadDot)}Last: ${bold(`${fmt.format(hour.loadGW + extra)} GW`)}${extra > 0.05 ? detailLine(muted(`Strom ${fmt.format(hour.loadGW)} + ${extraLabel} ${fmt.format(extra)}`)) : ''}`));
        }
        return `<div style="box-sizing:border-box;max-width:${maxTooltipWidth}px;max-height:min(360px,calc(100vh - 24px));overflow:auto">${lines.join('')}</div>`;
      },
    },
    legend: { show: false },
    ...coordinate,
    series: [
      ...supplySeries,
      ...(visibility.batterieDischargeGW ? [areaSeries('Batterie ←', '#14b8a6', chartHours.map((h) => h.batterieDischargeGW), mode)] : []),
      ...(visibility.pumpspeicherDischargeGW ? [areaSeries('Pumpspeicher ←', '#0284c7', chartHours.map((h) => h.pumpspeicherDischargeGW), mode)] : []),
      ...(visibility.h2DischargeGW ? [areaSeries('Wasserstoff ←', '#06b6d4', chartHours.map((h) => h.h2DischargeGW), mode)] : []),
      ...(visibility.importGW ? [areaSeries('Import', '#dc2626', chartHours.map((h) => h.importGW), mode)] : []),
      ...(visibility.loadSheddingGW ? [{
        name: 'Fehlend',
        type: 'line' as const,
        ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
        stack: 'supply',
        showSymbol: false,
        smooth: false,
        areaStyle: { color: '#b91c1c', opacity: 0.85 },
        lineStyle: { color: '#7f1d1d', width: 1.2 },
        itemStyle: { color: '#b91c1c' },
        data: chartHours.map((h) => h.loadSheddingGW),
      }] : []),
      // "Last" = direkte Stromlast + H₂-Elektrolyse. Die Elektrolyse (Industrie-H₂)
      // ist echter Strombezug und gehört zur Last — so sieht man, wo die Last
      // wirklich läuft. Liegt per Energiebilanz immer im Erzeugungs-Stapel
      // (Abstand zum Stapel = Curtailment + Export, vom Stapel gedeckt).
      ...(visibility.loadGW ? [{
        name: 'Last',
        type: 'line' as const,
        ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
        showSymbol: false,
        smooth: false,
        itemStyle: { color: colors.loadColor },
        lineStyle: { width: 2.2, color: colors.loadColor },
        data: chartHours.map(loadValue),
      }] : []),
      ...(withStorage ? [
        storageFillSeries('Batterie-Füllstand', '#10b981', batData, batMax),
        storageFillSeries('H₂-Füllstand', '#0891b2', h2Data, h2Max),
      ] : []),
    ],
  };
}

export function buildStorageChartOption(hours: SimHour[], theme: ChartTheme = 'light', mode: ChartMode = 'linie', viewport?: ChartViewport): EChartsOption {
  const chartHours = compressHours(hours);
  const colors = chartTheme(theme);
  const line = (name: string, color: string, data: number[]) => ({
    name,
    type: 'line' as const,
    ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
    smooth: false,
    showSymbol: false,
    itemStyle: { color },
    data,
  });
  // Gleiche Polar-Geometrie wie der Energiemix: Winkel = Jahresverlauf,
  // Radius = Füllstand. Im Linienmodus klassische Zeitachse.
  const compact = isCompactChart(viewport);
  const coordinate = mode === 'sunburst'
    ? {
      polar: {
        center: ['50%', compact ? '50%' : '52%'],
        radius: compact ? ['3%', compactPolarOuterRadius(viewport)] : ['5%', '77%'],
      },
      angleAxis: angleAxis(hours, chartHours, compact, theme),
      radiusAxis: radiusAxis('GWh', undefined, theme),
    }
    : {
      grid: { left: 46, right: 20, top: 18, bottom: 48 },
      xAxis: xAxis(hours, chartHours, theme),
      yAxis: yAxis('GWh', undefined, theme),
    };
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis', backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder, textStyle: { color: colors.tooltipText } },
    ...coordinate,
    series: [
      line('Batterie', '#10b981', chartHours.map(h => h.batteryGWh)),
      line('H₂', '#0891b2', chartHours.map(h => h.h2GWh)),
    ],
  };
}
