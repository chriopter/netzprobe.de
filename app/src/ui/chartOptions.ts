import type { EChartsOption } from 'echarts';
import type { SimHour } from '../types/simulation';
import { fmt, fmt0 } from './format';

export type MixLeafKey = 'hydroGW' | 'biomassGW' | 'geothermalGW' | 'nuclearGW' | 'coalGW' | 'oilGW' | 'otherGW' | 'wasteGW' | 'gasGW' | 'windOffGW' | 'windOnGW' | 'solarGW' | 'importGW' | 'batterieDischargeGW' | 'pumpspeicherDischargeGW' | 'h2DischargeGW' | 'h2PoolImportGW' | 'loadGW' | 'loadSheddingGW';
export type MixVisibility = Record<MixLeafKey, boolean>;
export type ExtraLeaf = { key: MixLeafKey; label: string; color: string; glyph: '●' | '▨' };
export const EXTRA_LEAVES: ExtraLeaf[] = [
  { key: 'loadGW', label: 'Last', color: '#111827', glyph: '●' },
  { key: 'loadSheddingGW', label: 'Fehlend', color: '#b91c1c', glyph: '▨' },
];
export type ChartMode = 'sunburst' | 'linie';
// Zwei Sichten auf die Referenzlinie — der Unterschied ist Energie vs. Strom:
// Der Stapel ist EINSPEISUNG (was auf die Sammelschiene kommt), nicht Erzeugung
// — Speicherentladung ist darin enthalten, obwohl der Strom dafuer frueher schon
// erzeugt wurde. Das Gegenstueck dazu ist die Entnahme.
//  - 'netzlast': alles, was vom Netz gezogen wird — Endverbrauch + Elektrolyse
//    + Speicher-Laden. Einspeisung minus Netzlast ist exakt der Export.
//  - 'endverbrauch': nur was bei Verbrauchern ankommt. Der Abstand nach oben
//    ist zusaetzlich das, was gerade eingespeichert wird — und davon kommt
//    spaeter nur ein Bruchteil zurueck (H₂-Roundtrip ~1/3).
export type LoadView = 'endverbrauch' | 'netzlast';
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
  { id: 'renewable', label: 'EE', color: '#15803d', leaves: [
    { key: 'hydroGW', label: 'Laufwasser', color: '#166534' },
    { key: 'biomassGW', label: 'Biomasse', color: '#16a34a' },
    { key: 'geothermalGW', label: 'Geothermie', color: '#3f6212' },
    { key: 'windOffGW', label: 'Wind Offshore', color: '#16a34a' },
    { key: 'windOnGW', label: 'Wind Onshore', color: '#4ade80' },
    { key: 'solarGW', label: 'PV', color: '#facc15' },
  ] },
  { id: 'fossil', label: 'Fossil', color: '#ea580c', leaves: [
    { key: 'coalGW', label: 'Kohle', color: '#7c2d12' },
    { key: 'oilGW', label: 'Öl', color: '#9a3412' },
    { key: 'gasGW', label: 'Gas', color: '#f97316' },
    { key: 'wasteGW', label: 'Müll', color: '#c2410c' },
    { key: 'otherGW', label: 'Sonstige', color: '#fdba74' },
  ] },
  { id: 'nuclear', label: 'Kern', color: '#a855f7', leaves: [
    { key: 'nuclearGW', label: 'Kernkraft', color: '#a855f7' },
  ] },
  { id: 'storage', label: 'Speicher', color: '#0ea5e9', leaves: [
    { key: 'batterieDischargeGW', label: 'Batterie', color: '#38bdf8' },
    { key: 'pumpspeicherDischargeGW', label: 'Pumpspeicher', color: '#0369a1' },
    { key: 'h2DischargeGW', label: 'Wasserstoff', color: '#22d3ee' },
  ] },
  // Beides ist Import — einmal als Elektron (uebers Netz, stuendlich dispatcht),
  // einmal als Molekuel (H₂ direkt in die Industrie, Jahresmenge gleichverteilt).
  // Der H₂-Anteil steht in Stromaequivalent, damit er auf derselben GW-Achse
  // stapelbar ist; schraffiert, weil er nie durchs Stromnetz laeuft.
  { id: 'import', label: 'Import', color: '#dc2626', leaves: [
    { key: 'importGW', label: 'Strom', color: '#ef4444' },
    { key: 'h2PoolImportGW', label: 'H₂ (Industrie)', color: '#f87171' },
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
// Stündliche Achsen-Labels: Datum nur am Tageswechsel, sonst nur Uhrzeit —
// kürzere Labels lassen mehr Stunden-Ticks zu, bevor hideOverlap ausdünnt.
const hourlyLabels = (hours: SimHour[]) => hours.map((hour, index) => {
  const time = berlinHourLabel(hour);
  const dayStart = index === 0 || dateKey(hour) !== dateKey(hours[index - 1]);
  return dayStart ? `${shortDateLabel(hour)} ${time}` : time;
});
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

// Stundenschritt für Achsen-Labels: so fein, wie es die Chart-Breite erlaubt,
// sonst auf glatte Schritte runden. 45°-rotierte Labels kollidieren erst,
// wenn der Querabstand (~0,7 × Tick-Abstand) unter die Texthöhe fällt —
// ~15 px Tick-Abstand reichen daher für stündliche Labels.
const hourlyLabelStep = (count: number, plotWidthPx: number) => {
  const spacing = plotWidthPx / Math.max(1, count);
  return [1, 2, 3, 4, 6, 8, 12, 24].find(step => spacing * step >= 15) ?? 24;
};

const xAxis = (hours: SimHour[], chartHours: SimHour[], theme: ChartTheme = 'light', viewport?: ChartViewport) => {
  const colors = chartTheme(theme);
  // Bei stündlicher Auflösung gibt es zu viele Labels für eine horizontale Achse:
  // angewinkelt (Excel-Style) und deterministisch auf glatte Stundenschritte
  // ausdünnen (ECharts' hideOverlap dünnt sonst unnötig aggressiv aus).
  const hourly = !isFullYearView(hours, chartHours) && isHourlyResolution(chartHours);
  const hourlyAxisLabel = () => {
    const plotWidth = Math.max(200, (viewport?.width ?? 900) - 64);
    const step = hourlyLabelStep(chartHours.length, plotWidth);
    const showLabel = chartHours.map((hour, index) => {
      if (index === 0 || dateKey(hour) !== dateKey(chartHours[index - 1])) return true;
      return Number(berlinHourLabel(hour).slice(0, 2)) % step === 0;
    });
    return { color: colors.axisText, interval: (index: number) => showLabel[index] ?? false, hideOverlap: false, rotate: 45, fontSize: 9, margin: 10 };
  };
  return {
  type: 'category' as const,
  data: xAxisLabels(hours, chartHours),
  axisTick: { show: false },
  axisLabel: hourly
    ? hourlyAxisLabel()
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
      + (visibility.loadSheddingGW ? hour.loadSheddingGW : 0);
    // Obergrenze ueber beide Sichten; Linie ist vom Legenden-Chip entkoppelt.
    const load = visibility.loadGW ? hour.loadGW + hour.h2PoolLhvGW : 0;
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
    xAxis: xAxis(hours, chartHours, theme, viewport),
    yAxis: yAxis('GW', scaleMaxGW, theme),
  };
};

// Diagonale Schraffur als Canvas-Pattern — ECharts' `decal` greift bei
// Linien-/Flaechenserien nicht, `areaStyle.color` akzeptiert aber ein Pattern.
// Ohne DOM (Tests, SSR) faellt es auf die einfarbige Flaeche zurueck.
const hatchFill = (color: string): string => {
  if (typeof document === 'undefined') return color;
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d');
  if (!ctx) return color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-2, 10); ctx.lineTo(10, -2);
  ctx.moveTo(2, 14); ctx.lineTo(14, 2);
  ctx.moveTo(-6, 6); ctx.lineTo(6, -6);
  ctx.stroke();
  return { image: canvas, repeat: 'repeat' } as unknown as string;
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

// ==== Sicht-Semantik (modulweit, damit Chart und Legenden-Werte identisch rechnen) ====
// H₂ zaehlt in ECHTEN Energie-TWh (LHV): Erzeugung + Import deckeln, was im
// System sein kann. Netzlast-Sicht: nur der Import-Anteil (heimische
// Elektrolyse steckt im Ladeband). Bedarf-Sicht: volle Pool-Deckung.
const h2PoolOf = (h: SimHour, loadView: LoadView) =>
  loadView === 'netzlast' ? h.h2PoolImportLhvGW : h.h2PoolLhvGW;
const netzstromOf = (h: SimHour) => Math.max(0, h.loadGW - h.importGW - h.storageDischargeGW - h.loadSheddingGW);
const supplyTotalOf = (h: SimHour) => STACK_ORDER.reduce((sum, key) => sum + valueOf(h, key), 0);
// Anteil der Erzeugung, der gerade Last deckt (Rest: Export + Speicher-Laden).
// Per Bilanz gilt netzstrom <= supply, der Faktor liegt in [0, 1].
const deckungsFaktorOf = (h: SimHour) => {
  const total = supplyTotalOf(h);
  return total > 0 ? Math.min(1, netzstromOf(h) / total) : 0;
};
// Wert eines Legenden-Leafs in der jeweiligen Sicht: Technologien werden in
// der Bedarf-Sicht auf ihren Deckungsanteil skaliert, Entladung/Import nicht.
const leafValueOf = (h: SimHour, key: MixLeafKey, loadView: LoadView): number => {
  if (key === 'h2PoolImportGW') return h2PoolOf(h, loadView);
  const raw = valueOf(h, key);
  return loadView === 'endverbrauch' && (STACK_ORDER as readonly MixLeafKey[]).includes(key)
    ? raw * deckungsFaktorOf(h)
    : raw;
};
export const loadValueOf = (h: SimHour, loadView: LoadView) => loadView === 'netzlast'
  ? h.loadGW + h.storageChargeGW + h2PoolOf(h, loadView)
  : h.loadGW + h2PoolOf(h, loadView);

// TWh-Summen fuer die Legenden-Chips — punktweise dt-gewichtet (tagesgemittelte
// Reihen zaehlen 24 h je Punkt). Rechnet mit exakt derselben Sicht-Semantik
// wie die geplotteten Flaechen und die weisse Linie.
export type LegendTWh = Partial<Record<MixLeafKey, number>> & {
  // Komponenten der weissen Linie, fuer den Last-Chip-Tooltip.
  stromTWh?: number; ladenTWh?: number; h2TWh?: number; h2StromAeqTWh?: number;
  // Speicher-Umweg: geladen vs. wieder entladen — Differenz = Wandelverlust.
  ladenGesamtTWh?: number; entladenTWh?: number;
};

export function mixLegendTWh(hours: SimHour[], loadView: LoadView): LegendTWh {
  if (hours.length < 2) return {};
  const t = (h: SimHour) => new Date(h.time).getTime();
  const dt = (i: number) => Math.max(1, (i + 1 < hours.length ? t(hours[i + 1]) - t(hours[i]) : t(hours[i]) - t(hours[i - 1])) / 3_600_000);
  const out: LegendTWh = {};
  const keys = MIX_GROUPS.flatMap(group => group.leaves.map(leaf => leaf.key));
  for (const key of keys) out[key] = 0;
  out.loadGW = 0;
  out.loadSheddingGW = 0;
  out.stromTWh = 0;
  out.ladenTWh = 0;
  out.h2TWh = 0;
  out.h2StromAeqTWh = 0;
  out.ladenGesamtTWh = 0;
  out.entladenTWh = 0;
  hours.forEach((h, i) => {
    const w = dt(i) / 1000;
    for (const key of keys) out[key]! += leafValueOf(h, key, loadView) * w;
    out.loadGW! += loadValueOf(h, loadView) * w;
    out.loadSheddingGW! += h.loadSheddingGW * w;
    out.stromTWh! += h.loadGW * w;
    if (loadView === 'netzlast') out.ladenTWh! += h.storageChargeGW * w;
    out.ladenGesamtTWh! += h.storageChargeGW * w;
    out.entladenTWh! += h.storageDischargeGW * w;
    out.h2TWh! += h2PoolOf(h, loadView) * w;
    out.h2StromAeqTWh! += h.h2PoolReductionGW * w;
  });
  return out;
}

export function buildMixChartOption(hours: SimHour[], visibility: MixVisibility = DEFAULT_MIX_VISIBILITY, mode: ChartMode = 'sunburst', viewport?: ChartViewport, scaleMaxGW?: number, theme: ChartTheme = 'light', withStorage: boolean | { batterie: boolean; h2: boolean } = false, loadView: LoadView = 'netzlast', expandedGroup: string | null = null, hoverSeries?: { current: string | null }): EChartsOption {
  const chartHours = compressHours(hours);
  const colors = chartTheme(theme);
  const isEndverbrauch = loadView === 'endverbrauch';
  // Tooltip-Highlight: die Serie unter dem Cursor (aus der Pixel->Band-
  // Erkennung in chartHooks) wird unterstrichen. Per Ref, damit der Chart
  // beim Hovern nicht neu gebaut werden muss — der Formatter liest live.
  const mark = (label: string, text: string) =>
    hoverSeries?.current === label ? `<span style="text-decoration:underline;text-underline-offset:2px;font-weight:600">${text}</span>` : text;
  // Fuellstand-Overlay je Linie schaltbar (Legenden-Gruppe "Fuellstand").
  const fill = typeof withStorage === 'boolean' ? { batterie: withStorage, h2: withStorage } : withStorage;
  const anyFill = fill.batterie || fill.h2;
  const h2Pool = (h: SimHour) => h2PoolOf(h, loadView);
  const loadValue = (h: SimHour) => loadValueOf(h, loadView);
  const deckungsFaktor = deckungsFaktorOf;
  // Flaechen spiegeln die Legenden-Gruppen: eine Flaeche je Gruppe in
  // Gruppenfarbe. 'all' (Hover irgendwo ueber dem Graph) expandiert alle
  // Gruppen in ihre Einzel-Technologien, eine Gruppen-Id (Chip-Hover) nur
  // diese eine. Der H₂-Leaf bleibt beim Expandieren schraffiert.
  const groupSeries = MIX_GROUPS.flatMap(group => {
    const leaves = group.leaves.filter(leaf => visibility[leaf.key]);
    if (!leaves.length) return [];
    if (expandedGroup === 'all' || expandedGroup === group.id) {
      return leaves.map(leaf => leaf.key === 'h2PoolImportGW'
        ? {
          ...areaSeries(isEndverbrauch ? 'Industrie-H₂' : 'H₂-Import', leaf.color, chartHours.map(h => leafValueOf(h, leaf.key, loadView)), mode),
          areaStyle: { color: hatchFill(leaf.color), opacity: .5 },
          lineStyle: { width: .8, opacity: .9, color: leaf.color },
        }
        : areaSeries(leaf.label, leaf.color, chartHours.map(h => leafValueOf(h, leaf.key, loadView)), mode));
    }
    return [areaSeries(group.label, group.color, chartHours.map(h => leaves.reduce((sum, leaf) => sum + leafValueOf(h, leaf.key, loadView), 0)), mode)];
  });
  const baseCoordinate = mixCoordinate(mode, hours, chartHours, viewport, scaleMaxGW, theme);
  // Speicher-Füllstand als Overlay: zweite, unsichtbare 0–100-%-Achse über
  // derselben Winkel- bzw. Zeitachse; Linien normiert auf das jeweilige
  // Speichermaximum des Szenarios.
  const batData = chartHours.map(h => h.batteryGWh);
  const h2Data = chartHours.map(h => h.h2GWh);
  const batMax = Math.max(1e-9, ...batData);
  const h2Max = Math.max(1e-9, ...h2Data);
  const coordinate: EChartsOption = anyFill
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
      // ECharts >= 6.1 typisiert nur noch 'mousemove|click|mousewheel'; zur
      // Laufzeit wird per indexOf gematcht, 'mousemove|click' (ohne Mausrad)
      // bleibt gültig und dokumentiert. Cast statt Verhaltensänderung.
      triggerOn: 'mousemove|click' as 'mousemove|click|mousewheel',
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
        if (isEndverbrauch) {
          const f = deckungsFaktor(hour);
          for (const group of MIX_GROUPS) {
            if (group.id === 'storage' || group.id === 'import') continue;
            const active = group.leaves.filter(leaf => visibility[leaf.key]);
            if (!active.length) continue;
            const total = active.reduce((sum, leaf) => sum + valueOf(hour, leaf.key) * f, 0);
            if (total <= 0.05) continue;
            const leafDetails = active.map(leaf => `${dot(leaf.color)}${mark(leaf.label, leaf.label)} ${fmt.format(valueOf(hour, leaf.key) * f)}`).join(' · ');
            lines.push(row(`${dot(group.color)}${mark(group.label, group.label)}: ${bold(`${fmt.format(total)} GW`)}${detailLine(muted(leafDetails))}`));
          }
          {
            const parts: string[] = [];
            if (visibility.batterieDischargeGW && hour.batterieDischargeGW > 0.05) parts.push(`${dot('#38bdf8')}Batterie ${fmt.format(hour.batterieDischargeGW)}`);
            if (visibility.pumpspeicherDischargeGW && hour.pumpspeicherDischargeGW > 0.05) parts.push(`${dot('#0369a1')}Pumpspeicher ${fmt.format(hour.pumpspeicherDischargeGW)}`);
            if (visibility.h2DischargeGW && hour.h2DischargeGW > 0.05) parts.push(`${dot('#22d3ee')}Wasserstoff ${fmt.format(hour.h2DischargeGW)}`);
            if (parts.length) {
              const total = (visibility.batterieDischargeGW ? hour.batterieDischargeGW : 0)
                + (visibility.pumpspeicherDischargeGW ? hour.pumpspeicherDischargeGW : 0)
                + (visibility.h2DischargeGW ? hour.h2DischargeGW : 0);
              lines.push(row(`${dot('#0ea5e9')}Speicher: ${bold(`${fmt.format(total)} GW`)}${detailLine(muted(parts.join(' · ')))}`));
            }
          }
          if (visibility.importGW && hour.importGW > 0.05) lines.push(row(`${dot('#ef4444')}Stromimport: ${bold(`${fmt.format(hour.importGW)} GW`)}`));
          if (h2Pool(hour) > 0.05) lines.push(row(`${square('#f87171')}${mark(isEndverbrauch ? 'Industrie-H₂' : 'H₂-Import', isEndverbrauch ? 'Industrie-H₂' : 'H₂-Import')}: ${bold(`${fmt.format(h2Pool(hour))} GW`)}`));
          if (visibility.loadSheddingGW && hour.loadSheddingGW > 0) lines.push(row(`${square('#b91c1c')}${mark('Fehlend', 'Fehlend')}: ${bold(`${fmt.format(hour.loadSheddingGW)} GW`)}`));
          if (visibility.loadGW) lines.push(row(`${dot(colors.loadDot)}Bedarf: ${bold(`${fmt.format(loadValue(hour))} GW`)}`));
          return `<div style="box-sizing:border-box;max-width:${maxTooltipWidth}px;max-height:min(360px,calc(100vh - 24px));overflow:auto">${lines.join('')}</div>`;
        }
        for (const group of MIX_GROUPS) {
          const active = group.leaves.filter(leaf => visibility[leaf.key]);
          if (!active.length) continue;
          const total = active.reduce((sum, leaf) => sum + leafValueOf(hour, leaf.key, loadView), 0);
          // Leere Gruppen und Null-Leaves verstecken — der Tooltip zeigt nur,
          // was in dieser Stunde tatsaechlich beitraegt.
          if (total <= 0.05) continue;
          const contributing = active.filter(leaf => leafValueOf(hour, leaf.key, loadView) > 0.05);
          const leafDetails = contributing.map(leaf => `${dot(leaf.color)}${mark(leaf.label, leaf.label)} ${fmt.format(leafValueOf(hour, leaf.key, loadView))}`).join(' · ');
          // Einzel-Leaf-Gruppen (z. B. Kernkraft) brauchen keine Detail-Zeile.
          const showDetails = contributing.length > 1 || contributing.length !== active.length;
          lines.push(row(`${dot(group.color)}${mark(group.label, group.label)}: ${bold(`${fmt.format(total)} GW`)}${showDetails && leafDetails ? detailLine(muted(leafDetails)) : ''}`));
        }
        if (visibility.loadSheddingGW && hour.loadSheddingGW > 0) lines.push(row(`${square('#b91c1c')}${mark('Fehlend', 'Fehlend')}: ${bold(`${fmt.format(hour.loadSheddingGW)} GW`)}`));
        if (hour.exportGW > 0) lines.push(row(`${dot('#94a3b8')}Export: ${bold(`${fmt.format(hour.exportGW)} GW`)}`));
        if (hour.dataBoundaryResidualGW !== 0) lines.push(row(`${dot('#64748b')}Abgrenzungsrest: ${bold(`${fmt.format(hour.dataBoundaryResidualGW)} GW`)}`));
        if (anyFill) {
          const parts: string[] = [];
          if (fill.batterie) parts.push(`${bold(`${fmt0.format(hour.batteryGWh / batMax * 100)} %`)} ${muted('Batterie')}`);
          if (fill.h2) parts.push(`${bold(`${fmt0.format(hour.h2GWh / h2Max * 100)} %`)} ${muted('H₂')}`);
          lines.push(row(`${dot('#0ea5e9')}Füllstand: ${parts.join(' · ')}`));
        }
        if (visibility.loadGW) {
          const isNetzlast = loadView === 'netzlast';
          const parts = [`Stromlast ${fmt.format(hour.loadGW)}`];
          if (isNetzlast && hour.storageChargeGW > 0.05) parts.push(`Speicher-Laden ${fmt.format(hour.storageChargeGW)}`);
          if (h2Pool(hour) > 0.05) parts.push(`${isNetzlast ? 'H₂-Import' : 'Industrie-H₂'} ${fmt.format(h2Pool(hour))}`);
          const title = isNetzlast ? 'Netzlast' : 'Bedarf';
          lines.push(row(`${dot(colors.loadDot)}${title}: ${bold(`${fmt.format(loadValue(hour))} GW`)}${parts.length > 1 ? detailLine(muted(parts.join(' + '))) : ''}`));
        }
        return `<div style="box-sizing:border-box;max-width:${maxTooltipWidth}px;max-height:min(360px,calc(100vh - 24px));overflow:auto">${lines.join('')}</div>`;
      },
    },
    legend: { show: false },
    ...coordinate,
    series: [
      ...groupSeries,
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
      ...(fill.batterie ? [storageFillSeries('Batterie-Füllstand', '#3b82f6', batData, batMax)] : []),
      ...(fill.h2 ? [storageFillSeries('H₂-Füllstand', '#2dd4bf', h2Data, h2Max)] : []),
    ],
  };
}

