import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChangelogPage } from './ChangelogPage';
import { FortschrittPage, FortschrittQuellen } from './FortschrittPage';
import { DataHandbookContent, DataHandbookSidebar } from './DataHandbook';
import { Camera, Link, Menu, Moon, Pause, Play, Plus, RotateCcw, Sun, TrendingUp, X } from 'lucide-react';
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
import { MAIN_VIEW_LABELS, type MainViewId } from './sectionUi';
import MixSection from './sections/MixSection';
import FlaecheSection from './sections/FlaecheSection';
import RessourcenSection from './sections/RessourcenSection';
import KostenSection from './sections/KostenSection';
import DatensatzSection from './sections/DatensatzSection';
// DataFileViewer bleibt lazy — Spezial-Route, selten genutzt. Wiki und
// Changelog werden statisch importiert, damit der Tab-Wechsel kein
// Suspense-Flash mehr erzeugt (Sidebar bleibt sichtbar, Layout stabil).
const loadDataFileViewer = () => import('./DataFileViewer');
const DataFileViewer = lazy(() => loadDataFileViewer().then(m => ({ default: m.DataFileViewer })));
import type { DatasetDoc } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { UpdateBanner } from './UpdateBanner';
import { pct, twh } from './format';
import { supplyPillLabels, supplyPresetIds } from './supplyPresets';
import { ScenarioSidebar, electrifiedFraction, loadPillLabels, matchingLoadPreset, type CostPeriod, type PeriodPreset, type SidebarExpandedRow, type SidebarOpenSectors } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario } from './scenarioPresets';
import { KOSTEN_LEVERS, OPTIMISM, OPTIMISM_DIMS, type Optimism } from './costLevers';
import { computeKosten } from './kosten';
import { captureNodeToPng, FloatingPanel } from './sectionUi';
import { cx, iconButton, shell, sidebarOffsetClass } from './ui';

type SimulationView = { start: string; end: string; maxPoints: number };

const defaultExpandedRow: SidebarExpandedRow = null;
const defaultCustomStart = '2025-01-01';
const defaultCustomEnd = '2025-12-31';
const defaultChartMode: ChartMode = 'sunburst';
const defaultPeriodPreset: PeriodPreset = 'year';
const defaultPeriodYears: CostPeriod = '20';
const defaultOpenSections = '';
const defaultOpenSectors: SidebarOpenSectors = { verkehr: false, waerme: false, industrie: false, wachstum: false };
const themeStorageKey = 'theme';
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
  ['klimaTWh', 'klima-flaechendeckend-target-twh'],
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
  return clean === 'flaeche' || clean === 'ressourcen' || clean === 'kosten' ? clean : null;
}

function pathForMainView(view: MainViewId) {
  const basePath = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
  return `${basePath}${view === 'mix' ? '' : `${view}/`}`;
}

function periodPresetFromUrl(): PeriodPreset {
  const value = queryParams().get('p');
  return value === '21d' || value === '90d' || value === 'custom' || value === 'year' ? value : defaultPeriodPreset;
}

// Optimismus-Regler — URL-Params `opt` (Hauptregler) und `opt.<dim>` (Sub-Regler,
// nur wenn sie vom Hauptregler abweichen). Default 0 = Paketwerte.
const clampOpt = (raw: string | null): number | null => {
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(OPTIMISM.max, Math.max(OPTIMISM.min, value)) : null;
};
function optimismFromUrl(): Optimism {
  const q = queryParams();
  const out: Optimism = { main: clampOpt(q.get('opt')) ?? OPTIMISM.def };
  for (const d of OPTIMISM_DIMS) {
    const v = clampOpt(q.get(`opt.${d.key}`));
    if (v !== null) out[d.key] = v;
  }
  return out;
}

function periodYearsFromUrl(): CostPeriod {
  const value = queryParams().get('jahre');
  return value === '20' || value === '30' || value === '40' ? value : defaultPeriodYears;
}

function dateFromUrl(name: string, fallback: string) {
  const value = queryParams().get(name);
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function chartModeFromUrl(): ChartMode {
  return queryParams().get('chart') === 'linie' ? 'linie' : defaultChartMode;
}

// Speicherfüllstand-Darstellung: Polar wie der Energiemix, per Toggle auf Linie.
// Ehemals Dropdown 'mix'|'kombi'|'speicher' — jetzt nur noch das
// Fuellstand-Overlay als Chip; alte 'speicher'-Links mappen auf Overlay an.
function storageOverlayFromUrl(): boolean {
  const value = queryParams().get('ansicht');
  return value === 'kombi' || value === 'speicher';
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
    wachstum: values.has('wachstum'),
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
    return value === 'flaeche' || value === 'ressourcen' || value === 'kosten' ? value : 'mix';
  } catch {
    return 'mix';
  }
}

