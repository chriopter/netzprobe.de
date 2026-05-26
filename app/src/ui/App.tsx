import { Fragment, lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { ChangelogPage } from './ChangelogPage';
import { DataHandbookContent, DataHandbookSidebar } from './DataHandbook';
import { Camera, ChevronRight, Link, Menu, Pause, Play, RotateCcw } from 'lucide-react';
import * as echarts from 'echarts/core';
import { LineChart, MapChart, ScatterChart } from 'echarts/charts';
import { GeoComponent, GridComponent, LegendComponent, PolarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { buildMixChartOption, buildStorageChartOption, mixReferenceScaleMaxGW, mixScalePeakGW, type ChartViewport } from './chartOptions';
import { dataFileUrl } from './dataPackages';
import { loadDefaultData, loadHistorical2017, loadJson, type Historical2017Data } from './defaultData';
import germanyGeoJson from './germanyGeoJson.json';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult, SimHour } from '../types/simulation';
import { DEFAULT_MIX_VISIBILITY, EXTRA_LEAVES, MIX_GROUPS, type ChartMode, type MixLeafKey, type MixVisibility } from './chartOptions';
// DataFileViewer bleibt lazy — Spezial-Route, selten genutzt. Wiki und
// Changelog werden statisch importiert, damit der Tab-Wechsel kein
// Suspense-Flash mehr erzeugt (Sidebar bleibt sichtbar, Layout stabil).
const loadDataFileViewer = () => import('./DataFileViewer');
const DataFileViewer = lazy(() => loadDataFileViewer().then(m => ({ default: m.DataFileViewer })));
import type { DatasetDoc } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { fmt, fmt0, pct, twh } from './format';
import { ScenarioSidebar, type PeriodPreset, type SidebarExpandedRow, type SidebarOpenSectors } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario } from './scenarioPresets';
import { uiManifest } from './uiManifest';
import { cx, iconButton, muted, panelHeader, shell, sidebarOffsetClass } from './ui';

type ChartRoamState = { scale: number; x: number; y: number };
type SimulationView = { start: string; end: string; maxPoints: number };

const defaultExpandedRow: SidebarExpandedRow = null;
const defaultCustomStart = '2025-01-01';
const defaultCustomEnd = '2025-12-31';
const defaultChartMode: ChartMode = 'sunburst';
const defaultPeriodPreset: PeriodPreset = 'year';
const defaultOpenSections = '';
const defaultOpenSectors: SidebarOpenSectors = { verkehr: false, waerme: false, industrie: false };
const listSeparator = '.';
const scenarioBase = normalizeScenario(defaultScenario);
const electrificationFlags: Array<keyof Scenario['demand']> = [
  'e100-pkw', 'e100-heiz', 'e100-lkw', 'e100-bahn', 'e100-schiff', 'e100-flug',
  'e100-ghd', 'e100-industrie-waerme', 'e100-stahl', 'e100-chemie',
];
const electrificationIds = new Set(electrificationFlags);
const fullElectrificationId = 'e100';
const scenarioNumberParams: Array<[string, keyof Scenario['demand']]> = [
  ['pkwKm', 'e100-pkw-million-km'],
  ['heizTWh', 'e100-heiz-target-heat-twh'],
  ['lkwKm', 'e100-lkw-target-bn-km'],
  ['bahnTWh', 'e100-bahn-target-twh'],
  ['schiffTWh', 'e100-schiff-target-twh'],
  ['flugTWh', 'e100-flug-target-twh'],
  ['ghdTWh', 'e100-ghd-target-heat-twh'],
  ['iwTWh', 'e100-industrie-waerme-target-heat-twh'],
  ['stahlMt', 'e100-stahl-target-mio-ton'],
  ['chemieTWh', 'e100-chemie-target-twh'],
];

const scenarioGenerationParams: Array<[string, keyof Scenario['generation']]> = [
  ['pvGW', 'pvInstalledGW'],
  ['windOnGW', 'windOnInstalledGW'],
  ['windOffGW', 'windOffInstalledGW'],
  ['kernGW', 'kernkraftInstalledGW'],
  ['bioGW', 'biomasseInstalledGW'],
  ['hydroGW', 'laufwasserInstalledGW'],
  ['gasGW', 'gasInstalledGW'],
  ['kohleGW', 'kohleInstalledGW'],
];

const scenarioStorageParams: Array<[string, keyof Scenario['storage']]> = [
  ['battP', 'batteriePowerGW'],
  ['battE', 'batterieEnergyGWh'],
  ['psP', 'pumpspeicherPowerGW'],
  ['psE', 'pumpspeicherEnergyGWh'],
  ['h2cP', 'h2ChargePowerGW'],
  ['h2dP', 'h2DischargePowerGW'],
  ['h2E', 'h2EnergyGWh'],
];

const scenarioImportParams: Array<[string, keyof Scenario['import']]> = [
  ['impGW', 'stromGW'],
  ['impEmis', 'stromEmissionGperKWh'],
  ['h2ImpTWh', 'h2TWh'],
];

const scenarioExportParams: Array<[string, keyof Scenario['export']]> = [
  ['expGW', 'stromGW'],
];

function queryParams() {
  try {
    return new URL(window.location.href).searchParams;
  } catch {
    return new URLSearchParams();
  }
}

function appPath(url: URL) {
  const basePath = new URL(import.meta.env.BASE_URL, url.origin).pathname;
  const path = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname.slice(1);
  return path.replace(/^\/+/, '');
}

function mainViewFromPath(path: string): MainViewId | null {
  const clean = path.replace(/\/+$/, '');
  if (clean === '') return 'mix';
  return clean === 'flaeche' || clean === 'ressourcen' || clean === 'netz' || clean === 'kosten' ? clean : null;
}

function pathForMainView(view: MainViewId) {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  return `${basePath}${view === 'mix' ? '' : `${view}/`}`;
}

function periodPresetFromUrl(): PeriodPreset {
  const value = queryParams().get('p');
  return value === '21d' || value === '90d' || value === 'custom' || value === 'year' ? value : defaultPeriodPreset;
}

function dateFromUrl(name: string, fallback: string) {
  const value = queryParams().get(name);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function chartModeFromUrl(): ChartMode {
  return queryParams().get('chart') === 'linie' ? 'linie' : defaultChartMode;
}

function sidebarCollapsedFromUrl() {
  const value = queryParams().get('sidebar');
  if (value === 'open') return false;
  if (value === 'closed') return true;
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 1023px)').matches;
}

function openSectorsFromUrl(): SidebarOpenSectors {
  const values = new Set(splitUrlList(queryParams().get('sections') ?? defaultOpenSections));
  return {
    verkehr: values.has('verkehr'),
    waerme: values.has('waerme'),
    industrie: values.has('industrie'),
  };
}

function expandedRowFromUrl(): SidebarExpandedRow {
  const value = queryParams().get('row');
  return value === 'none' ? null : value || defaultExpandedRow;
}

function mixVisibilityFromUrl(): MixVisibility {
  const hidden = new Set(splitUrlList(queryParams().get('legend') ?? ''));
  const supply = MIX_GROUPS.flatMap(group => group.leaves.map(leaf => [leaf.key, !hidden.has(leaf.key)] as const));
  const extras = EXTRA_LEAVES.map(leaf => [leaf.key, !hidden.has(leaf.key)] as const);
  return Object.fromEntries([...supply, ...extras]) as MixVisibility;
}

function mainViewFromUrl(): MainViewId {
  try {
    const url = new URL(window.location.href);
    const pathView = mainViewFromPath(appPath(url));
    if (pathView) return pathView;
    const value = url.searchParams.get('view');
    return value === 'flaeche' || value === 'ressourcen' || value === 'netz' || value === 'kosten' ? value : 'mix';
  } catch {
    return 'mix';
  }
}

function openSectionsParam(openSectors: SidebarOpenSectors) {
  return (Object.entries(openSectors) as Array<[keyof SidebarOpenSectors, boolean]>)
    .filter(([, open]) => open)
    .map(([id]) => id)
    .join(listSeparator);
}

function splitUrlList(value: string) {
  return value.split(/[,.]/).filter(Boolean);
}

const validSupplyPresets: ReadonlyArray<Scenario['supplyPreset']> = ['custom', 'historical-2025', 'historical-2017', '100ee-noimport', '100ee-import', '100kern-lastfolgend', '2025-skaliert'];

function scenarioFromQueryParams(): Scenario {
  const params = queryParams();
  const scenario = normalizeScenario(defaultScenario);
  const spRaw = params.get('sp');
  // Migration: alte 'manual' Werte werden zu 'custom'.
  const sp = spRaw === 'manual' ? 'custom' : spRaw;
  if (sp && (validSupplyPresets as readonly string[]).includes(sp)) scenario.supplyPreset = sp as Scenario['supplyPreset'];
  const demand = scenario.demand as Record<string, boolean | number>;
  if (params.has('e')) {
    const enabled = new Set(splitUrlList(params.get('e') ?? ''));
    const fullElectrification = enabled.has(fullElectrificationId);
    for (const key of electrificationFlags) demand[key] = fullElectrification || enabled.has(key);
  }
  for (const [param, key] of scenarioNumberParams) {
    const raw = params.get(param);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) demand[key] = value;
  }
  const generation = scenario.generation as Record<string, number>;
  for (const [param, key] of scenarioGenerationParams) {
    const raw = params.get(param);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) generation[key] = value;
  }
  const storage = scenario.storage as Record<string, number>;
  for (const [param, key] of scenarioStorageParams) {
    const raw = params.get(param);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) storage[key] = value;
  }
  const imp = scenario.import as Record<string, number>;
  for (const [param, key] of scenarioImportParams) {
    const raw = params.get(param);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) imp[key] = value;
  }
  const exp = scenario.export as Record<string, number>;
  for (const [param, key] of scenarioExportParams) {
    const raw = params.get(param);
    if (raw === null) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) exp[key] = value;
  }
  return scenario;
}

function syncScenarioParams(url: URL, scenario: Scenario) {
  url.searchParams.delete('s');
  if (scenario.supplyPreset === scenarioBase.supplyPreset) url.searchParams.delete('sp');
  else url.searchParams.set('sp', scenario.supplyPreset);
  const enabled = electrificationFlags.filter(key => scenario.demand[key]);
  if (enabled.length === 0) {
    url.searchParams.delete('e');
  } else if (enabled.length === electrificationFlags.length) {
    url.searchParams.set('e', fullElectrificationId);
  } else {
    const ids = enabled
      .filter(key => electrificationIds.has(key))
      .join(listSeparator);
    url.searchParams.set('e', ids);
  }
  for (const [param, key] of scenarioNumberParams) {
    if (scenario.demand[key] === scenarioBase.demand[key]) url.searchParams.delete(param);
    else url.searchParams.set(param, String(scenario.demand[key]));
  }
  for (const [param, key] of scenarioGenerationParams) {
    if (scenario.generation[key] === scenarioBase.generation[key]) url.searchParams.delete(param);
    else url.searchParams.set(param, String(scenario.generation[key]));
  }
  for (const [param, key] of scenarioStorageParams) {
    if (scenario.storage[key] === scenarioBase.storage[key]) url.searchParams.delete(param);
    else url.searchParams.set(param, String(scenario.storage[key]));
  }
  for (const [param, key] of scenarioImportParams) {
    if (scenario.import[key] === scenarioBase.import[key]) url.searchParams.delete(param);
    else url.searchParams.set(param, String(scenario.import[key]));
  }
  for (const [param, key] of scenarioExportParams) {
    if (scenario.export[key] === scenarioBase.export[key]) url.searchParams.delete(param);
    else url.searchParams.set(param, String(scenario.export[key]));
  }
}

