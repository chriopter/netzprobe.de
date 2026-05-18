import type { EChartsOption } from 'echarts';
import type { SimHour } from '../simulation/engine';
import { fmt } from './format';

export type MixLeafKey = 'hydroGW' | 'biomassGW' | 'geothermalGW' | 'nuclearGW' | 'coalGW' | 'oilGW' | 'otherGW' | 'wasteGW' | 'gasGW' | 'windOffGW' | 'windOnGW' | 'solarGW' | 'importGW' | 'storageDischargeGW' | 'loadGW' | 'loadSheddingGW';
export type MixVisibility = Record<MixLeafKey, boolean>;
export type ExtraLeaf = { key: MixLeafKey; label: string; color: string; glyph: '●' | '▨' };
export const EXTRA_LEAVES: ExtraLeaf[] = [
  { key: 'loadGW', label: 'Last', color: '#111827', glyph: '●' },
  { key: 'importGW', label: 'Import', color: '#dc2626', glyph: '●' },
  { key: 'storageDischargeGW', label: 'Speicher (Batterie/PSP/H₂)', color: '#14b8a6', glyph: '●' },
  { key: 'loadSheddingGW', label: 'Fehlend', color: '#b91c1c', glyph: '▨' },
];
export type ChartMode = 'sunburst' | 'linie';
export type ChartViewport = { width: number; height: number };
export type MixGroup = { id: string; label: string; color: string; leaves: Array<{ key: MixLeafKey; label: string; color: string }> };

export const MIX_GROUPS: MixGroup[] = [
  { id: 'base', label: 'Grundlast', color: '#2563eb', leaves: [
    { key: 'hydroGW', label: 'Wasser', color: '#4338ca' },
    { key: 'biomassGW', label: 'Bio', color: '#16a34a' },
    { key: 'geothermalGW', label: 'Geo', color: '#3730a3' },
    { key: 'nuclearGW', label: 'Kernkraft', color: '#ec4899' },
  ] },
  { id: 'fossil', label: 'Fossil', color: '#fb923c', leaves: [
    { key: 'coalGW', label: 'Kohle', color: '#57534e' },
    { key: 'oilGW', label: 'Öl', color: '#92400e' },
    { key: 'otherGW', label: 'Sonstige', color: '#8b5cf6' },
    { key: 'wasteGW', label: 'Müll', color: '#78350f' },
    { key: 'gasGW', label: 'Gas', color: '#fb923c' },
  ] },
  { id: 'wind', label: 'Wind', color: '#c5d8bc', leaves: [
    { key: 'windOffGW', label: 'Wind Offshore', color: '#8aa37f' },
    { key: 'windOnGW', label: 'Wind Onshore', color: '#c5d8bc' },
  ] },
  { id: 'solar', label: 'Solar', color: '#facc15', leaves: [
    { key: 'solarGW', label: 'Solar', color: '#facc15' },
  ] },
];

export const DEFAULT_MIX_VISIBILITY: MixVisibility = {
  ...Object.fromEntries(MIX_GROUPS.flatMap(group => group.leaves.map(leaf => [leaf.key, true]))),
  ...Object.fromEntries(EXTRA_LEAVES.map(leaf => [leaf.key, true])),
} as MixVisibility;

const shortDateLabel = (hour: SimHour) => new Date(hour.time).toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit', timeZone: 'Europe/Berlin' });
const dayLabels = (hours: SimHour[]) => hours.map(shortDateLabel);
const dateKey = (hour: SimHour) => new Date(hour.time).toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
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

