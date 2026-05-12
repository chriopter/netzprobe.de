import type { EChartsOption } from 'echarts';
import type { SimHour } from '../simulation/engine';
import { fmt } from './format';

export type MixLeafKey = 'hydroGW' | 'biomassGW' | 'geothermalGW' | 'coalGW' | 'oilGW' | 'otherGW' | 'wasteGW' | 'gasGW' | 'windOffGW' | 'windOnGW' | 'solarGW';
export type MixVisibility = Record<MixLeafKey, boolean>;
export type MixGroup = { id: string; label: string; color: string; leaves: Array<{ key: MixLeafKey; label: string; color: string }> };

export const MIX_GROUPS: MixGroup[] = [
  { id: 'base', label: 'CO₂-freie Grundlast', color: '#2563eb', leaves: [
    { key: 'hydroGW', label: 'Wasser', color: '#4338ca' },
    { key: 'biomassGW', label: 'Biomasse', color: '#16a34a' },
    { key: 'geothermalGW', label: 'Geo', color: '#3730a3' },
  ] },
  { id: 'fossil', label: 'Fossil', color: '#fb923c', leaves: [
    { key: 'coalGW', label: 'Kohle', color: '#57534e' },
    { key: 'oilGW', label: 'Öl', color: '#92400e' },
    { key: 'otherGW', label: 'Sonstige', color: '#8b5cf6' },
    { key: 'wasteGW', label: 'Müll', color: '#78350f' },
    { key: 'gasGW', label: 'Gas', color: '#fb923c' },
  ] },
  { id: 'wind', label: 'Wind', color: '#c5d8bc', leaves: [
    { key: 'windOffGW', label: 'Wind See', color: '#8aa37f' },
    { key: 'windOnGW', label: 'Wind an Land', color: '#c5d8bc' },
  ] },
  { id: 'solar', label: 'Solar', color: '#facc15', leaves: [
    { key: 'solarGW', label: 'Solar', color: '#facc15' },
  ] },
];

export const DEFAULT_MIX_VISIBILITY: MixVisibility = Object.fromEntries(
  MIX_GROUPS.flatMap(group => group.leaves.map(leaf => [leaf.key, true])),
) as MixVisibility;

const shortDateLabel = (hour: SimHour) => new Date(hour.time).toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit' });
const monthLabel = (hour: SimHour) => new Date(hour.time).toLocaleDateString('de-DE', { month: 'long' });
const dayLabels = (hours: SimHour[]) => hours.map(shortDateLabel);
const dateKey = (hour: SimHour) => hour.time.slice(0, 10);
const dateParts = (date: string) => ({ month: Number(date.slice(5, 7)), day: Number(date.slice(8, 10)) });

const averageBucket = (bucket: SimHour[], numericKeys: (keyof SimHour)[]): SimHour => {
  const row: Record<string, string | number> = { time: `${dateKey(bucket[0])}T00:00:00Z` };
  for (const key of numericKeys) row[key] = bucket.reduce((sum, hour) => sum + Number(hour[key]), 0) / bucket.length;
  return row as unknown as SimHour;
};

const dayOfMonthOrderedDailyAverages = (hours: SimHour[], numericKeys: (keyof SimHour)[]) => {
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
      return left.day - right.day || left.month - right.month;
    });
};

const compressHours = (hours: SimHour[], maxPoints = 365) => {
  if (hours.length <= maxPoints) return hours;
  const numericKeys = Object.keys(hours[0]).filter((key) => key !== 'time') as (keyof SimHour)[];
  const uniqueDates = new Set(hours.map(dateKey));
  if (uniqueDates.size >= 360) return dayOfMonthOrderedDailyAverages(hours, numericKeys);
  const step = Math.ceil(hours.length / maxPoints);
  const compressed: SimHour[] = [];
  for (let start = 0; start < hours.length; start += step) {
    const bucket = hours.slice(start, start + step);
    compressed.push(averageBucket(bucket, numericKeys));
  }
  return compressed;
};

