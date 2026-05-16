import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from 'react';
import { Camera, Link, Menu, PanelLeftOpen, RotateCcw } from 'lucide-react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, PolarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { buildMixChartOption, buildStorageChartOption } from './chartOptions';
import { dataFileUrl } from './dataPackages';
import { loadDefaultData, loadJson } from './defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult, SimHour } from '../simulation/engine';
import { DEFAULT_MIX_VISIBILITY, EXTRA_LEAVES, MIX_GROUPS, type ChartMode, type MixLeafKey, type MixVisibility } from './chartOptions';
import { DataFileViewer } from './DataFileViewer';
import { DataHandbook } from './DataHandbook';
import { ChangelogModal } from './ChangelogModal';
import { applyManifestPaths, manifestUrl, type DatasetDoc, type ManifestEntry } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { fmt, fmt0, pct, twh } from './format';
import { ScenarioSidebar, type PeriodPreset, type SidebarExpandedRow, type SidebarOpenSectors } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario } from './scenarioPresets';
import { applySupplyPreset } from './supplyPresets';
import { demandGW } from '../simulation/demand';
import { aggregateErzeugungsPool, aggregateSpeicherPool, aggregateAussenhandelPool } from './defaultData';
import erzPv from '../../data/erzeugung/pv/data.json';
import erzWindOn from '../../data/erzeugung/windon/data.json';
import erzWindOff from '../../data/erzeugung/windoff/data.json';
import erzKernkraft from '../../data/erzeugung/kernkraft/data.json';
import erzBiomasse from '../../data/erzeugung/biomasse/data.json';
import erzLaufwasser from '../../data/erzeugung/laufwasser/data.json';
import erzGas from '../../data/erzeugung/gas/data.json';
import erzKohle from '../../data/erzeugung/kohle/data.json';
import aussenhandelStromData from '../../data/aussenhandel/strom-handel/data.json';
import aussenhandelH2Data from '../../data/aussenhandel/h2-handel/data.json';
import speicherBatterie from '../../data/speicher/batterie/data.json';
import speicherPumpspeicher from '../../data/speicher/pumpspeicher/data.json';
import speicherH2 from '../../data/speicher/h2/data.json';
import type {
  ErzPackageBaseload, ErzPackageDispatchable, ErzPackageVariableRe,
  AussenhandelStromData, AussenhandelH2Data,
  SpeicherBatterieData, SpeicherPumpspeicherData, SpeicherH2Data,
} from '../types/data';
import { cx, muted, shell, sidebarOffsetClass } from './ui';

const erzeugungsModell = aggregateErzeugungsPool(
  erzPv as ErzPackageVariableRe,
  erzWindOn as ErzPackageVariableRe,
  erzWindOff as ErzPackageVariableRe,
  erzKernkraft as ErzPackageBaseload,
  erzBiomasse as ErzPackageBaseload,
  erzLaufwasser as ErzPackageBaseload,
  erzGas as ErzPackageDispatchable,
  erzKohle as ErzPackageDispatchable,
);
const speicherModell = aggregateSpeicherPool(
  speicherBatterie as SpeicherBatterieData,
  speicherPumpspeicher as SpeicherPumpspeicherData,
  speicherH2 as SpeicherH2Data,
);
const aussenhandelModell = aggregateAussenhandelPool(
  aussenhandelStromData as AussenhandelStromData,
  aussenhandelH2Data as AussenhandelH2Data,
);

type SimulationWorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

const defaultExpandedRow: SidebarExpandedRow = 'e100-pkw';
const defaultCustomStart = '2025-01-01';
const defaultCustomEnd = '2025-12-31';
const defaultChartMode: ChartMode = 'sunburst';
const defaultPeriodPreset: PeriodPreset = 'year';
const defaultOpenSections = 'verkehr';
const defaultOpenSectors: SidebarOpenSectors = { verkehr: true, waerme: false, industrie: false };
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
  const values = new Set(splitUrlList(queryParams().get('sections') ?? 'verkehr'));
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
  buildOption: (data: TData) => echarts.EChartsCoreOption,
): boolean {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
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
      const ro = new ResizeObserver(() => chart.resize());
      ro.observe(el);
      resizeObserverRef.current = ro;
    }
    setPending(true);
    // notMerge: alte Option komplett verwerfen statt mergen. Sonst überleben
    // Polar-Achsen/Series-Coords den Wechsel auf Linien-Modus und der Chart
    // sieht unverändert aus.
    chartRef.current.setOption(buildOption(data), { notMerge: true });
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
  }, [containerId, data]);

  useEffect(() => () => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    chartRef.current?.dispose();
    chartRef.current = null;
  }, []);

  return pending;
}