const compressHours = (hours: SimHour[], maxPoints = 365) => {
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

const isFullYearCompressed = (hours: SimHour[], chartHours: SimHour[]) => hours.length > chartHours.length && new Set(hours.map(dateKey)).size >= 360;
const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const shortMonthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const xAxisLabels = (hours: SimHour[], chartHours: SimHour[]) => {
  if (!isFullYearCompressed(hours, chartHours)) return dayLabels(chartHours);
  const slots = new Map<number, string>();
  monthNames.forEach((label, index) => slots.set(Math.round(index * (chartHours.length - 1) / (monthNames.length - 1)), label));
  return chartHours.map((_, index) => slots.get(index) ?? '');
};

const angleAxisLabels = (hours: SimHour[], chartHours: SimHour[]) => {
  if (!isFullYearCompressed(hours, chartHours)) return dayLabels(chartHours);
  const slots = new Map<number, string>();
  shortMonthNames.forEach((label, index) => slots.set(Math.min(chartHours.length - 1, Math.round((index + 0.5) * chartHours.length / shortMonthNames.length)), label));
  return chartHours.map((_, index) => slots.get(index) ?? '');
};

const xAxis = (hours: SimHour[], chartHours: SimHour[]) => ({
  type: 'category' as const,
  data: xAxisLabels(hours, chartHours),
  axisTick: { show: false },
  axisLabel: { color: '#71717a', interval: 0, hideOverlap: false, fontSize: 10, margin: 14 },
  axisLine: { lineStyle: { color: '#e4e4e7' } },
});

const angleAxis = (hours: SimHour[], chartHours: SimHour[], compact = false) => ({
  type: 'category' as const,
  data: angleAxisLabels(hours, chartHours),
  boundaryGap: false,
  startAngle: 90,
  clockwise: true,
  axisTick: { show: false },
  axisLabel: { color: '#71717a', interval: 0, hideOverlap: true, fontSize: compact ? 9 : 10, margin: compact ? 8 : 18 },
  axisLine: { lineStyle: { color: '#e4e4e7' } },
  splitLine: { show: true, lineStyle: { color: 'rgba(24,24,27,.06)' } },
});

const radiusAxis = (unit = 'GW') => ({
  type: 'value' as const,
  axisLabel: { show: true, color: '#71717a', fontSize: 9, formatter: `{value} ${unit}` },
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: 'rgba(24,24,27,.08)' } },
});

const yAxis = (unit = 'GW') => ({
  type: 'value' as const,
  axisLabel: { color: '#71717a', formatter: `{value} ${unit}` },
  splitLine: { lineStyle: { color: 'rgba(24,24,27,.08)' } },
});

const isCompactChart = (viewport?: ChartViewport) => (viewport?.width ?? 9999) < 640;
const compactPolarOuterRadius = (viewport?: ChartViewport) => {
  const width = viewport?.width ?? 0;
  if (width > 0 && width < 380) return '84%';
  if (width > 0 && width < 430) return '87%';
  return '90%';
};
const mixCoordinate = (mode: ChartMode, hours: SimHour[], chartHours: SimHour[], viewport?: ChartViewport) => {
  if (mode === 'sunburst') {
    const compact = isCompactChart(viewport);
    return {
      polar: {
        center: ['50%', compact ? '50%' : '52%'],
        radius: compact ? ['3%', compactPolarOuterRadius(viewport)] : ['6%', '96%'],
      },
      angleAxis: angleAxis(hours, chartHours, compact),
      radiusAxis: radiusAxis('GW'),
    };
  }
  const compact = isCompactChart(viewport);
  return {
    grid: compact
      ? { left: 4, right: 4, top: 6, bottom: 24, containLabel: true }
      : { left: 44, right: 20, top: 10, bottom: 48 },
    xAxis: xAxis(hours, chartHours),
    yAxis: yAxis('GW'),
  };
};

const valueOf = (hour: SimHour, key: MixLeafKey) => Number((hour as unknown as Record<string, number>)[key] ?? 0);
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