type ThemeMode = 'light' | 'dark';

function systemTheme(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function storedTheme(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(themeStorageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
}

function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>(() => storedTheme() ?? systemTheme());
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!storedTheme()) setTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  const toggleTheme = () => setTheme(value => {
    const next = value === 'dark' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(themeStorageKey, next);
    } catch {
      // Theme bleibt für diese Sitzung trotzdem aktiv.
    }
    return next;
  });
  return { theme, toggleTheme };
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

// Datengetrieben aus den preset-Blöcken der package.json (siehe supplyPresetCatalog) plus 'custom'.
const validSupplyPresets: ReadonlyArray<Scenario['supplyPreset']> = ['custom', ...supplyPresetIds];

function parseScenarioFromParams(params: URLSearchParams): Scenario {
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
  const co = params.get('co');
  if (co) {
    const overrides: Record<string, Record<string, number>> = {};
    for (const part of co.split(',')) {
      const [techKey, rawVal] = part.split(':');
      if (!techKey || rawVal == null) continue;
      const [tech, leverKey] = techKey.split('.');
      const value = Number(rawVal);
      if (!tech || !leverKey || !Number.isFinite(value)) continue;
      (overrides[tech] ??= {})[leverKey] = value;
    }
    scenario.costOverrides = overrides;
  }
  const klima = params.get('klima');
  if (klima !== null) (scenario.demand as Record<string, boolean | number>)['klima-flaechendeckend'] = klima === '1';
  const base = params.get('base');
  if (base !== null) (scenario.demand as Record<string, boolean | number>)['last-2025'] = base === '1';
  return scenario;
}

// base64url für den kompakten Mehr-Szenario-Param (URL-sicher, keine %-Flut).
// Lädt das komplette Szenario-Set aus der URL — lesbar, ohne Base64: Szenario 0
// steht unpräfixiert (abwärtskompatibel zu alten Einzel-URLs), weitere als
// `s1.<key>`, `s2.<key>` …; `sn` = Anzahl, `sa` = aktiver Index.
const PREFIXED_KEY = /^s(\d+)\./;
function scenariosFromQueryParams(): { scenarios: Scenario[]; active: number } {
  const params = queryParams();
  const scenarios = [parseScenarioFromParams(params)];
  const count = Math.max(1, Number(params.get('sn')) || 1);
  for (let i = 1; i < count; i++) {
    const prefix = `s${i}.`;
    const sub = new URLSearchParams();
    for (const [key, value] of params) if (key.startsWith(prefix)) sub.set(key.slice(prefix.length), value);
    scenarios.push(parseScenarioFromParams(sub));
  }
  const active = Math.min(Math.max(0, Number(params.get('sa')) || 0), scenarios.length - 1);
  return { scenarios, active };
}

function writeScenarioParams(params: URLSearchParams, scenario: Scenario) {
  params.delete('s');
  if (scenario.supplyPreset === scenarioBase.supplyPreset) params.delete('sp');
  else params.set('sp', scenario.supplyPreset);
  const enabled = electrificationFlags.filter(key => scenario.demand[key]);
  if (enabled.length === 0) {
    params.delete('e');
  } else if (enabled.length === electrificationFlags.length) {
    params.set('e', fullElectrificationId);
  } else {
    const ids = enabled
      .filter(key => electrificationIds.has(key))
      .join(listSeparator);
    params.set('e', ids);
  }
  for (const [param, key] of scenarioNumberParams) {
    if (scenario.demand[key] === scenarioBase.demand[key]) params.delete(param);
    else params.set(param, String(scenario.demand[key]));
  }
  for (const [param, key] of scenarioGenerationParams) {
    if (scenario.generation[key] === scenarioBase.generation[key]) params.delete(param);
    else params.set(param, String(scenario.generation[key]));
  }
  for (const [param, key] of scenarioStorageParams) {
    if (scenario.storage[key] === scenarioBase.storage[key]) params.delete(param);
    else params.set(param, String(scenario.storage[key]));
  }
  for (const [param, key] of scenarioImportParams) {
    if (scenario.import[key] === scenarioBase.import[key]) params.delete(param);
    else params.set(param, String(scenario.import[key]));
  }
  for (const [param, key] of scenarioExportParams) {
    if (scenario.export[key] === scenarioBase.export[key]) params.delete(param);
    else params.set(param, String(scenario.export[key]));
  }
  // Kosten-Overrides: kompakt als co=tech.leverKey:wert,… — nur Hebel, die vom
  // Default abweichen (gleiche Logik wie hasActiveOverrides).
  const coParts: string[] = [];
  for (const tech of Object.keys(KOSTEN_LEVERS)) {
    const ov = scenario.costOverrides?.[tech];
    if (!ov) continue;
    for (const lever of KOSTEN_LEVERS[tech]) {
      const v = ov[lever.key];
      if (v != null && v !== lever.def) coParts.push(`${tech}.${lever.key}:${v}`);
    }
  }
  if (coParts.length) params.set('co', coParts.join(',')); else params.delete('co');
  // Wachstum-Flag (klimatisierung) — eigener boolescher Param.
  if (scenario.demand['klima-flaechendeckend'] === scenarioBase.demand['klima-flaechendeckend']) params.delete('klima');
  else params.set('klima', scenario.demand['klima-flaechendeckend'] ? '1' : '0');
  // Basislast 2025 (Default an) — eigener Param, damit „Basis abgehakt" teilbar ist.
  if (scenario.demand['last-2025'] === scenarioBase.demand['last-2025']) params.delete('base');
  else params.set('base', scenario.demand['last-2025'] ? '1' : '0');
}

