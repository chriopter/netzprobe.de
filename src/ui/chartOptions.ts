import type { EChartsOption } from 'echarts';
import type { SimHour } from '../simulation/engine';
import { fmt } from './format';

const dayLabels = (hours: SimHour[]) => hours.map((h) => new Date(h.time).toLocaleDateString('de-DE', { month: '2-digit', day: '2-digit' }));
const thinHours = (hours: SimHour[], maxPoints = 360) => {
  if (hours.length <= maxPoints) return hours;
  const step = Math.ceil(hours.length / maxPoints);
  return hours.filter((_, index) => index % step === 0 || index === hours.length - 1);
};

export function buildMixChartOption(hours: SimHour[]): EChartsOption {
  const chartHours = thinHours(hours);
  return {
    backgroundColor: 'transparent',
    animation: false,
    tooltip: { trigger: 'axis', valueFormatter: (v) => `${fmt.format(Number(v))} GW` },
    legend: { textStyle: { color: '#aab0bd' }, top: 0 },
    grid: { left: 42, right: 24, top: 48, bottom: 34 },
    xAxis: { type: 'category', data: dayLabels(chartHours), axisLabel: { color: '#8a8f98' } },
    yAxis: { type: 'value', axisLabel: { color: '#8a8f98', formatter: '{value} GW' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,.07)' } } },
    series: [
      ...[
        ['Solar', 'solarGW', '#facc15'],
        ['Wind an Land', 'windOnGW', '#38bdf8'],
        ['Wind See', 'windOffGW', '#60a5fa'],
        ['Bio/Wasser', 'biomassGW', '#34d399'],
        ['Gas', 'gasGW', '#fb923c'],
        ['Kohle', 'coalGW', '#ef4444'],
        ['Import', 'importGW', '#a78bfa'],
        ['Last', 'loadGW', '#f7f8f8'],
      ].map(([name, key, color]) => ({
        name,
        type: 'line' as const,
        stack: key === 'loadGW' ? undefined : 'supply',
        showSymbol: false,
        smooth: false,
        areaStyle: key === 'loadGW' ? undefined : { opacity: .22 },
        lineStyle: { width: key === 'loadGW' ? 2.2 : 1.5 },
        itemStyle: { color },
        data: chartHours.map((h) => Number((h as unknown as Record<string, number>)[key])),
      })),
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
  const chartHours = thinHours(hours);
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
