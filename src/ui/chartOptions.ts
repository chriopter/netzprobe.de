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

const dayLabels = (hours: SimHour[]) => hours.map((h) => new Date(h.time).toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit' }));
const compressHours = (hours: SimHour[], maxPoints = 365) => {
  if (hours.length <= maxPoints) return hours;
  const step = Math.ceil(hours.length / maxPoints);
  const numericKeys = Object.keys(hours[0]).filter((key) => key !== 'time') as (keyof SimHour)[];
  const compressed: SimHour[] = [];
  for (let start = 0; start < hours.length; start += step) {
    const bucket = hours.slice(start, start + step);
    const row: Record<string, string | number> = { time: bucket[0].time };
    for (const key of numericKeys) {
      row[key] = bucket.reduce((sum, hour) => sum + Number(hour[key]), 0) / bucket.length;
    }
    compressed.push(row as unknown as SimHour);
  }
  return compressed;
};

const valueOf = (hour: SimHour, key: MixLeafKey) => Number((hour as unknown as Record<string, number>)[key] ?? 0);
const groupValue = (hour: SimHour, group: MixGroup, visibility: MixVisibility) => group.leaves.reduce((sum, leaf) => sum + (visibility[leaf.key] ? valueOf(hour, leaf.key) : 0), 0);

export function buildMixChartOption(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY): EChartsOption {
  const chartHours = compressHours(hours);
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: {
      trigger: 'axis',
      formatter: (raw: unknown) => {
        const params = Array.isArray(raw) ? raw as Array<{ dataIndex: number; marker: string; seriesName: string; value: number }> : [];
        const index = params[0]?.dataIndex ?? 0;
        const hour = chartHours[index];
        if (!hour) return '';
        const lines = [`<b>${dayLabels([hour])[0]}</b>`];
        for (const group of MIX_GROUPS) {
          const active = group.leaves.filter(leaf => visibility[leaf.key]);
          if (!active.length) continue;
          const total = groupValue(hour, group, visibility);
          const detail = active.map(leaf => `${leaf.label} ${fmt.format(valueOf(hour, leaf.key))}`).join(' · ');
          lines.push(`<span style="color:${group.color}">●</span> ${group.label}: <b>${fmt.format(total)} GW</b><br/><span style="opacity:.72">${detail}</span>`);
        }
        lines.push(`<span style="color:#a78bfa">●</span> Import: <b>${fmt.format(hour.importGW)} GW</b>`);
        lines.push(`<span style="color:#f7f8f8">●</span> Last: <b>${fmt.format(hour.loadGW)} GW</b>`);
        if (hour.loadSheddingGW > 0) lines.push(`<span style="color:#ef4444">●</span> Unterdeckung: <b>${fmt.format(hour.loadSheddingGW)} GW</b>`);
        return lines.join('<br/>');
      },
    },
    legend: { show: false },
    grid: { left: 42, right: 24, top: 12, bottom: 34 },
    xAxis: { type: 'category', data: dayLabels(chartHours), axisLabel: { color: '#8a8f98' } },
    yAxis: { type: 'value', axisLabel: { color: '#8a8f98', formatter: '{value} GW' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } } },
    series: [
      ...MIX_GROUPS.map(group => ({
        name: group.label,
        type: 'line' as const,
        stack: 'supply',
        showSymbol: false,
        smooth: false,
        areaStyle: { opacity: .26 },
        lineStyle: { width: 1.5 },
        itemStyle: { color: group.color },
        data: chartHours.map((h) => groupValue(h, group, visibility)),
      })),
      {
        name: 'Import',
        type: 'line' as const,
        stack: 'supply',
        showSymbol: false,
        smooth: false,
        areaStyle: { opacity: .22 },
        lineStyle: { width: 1.5 },
        itemStyle: { color: '#a78bfa' },
        data: chartHours.map((h) => h.importGW),
      },
      {
        name: 'Last',
        type: 'line' as const,
        showSymbol: false,
        smooth: false,
        lineStyle: { width: 2.2 },
        itemStyle: { color: '#f7f8f8' },
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
        itemStyle: { color: '#ef4444' },
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
    tooltip: { trigger: 'axis' },
    grid: { left: 44, right: 20, top: 20, bottom: 32 },
    xAxis: { type: 'category', data: dayLabels(chartHours), axisLabel: { color: '#8a8f98' } },
    yAxis: { type: 'value', axisLabel: { color: '#8a8f98', formatter: '{value} GWh' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } } },
    series: [
      { name: 'Batterie', type: 'line', smooth: false, showSymbol: false, itemStyle: { color: '#10b981' }, data: chartHours.map(h => h.batteryGWh) },
      { name: 'H₂', type: 'line', smooth: false, showSymbol: false, itemStyle: { color: '#22d3ee' }, data: chartHours.map(h => h.h2GWh) },
    ],
  };
}
