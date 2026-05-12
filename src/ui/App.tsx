import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { AlertTriangle, Gauge, Info, X, Zap } from 'lucide-react';
import { loadDefaultData, loadJson } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../simulation/engine';
import { DEFAULT_MIX_VISIBILITY, MIX_GROUPS, buildMixChartOption, buildStorageChartOption, type ChartMode, type MixLeafKey, type MixVisibility } from './chartOptions';
import { fmt0, pct, twh } from './format';

type PeriodPreset = '21d' | '90d' | 'year' | 'custom';
type SimulationWorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };
type DatasetDoc = {
  id: string;
  domain: string;
  title: string;
  file: string;
  doc: string;
  source: string;
  period: string;
  resolution: string;
  unit: string;
  short: string;
  description: string;
  fields: Array<{ name: string; unit: string; description: string }>;
  caveats?: string[];
};

const chartModeStorageKey = 'netzprobe.chartMode';

function storedChartMode(): ChartMode {
  try {
    return window.localStorage.getItem(chartModeStorageKey) === 'linie' ? 'linie' : 'sunburst';
  } catch {
    return 'sunburst';
  }
}

const manifestUrl = `${import.meta.env.BASE_URL}data/manifest.json`;
const dataWikiHomeUrl = () => `${import.meta.env.BASE_URL}?view=daten`;
const dataWikiUrl = (id: string) => `${import.meta.env.BASE_URL}?view=daten&dataset=${encodeURIComponent(id)}`;

const defaultScenario: Scenario = {
  id: 'eigenes-szenario',
  name: 'Eigenes Szenario',
  description: 'Historische Energy-Charts-Last 2025; Zusatzlasten sind optional.',
  demand: { historicalLoad: true, bev: false, heatPump: false, bevPct: 10, heatPumpPct: 10 },
  renewables: { pvGW: 100.5, windOnGW: 65.5, windOffGW: 9.5 },
  fossil: { coalGW: 35, gasGW: 36, nuclearGW: 0 },
  storage: { batteryPowerGW: 15, batteryEnergyGWh: 22, h2PowerGW: 0, h2EnergyGWh: 0, importLimitGW: 16 },
};

const shell = 'min-h-screen px-3 py-3 text-zinc-950 sm:px-4 lg:px-6';
const panel = 'rounded-2xl border border-zinc-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.05)]';
const sectionBox = 'rounded-xl border border-zinc-200/80 bg-white';
const field = 'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400';
const muted = 'text-zinc-500';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
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

function scenarioFromUrl(): Scenario | null {
  try {
    const raw = new URL(window.location.href).searchParams.get('s');
    return raw ? JSON.parse(decodeURIComponent(escape(atob(raw)))) : null;
  } catch {
    return null;
  }
}

function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    demand: {
      historicalLoad: true,
      bev: scenario.demand.bev ?? false,
      heatPump: scenario.demand.heatPump ?? false,
      bevPct: scenario.demand.bevPct ?? 10,
      heatPumpPct: scenario.demand.heatPumpPct ?? 10,
    },
  };
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
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
    hasDataRef.current = true;
    const requestId = ++requestRef.current;
    worker.postMessage({ type: 'init', requestId, input: data.hours, scenario });
  }, [data, scenario]);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !hasDataRef.current) return;
    const timer = window.setTimeout(() => {
      const requestId = ++requestRef.current;
      worker.postMessage({ type: 'run', requestId, scenario });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [scenario]);

  return result;
}

function useDatasetDocs() {
  const [docs, setDocs] = useState<DatasetDoc[]>([]);
  useEffect(() => {
    loadJson<DatasetDoc[]>(manifestUrl).then(setDocs).catch(console.error);
  }, []);
  return docs;
}

function isDataWikiView() {
  try {
    return new URL(window.location.href).searchParams.get('view') === 'daten';
  } catch {
    return false;
  }
}

function generationMeta(data: DataSet | null) {
  const generation = data?.generationSumTWh ? twh(data.generationSumTWh) : '—';
  const imported = data?.importSumTWh ? twh(data.importSumTWh) : '—';
  return `${generation} Erzeugung · ${imported} Import`;
}

export function App() {
  const datasetDocs = useDatasetDocs();
  const [dataWikiView] = useState(isDataWikiView);
  return dataWikiView ? <DataHandbook docs={datasetDocs}/> : <Dashboard datasetDocs={datasetDocs}/>;
}