function useMixChart(containerId: string, hours: SimHour[] | undefined, visibility: MixVisibility, mode: ChartMode): boolean {
  const data = useMemo(() => hours && hours.length ? { hours, visibility, mode } : null, [hours, visibility, mode]);
  return useMainThreadChart(containerId, data, d => buildMixChartOption(d.hours, d.visibility, d.mode));
}

function useStorageChart(containerId: string, hours: SimHour[] | undefined): boolean {
  const data = useMemo(() => hours && hours.length ? { hours } : null, [hours]);
  return useMainThreadChart(containerId, data, d => buildStorageChartOption(d.hours));
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

function useWorkerSimulation(data: DataSet | null, scenario: Scenario): { result: SimulationResult | null; isPending: boolean } {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [inFlight, setInFlight] = useState(false);
  const [isTransitioning, startTransition] = useTransition();
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const hasDataRef = useRef(false);
  const hasFiredFirstRef = useRef(false);

  useEffect(() => {
    const worker = new Worker(new URL('../simulation/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      if (event.data.requestId !== requestRef.current) return;
      setInFlight(false);
      // Setze das Result als non-urgent State-Update: React darf Slider-Events
      // dazwischen ranlassen, der Chart kommt nach. Macht den Slider responsiv
      // auch wenn die Reconciliation 50-100ms braucht.
      startTransition(() => setResult(event.data.result));
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      hasDataRef.current = false;
    };
  }, []);

  const useLoad2017 = scenario.loadYear === 2017;
  const observationYear: 2017 | 2025 = scenario.supplyPreset === 'historical-2017'
    ? 2017
    : scenario.supplyPreset === 'historical-2025'
      ? 2025
      : scenario.loadYear;
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !data) return;
    const loadHours = useLoad2017 && data.hours2017 ? data.hours2017 : data.hours;
    const obsHours = observationYear === 2017 && data.hours2017 ? data.hours2017 : data.hours;
    const hours = loadHours === obsHours
      ? loadHours
      : loadHours.map((row, i) => ({ ...row, observed: obsHours[i]?.observed ?? row.observed }));
    worker.postMessage({
      type: 'init',
      input: hours,
      'e100-pkw': data['e100-pkw'],
      'e100-heiz': data['e100-heiz'],
      'e100-lkw': data['e100-lkw'],
      'e100-bahn': data['e100-bahn'],
      'e100-schiff': data['e100-schiff'],
      'e100-flug': data['e100-flug'],
      'e100-ghd': data['e100-ghd'],
      'e100-industrie-waerme': data['e100-industrie-waerme'],
      'e100-stahl': data['e100-stahl'],
      'e100-chemie': data['e100-chemie'],
      'erzeugungs-modell': data['erzeugungs-modell'],
      'speicher-modell': data['speicher-modell'],
    });
    hasDataRef.current = true;
  }, [data, useLoad2017, observationYear]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !hasDataRef.current) return;
    setInFlight(true);
    const fire = () => {
      const requestId = ++requestRef.current;
      worker.postMessage({ type: 'run', requestId, scenario });
    };
    // Beim ersten Lauf (Page-Load) sofort feuern — kein Slider-Drag möglich,
    // 150 ms warten wäre nur künstliche Latenz. Danach Trailing-Debounce.
    if (!hasFiredFirstRef.current) {
      hasFiredFirstRef.current = true;
      fire();
      return;
    }
    const timer = window.setTimeout(fire, 150);
    return () => window.clearTimeout(timer);
  }, [data, scenario]);

  return { result, isPending: inFlight || isTransitioning };
}

