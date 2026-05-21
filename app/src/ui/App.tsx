import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { Camera, Link, Menu, Pause, Play, RotateCcw } from 'lucide-react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, PolarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { buildMixChartOption, buildStorageChartOption, mixReferenceScaleMaxGW, mixScalePeakGW, type ChartViewport } from './chartOptions';
import { dataFileUrl } from './dataPackages';
import { loadDefaultData, loadHistorical2017, loadJson, type Historical2017Data } from './defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult, SimHour } from '../types/simulation';
import { DEFAULT_MIX_VISIBILITY, EXTRA_LEAVES, MIX_GROUPS, type ChartMode, type MixLeafKey, type MixVisibility } from './chartOptions';
const loadDataFileViewer = () => import('./DataFileViewer');
const loadDataHandbook = () => import('./DataHandbook');
const loadChangelogPage = () => import('./ChangelogPage');
const DataFileViewer = lazy(() => loadDataFileViewer().then(m => ({ default: m.DataFileViewer })));
const DataHandbookContent = lazy(() => loadDataHandbook().then(m => ({ default: m.DataHandbookContent })));
const DataHandbookSidebar = lazy(() => loadDataHandbook().then(m => ({ default: m.DataHandbookSidebar })));
const ChangelogPage = lazy(() => loadChangelogPage().then(m => ({ default: m.ChangelogPage })));
import type { DatasetDoc } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { fmt, fmt0, pct, twh } from './format';
import { ScenarioSidebar, type PeriodPreset, type SidebarExpandedRow, type SidebarOpenSectors } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario } from './scenarioPresets';
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

function openSectionsParam(openSectors: SidebarOpenSectors) {
  return (Object.entries(openSectors) as Array<[keyof SidebarOpenSectors, boolean]>)
    .filter(([, open]) => open)
    .map(([id]) => id)
    .join(listSeparator);
}

function splitUrlList(value: string) {
  return value.split(/[,.]/).filter(Boolean);
}