// ECharts-Module einmalig registrieren. Charts laufen im Main-Thread; DOM-
// Events (Hover, Klick, Resize) sind nativ verkabelt, Tooltip rendert auf das
// Canvas. Slider-Drag wird über useDeferredValue + 80ms-Throttle (siehe
// chartResult-Effect) coalesced, sodass schneller Drag den Re-Render nicht
// auf den kritischen Pfad zwingt.
echarts.use([LineChart, MapChart, ScatterChart, GeoComponent, GridComponent, LegendComponent, PolarComponent, TooltipComponent, CanvasRenderer]);
echarts.registerMap('deutschland', germanyGeoJson as Parameters<typeof echarts.registerMap>[1]);

function useMainThreadChart<TData>(
  containerId: string,
  data: TData | null,
  buildOption: (data: TData, viewport: ChartViewport) => echarts.EChartsCoreOption,
  roam: boolean = false,
): boolean {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const roamCleanupRef = useRef<(() => void) | null>(null);
  const roamStateRef = useRef<ChartRoamState>({ scale: 1, x: 0, y: 0 });
  const [viewport, setViewport] = useState<ChartViewport>({ width: 0, height: 0 });
  const [pending, setPending] = useState(false);

  // Lazy-Init beim ersten Render mit Daten. Pending-Flag wird per double-RAF
  // wieder freigegeben (statt ECharts' 'finished'-Event, das mit
  // animation:false unzuverlässig feuert).
  useEffect(() => {
    if (!data) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    // Falls der Chart-Container zwischenzeitlich unmounted/remounted wurde
    // (z. B. Tab-Wechsel), zeigt chartRef noch auf die alte ECharts-Instanz
    // mit verlorenem DOM-Bezug. Dann dispose und neu init.
    if (chartRef.current && chartRef.current.getDom() !== el) {
      roamCleanupRef.current?.();
      roamCleanupRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current.dispose();
      chartRef.current = null;
    }
    if (!chartRef.current) {
      const chart = echarts.init(el);
      chartRef.current = chart;
      setViewport({ width: el.clientWidth, height: el.clientHeight });
      const ro = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        setViewport(prev => prev.width === width && prev.height === height ? prev : { width, height });
        chart.resize();
      });
      ro.observe(el);
      resizeObserverRef.current = ro;
    }
    if (roam) {
      roamCleanupRef.current?.();
      roamCleanupRef.current = attachChartRoam(el, chartRef.current, roamStateRef);
    } else {
      roamCleanupRef.current?.();
      roamCleanupRef.current = null;
      roamStateRef.current = { scale: 1, x: 0, y: 0 };
      resetChartRoam(chartRef.current);
    }
    setPending(true);
    // notMerge: alte Option komplett verwerfen statt mergen. Sonst überleben
    // Polar-Achsen/Series-Coords den Wechsel auf Linien-Modus und der Chart
    // sieht unverändert aus.
    chartRef.current.setOption(buildOption(data, viewport), { notMerge: true });
    // Zwei RAFs: erste fired wenn Browser layoutet, zweite wenn der Frame
    // wirklich gemalt ist. Danach kann der Spinner aus.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPending(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, data, viewport, roam]);

  useEffect(() => () => {
    roamCleanupRef.current?.();
    roamCleanupRef.current = null;
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    chartRef.current?.dispose();
    chartRef.current = null;
  }, []);

  return pending;
}

function useMixChart(containerId: string, hours: SimHour[] | undefined, visibility: MixVisibility, mode: ChartMode, scaleMaxGW?: number): boolean {
  const data = useMemo(() => hours && hours.length ? { hours, visibility, mode, scaleMaxGW } : null, [hours, visibility, mode, scaleMaxGW]);
  return useMainThreadChart(containerId, data, (d, viewport) => buildMixChartOption(d.hours, d.visibility, d.mode, viewport, d.scaleMaxGW), mode === 'sunburst');
}

function useStorageChart(containerId: string, hours: SimHour[] | undefined): boolean {
  const data = useMemo(() => hours && hours.length ? { hours } : null, [hours]);
  return useMainThreadChart(containerId, data, d => buildStorageChartOption(d.hours));
}

function useFlaecheMapChart(containerId: string, anlageKm2: number, wirkungKm2: number, offshoreWirkungKm2: number, vorFlaecheKm2: number, fmtKm2: (value: number) => string): boolean {
  const data = useMemo(() => ({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2 }), [anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2]);
  return useMainThreadChart(containerId, data, (d, viewport) => buildFlaecheMapOption(d.anlageKm2, d.wirkungKm2, d.offshoreWirkungKm2, d.vorFlaecheKm2, d.fmtKm2, viewport));
}

function buildFlaecheMapOption(anlageKm2: number, wirkungKm2: number, offshoreWirkungKm2: number, vorFlaecheKm2: number, fmtKm2: (value: number) => string, viewport: ChartViewport): echarts.EChartsCoreOption {
  const totalKm2 = anlageKm2 + wirkungKm2;
  const mapTotalKm2 = totalKm2 + offshoreWirkungKm2 + vorFlaecheKm2;
  const maxSymbol = Math.max(32, Math.min(viewport.width || 260, viewport.height || 260) * 0.36);
  const symbolSizeOf = (km2: number) => km2 <= 0 ? 0 : Math.min(maxSymbol, Math.sqrt(km2 / DEUTSCHLAND_KM2) * maxSymbol);
  const totalSymbolSize = symbolSizeOf(totalKm2);
  const offshoreSymbolSize = symbolSizeOf(offshoreWirkungKm2);
  const vorSymbolSize = symbolSizeOf(vorFlaecheKm2);
  const wirkungShare = totalKm2 > 0 ? wirkungKm2 / totalKm2 : 0;
  const hoverFill = {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: '#16a34a' },
      { offset: wirkungShare, color: '#16a34a' },
      { offset: wirkungShare, color: '#dc2626' },
      { offset: 1, color: '#dc2626' },
    ],
  };
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: () => {
        const totalPct = mapTotalKm2 / DEUTSCHLAND_KM2 * 100;
        return [
          `Flächenbedarf`,
          `Anlagenfläche: ${fmtKm2(anlageKm2)} km²`,
          `Wirkfläche: ${fmtKm2(wirkungKm2)} km²`,
          `Wirkfläche Offshore: ${fmtKm2(offshoreWirkungKm2)} km²`,
          `Vorfläche: ${fmtKm2(vorFlaecheKm2)} km²`,
          `Summe: ${fmtKm2(mapTotalKm2)} km²`,
          `${totalPct.toLocaleString('de-DE', { maximumFractionDigits: totalPct < 1 ? 2 : 1 })} % von Deutschland`,
        ].join('<br/>');
      },
    },
    geo: {
      map: 'deutschland',
      roam: false,
      aspectScale: 0.75,
      layoutCenter: ['50%', '50%'],
      layoutSize: '92%',
      itemStyle: {
        areaColor: '#f4f4f5',
        borderColor: '#d4d4d8',
        borderWidth: 1.2,
      },
      emphasis: {
        disabled: true,
      },
    },
    series: [
      {
        type: 'map',
        map: 'deutschland',
        geoIndex: 0,
        silent: true,
        data: [{ name: 'Deutschland', value: DEUTSCHLAND_KM2 }],
      },
      {
        name: 'Flächenbedarf',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: totalSymbolSize,
        data: [{ name: 'Flächenbedarf', value: [10.45, 51.15, totalKm2] }],
        itemStyle: {
          color: '#16a34a',
          opacity: 0.76,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: hoverFill,
            opacity: 0.9,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        },
      },
      ...(offshoreWirkungKm2 > 0 ? [{
        name: 'Wirkfläche Offshore',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: offshoreSymbolSize,
        clip: false,
        data: [{ name: 'Wirkfläche Offshore', value: [7.6, 54.15, offshoreWirkungKm2] }],
        label: {
          show: true,
          formatter: 'Offshore',
          position: 'top',
          color: '#0369a1',
          fontSize: 11,
          fontWeight: 600,
        },
        itemStyle: {
          color: '#0284c7',
          opacity: 0.78,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: '#0284c7',
            opacity: 0.92,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        },
      }] : []),
      ...(vorFlaecheKm2 > 0 ? [{
        name: 'Vorfläche',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: vorSymbolSize,
        clip: false,
        data: [{ name: 'Vorfläche', value: [12.15, 51.15, vorFlaecheKm2] }],
        itemStyle: {
          color: '#f59e0b',
          opacity: 0.78,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: '#f59e0b',
            opacity: 0.92,
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        },
      }] : []),
    ],
  };
}

function chartViewportRoot(chart: echarts.ECharts): HTMLElement | null {
  const zr = chart.getZr() as unknown as { painter?: { getViewportRoot?: () => HTMLElement } };
  return zr.painter?.getViewportRoot?.() ?? null;
}

function applyChartRoam(chart: echarts.ECharts, state: ChartRoamState) {
  const root = chartViewportRoot(chart);
  if (!root) return;
  root.style.transformOrigin = '0 0';
  root.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  root.style.willChange = 'transform';
}

function resetChartRoam(chart: echarts.ECharts | null) {
  if (!chart) return;
  const root = chartViewportRoot(chart);
  if (!root) return;
  root.style.transform = '';
  root.style.transformOrigin = '';
  root.style.willChange = '';
}