function Dashboard({ datasetDocs }: { datasetDocs: DatasetDoc[] }) {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario] = useState<Scenario>(() => normalizeScenario(scenarioFromUrl() ?? defaultScenario));
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
    <div className="mx-auto grid w-full max-w-[1760px] gap-3 lg:grid-cols-[270px_minmax(0,1fr)_210px] xl:grid-cols-[280px_minmax(0,1fr)_220px]">
      <section className="flex min-w-0 flex-col gap-3 lg:order-2">
        {!result ? <div className={cx(panel, 'grid min-h-[calc(100vh-1.5rem)] place-items-center text-zinc-700')}>Lade Daten …</div> : <>
          <ChartPanel className="flex h-[calc(100vh-1.5rem)] flex-col p-5">
            <div className="mb-2 flex shrink-0 items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium tracking-[-0.03em]">Energiemix vs. Last</h2>
                <span className={cx(muted, 'text-xs')}>{formatDate(selectedPeriod.start)} – {formatDate(selectedPeriod.end)}</span>
              </div>
              <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
            </div>
            <div id="mix-chart" className="min-h-0 flex-1 w-full"/>
            <MixLegend
              visibility={mixVisibility}
              onToggleLeaf={(key, checked) => setMixVisibility(prev => ({ ...prev, [key]: checked }))}
            />
          </ChartPanel>

          <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂">
            <div id="storage-chart" className="h-[240px] w-full"/>
          </ChartPanel>
          <footer className="mt-auto pt-2 text-xs leading-5 text-zinc-500">
            Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln. Daten auf <a className="text-zinc-800 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-950" href="https://github.com/chriopter/netzprobe/tree/main/data" target="_blank" rel="noreferrer">GitHub</a>.
          </footer>
        </>}
      </section>

      <aside className={cx(panel, 'lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto')}>
        <div className="border-b border-zinc-200/80 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold tracking-[-0.04em] text-zinc-950">Netzprobe</h1>
            <button
              type="button"
              aria-label="Daten-FAQ öffnen"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950"
              onClick={() => setFaqOpen(true)}
            >
              <Info className="h-3.5 w-3.5"/>
            </button>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <PeriodControl
            preset={periodPreset}
            start={selectedPeriod.start}
            end={selectedPeriod.end}
            customStart={customStart}
            customEnd={customEnd}
            onPreset={setPeriodPreset}
            onStart={setQuickStart}
            onEnd={setQuickEnd}
          />

          <DemandSection
            loadMeta={data?.loadSumTWh ? twh(data.loadSumTWh) : undefined}
            loadDocId="last.energy-charts.2025.stuendlich"
          />

          <GenerationSection
            generationMeta={generationMeta(data)}
            generationDocId="erzeugung.energy-charts.2025.stuendlich"
          />

          <ModelAssumptionsSection modelDocId="modell.faktoren.2025.stuendlich"/>
        </div>
      </aside>

      <aside className={cx(panel, 'lg:order-3 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto')}>
        <div className="border-b border-zinc-200/80 px-4 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Ergebnisse</h2>
        </div>
        <div className="grid gap-3 p-4">
          {result ? <>
            <Kpi icon={<Zap/>} label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
            <Kpi icon={<Gauge/>} label="CO₂ / EE" value={`${fmt0.format(result.summary.co2IntensityGPerKWh)} g/kWh`} subValue={pct(result.summary.renewableSharePct)}/>
            <Kpi icon={<AlertTriangle/>} label="Unterdeckung" value={twh(result.summary.loadSheddingTWh)} tone={result.summary.loadSheddingTWh > 1 ? 'kritisch' : result.summary.loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil'}/>
            <section className="grid gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
              <MetricLine label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
              <MetricLine label="Zeitraum" value={`${sliced.length} h`}/>
            </section>
          </> : <span className="text-sm text-zinc-500">Lade Ergebnisse …</span>}
        </div>
      </aside>
      {faqOpen && <DataFaq docs={datasetDocs} onClose={() => setFaqOpen(false)}/>} 
    </div>
  </main>;
}