const validSupplyPresets: ReadonlyArray<Scenario['supplyPreset']> = ['custom', 'historical-2025', 'historical-2017', '100ee-noimport', '50ee-50import', '2025-skaliert'];

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
echarts.use([LineChart, GridComponent, LegendComponent, PolarComponent, TooltipComponent, CanvasRenderer]);

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
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0015));
  };
  const onPointerDown = (event: PointerEvent) => {
    el.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastPinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
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
  el.style.touchAction = 'none';
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  applyChartRoam(chart, stateRef.current);
  return () => {
    el.style.touchAction = '';
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
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
    const basePath = new URL(import.meta.env.BASE_URL, url.origin).pathname;
    const path = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname.slice(1);
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
    const preload = () => {
      void loadDataHandbook();
      void loadChangelogPage();
    };
    const idle = window.requestIdleCallback?.(preload) ?? window.setTimeout(preload, 700);
    return () => {
      if (typeof idle === 'number') window.clearTimeout(idle);
      else window.cancelIdleCallback?.(idle);
    };
  }, []);

  useEffect(() => {
    if (routeIsDashboard) setDashboardMounted(true);
  }, [routeIsDashboard]);

  const routeContent = route.view === 'datei' && route.path
    ? <Suspense fallback={<RouteFallback/>}><DataFileViewer path={route.path}/></Suspense>
    : route.view === 'daten'
      ? <Suspense fallback={<RouteFallback/>}><DataHandbookRoute/></Suspense>
      : route.view === 'changelog'
        ? <Suspense fallback={<RouteFallback/>}><ChangelogRoute/></Suspense>
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
  }, [scenario, periodPreset, customStart, customEnd, chartMode, sidebarCollapsed, openSectors, expandedRow, mixVisibility]);

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

  return <main className={shell}>
    <div className={cx(
      'mx-auto w-full max-w-[1760px]',
      sidebarCollapsed ? '' : sidebarOffsetClass,
    )}>
      <section className="flex min-w-0 flex-col gap-3">
        {!result ? <div className="relative grid min-h-[calc(100vh-1.5rem)] place-items-center text-zinc-500">
          {sidebarCollapsed && <div className="absolute left-3 top-3"><SidebarOpenButton onClick={openSidebar}/></div>}
          Lade Daten …
        </div> : <>
          <ChartPanel className="flex flex-col sm:h-[calc(100vh-1.5rem)]">
            <div className="grid shrink-0 gap-2 border-b border-zinc-200/70 px-2 py-2 sm:px-3 sm:py-3 xl:grid-cols-[minmax(180px,0.9fr)_minmax(0,2.7fr)_auto] xl:items-start">
              <div className="flex min-w-0 items-start gap-2">
                {sidebarCollapsed && <SidebarOpenButton onClick={openSidebar}/>}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-zinc-950 sm:text-lg">Energiemix vs. Last</h2>
                  <span className={cx(muted, 'mt-0.5 block text-xs')}>{formatDate(selectedPeriod.start)} – {formatDate(selectedPeriod.end)}</span>
                </div>
              </div>
              <div className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 gap-1.5 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
                  <InlineKpi label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
                  <InlineKpi label="EE-Anteil" value={pct(result.summary.renewableSharePct)}/>
                  <InlineKpi label="Import" value={twh(result.summary.importTWh)}/>
                  <InlineKpi label="Fehlend" value={twh(result.summary.loadSheddingTWh)} tone={result.summary.loadSheddingTWh > 0.1 ? 'kritisch' : 'stabil'}/>
                  <InlineKpi label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
                </div>
                <div className="flex min-w-0 gap-1.5 overflow-x-auto sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
                  <InlineKpi label="CO₂-Intensität" value={`${fmt0.format(result.summary.co2GperKWh)} g/kWh`}/>
                  <InlineKpi label="CO₂ Jahr" value={`${fmt.format(result.summary.co2MtPerYear)} Mt`}/>
                  <InlineKpi label="Export" value={twh(result.summary.exportTWh)}/>
                  <InlineKpi label="Peak-Last" value={`${fmt0.format(result.summary.peakLoadGW)} GW`}/>
                  <InlineKpi label="Stunden Fehlend" value={`${fmt0.format(result.summary.hoursWithLoadShedding)} h`} tone={result.summary.hoursWithLoadShedding > 0 ? 'angespannt' : 'stabil'}/>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Skala zurücksetzen"
                  title="Skala auf aktuelles Szenario zurücksetzen"
                  className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
                  onClick={resetMixScale}
                  disabled={!deferredChartSource}
                >
                  <RotateCcw className="h-4 w-4"/>
                </button>
                <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
              </div>
            </div>
            <div className="relative aspect-square min-h-0 w-full bg-white sm:aspect-auto sm:flex-1">
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
            />
          </ChartPanel>

          <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂">
            <div id="storage-chart" className="h-[240px] w-full px-3 py-3"/>
          </ChartPanel>
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

function ChartPanel({ title, meta, className, children }: { title?: string; meta?: string; className?: string; children: ReactNode }) {
  return <section className={cx('min-w-0 overflow-hidden bg-white', className)}>
    {title && <div className={cx(panelHeader, 'flex items-center justify-between gap-3 px-3 py-3')}>
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      {meta && <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>}
    </div>}
    {children}
  </section>;
}

function MixLegend({ visibility, onToggleLeaf }: { visibility: MixVisibility; onToggleLeaf: (key: MixLeafKey, checked: boolean) => void }) {
  const leaves = MIX_GROUPS.flatMap(group => group.leaves);
  return <div className="grid gap-1.5 border-t border-zinc-200 bg-zinc-50/40 px-2 py-2 text-xs sm:px-3 sm:py-2.5">
    <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible">
      {EXTRA_LEAVES.map(item => {
        const active = visibility[item.key];
        return <button
          key={item.key}
          type="button"
          aria-pressed={active}
          className={cx(
            'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 transition',
            active ? 'border-zinc-300 bg-white text-zinc-800' : 'border-transparent bg-transparent text-zinc-400 hover:bg-white hover:text-zinc-700',
          )}
          onClick={() => onToggleLeaf(item.key, !active)}
        >
          <span aria-hidden className="text-[10px]" style={{ color: active ? item.color : '#d4d4d8' }}>{item.glyph}</span>
          <span>{item.label}</span>
        </button>;
      })}
    </div>
    <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible">
      {leaves.map(leaf => {
        const active = visibility[leaf.key];
        return <button
        key={leaf.key}
        type="button"
        aria-pressed={active}
        className={cx(
          'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 transition',
          active ? 'border-zinc-300 bg-white text-zinc-800' : 'border-transparent bg-transparent text-zinc-400 hover:bg-white hover:text-zinc-700',
        )}
        onClick={() => onToggleLeaf(leaf.key, !active)}
      >
        <span aria-hidden className="text-[10px]" style={{ color: active ? leaf.color : '#d4d4d8' }}>●</span>
        <span>{leaf.label}</span>
      </button>;
      })}
    </div>
  </div>;
}

function InlineKpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-600' : tone === 'angespannt' ? 'text-amber-600' : tone === 'kritisch' ? 'text-red-700' : 'text-zinc-950';
  const isAlarm = tone === 'kritisch';
  const containerClass = isAlarm
    ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-red-300 px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
    : 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-200 bg-white px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5';
  const alarmStyle = isAlarm
    ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(220,38,38,0.10) 0 6px, rgba(220,38,38,0.20) 6px 12px)' }
    : undefined;
  return <div className={containerClass} style={alarmStyle}>
    <span className={cx('truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em]', isAlarm ? 'text-red-700' : 'text-zinc-500')} title={label}>{label}</span>
    <span className={cx('whitespace-nowrap text-sm font-semibold tabular-nums', toneClass)}>{value}</span>
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