function attachChartRoam(el: HTMLElement, chart: echarts.ECharts, stateRef: MutableRefObject<ChartRoamState>) {
  const pointers = new Map<number, { x: number; y: number }>();
  let lastPinchDistance = 0;
  let lastTap = 0;
  // Wheel-Zoom erst nach Klick in den Chart aktivieren, sonst frisst der
  // Chart das Page-Scroll. Beim Verlassen mit dem Cursor wieder freigeben.
  let wheelActive = false;
  const clampScale = (scale: number) => Math.min(4, Math.max(1, scale));
  const setState = (next: ChartRoamState) => {
    stateRef.current = { ...next, scale: clampScale(next.scale) };
    if (stateRef.current.scale === 1) stateRef.current = { scale: 1, x: 0, y: 0 };
    applyChartRoam(chart, stateRef.current);
  };
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = el.getBoundingClientRect();
    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;
    const prev = stateRef.current;
    const scale = clampScale(prev.scale * factor);
    const ratio = scale / prev.scale;
    setState({
      scale,
      x: pointX - (pointX - prev.x) * ratio,
      y: pointY - (pointY - prev.y) * ratio,
    });
  };
  const onWheel = (event: WheelEvent) => {
    if (!wheelActive) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0015));
  };
  const onPointerDown = (event: PointerEvent) => {
    el.setPointerCapture(event.pointerId);
    wheelActive = true;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastPinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerLeave = () => {
    wheelActive = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    const prevPoint = pointers.get(event.pointerId);
    if (!prevPoint) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1 && stateRef.current.scale > 1) {
      event.preventDefault();
      setState({
        ...stateRef.current,
        x: stateRef.current.x + event.clientX - prevPoint.x,
        y: stateRef.current.y + event.clientY - prevPoint.y,
      });
      return;
    }
    if (pointers.size === 2) {
      event.preventDefault();
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinchDistance > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, distance / lastPinchDistance);
      lastPinchDistance = distance;
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    lastPinchDistance = 0;
    const now = Date.now();
    if (now - lastTap < 280) setState({ scale: 1, x: 0, y: 0 });
    lastTap = now;
  };
  el.style.touchAction = 'pan-y';
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('pointerleave', onPointerLeave);
  applyChartRoam(chart, stateRef.current);
  return () => {
    el.style.touchAction = '';
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
    el.removeEventListener('pointerleave', onPointerLeave);
  };
}

function localDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

function periodDates(preset: PeriodPreset, start: string, end: string, year: 2025 | 2017 = 2025) {
  const y = String(year);
  if (preset === '21d') return { start: `${y}-01-01`, end: `${y}-01-21` };
  if (preset === '90d') return { start: `${y}-01-01`, end: `${y}-03-31` };
  if (preset === 'year') return { start: `${y}-01-01`, end: `${y}-12-31` };
  return { start, end: end < start ? start : end };
}

function daysInclusive(start: string, end: string) {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) return 1;
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

function simulationViewForPeriod(period: { start: string; end: string }): SimulationView {
  const days = daysInclusive(period.start, period.end);
  return {
    start: period.start,
    end: period.end,
    maxPoints: days <= 31 ? days * 6 : days,
  };
}

function useRustSimulation(
  data: DataSet | null,
  scenario: Scenario,
  view: SimulationView,
  { live, interactionActive, runToken }: { live: boolean; interactionActive: boolean; runToken: number },
): { result: SimulationResult | null; isPending: boolean; isStale: boolean } {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [stale, setStale] = useState(false);
  const requestRef = useRef(0);
  const hasFiredFirstRef = useRef(false);
  const lastRunTokenRef = useRef(runToken);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    let abort: AbortController | null = null;
    const fire = () => {
      setInFlight(true);
      const requestId = ++requestRef.current;
      abort?.abort();
      abort = new AbortController();
      fetch('/api/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scenario, view }),
        signal: abort.signal,
      })
        .then(async response => {
          if (!response.ok) throw new Error(await response.text());
          return response.json() as Promise<SimulationResult>;
        })
        .then(nextResult => {
          if (cancelled || requestId !== requestRef.current) return;
          setResult(nextResult);
          setStale(false);
        })
        .catch(error => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.error('Rust-Simulation fehlgeschlagen:', error);
        })
        .finally(() => {
          if (!cancelled && requestId === requestRef.current) setInFlight(false);
        });
    };
    // Beim ersten Lauf sofort feuern; danach Trailing-Debounce.
    if (!hasFiredFirstRef.current) {
      hasFiredFirstRef.current = true;
      fire();
      return () => {
        cancelled = true;
        abort?.abort();
      };
    }
    setStale(true);
    const manualRun = runToken !== lastRunTokenRef.current;
    if (manualRun) {
      lastRunTokenRef.current = runToken;
      fire();
      return () => {
        cancelled = true;
        abort?.abort();
      };
    }
    if (!live || interactionActive) {
      return () => {
        cancelled = true;
        abort?.abort();
      };
    }
    const timer = window.setTimeout(fire, 300);
    return () => {
      cancelled = true;
      abort?.abort();
      window.clearTimeout(timer);
    };
  }, [data, scenario, view, live, interactionActive, runToken]);

  return { result, isPending: inFlight, isStale: stale };
}

function useRustResolvedScenario(data: DataSet | null, scenario: Scenario): Scenario {
  const [resolved, setResolved] = useState<Scenario>(scenario);
  const requestRef = useRef(0);
  useEffect(() => {
    if (!data) {
      setResolved(scenario);
      return;
    }
    const requestId = ++requestRef.current;
    const abort = new AbortController();
    fetch('/api/resolve', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario }),
      signal: abort.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<Scenario>;
      })
      .then(next => {
        if (requestId === requestRef.current) setResolved(next);
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Rust-Preset-Auflösung fehlgeschlagen:', error);
        if (requestId === requestRef.current) setResolved(scenario);
      });
    return () => abort.abort();
  }, [data, scenario]);
  return resolved;
}

function useDatasetDocs() {
  const [docs, setDocs] = useState<DatasetDoc[]>([]);
  useEffect(() => {
    import('./dataCatalog')
      .then(async ({ datasetDocs, templateDescriptionPaths }) => {
        const results = await Promise.allSettled(
          templateDescriptionPaths.map(path => loadJson<DatasetDoc>(dataFileUrl(path))),
        );
        const templates: DatasetDoc[] = [];
        results.forEach(result => {
          if (result.status === 'fulfilled') templates.push(result.value);
          else console.warn('Wiki-Vorlage konnte nicht geladen werden:', result.reason);
        });
        setDocs(templates.length ? [...datasetDocs, ...templates] : datasetDocs);
      })
      .catch(console.error);
  }, []);
  return docs;
}

function urlView() {
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const path = appPath(url);
    if (path === 'changelog' || path === 'changelog/') return { view: 'changelog' as const, path: null };
    if (path === 'wiki' || path.startsWith('wiki/')) return { view: 'daten' as const, path: null };
    return { view: params.get('view'), path: params.get('path') };
  } catch {
    return { view: null, path: null };
  }
}

function clientRouteUrlFromClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const target = event.target instanceof Element ? event.target : null;
  const anchor = target?.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== '_self') return null;
  if (anchor.hasAttribute('download')) return null;
  const href = anchor.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;

  const next = new URL(anchor.href, window.location.href);
  if (next.origin !== window.location.origin) return null;

  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  if (!next.pathname.startsWith(basePath)) return null;

  const current = new URL(window.location.href);
  const samePageHash = next.pathname === current.pathname && next.search === current.search && next.hash;
  if (samePageHash) return null;

  return next;
}

const RouteFallback = () => <div className="flex h-screen items-center justify-center text-sm text-zinc-400">Lade …</div>;

export function App() {
  const [route, setRoute] = useState(urlView);
  const routeIsDashboard = route.view !== 'datei' && route.view !== 'daten' && route.view !== 'changelog';
  const [dashboardMounted, setDashboardMounted] = useState(routeIsDashboard);

  useEffect(() => {
    const syncRoute = () => setRoute(urlView());
    const onClick = (event: MouseEvent) => {
      const next = clientRouteUrlFromClick(event);
      if (!next) return;
      event.preventDefault();

      const current = new URL(window.location.href);
      if (next.pathname === current.pathname && next.search === current.search && next.hash === current.hash) return;

      window.history.pushState(null, '', next);
      syncRoute();
      if (!next.hash) window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', syncRoute);
    document.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      document.removeEventListener('click', onClick);
    };
  }, []);


  useEffect(() => {
    if (routeIsDashboard) setDashboardMounted(true);
  }, [routeIsDashboard]);

  const routeContent = route.view === 'datei' && route.path
    ? <Suspense fallback={<RouteFallback/>}><DataFileViewer path={route.path}/></Suspense>
    : route.view === 'daten'
      ? <DataHandbookRoute/>
      : route.view === 'changelog'
        ? <ChangelogRoute/>
        : null;

  return <>
    {dashboardMounted && <div hidden={!routeIsDashboard}><Dashboard/></div>}
    {!routeIsDashboard && routeContent}
  </>;
}