function useDatasetDocs() {
  const [docs, setDocs] = useState<DatasetDoc[]>([]);
  useEffect(() => {
    loadJson<ManifestEntry[]>(manifestUrl)
      .then(entries => {
        applyManifestPaths(entries);
        return Promise.all(entries.map(entry => loadJson<DatasetDoc>(dataFileUrl(entry.description))));
      })
      .then(setDocs)
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

export function App() {
  const [route] = useState(urlView);
  if (route.view === 'datei' && route.path) return <DataFileViewer path={route.path}/>;
  if (route.view === 'daten') return <DataHandbookRoute/>;
  return <Dashboard initialChangelogOpen={route.view === 'changelog'}/>;
}

function DataHandbookRoute() {
  const datasetDocs = useDatasetDocs();
  return <DataHandbook docs={datasetDocs}/>;
}

function Dashboard({ initialChangelogOpen = false }: { initialChangelogOpen?: boolean }) {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(scenarioFromQueryParams);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(periodPresetFromUrl);
  const [customStart, setCustomStart] = useState(() => dateFromUrl('start', defaultCustomStart));
  const [customEnd, setCustomEnd] = useState(() => dateFromUrl('end', defaultCustomEnd));
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  const [mixVisibility, setMixVisibility] = useState<MixVisibility>(mixVisibilityFromUrl);
  const [chartMode, setChartMode] = useState<ChartMode>(chartModeFromUrl);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(sidebarCollapsedFromUrl);
  const [openSectors, setOpenSectors] = useState<SidebarOpenSectors>(openSectorsFromUrl);
  const [expandedRow, setExpandedRow] = useState<SidebarExpandedRow>(expandedRowFromUrl);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [changelogOpen, setChangelogOpenState] = useState(initialChangelogOpen);

  const setChangelogOpen = (next: boolean) => {
    setChangelogOpenState(next);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const basePath = new URL(import.meta.env.BASE_URL, url.origin).pathname;
    const target = next ? `${basePath}changelog` : basePath.replace(/\/$/, '') || '/';
    if (url.pathname !== target) {
      url.pathname = target;
      window.history.replaceState(null, '', url);
    }
  };

  useEffect(() => {
    loadDefaultData().then(setData).catch(console.error);
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

  const resolvedScenario = useMemo<Scenario>(() => {
    if (!data || scenario.supplyPreset === 'custom') return scenario;
    const demandContext = {
      'e100-pkw': data['e100-pkw'],
      'e100-heiz': data['e100-heiz'],
      'e100-lkw': data['e100-lkw'],
      'e100-bahn': data['e100-bahn'],
      'e100-schiff': data['e100-schiff'],
      'e100-flug': data['e100-flug'],
      'e100-ghd': data['e100-ghd'],
      'e100-industrie-waerme': data['e100-industrie-waerme'],
      'e100-stahl': data['e100-stahl'],
      'e100-chemie': data['e100-chemie'],
    };
    const annualDemandTWh = data.hours.reduce((sum, row) => sum + demandGW(row, scenario, demandContext), 0) / 1000;
    const override = applySupplyPreset(scenario.supplyPreset, annualDemandTWh, data.hours, erzeugungsModell, speicherModell, aussenhandelModell);
    return {
      ...scenario,
      generation: override.generation,
      storage: override.storage,
      import: override.import,
      export: override.export,
    };
  }, [scenario, data]);

  const { result, isPending: simPending } = useWorkerSimulation(data, resolvedScenario);
  useEffect(() => {
    if (!result || chartResult === result) return;
    if (!chartResult) {
      setChartResult(result);
      return;
    }
    // 180ms-Debounce: bei schnellem Slider-Drag werden Zwischenergebnisse
    // verworfen, der Chart-Render läuft erst nachdem der Slider stillsteht.
    // KPIs (oben) bleiben am ungedebouncten `result` und reagieren sofort.
    const timer = window.setTimeout(() => setChartResult(result), 180);
    return () => window.clearTimeout(timer);
  }, [result, chartResult]);

  const selectedPeriod = periodDates(periodPreset, customStart, customEnd, scenario.loadYear);
  // Defer chart-source updates: Slider-Tick triggert sofortige KPI-Updates, der
  // Chart läuft hinterher und blockiert Input nicht.
  const deferredChartSource = useDeferredValue<SimulationResult | null>(chartResult ?? result);
  const sliced = useMemo(() => deferredChartSource?.hours.filter(hour => {
    const day = localDate(hour.time);
    return day >= selectedPeriod.start && day <= selectedPeriod.end;
  }) ?? [], [deferredChartSource, selectedPeriod.start, selectedPeriod.end]);
  const mixPending = useMixChart('mix-chart', sliced, mixVisibility, chartMode);
  const storagePending = useStorageChart('storage-chart', sliced);
  // Indikator bleibt sichtbar, solange die Simulation rechnet, der 180ms-
  // Chart-Debounce läuft oder ECharts den letzten Frame noch nicht fertig
  // gerendert hat ('finished'-Event).
  const debouncing = !!result && chartResult !== result;
  const isPending = simPending || debouncing || mixPending || storagePending;

  const setQuickStart = (date: string) => {
    setPeriodPreset('custom');
    setCustomStart(date);
    if (customEnd < date) setCustomEnd(date);
  };
  const setQuickEnd = (date: string) => {
    setPeriodPreset('custom');
    setCustomEnd(date < customStart ? customStart : date);
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

  return <main className={shell}>
    <div className={cx(
      'mx-auto w-full max-w-[1760px]',
      sidebarCollapsed ? '' : sidebarOffsetClass,
    )}>
      <section className="flex min-w-0 flex-col gap-3">
        {!result ? <div className="relative grid min-h-[calc(100vh-1.5rem)] place-items-center rounded-xl border border-zinc-200/80 bg-white text-zinc-500 shadow-[0_18px_45px_rgba(24,24,27,.06)]">
          {sidebarCollapsed && <div className="absolute left-3 top-3"><SidebarOpenButton onClick={openSidebar}/></div>}
          Lade Daten …
        </div> : <>
          <ChartPanel className="flex h-[calc(100vh-1.5rem)] flex-col p-3">
            <div className="mb-2.5 grid shrink-0 gap-2 border-b border-zinc-100 pb-2.5 xl:grid-cols-[minmax(180px,0.9fr)_minmax(0,2.7fr)_auto] xl:items-start">
              <div className="flex min-w-0 items-start gap-2">
                {sidebarCollapsed && <SidebarOpenButton onClick={openSidebar}/>}
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-zinc-950">Energiemix vs. Last</h2>
                  <span className={cx(muted, 'mt-0.5 block text-xs')}>{formatDate(selectedPeriod.start)} – {formatDate(selectedPeriod.end)}</span>
                </div>
              </div>
              <div className="grid min-w-0 gap-1.5">
                <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                  <InlineKpi label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
                  <InlineKpi label="EE-Anteil" value={pct(result.summary.renewableSharePct)}/>
                  <InlineKpi label="Import" value={twh(result.summary.importTWh)}/>
                  <InlineKpi label="Fehlend" value={twh(result.summary.loadSheddingTWh)} tone={result.summary.loadSheddingTWh > 0.1 ? 'kritisch' : 'stabil'}/>
                  <InlineKpi label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
                </div>
                <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                  <InlineKpi label="CO₂-Intensität" value={`${fmt0.format(result.summary.co2GperKWh)} g/kWh`}/>
                  <InlineKpi label="CO₂ Jahr" value={`${fmt.format(result.summary.co2MtPerYear)} Mt`}/>
                  <InlineKpi label="Export" value={twh(result.summary.exportTWh)}/>
                  <InlineKpi label="Peak-Last" value={`${fmt0.format(result.summary.peakLoadGW)} GW`}/>
                  <InlineKpi label="Stunden Fehlend" value={`${fmt0.format(result.summary.hoursWithLoadShedding)} h`} tone={result.summary.hoursWithLoadShedding > 0 ? 'angespannt' : 'stabil'}/>
                </div>
              </div>
              <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
            </div>
            <div className="relative min-h-0 flex-1 rounded-lg bg-white">
              <div
                id="mix-chart"
                className={cx(
                  'h-full w-full transition-opacity duration-150',
                  isPending ? 'opacity-40' : 'opacity-100',
                )}
              />
              <div
                aria-hidden={!isPending}
                className={cx(
                  'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden rounded-t-lg bg-zinc-100/60 transition-opacity duration-150',
                  isPending ? 'opacity-100' : 'opacity-0',
                )}
              >
                <div className="h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-950 to-transparent"/>
              </div>
              <div
                aria-hidden={!isPending}
                className={cx(
                  'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150',
                  isPending ? 'opacity-100' : 'opacity-0',
                )}
              >
                <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white shadow-sm">
                  Aktualisiere …
                </div>
              </div>
            </div>
            <MixLegend
              visibility={mixVisibility}
              onToggleLeaf={(key, checked) => setMixVisibility(prev => ({ ...prev, [key]: checked }))}
            />
          </ChartPanel>

          <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂" className="p-4">
            <div id="storage-chart" className="h-[240px] w-full"/>
          </ChartPanel>
          <DisclaimerFooter className="mt-auto pt-2 text-xs leading-5 text-zinc-500"/>
        </>}
      </section>

      <ScenarioSidebar
        data={data}
        scenario={resolvedScenario}
        onOpenChangelog={() => setChangelogOpen(true)}
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
        />}
        onCollapsedChange={setSidebarCollapsed}
        onOpenSectorsChange={setOpenSectors}
        onExpandedRowChange={setExpandedRow}
        onPreset={setPeriodPreset}
        onStart={setQuickStart}
        onEnd={setQuickEnd}
        onHistoricalLoadChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'last-2025': checked } }))}
        onLoadYearChange={(year) => setScenario(prev => ({ ...prev, loadYear: year }))}
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
    <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)}/>
  </main>;
}