const isFullYearCompressed = (hours: SimHour[], chartHours: SimHour[]) => hours.length > chartHours.length && new Set(hours.map(dateKey)).size >= 360;
const xAxisLabels = (hours: SimHour[], chartHours: SimHour[]) => {
  if (!isFullYearCompressed(hours, chartHours)) return dayLabels(chartHours);
  return chartHours.map((hour) => dateParts(dateKey(hour)).day === 1 ? monthLabel(hour) : '');
};

const valueOf = (hour: SimHour, key: MixLeafKey) => Number((hour as unknown as Record<string, number>)[key] ?? 0);
const areaSeries = (name: string, color: string, data: number[]) => ({
  name,
  type: 'line' as const,
  stack: 'supply',
  showSymbol: false,
  smooth: false,
  areaStyle: { opacity: .34 },
  lineStyle: { width: 1.1 },
  itemStyle: { color },
  data,
});

export function buildMixChartOption(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY): EChartsOption {
  const chartHours = compressHours(hours);
  const supplySeries = MIX_GROUPS.flatMap(group => group.leaves.filter(leaf => visibility[leaf.key]).map(leaf => areaSeries(leaf.label, leaf.color, chartHours.map(h => valueOf(h, leaf.key)))));
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
        lines.push(`<span style="color:#a78bfa">●</span> Import: <b>${fmt.format(hour.importGW)} GW</b>`);
        lines.push(`<span style="color:#111827">●</span> Last: <b>${fmt.format(hour.loadGW)} GW</b>`);
        if (hour.loadSheddingGW > 0) lines.push(`<span style="color:#dc2626">●</span> Unterdeckung: <b>${fmt.format(hour.loadSheddingGW)} GW</b>`);
        return lines.join('<br/>');
      },
    },
    legend: { show: false },
    grid: { left: 42, right: 24, top: 12, bottom: 34 },
    xAxis: { type: 'category', data: xAxisLabels(hours, chartHours), axisLabel: { color: '#6b7280' }, axisLine: { lineStyle: { color: '#d1d5db' } } },
    yAxis: { type: 'value', axisLabel: { color: '#6b7280', formatter: '{value} GW' }, splitLine: { lineStyle: { color: 'rgba(17,24,39,.10)' } } },
    series: [
      ...supplySeries,
      areaSeries('Import', '#a78bfa', chartHours.map((h) => h.importGW)),
      {
        name: 'Last',
        type: 'line' as const,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2.2 },
        itemStyle: { color: '#111827' },
        data: chartHours.map((h) => h.loadGW),
      },
      {
        name: 'Unterdeckung',
        type: 'line' as const,
        showSymbol: false,
        smooth: false,
        z: 9,
        stack: 'supply',
        areaStyle: { opacity: .45 },
        lineStyle: { width: 0 },
        itemStyle: { color: '#dc2626' },
        data: chartHours.map((h) => h.loadSheddingGW),
      },
    ],
  };
}

export function buildStorageChartOption(hours: SimHour[]): EChartsOption {
  const chartHours = compressHours(hours);
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,.96)', borderColor: '#e5e7eb', textStyle: { color: '#111827' } },
    grid: { left: 44, right: 20, top: 20, bottom: 32 },
    xAxis: { type: 'category', data: xAxisLabels(hours, chartHours), axisLabel: { color: '#6b7280' }, axisLine: { lineStyle: { color: '#d1d5db' } } },
    yAxis: { type: 'value', axisLabel: { color: '#6b7280', formatter: '{value} GWh' }, splitLine: { lineStyle: { color: 'rgba(17,24,39,.10)' } } },
    series: [
      { name: 'Batterie', type: 'line', smooth: false, showSymbol: false, itemStyle: { color: '#10b981' }, data: chartHours.map(h => h.batteryGWh) },
      { name: 'H₂', type: 'line', smooth: false, showSymbol: false, itemStyle: { color: '#0891b2' }, data: chartHours.map(h => h.h2GWh) },
    ],
  };
}