function DataHandbookRoute() {
  const datasetDocs = useDatasetDocs();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [wikiLive, setWikiLive] = useState(true);
  const copyWikiUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionStatus('Link kopiert');
    } catch {
      setActionStatus('Kopieren nicht möglich');
    }
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const showStaticStatus = () => {
    setWikiLive(value => !value);
    setActionStatus('Wiki-Ansicht statisch');
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const screenshotWiki = () => {
    window.print();
    setActionStatus('Druckdialog geöffnet');
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  return <main className={shell}>
    <div className={cx('mx-auto w-full max-w-[1760px]', sidebarCollapsed ? '' : sidebarOffsetClass)}>
      <DataHandbookSidebar
        docs={datasetDocs}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        actionBar={<HeaderToolBar
          status={actionStatus}
          live={wikiLive}
          onToggleLive={showStaticStatus}
          onScreenshot={screenshotWiki}
          onRefresh={() => window.location.reload()}
          onCopyUrl={copyWikiUrl}
        />}
      />
      <DataHandbookContent docs={datasetDocs} sidebarCollapsed={sidebarCollapsed} onOpenSidebar={() => setSidebarCollapsed(false)}/>
    </div>
  </main>;
}

function ChangelogRoute() {
  const datasetDocs = useDatasetDocs();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [wikiLive, setWikiLive] = useState(true);
  const copyWikiUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionStatus('Link kopiert');
    } catch {
      setActionStatus('Kopieren nicht möglich');
    }
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const showStaticStatus = () => {
    setWikiLive(value => !value);
    setActionStatus('Wiki-Ansicht statisch');
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const screenshotWiki = () => {
    window.print();
    setActionStatus('Druckdialog geöffnet');
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  return <main className={shell}>
    <div className={cx('mx-auto w-full max-w-[1760px]', sidebarCollapsed ? '' : sidebarOffsetClass)}>
      <DataHandbookSidebar
        docs={datasetDocs}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        actionBar={<HeaderToolBar
          status={actionStatus}
          live={wikiLive}
          onToggleLive={showStaticStatus}
          onScreenshot={screenshotWiki}
          onRefresh={() => window.location.reload()}
          onCopyUrl={copyWikiUrl}
        />}
      />
      <section className="flex min-w-0 flex-col gap-3">
        {sidebarCollapsed && <div><button
          type="button"
          aria-label="Sidebar öffnen"
          aria-expanded={false}
          title="Sidebar öffnen"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
          onClick={() => setSidebarCollapsed(false)}
        >
          <Menu className="h-4 w-4" aria-hidden="true"/>
        </button></div>}
        <div className="flex min-w-0 rounded-lg border border-zinc-200 bg-white">
          <article className="min-w-0 flex-1 px-4 pb-14 pt-8 sm:px-6 lg:px-10 lg:py-8">
            <ChangelogPage/>
            <DisclaimerFooter className="mt-12 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500"/>
          </article>
        </div>
      </section>
    </div>
  </main>;
}

function Dashboard() {
  const [rawData, setRawData] = useState<DataSet | null>(null);
  const [historical2017, setHistorical2017] = useState<Historical2017Data | null>(null);
  const [scenario, setScenario] = useState<Scenario>(scenarioFromQueryParams);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(periodPresetFromUrl);
  const [customStart, setCustomStart] = useState(() => dateFromUrl('start', defaultCustomStart));
  const [customEnd, setCustomEnd] = useState(() => dateFromUrl('end', defaultCustomEnd));
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  // Build-Time pre-computed default als sofortiger Erst-Render. Wird beim ersten
  // Worker-Ergebnis (Slider-Drag) durch live-Rechnung ersetzt.
  const hasLiveResultRef = useRef(false);
  const [mixVisibility, setMixVisibility] = useState<MixVisibility>(mixVisibilityFromUrl);
  const [chartMode, setChartMode] = useState<ChartMode>(chartModeFromUrl);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(sidebarCollapsedFromUrl);
  const [openSectors, setOpenSectors] = useState<SidebarOpenSectors>(openSectorsFromUrl);
  const [expandedRow, setExpandedRow] = useState<SidebarExpandedRow>(expandedRowFromUrl);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [liveSimulation, setLiveSimulation] = useState(true);
  const [manualRunToken, setManualRunToken] = useState(0);
  const [sliderActive, setSliderActive] = useState(false);
  const [referenceScaleMaxGW, setReferenceScaleMaxGW] = useState<number | undefined>(undefined);
  const [mainView, setMainView] = useState<MainViewId>(mainViewFromUrl);
  useActiveSection(setMainView);
  // Beim Initial-Load auf die Sektion aus der URL scrollen (sofern nicht mix).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initial = mainViewFromUrl();
    if (initial === 'mix') return;
    const el = document.getElementById(`section-${initial}`);
    if (el) el.scrollIntoView({ block: 'start' });
    // Nur einmal beim Mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDefaultData().then(setRawData).catch(console.error);
  }, []);

  const needs2017 = scenario.loadYear === 2017 || scenario.supplyPreset === 'historical-2017';
  useEffect(() => {
    if (!needs2017 || historical2017) return;
    loadHistorical2017().then(setHistorical2017).catch(console.error);
  }, [needs2017, historical2017]);

  const data = useMemo<DataSet | null>(() => {
    if (!rawData) return null;
    if (!historical2017) return rawData;
    return {
      ...rawData,
      loadSum2017TWh: historical2017.loadSum2017TWh,
      generationSum2017TWh: historical2017.generationSum2017TWh,
    };
  }, [rawData, historical2017]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof HTMLInputElement && event.target.type === 'range') setSliderActive(true);
    };
    const stopSliderInteraction = () => setSliderActive(false);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointerup', stopSliderInteraction, true);
    window.addEventListener('pointercancel', stopSliderInteraction, true);
    window.addEventListener('keyup', stopSliderInteraction, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', stopSliderInteraction, true);
      window.removeEventListener('pointercancel', stopSliderInteraction, true);
      window.removeEventListener('keyup', stopSliderInteraction, true);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    syncScenarioParams(url, scenario);

    if (periodPreset === defaultPeriodPreset) url.searchParams.delete('p');
    else url.searchParams.set('p', periodPreset);

    if (customStart === defaultCustomStart) url.searchParams.delete('start');
    else url.searchParams.set('start', customStart);

    if (customEnd === defaultCustomEnd) url.searchParams.delete('end');
    else url.searchParams.set('end', customEnd);

    if (chartMode === defaultChartMode) url.searchParams.delete('chart');
    else url.searchParams.set('chart', chartMode);

    url.searchParams.delete('view');
    if (mainViewFromPath(appPath(url))) url.pathname = pathForMainView(mainView);

    const defaultSidebarCollapsed = window.matchMedia('(max-width: 1023px)').matches;
    if (sidebarCollapsed === defaultSidebarCollapsed) url.searchParams.delete('sidebar');
    else url.searchParams.set('sidebar', sidebarCollapsed ? 'closed' : 'open');

    const sections = openSectionsParam(openSectors);
    if (sections === defaultOpenSections) url.searchParams.delete('sections');
    else url.searchParams.set('sections', sections);

    if (expandedRow === defaultExpandedRow) url.searchParams.delete('row');
    else url.searchParams.set('row', expandedRow ?? 'none');

    const hiddenLegend = [
      ...MIX_GROUPS.flatMap(group => group.leaves),
      ...EXTRA_LEAVES,
    ]
      .filter(leaf => !mixVisibility[leaf.key])
      .map(leaf => leaf.key)
      .join(listSeparator);
    if (hiddenLegend) url.searchParams.set('legend', hiddenLegend);
    else url.searchParams.delete('legend');
    window.history.replaceState(null, '', url);
  }, [scenario, periodPreset, customStart, customEnd, chartMode, mainView, sidebarCollapsed, openSectors, expandedRow, mixVisibility]);

  const resolvedScenario = useRustResolvedScenario(data, scenario);
  const selectedPeriod = periodDates(periodPreset, customStart, customEnd, scenario.loadYear);
  const simulationView = useMemo(
    () => simulationViewForPeriod(selectedPeriod),
    [selectedPeriod.start, selectedPeriod.end],
  );

  const { result, isPending: simPending, isStale: simStale } = useRustSimulation(data, scenario, simulationView, {
    live: liveSimulation,
    interactionActive: sliderActive,
    runToken: manualRunToken,
  });
  useEffect(() => {
    if (!result || chartResult === result) return;
    if (!hasLiveResultRef.current) {
      // Erstes Live-Result vom Worker: ersetzt den pre-computed Default sofort.
      hasLiveResultRef.current = true;
      setChartResult(result);
      return;
    }
    // 180ms-Debounce: bei schnellem Slider-Drag werden Zwischenergebnisse
    // verworfen, der Chart-Render läuft erst nachdem der Slider stillsteht.
    // KPIs (oben) bleiben am ungedebouncten `result` und reagieren sofort.
    const timer = window.setTimeout(() => setChartResult(result), 180);
    return () => window.clearTimeout(timer);
  }, [result, chartResult]);

  // Defer chart-source updates: Slider-Tick triggert sofortige KPI-Updates, der
  // Chart läuft hinterher und blockiert Input nicht.
  const deferredChartSource = useDeferredValue<SimulationResult | null>(chartResult ?? result);
  useEffect(() => {
    if (!deferredChartSource) return;
    const currentMax = mixScalePeakGW(deferredChartSource.hours, DEFAULT_MIX_VISIBILITY);
    if (!currentMax) return;
    const nextScale = mixReferenceScaleMaxGW(currentMax);
    setReferenceScaleMaxGW(prev => prev && prev >= currentMax ? prev : nextScale);
  }, [deferredChartSource]);
  const sliced = useMemo(() => deferredChartSource?.hours.filter(hour => {
    const day = localDate(hour.time);
    return day >= selectedPeriod.start && day <= selectedPeriod.end;
  }) ?? [], [deferredChartSource, selectedPeriod.start, selectedPeriod.end]);
  const mixPending = useMixChart('mix-chart', sliced, mixVisibility, chartMode, referenceScaleMaxGW);
  const storagePending = useStorageChart('storage-chart', sliced);
  // Indikator bleibt sichtbar, solange die Simulation rechnet, der 180ms-
  // Chart-Debounce läuft oder ECharts den letzten Frame noch nicht fertig
  // gerendert hat ('finished'-Event).
  const debouncing = !!result && chartResult !== result;
  const isOutdated = simStale || debouncing;
  const isPending = simPending || debouncing || mixPending || storagePending;
  const resetMixScale = () => {
    if (!deferredChartSource) return;
    const currentMax = mixScalePeakGW(deferredChartSource.hours, DEFAULT_MIX_VISIBILITY);
    const nextScale = mixReferenceScaleMaxGW(currentMax);
    if (nextScale) setReferenceScaleMaxGW(nextScale);
  };

  const setQuickStart = (date: string) => {
    setPeriodPreset('custom');
    setCustomStart(date);
    if (customEnd < date) setCustomEnd(date);
  };
  const setQuickEnd = (date: string) => {
    setPeriodPreset('custom');
    setCustomEnd(date < customStart ? customStart : date);
  };
  const setQuickRange = (start: string, end: string) => {
    setPeriodPreset('custom');
    setCustomStart(start);
    setCustomEnd(end < start ? start : end);
  };

  const openSidebar = () => setSidebarCollapsed(false);
  const resetConfiguration = () => {
    setScenario(normalizeScenario(defaultScenario));
    setPeriodPreset(defaultPeriodPreset);
    setCustomStart(defaultCustomStart);
    setCustomEnd(defaultCustomEnd);
    setMixVisibility(DEFAULT_MIX_VISIBILITY);
    setChartMode(defaultChartMode);
    setSidebarCollapsed(sidebarCollapsedFromUrl());
    setOpenSectors(defaultOpenSectors);
    setExpandedRow(defaultExpandedRow);
    setActionStatus('Zurückgesetzt');
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setActionStatus('URL kopiert');
    } catch {
      setActionStatus('Kopieren nicht möglich');
    }
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const copyChartScreenshot = async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#mix-chart canvas');
    if (!canvas || !result) {
      setActionStatus('Chart nicht bereit');
      window.setTimeout(() => setActionStatus(null), 1600);
      return;
    }
    try {
      const exportCanvas = document.createElement('canvas');
      const width = Math.max(1200, Math.min(1800, canvas.width || 1200));
      const chartRatio = canvas.height && canvas.width ? canvas.height / canvas.width : .62;
      const chartWidth = width - 80;
      const chartHeight = Math.round(chartWidth * chartRatio);
      const headerHeight = 190;
      exportCanvas.width = width;
      exportCanvas.height = headerHeight + chartHeight + 48;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) throw new Error('Kein Canvas-Kontext');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      ctx.fillStyle = '#18181b';
      ctx.font = '600 32px Inter, system-ui, sans-serif';
      ctx.fillText('Netzprobe · Energiemix vs. Last', 40, 54);
      ctx.fillStyle = '#71717a';
      ctx.font = '400 18px Inter, system-ui, sans-serif';
      ctx.fillText(`${formatDate(selectedPeriod.start)} - ${formatDate(selectedPeriod.end)} · ${chartMode === 'sunburst' ? 'Polar' : 'Linie'}`, 40, 84);

      const kpis: Array<[string, string, string]> = [
        ['Jahreslast', twh(result.summary.totalDemandTWh), '#18181b'],
        ['EE-Anteil', pct(result.summary.renewableSharePct), '#18181b'],
        ['Import', twh(result.summary.importTWh), '#18181b'],
        ['Fehlend', twh(result.summary.loadSheddingTWh), result.summary.loadSheddingTWh > 0.1 ? '#e11d48' : '#059669'],
        ['Abregelung', twh(result.summary.curtailmentTWh), '#18181b'],
      ];
      const cardGap = 12;
      const cardWidth = Math.floor((width - 80 - cardGap * (kpis.length - 1)) / kpis.length);
      kpis.forEach(([label, value, color], index) => {
        const x = 40 + index * (cardWidth + cardGap);
        ctx.fillStyle = '#fafafa';
        roundRect(ctx, x, 112, cardWidth, 58, 10);
        ctx.fill();
        ctx.strokeStyle = '#e4e4e7';
        ctx.stroke();
        ctx.fillStyle = '#71717a';
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        ctx.fillText(label.toUpperCase(), x + 14, 136);
        ctx.fillStyle = color;
        ctx.font = '600 22px Inter, system-ui, sans-serif';
        ctx.fillText(value, x + 14, 160);
      });

      ctx.drawImage(canvas, 40, headerHeight, chartWidth, chartHeight);
      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(result => result ? resolve(result) : reject(new Error('Kein Bild erzeugt')), 'image/png');
      });
      const ClipboardItemCtor = window.ClipboardItem;
      if (!ClipboardItemCtor || !navigator.clipboard.write) throw new Error('Bild-Zwischenablage nicht verfügbar');
      await navigator.clipboard.write([new ClipboardItemCtor({ 'image/png': blob })]);
      setActionStatus('Plot kopiert');
    } catch {
      setActionStatus('Screenshot nicht möglich');
    }
    window.setTimeout(() => setActionStatus(null), 1600);
  };
  const toggleLiveSimulation = () => {
    setLiveSimulation(value => {
      const next = !value;
      if (next) setManualRunToken(token => token + 1);
      setActionStatus(next ? 'Live-Berechnung an' : 'Live-Berechnung pausiert');
      window.setTimeout(() => setActionStatus(null), 1600);
      return next;
    });
  };
  const runSimulationNow = () => setManualRunToken(token => token + 1);

  return <main className={cx(shell, 'flex flex-col bg-zinc-100')}>
    <div className={cx(
      'mx-auto flex w-full max-w-[1760px] flex-1 flex-col',
      sidebarCollapsed ? '' : sidebarOffsetClass,
    )}>
      <section className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 flex-col gap-3">
        {!result ? <div className="relative grid min-h-[calc(100vh-1.5rem)] place-items-center text-zinc-500">
          {sidebarCollapsed && <div className="absolute left-3 top-3"><SidebarOpenButton onClick={openSidebar}/></div>}
          Lade Daten …
        </div> : <>
          <MainViewTabs active={mainView} onChange={setMainView} sidebarCollapsed={sidebarCollapsed} onOpenSidebar={openSidebar}/>
          <section id="section-mix" className="flex flex-col gap-3 scroll-mt-14 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
          <SectionHeading id="mix"/>
          <ChartPanel className="flex flex-col sm:h-[calc(100vh-3.5rem)]">
            <div className="shrink-0 border-b border-zinc-200/70 px-2 py-2 sm:px-3 sm:py-3">
              <div className="flex min-w-0 gap-1.5 overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-visible">
                <InlineKpi label="EE-Anteil" value={pct(result.summary.renewableSharePct)} primary/>
                <InlineKpi label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
                <InlineKpi label="Import" value={resolvedScenario.import.h2TWh > 0 ? `${fmt.format(result.summary.importTWh)} / ${fmt0.format(resolvedScenario.import.h2TWh)} TWh H₂` : twh(result.summary.importTWh)}/>
                <InlineKpi label="Fehlend" value={twh(result.summary.loadSheddingTWh)} tone={result.summary.loadSheddingTWh > 0.1 ? 'kritisch' : 'stabil'} primary/>
                <InlineKpi label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
                <InlineKpi label="CO₂-Intensität" value={`${fmt0.format(result.summary.co2GperKWh)} g/kWh`} primary/>
                <InlineKpi label="CO₂ Jahr" value={`${fmt.format(result.summary.co2MtPerYear)} Mt`}/>
                <InlineKpi label="Export" value={twh(result.summary.exportTWh)}/>
                <InlineKpi label="Peak-Last" value={`${fmt0.format(result.summary.peakLoadGW)} GW`}/>
                <InlineKpi label="Stunden Fehlend" value={`${fmt0.format(result.summary.hoursWithLoadShedding)} h`} tone={result.summary.hoursWithLoadShedding > 0 ? 'angespannt' : 'stabil'}/>
              </div>
            </div>
            <div className="relative aspect-square min-h-0 w-full bg-white sm:aspect-auto sm:flex-1">
              <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 sm:right-3 sm:top-3">
                <div className="pointer-events-auto">
                  <button
                    type="button"
                    aria-label="Skala zurücksetzen"
                    title="Skala auf aktuelles Szenario zurücksetzen"
                    className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
                    onClick={resetMixScale}
                    disabled={!deferredChartSource}
                  >
                    <RotateCcw className="h-4 w-4"/>
                  </button>
                </div>
                <div className="pointer-events-auto">
                  <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
                </div>
              </div>
              <div
                id="mix-chart"
                className={cx(
                  'h-full w-full transition-opacity duration-150',
                  isPending || isOutdated ? 'opacity-40' : 'opacity-100',
                )}
              />
              <div
                aria-hidden={!isPending}
                className={cx(
                  'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-zinc-100/60 transition-opacity duration-150',
                  isPending ? 'opacity-100' : 'opacity-0',
                )}
              >
                <div className="h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-950 to-transparent"/>
              </div>
              <div
                aria-hidden={!isOutdated || isPending}
                className={cx(
                  'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-zinc-100/60 transition-opacity duration-150',
                  isOutdated && !isPending ? 'opacity-100' : 'opacity-0',
                )}
              >
                <div className="h-full w-full bg-zinc-950/30"/>
              </div>
              <div
                aria-hidden={!isPending}
                className={cx(
                  'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150',
                  isPending ? 'opacity-100' : 'opacity-0',
                )}
              >
                <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white">
                  Aktualisiere …
                </div>
              </div>
              <div
                aria-hidden={!isOutdated || isPending}
                className={cx(
                  'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
                  isOutdated && !isPending ? 'opacity-100' : 'pointer-events-none opacity-0',
                  liveSimulation && 'pointer-events-none',
                )}
              >
                {liveSimulation
                  ? <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white">
                      {sliderActive ? 'Eingabe läuft …' : 'Warte auf Berechnung …'}
                    </div>
                  : <button
                      type="button"
                      className="rounded-full bg-zinc-950/90 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25"
                      onClick={runSimulationNow}
                    >
                      Berechnen
                    </button>}
              </div>
            </div>
            <MixLegend
              visibility={mixVisibility}
              onToggleLeaf={(key, checked) => setMixVisibility(prev => ({ ...prev, [key]: checked }))}
              onToggleGroup={(groupId, checked) => setMixVisibility(prev => {
                const group = MIX_GROUPS.find(g => g.id === groupId);
                if (!group) return prev;
                const next = { ...prev };
                for (const leaf of group.leaves) next[leaf.key] = checked;
                return next;
              })}
            />
          </ChartPanel>

          <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂">
            <div id="storage-chart" className="h-[240px] w-full px-3 py-3"/>
          </ChartPanel>
          </section>
          <section id="section-flaeche" className="flex flex-col gap-3 scroll-mt-14 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
            <SectionHeading id="flaeche"/>
            <FlaechePanel scenario={resolvedScenario}/>
          </section>
          <section id="section-ressourcen" className="flex flex-col gap-3 scroll-mt-14 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
            <SectionHeading id="ressourcen"/>
            <ComingSoonPanel/>
          </section>
          <section id="section-netz" className="flex flex-col gap-3 scroll-mt-14 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
            <SectionHeading id="netz"/>
            <ComingSoonPanel/>
          </section>
          <section id="section-kosten" className="flex flex-col gap-3 scroll-mt-14 rounded-lg border border-zinc-200 bg-white p-3 sm:p-4">
            <SectionHeading id="kosten"/>
            <ComingSoonPanel/>
          </section>
          <DisclaimerFooter className="mt-auto pt-2 text-xs leading-5 text-zinc-500"/>
        </>}
      </section>

      <ScenarioSidebar
        data={data}
        scenario={resolvedScenario}
        supplyPreset={scenario.supplyPreset}
        onSupplyPresetChange={(p) => setScenario(prev => {
          if (p === 'custom') return { ...prev, supplyPreset: 'custom', generation: resolvedScenario.generation, storage: resolvedScenario.storage };
          return { ...prev, supplyPreset: p };
        })}
        selectedPeriod={selectedPeriod}
        periodPreset={periodPreset}
        customStart={customStart}
        customEnd={customEnd}
        collapsed={sidebarCollapsed}
        openSectors={openSectors}
        expandedRow={expandedRow}
        actionBar={<HeaderActions
          status={actionStatus}
          onReset={resetConfiguration}
          onCopyUrl={copyShareUrl}
          onScreenshot={copyChartScreenshot}
          live={liveSimulation}
          onToggleLive={toggleLiveSimulation}
        />}
        onCollapsedChange={setSidebarCollapsed}
        onOpenSectorsChange={setOpenSectors}
        onExpandedRowChange={setExpandedRow}
        onPreset={setPeriodPreset}
        onStart={setQuickStart}
        onEnd={setQuickEnd}
        onRange={setQuickRange}
        onLoadPresetChange={(preset) => setScenario(prev => ({ ...prev, loadYear: preset.loadYear, demand: preset.demand }))}
        onHistoricalLoadChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'last-2025': checked } }))}
        onE100PkwChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-pkw': checked } }))}
        onE100PkwMillionKmChange={(millionKm) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-pkw-million-km': millionKm } }))}
        onE100HeizChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-heiz': checked } }))}
        onE100HeizTargetHeatTWhChange={(heatTWh) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-heiz-target-heat-twh': heatTWh } }))}
        onE100LkwChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-lkw': checked } }))}
        onE100LkwTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-lkw-target-bn-km': v } }))}
        onE100BahnChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-bahn': checked } }))}
        onE100BahnTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-bahn-target-twh': v } }))}
        onE100SchiffChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-schiff': checked } }))}
        onE100SchiffTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-schiff-target-twh': v } }))}
        onE100FlugChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-flug': checked } }))}
        onE100FlugTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-flug-target-twh': v } }))}
        onE100GhdChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-ghd': checked } }))}
        onE100GhdTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-ghd-target-heat-twh': v } }))}
        onE100IndustrieWaermeChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-industrie-waerme': checked } }))}
        onE100IndustrieWaermeTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-industrie-waerme-target-heat-twh': v } }))}
        onE100StahlChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-stahl': checked } }))}
        onE100StahlTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-stahl-target-mio-ton': v } }))}
        onE100ChemieChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-chemie': checked } }))}
        onE100ChemieTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'e100-chemie-target-twh': v } }))}
        onGenerationChange={(field, v) => setScenario(prev => {
          // Beim ersten Wechsel weg vom Preset: resolvedScenario-Werte als
          // Basis (sonst würde prev.generation veraltete Preset-Loader-Werte
          // enthalten). Danach (custom-Mode) immer prev nehmen, damit
          // mehrere Calls im selben Event sich akkumulieren statt sich zu
          // überschreiben.
          const base = prev.supplyPreset === 'custom' ? prev : resolvedScenario;
          return {
            ...prev,
            supplyPreset: 'custom',
            generation: { ...base.generation, [field]: v },
            storage: base.storage,
            import: base.import,
            export: base.export,
          };
        })}
        onStorageChange={(field, v) => setScenario(prev => {
          const base = prev.supplyPreset === 'custom' ? prev : resolvedScenario;
          return {
            ...prev,
            supplyPreset: 'custom',
            generation: base.generation,
            storage: { ...base.storage, [field]: v },
            import: base.import,
            export: base.export,
          };
        })}
        onImportChange={(field, v) => setScenario(prev => {
          const base = prev.supplyPreset === 'custom' ? prev : resolvedScenario;
          return {
            ...prev,
            supplyPreset: 'custom',
            generation: base.generation,
            storage: base.storage,
            import: { ...base.import, [field]: v },
            export: base.export,
          };
        })}
        onExportChange={(field, v) => setScenario(prev => {
          const base = prev.supplyPreset === 'custom' ? prev : resolvedScenario;
          return {
            ...prev,
            supplyPreset: 'custom',
            generation: base.generation,
            storage: base.storage,
            import: base.import,
            export: { ...base.export, [field]: v },
          };
        })}
      />

    </div>
  </main>;
}