function HeaderActions({ status, onReset, onCopyUrl, onScreenshot }: { status: string | null; onReset: () => void; onCopyUrl: () => void; onScreenshot: () => void }) {
  return <div className="rounded-xl border border-zinc-200/80 bg-white p-2 shadow-[0_10px_26px_rgba(24,24,27,.04)]">
    <div className="grid grid-cols-3 gap-1.5">
      <IconAction label="Zurücksetzen" onClick={onReset}><RotateCcw className="h-3.5 w-3.5"/></IconAction>
      <IconAction label="Link kopieren" onClick={onCopyUrl}><Link className="h-3.5 w-3.5"/></IconAction>
      <IconAction label="Plot kopieren" onClick={onScreenshot}><Camera className="h-3.5 w-3.5"/></IconAction>
    </div>
    {status && <div className="mt-1.5 truncate rounded-md bg-zinc-100 px-2 py-1 text-center text-[11px] font-medium text-zinc-600">{status}</div>}
  </div>;
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <button
    type="button"
    aria-label={label}
    title={label}
    className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-950"
    onClick={onClick}
  >
    {children}
    <span className="truncate">{label}</span>
  </button>;
}

function SidebarOpenButton({ onClick }: { onClick: () => void }) {
  return <button
    type="button"
    aria-label="Sidebar öffnen"
    aria-expanded={false}
    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-950"
    onClick={onClick}
  >
    <Menu className="h-4 w-4 lg:hidden" aria-hidden="true"/>
    <PanelLeftOpen className="hidden h-4 w-4 lg:block" aria-hidden="true"/>
  </button>;
}

