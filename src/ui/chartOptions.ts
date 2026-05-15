import type { EChartsOption } from 'echarts';
import type { SimHour } from '../simulation/engine';
import { fmt } from './format';

export type MixLeafKey = 'hydroGW' | 'biomassGW' | 'geothermalGW' | 'nuclearGW' | 'coalGW' | 'oilGW' | 'otherGW' | 'wasteGW' | 'gasGW' | 'windOffGW' | 'windOnGW' | 'solarGW';
export type MixVisibility = Record<MixLeafKey, boolean>;
export type ChartMode = 'sunburst' | 'linie';
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

export const DEFAULT_MIX_VISIBILITY: MixVisibility = Object.fromEntries(
  MIX_GROUPS.flatMap(group => group.leaves.map(leaf => [leaf.key, true])),
) as MixVisibility;

const shortDateLabel = (hour: SimHour) => new Date(hour.time).toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit' });
const dayLabels = (hours: SimHour[]) => hours.map(shortDateLabel);
const dateKey = (hour: SimHour) => hour.time.slice(0, 10);
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

const angleAxis = (hours: SimHour[], chartHours: SimHour[]) => ({
  type: 'category' as const,
  data: angleAxisLabels(hours, chartHours),
  boundaryGap: false,
  startAngle: 90,
  clockwise: true,
  axisTick: { show: false },
  axisLabel: { color: '#71717a', interval: 0, hideOverlap: true, fontSize: 10, margin: 18 },
  axisLine: { lineStyle: { color: '#e4e4e7' } },
  splitLine: { show: true, lineStyle: { color: 'rgba(24,24,27,.06)' } },
});

const radiusAxis = (unit = 'GW') => ({
  type: 'value' as const,
  axisLabel: { show: false, color: '#71717a', formatter: `{value} ${unit}` },
  axisLine: { show: false },
  axisTick: { show: false },
  splitLine: { lineStyle: { color: 'rgba(24,24,27,.08)' } },
});

const yAxis = (unit = 'GW') => ({
  type: 'value' as const,
  axisLabel: { color: '#71717a', formatter: `{value} ${unit}` },
  splitLine: { lineStyle: { color: 'rgba(24,24,27,.08)' } },
});

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

export function buildMixChartOption(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY, mode: ChartMode = 'sunburst'): EChartsOption {
  const chartHours = compressHours(hours);
  const supplySeries = MIX_GROUPS.flatMap(group => group.leaves.filter(leaf => visibility[leaf.key]).map(leaf => areaSeries(leaf.label, leaf.color, chartHours.map(h => valueOf(h, leaf.key)), mode)));
  const coordinate = mode === 'sunburst'
    ? { polar: { center: ['50%', '52%'], radius: ['6%', '96%'] }, angleAxis: angleAxis(hours, chartHours), radiusAxis: radiusAxis('GW') }
    : { grid: { left: 44, right: 20, top: 10, bottom: 48 }, xAxis: xAxis(hours, chartHours), yAxis: yAxis('GW') };
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,.96)',
      borderColor: '#e5e7eb',
      textStyle: { color: '#111827' },
      formatter: (raw: unknown) => {
        const params = Array.isArray(raw) ? raw as Array<{ dataIndex: number }> : [];
        const index = params[0]?.dataIndex ?? 0;
        const hour = chartHours[index];
        if (!hour) return '';
        const lines = [`<b>${shortDateLabel(hour)}</b>`];
        for (const group of MIX_GROUPS) {
          const active = group.leaves.filter(leaf => visibility[leaf.key]);
          if (!active.length) continue;
          const total = active.reduce((sum, leaf) => sum + valueOf(hour, leaf.key), 0);
          const detail = active.map(leaf => `<span style="color:${leaf.color}">●</span> ${leaf.label} ${fmt.format(valueOf(hour, leaf.key))}`).join(' · ');
          lines.push(`<span style="color:${group.color}">●</span> ${group.label}: <b>${fmt.format(total)} GW</b><br/><span style="opacity:.75">${detail}</span>`);
        }
        lines.push(`<span style="color:#dc2626">●</span> Import: <b>${fmt.format(hour.importGW)} GW</b>`);
        if (hour.loadSheddingGW > 0) lines.push(`<span style="color:#b91c1c">▨</span> Fehlend: <b>${fmt.format(hour.loadSheddingGW)} GW</b>`);
        if (hour.exportGW > 0) lines.push(`<span style="color:#94a3b8">●</span> Export: <b>${fmt.format(hour.exportGW)} GW</b>`);
        if (hour.dataBoundaryResidualGW !== 0) lines.push(`<span style="color:#64748b">●</span> Abgrenzungsrest: <b>${fmt.format(hour.dataBoundaryResidualGW)} GW</b>`);
        lines.push(`<span style="color:#111827">●</span> Last: <b>${fmt.format(hour.loadGW)} GW</b>`);
        return lines.join('<br/>');
      },
    },
    legend: { show: false },
    ...coordinate,
    series: [
      ...supplySeries,
      areaSeries('Import', '#dc2626', chartHours.map((h) => h.importGW), mode),
      {
        name: 'Fehlend',
        type: 'line' as const,
        ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
        stack: 'supply',
        showSymbol: false,
        smooth: false,
        areaStyle: { color: '#b91c1c', opacity: 0.65 },
        lineStyle: { color: '#7f1d1d', width: 1 },
        itemStyle: {
          color: '#b91c1c',
          decal: {
            symbol: 'rect',
            symbolSize: 0.7,
            dashArrayX: [4, 0],
            dashArrayY: [3, 3],
            rotation: -Math.PI / 4,
            color: 'rgba(255,255,255,0.45)',
          },
        } as never,
        data: chartHours.map((h) => h.loadSheddingGW),
      },
      {
        name: 'Last',
        type: 'line' as const,
        ...(mode === 'sunburst' ? { coordinateSystem: 'polar' as const } : {}),
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2.2 },
        itemStyle: { color: '#111827' },
        data: chartHours.map((h) => h.loadGW),
      },
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