function HeaderActions({ status, live, onReset, onCopyUrl, onScreenshot, onToggleLive }: { status: string | null; live: boolean; onReset: () => void; onCopyUrl: () => void; onScreenshot: () => void; onToggleLive: () => void }) {
  return <HeaderToolBar status={status} live={live} onToggleLive={onToggleLive} onScreenshot={onScreenshot} onRefresh={onReset} onCopyUrl={onCopyUrl}/>;
}

function HeaderToolBar({ status, live, onToggleLive, onScreenshot, onRefresh, onCopyUrl }: { status: string | null; live: boolean; onToggleLive: () => void; onScreenshot: () => void; onRefresh: () => void; onCopyUrl: () => void }) {
  return <div className="flex w-full min-w-0 flex-col items-start gap-0.5">
    <div className="flex w-full justify-between">
      <IconAction label={live ? 'Live-Berechnung pausieren' : 'Live-Berechnung aktivieren'} onClick={onToggleLive} tone={live ? 'default' : 'danger'}>
        {live ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
      </IconAction>
      <IconAction label="Plot" onClick={onScreenshot}><Camera className="h-4 w-4"/></IconAction>
      <IconAction label="Aktualisieren" onClick={onRefresh}><RotateCcw className="h-4 w-4"/></IconAction>
      <IconAction label="Link" onClick={onCopyUrl}><Link className="h-4 w-4"/></IconAction>
    </div>
    {!live && <div className="truncate rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-medium text-white">Live-Berechnung pausiert</div>}
    {status && live && <div className="truncate rounded-md bg-zinc-900/90 px-2 py-0.5 text-[11px] font-medium text-white">{status}</div>}
  </div>;
}

function IconAction({ label, onClick, tone = 'default', children }: { label: string; onClick: () => void; tone?: 'default' | 'danger'; children: ReactNode }) {
  return <button
    type="button"
    aria-label={label}
    title={label}
    className={cx(iconButton, 'h-[27px] w-[27px]', tone === 'danger' && 'bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 focus-visible:ring-red-700/25')}
    onClick={onClick}
  >
    {children}
  </button>;
}

function SidebarOpenButton({ onClick }: { onClick: () => void }) {
  return <button
    type="button"
    aria-label="Sidebar öffnen"
    aria-expanded={false}
    title="Sidebar öffnen"
    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
    onClick={onClick}
  >
    <Menu className="h-4 w-4" aria-hidden="true"/>
  </button>;
}

function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  const modes: Array<[ChartMode, string]> = [['sunburst', 'Polar'], ['linie', 'Linie']];
  return <div className="inline-flex shrink-0 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs" aria-label="Diagrammform wählen">
    {modes.map(([value, label]) => <button
      key={value}
      type="button"
      aria-pressed={mode === value}
      className={cx('rounded-[5px] px-2.5 py-1 transition', mode === value ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:bg-white hover:text-zinc-950')}
      onClick={() => onChange(value)}
    >{label}</button>)}
  </div>;
}

type MainViewId = 'mix' | 'flaeche' | 'ressourcen' | 'netz' | 'kosten';

const MAIN_VIEW_LABELS: Record<MainViewId, string> = {
  mix: 'Energiemix',
  flaeche: 'Fläche',
  ressourcen: 'Ressourcen',
  netz: 'Netz',
  kosten: 'Kosten',
};

const MAIN_VIEW_IMPLEMENTED: Record<MainViewId, boolean> = {
  mix: true,
  flaeche: true,
  ressourcen: false,
  netz: false,
  kosten: false,
};

type FlaecheRow = {
  id: string;
  label: string;
  gw: number;
  anlageKm2: number;
  wirkungKm2: number;
  spezifischKm2PerGW: number;
  spezifischKm2PerGWh?: number;
  spezifischKm2PerTWh?: number;
  twhPerGWa?: number;
  vorFlaecheKm2?: number;
  vorFlaecheAuslandKm2?: number;
  vorFlaecheLand?: string;
  vorFlaecheTyp?: string;
  kategorie?: string;
};

function flaecheRows(scenario: Scenario): FlaecheRow[] {
  // Holt jeweils anlagenFlaeche + vorFlaeche + referenceYield aus dem Paket und
  // multipliziert mit dem aktuellen Slider-Wert. Speicher kombinieren GW/GWh-Term.
  const getF = (id: string) => (uiManifest.generation as Record<string, any>)[id]?.anlagenFlaeche ?? {};
  const getV = (id: string) => (uiManifest.generation as Record<string, any>)[id]?.vorFlaeche;
  const getY = (id: string) => (uiManifest.generation as Record<string, any>)[id]?.referenceYield;
  const getS = (id: string) => (uiManifest.storage as Record<string, any>)[id]?.anlagenFlaeche ?? {};

  const erz: Array<[string, string, number, string]> = [
    ['pv', 'PV', scenario.generation.pvInstalledGW, 'pv'],
    ['windon', 'Wind Onshore', scenario.generation.windOnInstalledGW, 'windon'],
    ['windoff', 'Wind Offshore', scenario.generation.windOffInstalledGW, 'windoff'],
    ['biomasse', 'Biomasse', scenario.generation.biomasseInstalledGW, 'biomasse'],
    ['laufwasser', 'Laufwasser', scenario.generation.laufwasserInstalledGW, 'laufwasser'],
    ['kernkraft', 'Kernkraft', scenario.generation.kernkraftInstalledGW, 'kernkraft'],
    ['gas', 'Gas', scenario.generation.gasInstalledGW, 'gas'],
    ['kohle', 'Kohle', scenario.generation.kohleInstalledGW, 'kohle'],
  ];

  const erzRows: FlaecheRow[] = erz.map(([id, label, gw, key]) => {
    const f = getF(key);
    const v = getV(key);
    const y = getY(key);
    const twhPerGWa = y?.twhPerGWa;
    const km2PerGW = (f.anlageKm2PerGW ?? 0) + (f.wirkungKm2PerGW ?? 0);
    // Nur DE-Inland-Vorfläche zählt für Bilanz und km²/TWh (methodische Konsistenz:
    // PV-Modulherstellung China zählt auch nicht). Auslands-Vorfläche bleibt im
    // Detail sichtbar, aber nicht in Summe.
    const vorKm2PerGW = v?.km2PerGW ?? 0;
    const isInland = v?.land === 'DE';
    const inlandVorKm2PerGW = isInland ? vorKm2PerGW : 0;
    const km2PerTWh = twhPerGWa && twhPerGWa > 0 ? (km2PerGW + inlandVorKm2PerGW) / twhPerGWa : undefined;
    return {
      id, label, gw,
      anlageKm2: gw * (f.anlageKm2PerGW ?? 0),
      wirkungKm2: gw * (f.wirkungKm2PerGW ?? 0),
      spezifischKm2PerGW: km2PerGW,
      spezifischKm2PerTWh: km2PerTWh,
      twhPerGWa,
      vorFlaecheKm2: v && isInland ? gw * vorKm2PerGW : undefined,
      vorFlaecheLand: v?.land,
      vorFlaecheTyp: v?.typ,
      vorFlaecheAuslandKm2: v && !isInland ? gw * vorKm2PerGW : undefined,
      kategorie: f.kategorie,
    };
  });

  const speicher: Array<[string, string, number, number]> = [
    ['batterie', 'Batterie', scenario.storage.batteriePowerGW, scenario.storage.batterieEnergyGWh],
    ['pumpspeicher', 'Pumpspeicher', scenario.storage.pumpspeicherPowerGW, scenario.storage.pumpspeicherEnergyGWh],
    ['h2', 'Wasserstoff', Math.max(scenario.storage.h2ChargePowerGW, scenario.storage.h2DischargePowerGW), scenario.storage.h2EnergyGWh],
  ];

  const speRows: FlaecheRow[] = speicher.map(([id, label, gw, gwh]) => {
    const f = getS(id);
    const anlage = gw * (f.anlageKm2PerGW ?? 0) + gwh * (f.anlageKm2PerGWh ?? 0);
    const wirkung = gw * (f.wirkungKm2PerGW ?? 0) + gwh * (f.wirkungKm2PerGWh ?? 0);
    return {
      id, label, gw,
      anlageKm2: anlage,
      wirkungKm2: wirkung,
      spezifischKm2PerGW: (f.anlageKm2PerGW ?? 0) + (f.wirkungKm2PerGW ?? 0),
      spezifischKm2PerGWh: (f.anlageKm2PerGWh ?? 0) + (f.wirkungKm2PerGWh ?? 0),
      kategorie: f.kategorie,
    };
  });

  return [...erzRows, ...speRows];
}

const DEUTSCHLAND_KM2 = 357580;
const SAARLAND_KM2 = 2570;
const saarlandComparisonColumns = 12;

function FlaechePanel({ scenario }: { scenario: Scenario }) {
  const rows = flaecheRows(scenario);
  const rows2025 = flaecheRows(scenarioBase);
  const offshoreWirkung = rows.find(r => r.id === 'windoff')?.wirkungKm2 ?? 0;
  const sumAnlage = rows.reduce((s, r) => s + r.anlageKm2, 0);
  const sumWirkung = rows.reduce((s, r) => s + r.wirkungKm2, 0);
  const sumWirkungInland = Math.max(0, sumWirkung - offshoreWirkung);
  const sumVor = rows.reduce((s, r) => s + (r.vorFlaecheKm2 ?? 0), 0);
  const sumGesamt = sumAnlage + sumWirkung + sumVor;
  const sum2025 = rows2025.reduce((s, r) => s + r.anlageKm2 + r.wirkungKm2 + (r.vorFlaecheKm2 ?? 0), 0);

  const fmtKm2 = (v: number) => v < 1 ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : v < 100 ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : Math.round(v).toLocaleString('de-DE');

  return <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <FlaecheKpi label="Summe" value={`${fmtKm2(sumGesamt)} km²`} color="#18181b"/>
      <FlaecheKpi label="DE-Anteil" value={`${(sumGesamt / DEUTSCHLAND_KM2 * 100).toLocaleString('de-DE', { maximumFractionDigits: sumGesamt / DEUTSCHLAND_KM2 < 0.01 ? 2 : 1 })} %`} color="#525252"/>
      <FlaecheKpi label="Saarlands" value={`${(sumGesamt / SAARLAND_KM2).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×`} color="#525252"/>
      <FlaecheKpi label="gegen 2025" value={sum2025 > 0 ? `${(sumGesamt / sum2025).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` : '–'} color="#71717a"/>
    </div>

    <FlaecheMap anlageKm2={sumAnlage} wirkungKm2={sumWirkungInland} offshoreWirkungKm2={offshoreWirkung} vorFlaecheKm2={sumVor} rows={rows} fmtKm2={fmtKm2}/>
  </div>;
}

function FlaecheKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }}/>
      <span>{label}</span>
    </div>
    <div className="mt-1.5 text-base font-semibold tabular-nums text-zinc-950">{value}</div>
  </div>;
}