function DataHandbook({ docs }: { docs: DatasetDoc[] }) {
  const params = new URL(window.location.href).searchParams;
  const selectedId = params.get('dataset');
  const selected = selectedId ? docs.find(doc => doc.id === selectedId) : undefined;
  const grouped = docs.reduce<Record<string, DatasetDoc[]>>((acc, doc) => {
    (acc[doc.domain] ??= []).push(doc);
    return acc;
  }, {});
  const sections = [
    ['last', 'Last'],
    ['erzeugung', 'Erzeugung'],
    ['modell', 'Modell'],
  ] as const;

  return <main className="min-h-screen bg-white px-3 py-3 text-zinc-950 sm:px-4 lg:px-6">
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-r border-zinc-200 pr-4 lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
        <div className="pb-4">
          <a href={import.meta.env.BASE_URL} className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">Netzprobe</a>
          <h1 className="mt-3 text-xl font-semibold tracking-[-0.04em]">Datenhandbuch</h1>
          <p className="mt-1 text-sm leading-5 text-zinc-500">Datensätze aus <code>data/</code>.</p>
        </div>
        <div>
          <nav aria-label="Datensätze">
            <div className="grid gap-3">
              <TreeSection title="Home">
                <TreeNode href={dataWikiHomeUrl()} label="Überblick" selected={!selectedId}/>
              </TreeSection>
              {sections.map(([domain, label]) => grouped[domain]?.length ? <TreeSection key={domain} title={label}>
                {grouped[domain].map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id}/>)}
              </TreeSection> : null)}
            </div>
          </nav>
        </div>
      </aside>
      <article className="min-w-0 pb-12">
        {!docs.length ? <p className="p-5 text-zinc-500">Lade Datenhandbuch …</p> : selectedId && !selected ? <p className="p-5 text-zinc-500">Datensatz nicht gefunden.</p> : !selected ? <DataHandbookHome docs={docs}/> : <>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{selected.domain}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{selected.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">{selected.description}</p>
            <section className="mt-8">
              <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Übersicht</h2>
              <dl className="mt-3 grid gap-1 text-sm leading-6">
                <InfoLine label="Verwendung" value={selected.description}/>
                <InfoLine label="Zeitraum" value={selected.period}/>
                <InfoLine label="Auflösung" value={selected.resolution}/>
                <InfoLine label="Einheit" value={selected.unit}/>
                <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
                  <dt className="font-medium text-zinc-950">Datei</dt>
                  <dd>
                    <a href={`${import.meta.env.BASE_URL}data/${selected.file}`} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
                      <code>data/{selected.file}</code>
                    </a>
                  </dd>
                </div>
                <InfoLine label="Quelle" value={selected.source}/>
              </dl>
            </section>
            <section className="mt-8">
              <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Felder</h2>
              <dl className="mt-3 grid gap-3">
                {selected.fields.map(field => <div key={field.name} className="grid gap-1 text-sm sm:grid-cols-[180px_90px_1fr]">
                  <dt><code>{field.name}</code></dt>
                  <dd className="text-zinc-500">{field.unit}</dd>
                  <dd className="leading-5 text-zinc-700">{field.description}</dd>
                </div>)}
              </dl>
            </section>
            {!!selected.caveats?.length && <section className="mt-8">
              <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Hinweise</h2>
              <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
                {selected.caveats.map(caveat => <li key={caveat}>• {caveat}</li>)}
              </ul>
            </section>}
          </div>
        </>}
      </article>
    </div>
  </main>;
}

function DataHandbookHome({ docs }: { docs: DatasetDoc[] }) {
  return <div>
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">data/</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Datenhandbuch</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">Dokumentation der Datensätze, die die Simulation direkt aus dem statischen <code>data/</code>-Ordner lädt.</p>
    </div>
    <section className="mt-8">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Datensätze</h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6">
        {docs.map(doc => <li key={doc.id}>
          <a href={dataWikiUrl(doc.id)} className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{doc.title}</a>
          <span className="text-zinc-500"> — {doc.short}</span>
        </li>)}
      </ul>
    </section>
  </div>;
}

function TreeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section>
    <h2 className="pb-1 text-[11px] font-semibold text-zinc-950">{title}</h2>
    <div className="ml-1 grid gap-0.5 border-l border-zinc-200 pl-3">
      {children}
    </div>
  </section>;
}

