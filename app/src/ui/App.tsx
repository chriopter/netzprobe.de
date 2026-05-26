import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChangelogPage } from './ChangelogPage';
import { DataHandbookContent, DataHandbookSidebar } from './DataHandbook';
import { Camera, Link, Menu, Pause, Play, RotateCcw } from 'lucide-react';
import * as echarts from 'echarts/core';
import { LineChart, MapChart, ScatterChart } from 'echarts/charts';
import { GeoComponent, GridComponent, LegendComponent, PolarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { mixReferenceScaleMaxGW, mixScalePeakGW } from './chartOptions';
import { dataFileUrl } from './dataPackages';
import { loadDefaultData, loadHistorical2017, loadJson, type Historical2017Data } from './defaultData';
import germanyGeoJson from './germanyGeoJson.json';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../types/simulation';
import { DEFAULT_MIX_VISIBILITY, EXTRA_LEAVES, MIX_GROUPS, type ChartMode, type MixVisibility } from './chartOptions';
import { MAIN_VIEW_IMPLEMENTED, MAIN_VIEW_LABELS, type MainViewId } from './sectionUi';
import MixSection from './sections/MixSection';
import FlaecheSection from './sections/FlaecheSection';
import RessourcenSection from './sections/RessourcenSection';
import NetzSection from './sections/NetzSection';
import KostenSection from './sections/KostenSection';
// DataFileViewer bleibt lazy — Spezial-Route, selten genutzt. Wiki und
// Changelog werden statisch importiert, damit der Tab-Wechsel kein
// Suspense-Flash mehr erzeugt (Sidebar bleibt sichtbar, Layout stabil).
const loadDataFileViewer = () => import('./DataFileViewer');
const DataFileViewer = lazy(() => loadDataFileViewer().then(m => ({ default: m.DataFileViewer })));
import type { DatasetDoc } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { pct, twh } from './format';
import { ScenarioSidebar, type PeriodPreset, type SidebarExpandedRow, type SidebarOpenSectors } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario } from './scenarioPresets';
import { cx, iconButton, shell, sidebarOffsetClass } from './ui';

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
  // Indikator bleibt sichtbar, solange die Simulation rechnet, der 180ms-
  // Chart-Debounce läuft oder ECharts den letzten Frame noch nicht fertig
  // gerendert hat ('finished'-Event). Mix/Storage-Chart-Pending wird in
  // MixSection eigenständig hinzu-gemerged.
  const debouncing = !!result && chartResult !== result;
  const isOutdated = simStale || debouncing;
  const isPending = simPending || debouncing;
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

  return <main className={cx(shell, 'flex flex-col')}>
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
          <MixSection
            result={result}
            resolvedScenario={resolvedScenario}
            chartMode={chartMode}
            setChartMode={setChartMode}
            mixVisibility={mixVisibility}
            setMixVisibility={setMixVisibility}
            isPending={isPending}
            isOutdated={isOutdated}
            sliderActive={sliderActive}
            liveSimulation={liveSimulation}
            deferredChartSource={deferredChartSource}
            sliced={sliced}
            referenceScaleMaxGW={referenceScaleMaxGW}
            resetMixScale={resetMixScale}
            runSimulationNow={runSimulationNow}
          />
          <FlaecheSection scenario={resolvedScenario}/>
          <RessourcenSection/>
          <NetzSection/>
          <KostenSection/>
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
  return <div className="pointer-events-none sticky top-2 z-30 flex items-center gap-2 sm:top-3">
    {sidebarCollapsed && <div className="pointer-events-auto"><SidebarOpenButton onClick={onOpenSidebar}/></div>}
    <nav aria-label="Hauptansicht" className="pointer-events-auto inline-flex shrink-0 rounded-full border border-zinc-200 bg-white p-0.5 text-[13px] font-medium leading-none shadow-sm">
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