function FlaecheTechnologyTable({ rows, fmtKm2 }: { rows: FlaecheRow[]; fmtKm2: (value: number) => string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sumGesamt = rows.reduce((s, r) => s + r.anlageKm2 + r.wirkungKm2 + (r.vorFlaecheKm2 ?? 0), 0);
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  return <div className="min-w-0 overflow-x-auto bg-white">
    <table className="w-full min-w-[360px] text-sm">
      <thead className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        <tr className="border-b border-zinc-200">
          <th className="w-7 py-3 font-medium"/>
          <th className="py-3 font-medium">Technologie</th>
          <th className="py-3 text-right font-medium">Bestand</th>
          <th className="py-3 text-right font-medium">Summe</th>
        </tr>
      </thead>
      <tbody className="text-zinc-700">
        {rows.map(row => {
          const summe = row.anlageKm2 + row.wirkungKm2 + (row.vorFlaecheKm2 ?? 0);
          const dim = row.gw === 0;
          const specGwhFmt = row.spezifischKm2PerGWh && row.spezifischKm2PerGWh > 0
            ? ` + ${row.spezifischKm2PerGWh.toLocaleString('de-DE', { maximumFractionDigits: 4 })} /GWh`
            : '';
          const km2PerTWhFmt = row.spezifischKm2PerTWh && row.twhPerGWa
            ? ` · ${row.spezifischKm2PerTWh.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km²/TWh (Yield ${row.twhPerGWa.toLocaleString('de-DE', { maximumFractionDigits: 1 })} TWh/GW·a)`
            : '';
          const isOpen = expanded.has(row.id);
          return <Fragment key={row.id}>
            <tr
              className={cx('cursor-pointer border-b border-zinc-100 hover:bg-zinc-50', dim && 'text-zinc-300')}
              aria-expanded={isOpen}
              onClick={() => toggle(row.id)}
            >
              <td className="py-2.5 align-middle">
                <ChevronRight className={cx('h-3.5 w-3.5 text-zinc-400 transition-transform', isOpen && 'rotate-90')}/>
              </td>
              <td className="py-2.5 pr-3">{row.label}</td>
              <td className="py-2.5 text-right tabular-nums">{row.gw.toLocaleString('de-DE', { maximumFractionDigits: 1 })} GW</td>
              <td className="py-2.5 text-right font-medium tabular-nums">{fmtKm2(summe)} km²</td>
            </tr>
            {isOpen && <tr className={cx('border-b border-zinc-100 bg-zinc-50/60 text-xs', dim && 'text-zinc-300')}>
              <td className="py-3"/>
              <td colSpan={3} className="py-3">
                <dl className="grid gap-2">
                  <FlaecheDetailTerm label="Spezifisch" value={`${row.spezifischKm2PerGW.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km²/GW${specGwhFmt}${km2PerTWhFmt}`}/>
                  <FlaecheDetailTerm label="Anlagenfläche" value={`${fmtKm2(row.anlageKm2)} km²`}/>
                  <FlaecheDetailTerm label="Wirkfläche" value={`${fmtKm2(row.wirkungKm2)} km²`}/>
                  {row.vorFlaecheKm2 !== undefined && row.vorFlaecheKm2 > 0 && <FlaecheDetailTerm label="Vorfläche" value={`${fmtKm2(row.vorFlaecheKm2)} km² (DE)${row.vorFlaecheTyp ? ` · ${row.vorFlaecheTyp}` : ''}`}/>}
                  {row.vorFlaecheAuslandKm2 !== undefined && row.vorFlaecheAuslandKm2 > 0 && <FlaecheDetailTerm label="Vorfläche Ausland" value={`${fmtKm2(row.vorFlaecheAuslandKm2)} km² (${row.vorFlaecheLand ?? 'extern'})${row.vorFlaecheTyp ? ` · ${row.vorFlaecheTyp}` : ''} — nicht in Summe (methodische Konsistenz: PV-Modulfertigung China zählt auch nicht)`}/>}
                  <FlaecheDetailTerm label="Kategorie" value={row.kategorie ?? '–'}/>
                </dl>
              </td>
            </tr>}
          </Fragment>;
        })}
      </tbody>
      <tfoot className="font-semibold text-zinc-950">
        <tr>
          <td className="py-3"/>
          <td className="py-3">Summe</td>
          <td className="py-3"/>
          <td className="py-3 text-right tabular-nums">{fmtKm2(sumGesamt)} km²</td>
        </tr>
      </tfoot>
    </table>
  </div>;
}

function FlaecheDetailTerm({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[92px_1fr] gap-3">
    <dt className="text-zinc-400">{label}</dt>
    <dd className="break-words font-medium tabular-nums text-zinc-700">{value}</dd>
  </div>;
}

function FlaecheMap({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, rows, fmtKm2 }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; rows: FlaecheRow[]; fmtKm2: (value: number) => string }) {
  return <section className="mt-7 grid gap-5">
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.95fr)_minmax(420px,1.05fr)]">
      <div className="min-w-0">
        <FlaecheMapCard anlageKm2={anlageKm2} wirkungKm2={wirkungKm2} offshoreWirkungKm2={offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} rows={rows} fmtKm2={fmtKm2}/>
      </div>
      <div className="flex min-w-0 flex-col gap-5">
        <SaarlandComparison anlageKm2={anlageKm2} wirkungKm2={wirkungKm2 + offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} fmtKm2={fmtKm2}/>
        <FlaecheTechnologyTable rows={rows} fmtKm2={fmtKm2}/>
      </div>
    </div>
  </section>;
}