function TreeNode({ href, label, selected }: { href: string; label: string; selected: boolean }) {
  return <a
    href={href}
    className={cx(
      'block py-0.5 text-sm transition',
      selected ? 'font-medium text-zinc-950' : 'text-zinc-600 hover:text-zinc-950',
    )}
  >
    <span className="block truncate">{label}</span>
  </a>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const urlMatch = value.match(/https?:\/\/\S+/);
  return <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
    <dt className="font-medium text-zinc-950">{label}</dt>
    <dd className="text-zinc-700">
      {urlMatch ? <>
        {value.slice(0, urlMatch.index).trim()}
        {value.slice(0, urlMatch.index).trim() ? ' ' : ''}
        <a href={urlMatch[0]} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{urlMatch[0]}</a>
      </> : value}
    </dd>
  </div>;
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

function DataInfoLink({ id, label = 'Daten erklären' }: { id: string; label?: string }) {
  return <a
    href={dataWikiUrl(id)}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-950"
    onClick={event => event.stopPropagation()}
  >
    <Info className="h-3 w-3"/>
  </a>;
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
  return <section className={cx(panel, 'min-w-0 p-4', className)}>
    {title && <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-medium tracking-[-0.02em]">{title}</h2>
      {meta && <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>}
    </div>}
    {children}
  </section>;
}

function MixLegend({ visibility, onToggleLeaf }: { visibility: MixVisibility; onToggleLeaf: (key: MixLeafKey, checked: boolean) => void }) {
  const leaves = MIX_GROUPS.flatMap(group => group.leaves);
  return <div className="mt-3 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-3 text-xs">
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
  </div>;
}

function Kpi({ icon, label, value, subValue, tone }: { icon: ReactNode; label: string; value: string; subValue?: string; tone?: string }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-600' : tone === 'angespannt' ? 'text-amber-600' : tone === 'kritisch' ? 'text-red-600' : 'text-zinc-500';
  return <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3">
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={cx('[&_svg]:h-3.5 [&_svg]:w-3.5', toneClass)}>{icon}</span>
    </div>
    <strong className="mt-1 block text-2xl font-medium tracking-[-0.05em] text-zinc-950">{value}</strong>
    {subValue && <span className="mt-1 block text-xs text-zinc-500">{subValue}</span>}
  </div>;
}

function GenerationSection({ generationMeta, generationDocId }: { generationMeta: string; generationDocId?: string }) {
  return <section className={cx(sectionBox, 'p-3')}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Erzeugung</span>
    </div>
    <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3">
      <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
        <label className="flex items-start gap-2 text-sm text-zinc-950">
          <input className="mt-0.5 accent-zinc-700" type="radio" checked readOnly />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">2025 Historisch</span>
              {generationDocId && <DataInfoLink id={generationDocId} label="2025 Historisch erklären"/>}
            </span>
            <span className="truncate text-xs text-zinc-500">Energy-Charts · {generationMeta}</span>
          </span>
        </label>
      </section>
    </div>
  </section>;
}

function ModelAssumptionsSection({ modelDocId }: { modelDocId?: string }) {
  return <section className={cx(sectionBox, 'p-3')}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Modellannahmen</span>
    </div>
    <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3">
      <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
        <label className="flex items-start gap-2 text-sm text-zinc-950">
          <input className="mt-0.5 accent-zinc-700" type="radio" checked readOnly />
          <span className="grid min-w-0 flex-1 gap-0.5">
            <span className="flex items-center justify-between gap-2">
              <span className="truncate">Einspeisefaktoren 2025</span>
              {modelDocId && <DataInfoLink id={modelDocId} label="Einspeisefaktoren 2025 erklären"/>}
            </span>
            <span className="truncate text-xs text-zinc-500">PV/Wind aus beobachteter Einspeisung abgeleitet</span>
          </span>
        </label>
      </section>
    </div>
  </section>;
}

function PeriodControl({ preset, start, end, customStart, customEnd, onPreset, onStart, onEnd }: { preset: PeriodPreset; start: string; end: string; customStart: string; customEnd: string; onPreset: (preset: PeriodPreset) => void; onStart: (date: string) => void; onEnd: (date: string) => void }) {
  return <section className={cx(sectionBox, 'grid gap-1.5 p-2.5')}>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Zeitraum</h2>
      <span className="whitespace-nowrap text-[10px] text-zinc-500">{formatDate(start)}–{formatDate(end)}</span>
    </div>
    <select className={cx(field, 'h-7 px-2 text-xs')} value={preset} onChange={event => onPreset(event.target.value as PeriodPreset)}>
      <option value="21d">21 Tage</option>
      <option value="90d">90 Tage</option>
      <option value="year">Jahr</option>
      <option value="custom">Custom</option>
    </select>
    {preset === 'custom' && <div className="grid grid-cols-2 gap-1.5">
      <input aria-label="Startdatum" className={cx(field, 'h-7 px-1.5 text-[11px]')} type="date" min="2025-01-01" max="2025-12-31" value={customStart} onChange={event => onStart(event.target.value)}/>
      <input aria-label="Enddatum" className={cx(field, 'h-7 px-1.5 text-[11px]')} type="date" min="2025-01-01" max="2025-12-31" value={customEnd} onChange={event => onEnd(event.target.value)}/>
    </div>}
  </section>;
}

function DemandSection({ loadMeta, loadDocId }: { loadMeta?: string; loadDocId?: string }) {
  return <section className={cx(sectionBox, 'p-3')}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Last</span>
    </div>
    <div className="mt-3 grid gap-3 border-t border-zinc-100 pt-3">
      <FixedDemandSource
        label="2025 Historisch"
        meta={`Energy-Charts${loadMeta ? ` · ${loadMeta}` : ''}`}
        docId={loadDocId}
      />
    </div>
  </section>;
}

function FixedDemandSource({ label, meta, docId }: { label: string; meta: string; docId?: string }) {
  return <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
    <label className="flex items-start gap-2 text-sm text-zinc-950">
      <input className="mt-0.5 accent-zinc-700" type="radio" checked readOnly />
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate">{label}</span>
          {docId && <DataInfoLink id={docId} label={`${label} erklären`}/>} 
        </span>
        <span className="truncate text-xs text-zinc-500">{meta}</span>
      </span>
    </label>
  </section>;
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-zinc-500">{label}</span>
    <strong className="font-medium text-zinc-950">{value}</strong>
  </div>;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
