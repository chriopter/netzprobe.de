import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { Menu, PanelLeftOpen } from 'lucide-react';
import { dataFileUrl } from '../dataPackages';
import { loadDefaultData, loadJson } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../simulation/engine';
import { DEFAULT_MIX_VISIBILITY, MIX_GROUPS, buildMixChartOption, buildStorageChartOption, type ChartMode, type MixLeafKey, type MixVisibility } from './chartOptions';
import { DataFileViewer } from './DataFileViewer';
import { DataHandbook } from './DataHandbook';
import { manifestUrl, type DatasetDoc, type ManifestEntry } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { fmt0, pct, twh } from './format';
import { ScenarioSidebar, type PeriodPreset } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario, scenarioFromUrl } from './scenarioPresets';
import { cx, muted, shell, sidebarOffsetClass } from './ui';

type SimulationWorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

function useChart(id: string, option: echarts.EChartsOption | undefined) {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => {
    cleanupRef.current?.();
    chartRef.current?.dispose();
    chartRef.current = null;
    cleanupRef.current = null;
  }, []);

  useEffect(() => {
    if (!option) return;
    const el = document.getElementById(id);
    if (!el) return;
    if (!chartRef.current) {
      const chart = echarts.init(el);
      const resize = () => chart.resize();
      window.addEventListener('resize', resize);
      chartRef.current = chart;
      cleanupRef.current = () => window.removeEventListener('resize', resize);
    }
    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [id, option]);
}

function localDate(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
}

function periodDates(preset: PeriodPreset, start: string, end: string) {
  if (preset === '21d') return { start: '2025-01-01', end: '2025-01-21' };
  if (preset === '90d') return { start: '2025-01-01', end: '2025-03-31' };
  if (preset === 'year') return { start: '2025-01-01', end: '2025-12-31' };
  return { start, end: end < start ? start : end };
}

function useWorkerSimulation(data: DataSet | null, scenario: Scenario) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestRef = useRef(0);
  const hasDataRef = useRef(false);

  useEffect(() => {
    const worker = new Worker(new URL('../simulation/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<SimulationWorkerResponse>) => {
      if (event.data.requestId !== requestRef.current) return;
      setResult(event.data.result);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      hasDataRef.current = false;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !data) return;
    worker.postMessage({
      type: 'init',
      input: data.hours,
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
    });
    hasDataRef.current = true;
  }, [data]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !hasDataRef.current) return;
    const timer = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      worker.postMessage({ type: 'run', requestId, scenario });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [data, scenario]);

  return result;
}

function useDatasetDocs() {
  const [docs, setDocs] = useState<DatasetDoc[]>([]);
  useEffect(() => {
    loadJson<ManifestEntry[]>(manifestUrl)
      .then(entries => Promise.all(entries.map(entry => loadJson<DatasetDoc>(dataFileUrl(entry.description)))))
      .then(setDocs)
      .catch(console.error);
  }, []);
  return docs;
}

function urlView() {
  try {
    const params = new URL(window.location.href).searchParams;
    return { view: params.get('view'), path: params.get('path') };
  } catch {
    return { view: null, path: null };
  }
}

export function App() {
  const [route] = useState(urlView);
  if (route.view === 'datei' && route.path) return <DataFileViewer path={route.path}/>;
  if (route.view === 'daten') return <DataHandbookRoute/>;
  return <Dashboard/>;
}

function DataHandbookRoute() {
  const datasetDocs = useDatasetDocs();
  return <DataHandbook docs={datasetDocs}/>;
}

function Dashboard() {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(() => normalizeScenario(scenarioFromUrl() ?? defaultScenario));
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('year');
  const [customStart, setCustomStart] = useState('2025-01-01');
  const [customEnd, setCustomEnd] = useState('2025-12-31');
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  const [mixVisibility, setMixVisibility] = useState<MixVisibility>(DEFAULT_MIX_VISIBILITY);
  const [chartMode, setChartMode] = useState<ChartMode>('sunburst');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1023px)').matches;
  });

  useEffect(() => {
    loadDefaultData().then(setData).catch(console.error);
  }, []);

  const result = useWorkerSimulation(data, scenario);
  useEffect(() => {
    if (!result || chartResult === result) return;
    if (!chartResult) {
      setChartResult(result);
      return;
    }
    const timer = window.setTimeout(() => setChartResult(result), 650);
    return () => window.clearTimeout(timer);
  }, [result, chartResult]);

  const selectedPeriod = periodDates(periodPreset, customStart, customEnd);
  const chartSource = chartResult ?? result;
  const sliced = useMemo(() => chartSource?.hours.filter(hour => {
    const day = localDate(hour.time);
    return day >= selectedPeriod.start && day <= selectedPeriod.end;
  }) ?? [], [chartSource, selectedPeriod.start, selectedPeriod.end]);
  const mixOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildMixChartOption(sliced, mixVisibility, chartMode) : undefined, [sliced, mixVisibility, chartMode]);
  const storageOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildStorageChartOption(sliced) : undefined, [sliced]);

  useChart('mix-chart', mixOption);
  useChart('storage-chart', storageOption);

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
              <div className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                <InlineKpi label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
                <InlineKpi label="EE-Anteil" value={pct(result.summary.renewableSharePct)}/>
                <InlineKpi label="Unterdeckung" value={twh(result.summary.importTWh)} tone={result.summary.importTWh > 1 ? 'kritisch' : 'stabil'}/>
                <InlineKpi label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
                <InlineKpi label="Zeitraum" value={`${sliced.length} h`}/>
              </div>
              <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
            </div>
            <div className="min-h-0 flex-1 rounded-lg bg-white">
              <div id="mix-chart" className="h-full w-full"/>
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
        scenario={scenario}
        selectedPeriod={selectedPeriod}
        periodPreset={periodPreset}
        customStart={customStart}
        customEnd={customEnd}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        onPreset={setPeriodPreset}
        onStart={setQuickStart}
        onEnd={setQuickEnd}
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
      />

    </div>
  </main>;
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
  const modes: Array<[ChartMode, string]> = [['sunburst', 'Sunburst'], ['linie', 'Linie']];
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
  const contextItems = [
    { label: 'Import', color: '#dc2626', active: true },
    { label: 'Last', color: '#111827', active: true },
  ];
  const leaves = MIX_GROUPS.flatMap(group => group.leaves);
  return <div className="mt-2.5 grid gap-1.5 border-t border-zinc-100 pt-2.5 text-xs">
    <div className="flex flex-wrap gap-1.5">
      {contextItems.map(item => <span key={item.label} className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-zinc-800 shadow-sm">
        <span aria-hidden className="text-[10px]" style={{ color: item.active ? item.color : '#d4d4d8' }}>●</span>
        <span>{item.label}</span>
      </span>)}
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
  const toneClass = tone === 'stabil' ? 'text-emerald-600' : tone === 'angespannt' ? 'text-amber-600' : tone === 'kritisch' ? 'text-red-600' : 'text-zinc-950';
  return <div className="grid min-w-0 gap-0.5 overflow-hidden rounded-md border border-zinc-200/80 bg-zinc-50/70 px-2.5 py-1.5 leading-tight">
    <span className="truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em] text-zinc-500" title={label}>{label}</span>
    <span className={cx('whitespace-nowrap text-sm font-semibold tabular-nums', toneClass)}>{value}</span>
  </div>;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