function FlaecheMapCard({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, rows, fmtKm2 }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; rows: FlaecheRow[]; fmtKm2: (value: number) => string }) {
  useFlaecheMapChart('flaeche-map', anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2);
  const anlagePct = anlageKm2 / DEUTSCHLAND_KM2 * 100;
  const wirkungPct = wirkungKm2 / DEUTSCHLAND_KM2 * 100;
  const offshorePct = offshoreWirkungKm2 / DEUTSCHLAND_KM2 * 100;
  const vorPct = vorFlaecheKm2 / DEUTSCHLAND_KM2 * 100;
  // vorFlaeche-Länder gruppieren für Label-Anzeige
  const vorByLand: Record<string, number> = {};
  for (const r of rows) {
    if (r.vorFlaecheKm2 && r.vorFlaecheKm2 > 0) {
      const land = r.vorFlaecheLand ?? '–';
      vorByLand[land] = (vorByLand[land] ?? 0) + r.vorFlaecheKm2;
    }
  }
  const vorLandLabel = Object.entries(vorByLand)
    .sort((a, b) => b[1] - a[1])
    .map(([land, km2]) => `${land} ${fmtKm2(km2)}`)
    .join(' · ');
  return <div>
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-lg font-semibold text-zinc-950">Flächenbedarf in Deutschland</h2>
      <span className="text-xs tabular-nums text-zinc-500">{fmtKm2(anlageKm2 + wirkungKm2 + offshoreWirkungKm2 + vorFlaecheKm2)} km² gesamt</span>
    </div>
    <div className="mt-4 bg-white">
      <div id="flaeche-map" className="h-[360px] w-full"/>
      <div className="grid gap-2.5 border-t border-zinc-100 pb-2 pt-4 text-xs">
        <LegendMetric color="#dc2626" label="Anlagenfläche" value={`${anlagePct.toLocaleString('de-DE', { maximumFractionDigits: anlagePct < 1 ? 2 : 1 })} %`} meta="DE"/>
        <LegendMetric color="#16a34a" label="Wirkfläche" value={`${wirkungPct.toLocaleString('de-DE', { maximumFractionDigits: wirkungPct < 1 ? 2 : 1 })} %`} meta="DE"/>
        {offshoreWirkungKm2 > 0 && <LegendMetric color="#0284c7" label="Wirkfläche Offshore" value={`${offshorePct.toLocaleString('de-DE', { maximumFractionDigits: offshorePct < 1 ? 2 : 1 })} %`} meta="Nordsee/Ostsee"/>}
        {vorFlaecheKm2 > 0 && <LegendMetric color="#f59e0b" label="Vorfläche" value={`${vorPct.toLocaleString('de-DE', { maximumFractionDigits: vorPct < 1 ? 2 : 1 })} %`} meta={vorLandLabel || 'Brennstoff/Anbau'}/>}
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500">
        Anlagenfläche = direkt versiegelt. Wirkfläche = Park/Sperrzone/Stauraum. Offshore-Wind wird blau außerhalb der Karte gezeigt. Vorfläche = DE-Inland-Brennstoff-/Anbaufläche (Biomasse-Acker, Braunkohle-Tagebau). Auslands-Brennstoffketten (Uran KZ/CA, Gas NO/US/QA, PV-Modulfertigung China) sind ausgeklammert — methodisch konsistent.
      </p>
    </div>
  </div>;
}

