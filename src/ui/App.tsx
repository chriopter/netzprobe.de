import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { X } from 'lucide-react';
import { dataFileUrl } from '../dataPackages';
import { loadDefaultData, loadJson } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../simulation/engine';
import { DEFAULT_MIX_VISIBILITY, MIX_GROUPS, buildMixChartOption, buildStorageChartOption, type ChartMode, type MixLeafKey, type MixVisibility } from './chartOptions';
import { DataFileViewer } from './DataFileViewer';
import { DataHandbook } from './DataHandbook';
import { dataWikiUrl, manifestUrl, type DatasetDoc, type ManifestEntry } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { fmt0, pct, twh } from './format';
import { ScenarioSidebar, type PeriodPreset } from './ScenarioSidebar';
import { defaultScenario, normalizeScenario, scenarioFromUrl } from './scenarioPresets';
import { cx, muted, shell } from './ui';

type SimulationWorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

const chartModeStorageKey = 'netzprobe.chartMode';

function storedChartMode(): ChartMode {
  try {
    return window.localStorage.getItem(chartModeStorageKey) === 'linie' ? 'linie' : 'sunburst';
  } catch {
    return 'sunburst';
  }
}


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
  const datasetDocs = useDatasetDocs();
  const [route] = useState(urlView);
  if (route.view === 'datei' && route.path) return <DataFileViewer path={route.path}/>;
  if (route.view === 'daten') return <DataHandbook docs={datasetDocs}/>;
  return <Dashboard datasetDocs={datasetDocs}/>;
}

function Dashboard({ datasetDocs }: { datasetDocs: DatasetDoc[] }) {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(() => normalizeScenario(scenarioFromUrl() ?? defaultScenario));
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('year');
  const [customStart, setCustomStart] = useState('2025-01-01');
  const [customEnd, setCustomEnd] = useState('2025-12-31');
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  const [mixVisibility, setMixVisibility] = useState<MixVisibility>(DEFAULT_MIX_VISIBILITY);
  const [chartMode, setChartMode] = useState<ChartMode>(storedChartMode);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    loadDefaultData().then(setData).catch(console.error);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(chartModeStorageKey, chartMode);
    } catch {
      // Speicherung ist Komfort, nicht Bedingung.
    }
  }, [chartMode]);

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

  return <main className={shell}>
    <div className="mx-auto grid w-full max-w-[1760px] gap-3 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <section className="flex min-w-0 flex-col gap-3 lg:order-2">
        {!result ? <div className="grid min-h-[calc(100vh-1.5rem)] place-items-center text-zinc-500">Lade Daten …</div> : <>
          <ChartPanel className="flex h-[calc(100vh-1.5rem)] flex-col p-5">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-x-5 gap-y-2">
              <div className="min-w-0">
                <h2 className="text-lg font-medium tracking-[-0.03em]">Energiemix vs. Last</h2>
                <span className={cx(muted, 'text-xs')}>{formatDate(selectedPeriod.start)} – {formatDate(selectedPeriod.end)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <InlineKpi label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
                <InlineKpi label="EE-Anteil" value={pct(result.summary.renewableSharePct)}/>
                <InlineKpi label="Import" value={twh(result.summary.importTWh)} tone={result.summary.importTWh > 1 ? 'kritisch' : 'stabil'}/>
                <InlineKpi label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
                <InlineKpi label="Zeitraum" value={`${sliced.length} h`}/>
              </div>
              <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
            </div>
            <div className="min-h-0 flex-1">
              <div id="mix-chart" className="h-full w-full"/>
            </div>
            <MixLegend
              visibility={mixVisibility}
              onToggleLeaf={(key, checked) => setMixVisibility(prev => ({ ...prev, [key]: checked }))}
            />
          </ChartPanel>

          <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂">
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
        onPreset={setPeriodPreset}
        onStart={setQuickStart}
        onEnd={setQuickEnd}
        onFaqOpen={() => setFaqOpen(true)}
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

      {faqOpen && <DataFaq docs={datasetDocs} onClose={() => setFaqOpen(false)}/>}
    </div>
  </main>;
}

function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  const modes: Array<[ChartMode, string]> = [['sunburst', 'Sunburst'], ['linie', 'Linie']];
  return <div className="inline-flex shrink-0 rounded-full border border-zinc-200 bg-zinc-50 p-0.5 text-xs" aria-label="Diagrammform wählen">
    {modes.map(([value, label]) => <button
      key={value}
      type="button"
      aria-pressed={mode === value}
      className={cx('rounded-full px-2.5 py-1 transition', mode === value ? 'bg-zinc-950 text-white shadow-sm' : 'text-zinc-500 hover:bg-white hover:text-zinc-950')}
      onClick={() => onChange(value)}
    >{label}</button>)}
  </div>;
}

function DataFaq({ docs, onClose }: { docs: DatasetDoc[]; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/20 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="data-faq-title" onClick={onClose}>
    <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,.18)]" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4 border-b border-zinc-100 pb-3">
        <div>
          <h2 id="data-faq-title" className="text-lg font-medium tracking-[-0.03em] text-zinc-950">Daten-FAQ</h2>
          <p className="mt-1 text-xs leading-5 text-zinc-500">Kurzfassung der Dateien in <code>/data</code>.</p>
        </div>
        <button type="button" aria-label="Daten-FAQ schließen" className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-950" onClick={onClose}>
          <X className="h-3.5 w-3.5"/>
        </button>
      </div>
      <dl className="mt-3 grid gap-3">
        {(docs.length ? docs : []).map(doc => <a key={doc.id} className="block rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 transition hover:border-zinc-300 hover:bg-white" href={dataWikiUrl(doc.id)} target="_blank" rel="noreferrer">
          <dt className="font-mono text-[11px] text-zinc-700">{doc.file}</dt>
          <dd className="mt-1 text-sm leading-5 text-zinc-600">{doc.short}</dd>
        </a>)}
      </dl>
      <a className="mt-3 inline-flex text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950" href="https://github.com/chriopter/netzprobe/tree/main/data" target="_blank" rel="noreferrer">Datendateien auf GitHub ansehen</a>
    </section>
  </div>;
}

function ChartPanel({ title, meta, className, children }: { title?: string; meta?: string; className?: string; children: ReactNode }) {
  return <section className={cx('min-w-0', className)}>
    {title && <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-base font-medium tracking-[-0.02em]">{title}</h2>
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
  return <div className="mt-3 grid gap-2 border-t border-zinc-100 pt-3 text-xs">
    <div className="flex flex-wrap gap-1.5">
      {contextItems.map(item => <span key={item.label} className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-800 shadow-sm">
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
          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition',
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
  return <div className="grid gap-0.5 leading-tight">
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</span>
    <span className={cx('text-sm font-medium tabular-nums', toneClass)}>{value}</span>
  </div>;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