// Schreibt das ganze Set lesbar in die URL: Szenario 0 unpräfixiert (wie eine
// klassische Einzel-URL), weitere als `s1.<key>` …, plus `sn`/`sa`. Räumt alte
// Prefix-Params (und den früheren base64-`set`) weg.
function syncScenarioParams(url: URL, scenarios: Scenario[], active: number) {
  for (const key of [...url.searchParams.keys()]) if (PREFIXED_KEY.test(key)) url.searchParams.delete(key);
  url.searchParams.delete('set');
  writeScenarioParams(url.searchParams, scenarios[0] ?? scenarioBase);
  for (let i = 1; i < scenarios.length; i++) {
    const sub = new URLSearchParams();
    writeScenarioParams(sub, scenarios[i]);
    for (const [key, value] of sub) url.searchParams.set(`s${i}.${key}`, value);
  }
  if (scenarios.length > 1) {
    url.searchParams.set('sn', String(scenarios.length));
    url.searchParams.set('sa', String(active));
  } else {
    url.searchParams.delete('sn');
    url.searchParams.delete('sa');
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
    // Kurze Zeiträume in voller Stundenauflösung (max. 31 × 24 = 744 Punkte,
    // das Limit von compressHours); längere als Tagesmittel.
    maxPoints: days <= 31 ? days * 24 : days,
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
  // Ergebnis-Cache pro Szenario-INHALT (+ View): beim Wechsel zwischen Reitern
  // wird ein bereits gerechnetes Szenario sofort aus dem Cache angezeigt, ohne
  // die Engine erneut zu befragen. Eine unveränderte Kopie teilt sich den Cache.
  const cacheRef = useRef(new Map<string, SimulationResult>());

  useEffect(() => {
    if (!data) return;
    const cacheKey = JSON.stringify({ scenario, view });
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResult(cached);
      setStale(false);
      setInFlight(false);
      hasFiredFirstRef.current = true;
      return;
    }
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
          if (cacheRef.current.size > 64) cacheRef.current.clear();
          cacheRef.current.set(cacheKey, nextResult);
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
  // Auflösungs-Cache pro Szenario-Inhalt — siehe useRustSimulation.
  const cacheRef = useRef(new Map<string, Scenario>());
  useEffect(() => {
    if (!data) {
      setResolved(scenario);
      return;
    }
    const cacheKey = JSON.stringify(scenario);
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
      setResolved(cached);
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
        if (requestId !== requestRef.current) return;
        if (cacheRef.current.size > 64) cacheRef.current.clear();
        cacheRef.current.set(cacheKey, next);
        setResolved(next);
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
    if (path === 'fortschritt' || path === 'fortschritt/') return { view: 'fortschritt' as const, path: null };
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
  const { theme, toggleTheme } = useThemeMode();
  const [route, setRoute] = useState(urlView);
  const routeIsDashboard = route.view !== 'datei' && route.view !== 'daten' && route.view !== 'changelog' && route.view !== 'fortschritt';
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
        : route.view === 'fortschritt'
          ? <FortschrittRoute/>
          : null;

  return <>
    <UpdateBanner/>
    <ThemeToggle theme={theme} onToggleTheme={toggleTheme}/>
    {dashboardMounted && <div hidden={!routeIsDashboard}><Dashboard theme={theme}/></div>}
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

// Fortschritt: eigene Vollseite mit dem CO2-frei-Dreisatz seit 2000.
function FortschrittRoute() {
  return <main className={shell}>
    <FortschrittToggle variant="floating"/>
    <FortschrittPage/>
    {/* Alles unterhalb des Trennstrichs: erst die Quellen der Seite, dann der
        allgemeine Disclaimer — beide teilen sich denselben Strich. */}
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 border-t border-zinc-200 px-4 pb-10 pt-4 dark:border-zinc-800">
      <FortschrittQuellen/>
      <DisclaimerFooter className="text-xs leading-5 text-zinc-500 dark:text-zinc-400"/>
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
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20"
          onClick={() => setSidebarCollapsed(false)}
        >
          <Menu className="h-4 w-4" aria-hidden="true"/>
        </button></div>}
        <div className="flex min-w-0 rounded-lg border border-zinc-200 bg-white dark:border-transparent dark:bg-zinc-950">
          <article className="min-w-0 flex-1 px-4 pb-14 pt-8 sm:px-6 lg:px-10 lg:py-8">
            <ChangelogPage/>
            <DisclaimerFooter className="mt-12 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"/>
          </article>
        </div>
      </section>
    </div>
  </main>;
}

// Szenario-Reiter: einfacher Slot-Wechsler oben über dem Dashboard. Erst nur
// Umschalten + Hinzufügen/Entfernen; Vergleich/Side-by-side später.
function ScenarioTabs({ count, active, onSelect, onAdd, onRemove }: {
  count: number;
  active: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  // Browser-Tab-Logik: das aktive Szenario ist breit mit Label, inaktive sind
  // kompakte Nummern-Pillen, die beim Anklicken „aufgehen" (aktiv werden).
  return <div className="flex items-center gap-1">
    {Array.from({ length: count }, (_, i) => {
      if (i === active) {
        return <div key={i} className="inline-flex h-[26px] items-center rounded-full bg-zinc-950 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
          <span className={cx('whitespace-nowrap pl-3', count > 1 ? 'pr-1' : 'pr-3')}>Szenario {i + 1}</span>
          {count > 1 && <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Szenario ${i + 1} entfernen`}
            className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-60 transition hover:bg-black/15 hover:opacity-100 dark:hover:bg-white/20"
          ><X className="h-3 w-3"/></button>}
        </div>;
      }
      return <button
        key={i}
        type="button"
        onClick={() => onSelect(i)}
        aria-label={`Szenario ${i + 1}`}
        title={`Szenario ${i + 1}`}
        className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 hover:text-zinc-950 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50"
      >{i + 1}</button>;
    })}
    <button
      type="button"
      onClick={onAdd}
      aria-label="Szenario hinzufügen"
      title="Szenario hinzufügen"
      className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
    ><Plus className="h-4 w-4"/></button>
    <FortschrittToggle variant="tab"/>
  </div>;
}

// Fortschritt-Umschalter: im Dashboard als »tab«-Variante neben dem »+« der
// Szenario-Reiter, auf der Fortschritt-Seite als »floating«-Variante links neben
// dem Theme-Knopf — gleiche Größe und Optik wie dieser, führt zurück.
function FortschrittToggle({ variant }: { variant: 'tab' | 'floating' }) {
  const zurueck = variant === 'floating';
  return <a
    href={zurueck ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}fortschritt`}
    aria-label={zurueck ? 'Zurück zur Simulation' : 'Fortschritt'}
    aria-current={zurueck ? 'page' : undefined}
    title={zurueck ? 'Zurück zur Simulation' : 'Fortschritt'}
    className={zurueck
      ? cx(floatingRoundButton, 'fixed right-[52px] top-3 z-[60] sm:right-14')
      : 'inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'}
  ><TrendingUp className="h-4 w-4" aria-hidden="true"/></a>;
}

function Dashboard({ theme }: { theme: ThemeMode }) {
  const [rawData, setRawData] = useState<DataSet | null>(null);
  const [historical2017, setHistorical2017] = useState<Historical2017Data | null>(null);
  // Mehrere Szenario-Slots (Reiter); der aktive Slot ist das, was Sidebar/Bon
  // anzeigen. setScenario bleibt als Wrapper auf den aktiven Slot bestehen, damit
  // alle vorhandenen Handler unverändert weiterlaufen.
  const initialScenarioSet = useMemo(scenariosFromQueryParams, []);
  const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarioSet.scenarios);
  const [activeScenario, setActiveScenario] = useState(initialScenarioSet.active);
  const scenario = scenarios[activeScenario] ?? scenarios[0];
  const setScenario = (updater: Scenario | ((prev: Scenario) => Scenario)) =>
    setScenarios(prev => prev.map((s, i) => i === activeScenario
      ? (typeof updater === 'function' ? (updater as (p: Scenario) => Scenario)(s) : updater)
      : s));
  const addScenario = () => {
    setScenarios(prev => [...prev, JSON.parse(JSON.stringify(prev[activeScenario] ?? prev[0])) as Scenario]);
    setActiveScenario(scenarios.length);
  };
  const removeScenario = (index: number) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter((_, i) => i !== index));
    setActiveScenario(a => Math.max(0, Math.min(index <= a ? a - 1 : a, scenarios.length - 2)));
  };
  // Tasten 1–9: direkt zu Szenario N springen. Nur greifen, wenn kein Eingabe-
  // feld/Slider fokussiert ist und keine Modifier-Taste gedrückt ist — sonst
  // würde es die normale Tastatur-Bedienung (Eingaben, Slider) stören.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (event.key >= '1' && event.key <= '9') {
        const index = Number(event.key) - 1;
        // Existiert das Szenario noch nicht, bis dahin mit Kopien des aktiven
        // auffüllen (wie der „+"-Knopf) und dann hinspringen.
        if (index >= scenarios.length) {
          setScenarios(prev => {
            const next = [...prev];
            const seed = prev[activeScenario] ?? prev[0];
            while (next.length <= index) next.push(JSON.parse(JSON.stringify(seed)) as Scenario);
            return next;
          });
        }
        setActiveScenario(index);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scenarios.length, activeScenario]);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(periodPresetFromUrl);
  const [customStart, setCustomStart] = useState(() => dateFromUrl('start', defaultCustomStart));
  const [customEnd, setCustomEnd] = useState(() => dateFromUrl('end', defaultCustomEnd));
  const [periodYears, setPeriodYears] = useState<CostPeriod>(periodYearsFromUrl);
  const [optimism, setOptimism] = useState<Optimism>(optimismFromUrl);
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  // Build-Time pre-computed default als sofortiger Erst-Render. Wird beim ersten
  // Worker-Ergebnis (Slider-Drag) durch live-Rechnung ersetzt.
  const hasLiveResultRef = useRef(false);
  const [mixVisibility, setMixVisibility] = useState<MixVisibility>(mixVisibilityFromUrl);
  const [chartMode, setChartMode] = useState<ChartMode>(chartModeFromUrl);
  const [fillLines, setFillLines] = useState<{ batterie: boolean; h2: boolean }>(() => storageOverlayFromUrl() ? { batterie: true, h2: true } : { batterie: false, h2: false });
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

  // Vollstaendige Szenario-URL (wie der kopierbare Link) — fuer den QR-Code
  // auf der Stromrechnung; wird vom URL-Sync-Effekt unten aktuell gehalten.
  const [shareUrl, setShareUrl] = useState('');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    syncScenarioParams(url, scenarios, activeScenario);

    if (periodPreset === defaultPeriodPreset) url.searchParams.delete('p');
    else url.searchParams.set('p', periodPreset);

    if (customStart === defaultCustomStart) url.searchParams.delete('start');
    else url.searchParams.set('start', customStart);

    if (customEnd === defaultCustomEnd) url.searchParams.delete('end');
    else url.searchParams.set('end', customEnd);

    if (chartMode === defaultChartMode) url.searchParams.delete('chart');
    else url.searchParams.set('chart', chartMode);

    if (!fillLines.batterie && !fillLines.h2) url.searchParams.delete('ansicht');
    else url.searchParams.set('ansicht', 'kombi');

    if (periodYears === defaultPeriodYears) url.searchParams.delete('jahre');
    else url.searchParams.set('jahre', periodYears);
    if (optimism.main === OPTIMISM.def) url.searchParams.delete('opt');
    else url.searchParams.set('opt', String(optimism.main));
    for (const d of OPTIMISM_DIMS) {
      const v = optimism[d.key];
      if (v == null || v === optimism.main) url.searchParams.delete(`opt.${d.key}`);
      else url.searchParams.set(`opt.${d.key}`, String(v));
    }

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

    const hiddenLegend = [...new Set([
      ...MIX_GROUPS.flatMap(group => group.leaves),
      ...EXTRA_LEAVES,
    ].map(leaf => leaf.key))]
      .filter(key => !mixVisibility[key])
      .join(listSeparator);
    if (hiddenLegend) url.searchParams.set('legend', hiddenLegend);
    else url.searchParams.delete('legend');
    window.history.replaceState(null, '', url);
    setShareUrl(url.toString());
  }, [scenarios, activeScenario, periodPreset, customStart, customEnd, periodYears, optimism, chartMode, fillLines, mainView, sidebarCollapsed, openSectors, expandedRow, mixVisibility]);

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
    // Kein aktiver Slider-Drag (z. B. Szenario-Wechsel): Chart sofort umstellen,
    // damit das Umschalten zwischen Reitern nicht spürbar nachläuft.
    if (!sliderActive) {
      setChartResult(result);
      return;
    }
    // 180ms-Debounce: bei schnellem Slider-Drag werden Zwischenergebnisse
    // verworfen, der Chart-Render läuft erst nachdem der Slider stillsteht.
    // KPIs (oben) bleiben am ungedebouncten `result` und reagieren sofort.
    const timer = window.setTimeout(() => setChartResult(result), 180);
    return () => window.clearTimeout(timer);
  }, [result, chartResult, sliderActive]);

  // Pro-Technologie erzeugte Jahresenergie (TWh, BRUTTO inkl. abgeregeltem
  // Überschuss — also GW × Volllaststunden, was die Flotte herstellt; die
  // Abregelung steht separat im Mix-Panel). Für die Energiemengen-Anzeige der
  // Erzeugungs-Sidebar; gleiche Annualisierung wie die Kostenrechnung.
  const generationTWh = useMemo<Record<string, number> | null>(() => {
    const hours = result?.hours;
    if (!hours || hours.length === 0) return null;
    // [Szenario-Key, [gelieferte GW-Felder + Abregelungs-Felder]] = Brutto-Erzeugung.
    const fields: Array<[string, string[]]> = [
      ['pvInstalledGW', ['pvGW', 'pvCurtailedGW']],
      ['windOnInstalledGW', ['windOnGW', 'windOnCurtailedGW']],
      ['windOffInstalledGW', ['windOffGW', 'windOffCurtailedGW']],
      ['biomasseInstalledGW', ['biomasseGW']],
      ['laufwasserInstalledGW', ['laufwasserGW']],
      ['kernkraftInstalledGW', ['kernkraftGW', 'kernkraftCurtailedGW']],
      ['gasInstalledGW', ['gasGW']],
      ['kohleInstalledGW', ['kohleGW']],
    ];
    let loadSum = 0;
    const sums: Record<string, number> = {};
    for (const h of hours) {
      const hr = h as unknown as Record<string, number>;
      loadSum += hr.loadGW ?? 0;
      for (const [key, hfs] of fields) {
        let gross = 0;
        for (const hf of hfs) gross += hr[hf] ?? 0;
        sums[key] = (sums[key] ?? 0) + gross;
      }
    }
    const annualScale = loadSum > 0 ? result!.summary.totalDemandTWh * 1000 / loadSum : 1;
    const out: Record<string, number> = {};
    for (const [key] of fields) out[key] = (sums[key] ?? 0) * annualScale / 1000;
    return out;
  }, [result]);

  // Defer chart-source updates: Slider-Tick triggert sofortige KPI-Updates, der
  // Chart läuft hinterher und blockiert Input nicht.
  const deferredChartSource = useDeferredValue<SimulationResult | null>(chartResult ?? result);
  // Jahreskosten je Technologie fuer die Sidebar-Karte »Kosten« (live mit dem Optimismus-Regler).
  const techKosten = useMemo(() => result ? computeKosten(resolvedScenario, result, optimism).perTech.map(t => ({ key: t.key, total: t.total })) : null, [resolvedScenario, result, optimism]);
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
          <MainViewTabs active={mainView} onChange={setMainView} sidebarCollapsed={sidebarCollapsed} onOpenSidebar={openSidebar} rightSlot={<ScenarioTabs count={scenarios.length} active={activeScenario} onSelect={setActiveScenario} onAdd={addScenario} onRemove={removeScenario}/>}/>
          <div id="dashboard-sections" className="flex flex-col gap-3">
          <MixSection
            result={result}
            resolvedScenario={resolvedScenario}
            electrifiedPct={electrifiedFraction(resolvedScenario, data)}
            periodYears={periodYears}
            optimism={optimism}
            chartMode={chartMode}
            setChartMode={setChartMode}
            fillLines={fillLines}
            setFillLines={setFillLines}
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
            theme={theme}
          />
          <FlaecheSection scenario={resolvedScenario} theme={theme}/>
          <RessourcenSection scenario={resolvedScenario} result={result} periodYears={periodYears} data={data}/>
          <KostenSection scenario={resolvedScenario} result={result} periodYears={periodYears} optimism={optimism} supplyLabel={supplyPillLabels[scenario.supplyPreset]} loadLabel={loadPillLabels[matchingLoadPreset(scenario)]} data={data} shareUrl={shareUrl}/>
          {/* Eigene Sektion, bewusst NICHT in MAIN_VIEW_LABELS/den MainViewTabs verlinkt. */}
          <DatensatzSection resolvedScenario={resolvedScenario} result={result} periodYears={periodYears} optimism={optimism} data={data} shareUrl={shareUrl}/>
          </div>
          <DisclaimerFooter className="mt-auto pt-10 text-xs leading-5 text-zinc-500"/>
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
        periodYears={periodYears}
        generationTWh={generationTWh}
        collapsed={sidebarCollapsed}
        openSectors={openSectors}
        expandedRow={expandedRow}
        actionBar={<HeaderActions
          status={actionStatus}
          onReset={resetConfiguration}
          onCopyUrl={copyShareUrl}
          screenshotMenu={<ScreenshotMenu/>}
          live={liveSimulation}
          onToggleLive={toggleLiveSimulation}
        />}
        onCollapsedChange={setSidebarCollapsed}
        onOpenSectorsChange={setOpenSectors}
        onExpandedRowChange={setExpandedRow}
        onPeriodYears={setPeriodYears}
        optimism={optimism}
        techKosten={techKosten}
        onOptimism={setOptimism}
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
        onKlimaChange={(checked) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'klima-flaechendeckend': checked } }))}
        onKlimaTargetChange={(v) => setScenario(prev => ({ ...prev, demand: { ...prev.demand, 'klima-flaechendeckend-target-twh': v } }))}
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
        onCostOverrideChange={(tech, key, value) => setScenario(prev => {
          const base = prev.supplyPreset === 'custom' ? prev : resolvedScenario;
          return {
            ...prev,
            supplyPreset: 'custom',
            generation: base.generation,
            storage: base.storage,
            import: base.import,
            export: base.export,
            costOverrides: { ...prev.costOverrides, [tech]: { ...prev.costOverrides?.[tech], [key]: value } },
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

// Kamera-Dropdown: ein Button (oben links), Klick öffnet eine Auswahl, welcher
// Abschnitt (oder alle) als PNG gespeichert wird. captureNodeToPng erfasst den
// jeweiligen Knoten per id im aktuellen aufgeklappten Zustand.
const SCREENSHOT_TARGETS = [
  { label: 'Alle Abschnitte', id: 'dashboard-sections', file: 'netzprobe-uebersicht.png' },
  { label: 'Energiemix', id: 'section-mix', file: 'netzprobe-energiemix.png' },
  { label: 'Fläche', id: 'section-flaeche', file: 'netzprobe-flaeche.png' },
  { label: 'Ressourcen', id: 'section-ressourcen', file: 'netzprobe-ressourcen.png' },
  { label: 'Kosten', id: 'section-kosten', file: 'netzprobe-kostenrechnung.png' },
  { label: 'Datensatz', id: 'section-datensatz', file: 'netzprobe-datensatz.png' },
] as const;

function ScreenshotMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const shoot = async (target: typeof SCREENSHOT_TARGETS[number]) => {
    setOpen(false);
    const node = document.getElementById(target.id);
    if (!node) return;
    setBusy(target.id);
    try {
      await captureNodeToPng(node, target.file);
    } catch (error) {
      console.error('Screenshot fehlgeschlagen:', error);
    } finally {
      setBusy(null);
    }
  };
  return <>
    <button
      ref={ref}
      type="button"
      aria-label="Als Bild speichern"
      title="Als Bild speichern"
      onClick={() => setOpen(o => !o)}
      className={cx(iconButton, 'h-[27px] w-[27px]')}
    ><Camera className="h-4 w-4"/></button>
    <FloatingPanel anchorRef={ref} open={open} onClose={() => setOpen(false)} className="w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      {SCREENSHOT_TARGETS.map(target => <button
        key={target.id}
        type="button"
        onClick={() => shoot(target)}
        disabled={busy != null}
        className="block w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
      >{busy === target.id ? 'Erzeuge …' : target.label}</button>)}
    </FloatingPanel>
  </>;
}

function HeaderActions({ status, live, onReset, onCopyUrl, onScreenshot, screenshotMenu, onToggleLive }: { status: string | null; live: boolean; onReset: () => void; onCopyUrl: () => void; onScreenshot?: () => void; screenshotMenu?: ReactNode; onToggleLive: () => void }) {
  return <HeaderToolBar status={status} live={live} onToggleLive={onToggleLive} onScreenshot={onScreenshot} screenshotMenu={screenshotMenu} onRefresh={onReset} onCopyUrl={onCopyUrl}/>;
}

function HeaderToolBar({ status, live, onToggleLive, onScreenshot, screenshotMenu, onRefresh, onCopyUrl }: { status: string | null; live: boolean; onToggleLive: () => void; onScreenshot?: () => void; screenshotMenu?: ReactNode; onRefresh: () => void; onCopyUrl: () => void }) {
  return <div className="flex w-full min-w-0 flex-col items-start gap-0.5">
    <div className="flex w-full justify-between">
      <IconAction label={live ? 'Live-Berechnung pausieren' : 'Live-Berechnung aktivieren'} onClick={onToggleLive} tone={live ? 'default' : 'danger'}>
        {live ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
      </IconAction>
      {onScreenshot && <IconAction label="Plot" onClick={onScreenshot}><Camera className="h-4 w-4"/></IconAction>}
      {screenshotMenu}
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
    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20"
    onClick={onClick}
  >
    <Menu className="h-4 w-4" aria-hidden="true"/>
  </button>;
}

function useActiveSection(setMainView: (v: MainViewId) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ids: MainViewId[] = ['mix', 'flaeche', 'ressourcen', 'kosten'];
    // Scroll-Spy nach sichtbarem Anteil: aktiv ist die Sektion, die gerade
    // die größte sichtbare Höhe im Viewport einnimmt — nicht die, deren
    // Überschrift zuletzt eine Trigger-Linie passiert hat. Das markiert
    // intuitiv „was hauptsächlich im Bild ist" und funktioniert auch für
    // kurze Schluss-Sektionen.
    const compute = () => {
      const vh = window.innerHeight;
      // Am Seitenende gewinnt immer die letzte Sektion — selbst wenn sie
      // kürzer als die halbe Viewport-Höhe ist.
      const docHeight = document.documentElement.scrollHeight;
      const scrollBottom = window.scrollY + vh;
      if (docHeight > vh + 8 && docHeight - scrollBottom < 8) {
        setMainView(ids[ids.length - 1]);
        return;
      }
      let active: MainViewId = ids[0];
      let bestVisible = -1;
      for (const id of ids) {
        const el = document.getElementById(`section-${id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
        if (visible > bestVisible) {
          bestVisible = visible;
          active = id;
        }
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

function MainViewTabs({ active, onChange, sidebarCollapsed, onOpenSidebar, rightSlot }: { active: MainViewId; onChange: (id: MainViewId) => void; sidebarCollapsed: boolean; onOpenSidebar: () => void; rightSlot?: ReactNode }) {
  const tabs = (Object.entries(MAIN_VIEW_LABELS) as Array<[MainViewId, string]>).map(([id, label]) => ({ id, label }));
  // Kurzlabels nur auf Mobile, damit die vier Tabs neben dem fixierten Theme-Knopf passen.
  const shortLabel: Record<MainViewId, string> = { mix: 'Mix', flaeche: 'Fläche', ressourcen: 'Stoffe', kosten: 'Kosten' };
  const activeIndex = tabs.findIndex(tab => tab.id === active);
  return <div className={cx('pointer-events-none sticky top-2 z-30 flex items-center gap-2 sm:top-3', rightSlot ? 'pr-12' : 'pr-12 sm:pr-0')}>
    {sidebarCollapsed && <div className="pointer-events-auto"><SidebarOpenButton onClick={onOpenSidebar}/></div>}
    <nav aria-label="Hauptansicht" className="pointer-events-auto relative grid min-w-0 overflow-hidden rounded-full border border-zinc-200 bg-white p-0.5 text-[12px] font-medium leading-none shadow-sm sm:text-[13px] dark:border-zinc-700 dark:bg-zinc-900" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className="absolute bottom-0.5 left-0.5 top-0.5 rounded-full bg-zinc-950 transition-transform duration-200 ease-out dark:bg-zinc-50"
        style={{ width: `calc((100% - 4px) / ${tabs.length})`, transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
      />
      {tabs.map(tab => {
        const isActive = active === tab.id;
        return <button
          key={tab.id}
          type="button"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => { onChange(tab.id); scrollToSection(tab.id); }}
          className={cx(
            'relative z-10 truncate rounded-full px-2.5 py-1.5 transition-colors duration-200 sm:px-3',
            isActive
              ? 'text-white dark:text-zinc-950'
              : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50',
          )}
        ><span className="sm:hidden">{shortLabel[tab.id]}</span><span className="hidden sm:inline">{tab.label}</span></button>;
      })}
    </nav>
    {rightSlot && <div className="pointer-events-auto ml-auto">{rightSlot}</div>}
  </div>;
}

// Optik der fixierten Rund-Knoepfe oben rechts (Theme, Fortschritt-Rueckweg).
const floatingRoundButton = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20';

function ThemeToggle({ theme, onToggleTheme }: { theme: ThemeMode; onToggleTheme: () => void }) {
  const themeLabel = theme === 'dark' ? 'Helles Design' : 'Dunkles Design';
  return <button
    type="button"
    aria-label={themeLabel}
    title={themeLabel}
    className={cx(floatingRoundButton, 'fixed right-3 top-3 z-[60] sm:right-4')}
    onClick={onToggleTheme}
  >
    {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true"/> : <Moon className="h-4 w-4" aria-hidden="true"/>}
  </button>;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