function LegendMetric({ color, label, value, meta }: { color: string; label: string; value: string; meta: string }) {
  return <div className="flex items-baseline gap-2">
    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }}/>
    <span className="text-zinc-600">{label}</span>
    <span className="ml-auto font-medium tabular-nums text-zinc-950">{value}</span>
    <span className="tabular-nums text-zinc-400">{meta}</span>
  </div>;
}

function SaarlandComparison({ anlageKm2, wirkungKm2, vorFlaecheKm2, fmtKm2 }: { anlageKm2: number; wirkungKm2: number; vorFlaecheKm2: number; fmtKm2: (value: number) => string }) {
  const totalKm2 = anlageKm2 + wirkungKm2 + vorFlaecheKm2;
  const saarlands = totalKm2 / SAARLAND_KM2;
  const anlageTiles = anlageKm2 / SAARLAND_KM2;
  const wirkungTiles = wirkungKm2 / SAARLAND_KM2;
  const vorTiles = vorFlaecheKm2 / SAARLAND_KM2;
  const visibleTileCount = Math.max(saarlandComparisonColumns, Math.ceil(saarlands / saarlandComparisonColumns) * saarlandComparisonColumns);
  const saarlandTiles = Array.from({ length: visibleTileCount }, (_, index) => index);
  return <div className="group relative border-b border-zinc-100 bg-white pb-5">
    <div className="flex items-baseline justify-between gap-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saarland-Vergleich</h4>
      <span className="text-xs tabular-nums text-zinc-500">{saarlands.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Saarlands</span>
    </div>
    <div
      className="mt-4 grid grid-cols-12 gap-1.5"
      aria-label={`Entspricht ${saarlands.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Saarlands`}
    >
      {saarlandTiles.map(index => {
        const totalFill = Math.max(0, Math.min(1, saarlands - index));
        const anlageFill = Math.max(0, Math.min(totalFill, anlageTiles - index));
        const wirkungFill = Math.max(0, Math.min(totalFill - anlageFill, wirkungTiles - Math.max(0, index - anlageTiles)));
        const redPct = anlageFill > 0 ? Math.max(8, Math.round(anlageFill * 100)) : 0;
        const greenEnd = redPct + (wirkungFill > 0 ? Math.max(8, Math.round(wirkungFill * 100)) : 0);
        const totalPct = Math.round(totalFill * 100);
        return <span
          key={index}
          className="h-3.5 rounded-[3px] border border-zinc-200 bg-zinc-100"
          style={totalPct > 0 ? { background: `linear-gradient(90deg, #dc2626 0 ${redPct}%, #16a34a ${redPct}% ${greenEnd}%, #f59e0b ${greenEnd}% ${totalPct}%, #f4f4f5 ${totalPct}% 100%)` } : undefined}
        />;
      })}
    </div>
    <div className="pointer-events-none absolute left-4 top-full z-30 mt-2 w-[min(320px,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white p-3 text-xs opacity-0 shadow-lg ring-1 ring-zinc-950/5 transition group-hover:opacity-100">
      <div className="grid gap-2">
        <LegendMetric color="#dc2626" label="Anlagenfläche" value={anlageTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>
        <LegendMetric color="#16a34a" label="Wirkfläche" value={wirkungTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>
        {vorFlaecheKm2 > 0 && <LegendMetric color="#f59e0b" label="Vorfläche" value={vorTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>}
      </div>
      <div className="mt-3 border-t border-zinc-100 pt-2 text-zinc-500">
        <span className="font-medium tabular-nums text-zinc-900">{fmtKm2(totalKm2)} km²</span> gesamt. Eine Kachel entspricht <span className="font-medium tabular-nums text-zinc-900">2.570 km²</span>.
      </div>
    </div>
  </div>;
}

function useActiveSection(setMainView: (v: MainViewId) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ids: MainViewId[] = ['mix', 'flaeche', 'ressourcen', 'netz', 'kosten'];
    // Trigger-Linie bei 20 % der Viewport-Höhe. Aktive Sektion = letzte,
    // deren Top oberhalb dieser Linie liegt — also sobald die Überschrift
    // einer neuen Sektion ins oberste Fünftel scrollt, springt das Menü.
    const compute = () => {
      const triggerY = window.innerHeight * 0.2;
      let active: MainViewId = ids[0];
      for (const id of ids) {
        const el = document.getElementById(`section-${id}`);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= triggerY) active = id;
        else break;
      }
      setMainView(active);
    };
    compute();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        compute();
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [setMainView]);
}

function scrollToSection(id: MainViewId) {
  if (typeof window === 'undefined') return;
  const el = document.getElementById(`section-${id}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function MainViewTabs({ active, onChange, sidebarCollapsed, onOpenSidebar }: { active: MainViewId; onChange: (id: MainViewId) => void; sidebarCollapsed: boolean; onOpenSidebar: () => void }) {
  const tabs = (Object.entries(MAIN_VIEW_LABELS) as Array<[MainViewId, string]>).map(([id, label]) => ({ id, label, ready: MAIN_VIEW_IMPLEMENTED[id] }));
  return <div className="sticky top-0 z-30 -mx-2 flex items-center gap-2 bg-white/85 px-2 py-2 backdrop-blur sm:-mx-3 sm:-mt-3 sm:px-3">
    {sidebarCollapsed && <SidebarOpenButton onClick={onOpenSidebar}/>}
    <nav aria-label="Hauptansicht" className="inline-flex shrink-0 rounded-full border border-zinc-200 bg-white p-0.5 text-[13px] font-medium leading-none">
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return <button
          key={tab.id}
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => { onChange(tab.id); scrollToSection(tab.id); }}
          title={tab.ready ? undefined : `${tab.label} – Coming soon`}
          className={cx(
            'rounded-full px-3 py-1.5 transition',
            isActive
              ? 'bg-zinc-950 text-white'
              : tab.ready
                ? 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950'
                : 'text-zinc-300 hover:text-zinc-500',
          )}
        >{tab.label}</button>;
      })}
    </nav>
  </div>;
}

function SectionHeading({ id }: { id: MainViewId }) {
  return <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{MAIN_VIEW_LABELS[id]}</h2>;
}

function ComingSoonPanel() {
  return <div className="grid min-h-[40vh] place-items-center rounded-lg border border-dashed border-zinc-200 bg-white text-center">
    <p className="px-6 py-12 text-sm text-zinc-500">Coming soon.</p>
  </div>;
}

function ChartPanel({ title, meta, className, children }: { title?: string; meta?: string; className?: string; children: ReactNode }) {
  return <section className={cx('min-w-0 overflow-hidden bg-white', className)}>
    {title && <div className={cx(panelHeader, 'flex items-center justify-between gap-3 px-3 py-3')}>
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      {meta && <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>}
    </div>}
    {children}
  </section>;
}

function MixLegend({ visibility, onToggleLeaf, onToggleGroup }: { visibility: MixVisibility; onToggleLeaf: (key: MixLeafKey, checked: boolean) => void; onToggleGroup: (groupId: string, checked: boolean) => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const renderPill = (key: MixLeafKey, label: string, color: string, glyph: string) => {
    const active = visibility[key];
    return <button
      key={key}
      type="button"
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 transition',
        active ? 'border-zinc-300 bg-white text-zinc-800' : 'border-zinc-100 bg-white text-zinc-400 hover:text-zinc-700',
      )}
      onClick={() => onToggleLeaf(key, !active)}
    >
      <span aria-hidden className="text-[10px]" style={{ color: active ? color : '#d4d4d8' }}>{glyph}</span>
      <span>{label}</span>
    </button>;
  };
  const activeGroup = openGroup ? MIX_GROUPS.find(g => g.id === openGroup) : null;
  return <div className="grid gap-1.5 bg-white px-2 pb-3 pt-6 text-xs sm:px-3 sm:pb-3.5 sm:pt-8">
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {EXTRA_LEAVES.map(item => renderPill(item.key, item.label, item.color, item.glyph))}
      {MIX_GROUPS.map(group => {
        const activeCount = group.leaves.filter(leaf => visibility[leaf.key]).length;
        const total = group.leaves.length;
        const someActive = activeCount > 0;
        const allActive = activeCount === total;
        const isOpen = openGroup === group.id;
        return <div key={group.id} className={cx(
          'inline-flex shrink-0 items-stretch overflow-hidden rounded-md border transition',
          someActive ? 'border-zinc-300 bg-white text-zinc-800' : 'border-zinc-100 bg-white text-zinc-400',
        )}>
          <button
            type="button"
            aria-pressed={someActive}
            title={allActive ? 'Alle abwählen' : 'Alle aktivieren'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 transition hover:bg-zinc-50"
            onClick={() => onToggleGroup(group.id, !allActive)}
          >
            <span aria-hidden className="text-[10px]" style={{ color: someActive ? group.color : '#d4d4d8' }}>●</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em]">{group.label}</span>
            <span className="text-[10px] text-zinc-400">{activeCount}/{total}</span>
          </button>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? `${group.label} einklappen` : `${group.label} aufklappen`}
            className="inline-flex items-center border-l border-zinc-200 px-1.5 transition hover:bg-zinc-50"
            onClick={() => setOpenGroup(isOpen ? null : group.id)}
          >
            <ChevronRight aria-hidden className={cx('h-3 w-3 text-zinc-400 transition-transform', isOpen && 'rotate-90')}/>
          </button>
        </div>;
      })}
    </div>
    {activeGroup && <div className="flex flex-wrap items-center justify-center gap-1.5">
      {activeGroup.leaves.map(leaf => renderPill(leaf.key, leaf.label, leaf.color, '●'))}
    </div>}
  </div>;
}

function InlineKpi({ label, value, tone, primary }: { label: string; value: string; tone?: string; primary?: boolean }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-600' : tone === 'angespannt' ? 'text-amber-600' : tone === 'kritisch' ? 'text-red-700' : 'text-zinc-950';
  const isAlarm = tone === 'kritisch';
  const valueSize = primary ? 'text-base' : 'text-sm';
  const containerClass = isAlarm
    ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-red-300 px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
    : primary
      ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-300 bg-white px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
      : 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-200 bg-white px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5';
  const alarmStyle = isAlarm
    ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(220,38,38,0.10) 0 6px, rgba(220,38,38,0.20) 6px 12px)' }
    : undefined;
  return <div className={containerClass} style={alarmStyle}>
    <span className={cx('truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em]', isAlarm ? 'text-red-700' : 'text-zinc-500')} title={label}>{label}</span>
    <span className={cx('whitespace-nowrap font-semibold tabular-nums', valueSize, toneClass)}>{value}</span>
  </div>;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