function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  const modes: Array<[ChartMode, string]> = [['sunburst', 'Polar'], ['linie', 'Linie']];
  return <div className="inline-flex shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-xs shadow-sm" aria-label="Diagrammform wählen">
    {modes.map(([value, label]) => <button
      key={value}
      type="button"
      aria-pressed={mode === value}
      className={cx('rounded-md px-2.5 py-1 transition', mode === value ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-500 hover:bg-white hover:text-zinc-950')}
      onClick={() => onChange(value)}
    >{label}</button>)}
  </div>;
}

function ChartPanel({ title, meta, className, children }: { title?: string; meta?: string; className?: string; children: ReactNode }) {
  return <section className={cx('min-w-0 overflow-hidden rounded-xl border border-zinc-200/80 bg-white shadow-[0_18px_45px_rgba(24,24,27,.06)]', className)}>
    {title && <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      {meta && <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>}
    </div>}
    {children}
  </section>;
}

function MixLegend({ visibility, onToggleLeaf }: { visibility: MixVisibility; onToggleLeaf: (key: MixLeafKey, checked: boolean) => void }) {
  const leaves = MIX_GROUPS.flatMap(group => group.leaves);
  return <div className="mt-2.5 grid gap-1.5 border-t border-zinc-100 pt-2.5 text-xs">
    <div className="flex flex-wrap gap-1.5">
      {EXTRA_LEAVES.map(item => {
        const active = visibility[item.key];
        return <button
          key={item.key}
          type="button"
          aria-pressed={active}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition',
            active ? 'border-zinc-200 bg-white text-zinc-800 shadow-sm' : 'border-transparent bg-transparent text-zinc-400',
          )}
          onClick={() => onToggleLeaf(item.key, !active)}
        >
          <span aria-hidden className="text-[10px]" style={{ color: active ? item.color : '#d4d4d8' }}>{item.glyph}</span>
          <span>{item.label}</span>
        </button>;
      })}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {leaves.map(leaf => {
        const active = visibility[leaf.key];
        return <button
        key={leaf.key}
        type="button"
        aria-pressed={active}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 transition',
          active ? 'border-zinc-200 bg-white text-zinc-800 shadow-sm' : 'border-transparent bg-transparent text-zinc-400',
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
    ? 'grid min-w-0 gap-0.5 overflow-hidden rounded-md border border-red-300 px-2.5 py-1.5 leading-tight'
    : 'grid min-w-0 gap-0.5 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-1.5 leading-tight';
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