export function buildMixChartOption(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY, mode: ChartMode = 'sunburst', viewport?: ChartViewport): EChartsOption {
  const chartHours = compressHours(hours);
  const supplySeries = MIX_GROUPS.flatMap(group => group.leaves.filter(leaf => visibility[leaf.key]).map(leaf => areaSeries(leaf.label, leaf.color, chartHours.map(h => valueOf(h, leaf.key)), mode)));
  const coordinate = mixCoordinate(mode, hours, chartHours, viewport);
  // HTML-Tooltip via DOM-Overlay: nativ über ECharts, läuft im Main-Thread
  // und rendert mit echter Typografie + selektierbarem Text. Helfer für
  // farbige Punkte / Bold / Muted-Zeilen.
  const dot = (color: string) => `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:4px;vertical-align:middle"></span>`;
  const square = (color: string) => `<span style="display:inline-block;width:8px;height:8px;background:${color};margin-right:4px;vertical-align:middle"></span>`;
  const bold = (text: string) => `<b style="color:#111827">${text}</b>`;
  const muted = (text: string) => `<span style="color:#71717a">${text}</span>`;
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,.96)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#111827', fontSize: 12 },
      formatter: (raw: unknown) => {
        const params = Array.isArray(raw) ? raw as Array<{ dataIndex: number }> : [];
        const index = params[0]?.dataIndex ?? 0;
        const hour = chartHours[index];
        if (!hour) return '';
        const lines = [bold(shortDateLabel(hour))];
        for (const group of MIX_GROUPS) {
          const active = group.leaves.filter(leaf => visibility[leaf.key]);
          if (!active.length) continue;
          const total = active.reduce((sum, leaf) => sum + valueOf(hour, leaf.key), 0);
          const detail = active.map(leaf => `${dot(leaf.color)}${leaf.label} ${fmt.format(valueOf(hour, leaf.key))}`).join(' · ');
          lines.push(`${dot(group.color)}${group.label}: ${bold(`${fmt.format(total)} GW`)}<br><span style="margin-left:12px">${muted(detail)}</span>`);
        }
        if (visibility.storageDischargeGW && hour.storageDischargeGW > 0) lines.push(`${dot('#0d9488')}Speicher: ${bold(`${fmt.format(hour.storageDischargeGW)} GW`)}<br><span style="margin-left:12px">${muted(`${dot('#14b8a6')}Batterie ${fmt.format(hour.batterieDischargeGW)} · ${dot('#0284c7')}PSP ${fmt.format(hour.pumpspeicherDischargeGW)} · ${dot('#06b6d4')}H₂ ${fmt.format(hour.h2DischargeGW)}`)}</span>`);
        if (visibility.importGW) lines.push(`${dot('#dc2626')}Import: ${bold(`${fmt.format(hour.importGW)} GW`)}`);
        if (visibility.loadSheddingGW && hour.loadSheddingGW > 0) lines.push(`${square('#b91c1c')}Fehlend: ${bold(`${fmt.format(hour.loadSheddingGW)} GW`)}`);
        if (hour.exportGW > 0) lines.push(`${dot('#94a3b8')}Export: ${bold(`${fmt.format(hour.exportGW)} GW`)}`);
        if (hour.dataBoundaryResidualGW !== 0) lines.push(`${dot('#64748b')}Abgrenzungsrest: ${bold(`${fmt.format(hour.dataBoundaryResidualGW)} GW`)}`);
        if (visibility.loadGW) lines.push(`${dot('#111827')}Last: ${bold(`${fmt.format(hour.loadGW)} GW`)}`);
        return lines.join('<br>');
      },
    },
    legend: { show: false },
    ...coordinate,
    series: [
      ...supplySeries,
      ...(visibility.storageDischargeGW ? [
        areaSeries('Batterie ←', '#14b8a6', chartHours.map((h) => h.batterieDischargeGW), mode),
        areaSeries('Pumpspeicher ←', '#0284c7', chartHours.map((h) => h.pumpspeicherDischargeGW), mode),
        areaSeries('H₂ ←', '#06b6d4', chartHours.map((h) => h.h2DischargeGW), mode),
      ] : []),
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
      ...(visibility.loadGW ? [{
        name: 'Last',
        type: 'line' as const,
        ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2.2 },
        itemStyle: { color: '#111827' },
        data: chartHours.map((h) => h.loadGW),
      }] : []),
    ],
  };
}

export function buildStorageChartOption(hours: SimHour[]): EChartsOption {
  const chartHours = compressHours(hours);
  const line = (name: string, color: string, data: number[]) => ({
    name,
    type: 'line' as const,
    smooth: false,
    showSymbol: false,
    itemStyle: { color },
    data,
  });
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,.96)', borderColor: '#e5e7eb', textStyle: { color: '#111827' } },
    grid: { left: 46, right: 20, top: 18, bottom: 48 },
    xAxis: xAxis(hours, chartHours),
    yAxis: yAxis('GWh'),
    series: [
      line('Batterie', '#10b981', chartHours.map(h => h.batteryGWh)),
      line('H₂', '#0891b2', chartHours.map(h => h.h2GWh)),
    ],
  };
}
