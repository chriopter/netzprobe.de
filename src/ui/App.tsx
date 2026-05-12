import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { AlertTriangle, Gauge, Zap } from 'lucide-react';
import { loadDefaultData } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../simulation/engine';
import { DEFAULT_MIX_VISIBILITY, MIX_GROUPS, buildMixChartOption, buildStorageChartOption, type MixLeafKey, type MixVisibility } from './chartOptions';
import { fmt0, gw, pct, twh } from './format';

type ControlRow = [label: string, path: string, value: number, min: number, max: number, unit: string];
type PeriodPreset = '21d' | '90d' | 'year' | 'custom';
type SimulationWorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

const defaultScenario: Scenario = {
  id: 'eigenes-szenario',
  name: 'Eigenes Szenario',
  description: 'Historische Energy-Charts-Last 2025; Zusatzlasten sind optional.',
  demand: { historicalLoad: true, bev: false, heatPump: false, basePct: 100, bevPct: 10, heatPumpPct: 10 },
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
    chartRef.current.setOption(option, { notMerge: false, lazyUpdate: true });
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

function setScenarioValue(scenario: Scenario, path: string, value: number): Scenario {
  const next = structuredClone(scenario) as Scenario & Record<string, any>;
  const parts = path.split('.');
  let target: Record<string, any> = next;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)!] = value;
  next.id = 'eigenes-szenario';
  next.name = 'Eigenes Szenario';
  return next;
}

function setScenarioFlag(scenario: Scenario, path: string, value: boolean): Scenario {
  const next = structuredClone(scenario) as Scenario & Record<string, any>;
  const parts = path.split('.');
  let target: Record<string, any> = next;
  for (const part of parts.slice(0, -1)) target = target[part];
  target[parts.at(-1)!] = value;
  next.id = 'eigenes-szenario';
  next.name = 'Eigenes Szenario';
  return next;
}

function normalizeScenario(scenario: Scenario): Scenario {
  return {
    ...scenario,
    demand: {
      historicalLoad: scenario.demand.historicalLoad ?? true,
      bev: scenario.demand.bev ?? false,
      heatPump: scenario.demand.heatPump ?? false,
      basePct: scenario.demand.basePct ?? 100,
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

function generationMeta(data: DataSet | null) {
  const generation = data?.generationSumTWh ? twh(data.generationSumTWh) : '—';
  const imported = data?.importSumTWh ? twh(data.importSumTWh) : '—';
  return `${generation} Erzeugung · ${imported} Import`;
}

export function App() {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(() => normalizeScenario(scenarioFromUrl() ?? defaultScenario));
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('year');
  const [customStart, setCustomStart] = useState('2025-01-01');
  const [customEnd, setCustomEnd] = useState('2025-12-31');
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  const [isTuning, setIsTuning] = useState(false);
  const [mixVisibility, setMixVisibility] = useState<MixVisibility>(DEFAULT_MIX_VISIBILITY);

  useEffect(() => {
    loadDefaultData().then(setData).catch(console.error);
  }, []);

  const result = useWorkerSimulation(data, scenario);
  useEffect(() => {
    if (!result || chartResult === result || isTuning) return;
    if (!chartResult) {
      setChartResult(result);
      return;
    }
    const timer = window.setTimeout(() => setChartResult(result), 650);
    return () => window.clearTimeout(timer);
  }, [result, chartResult, isTuning]);

  const selectedPeriod = periodDates(periodPreset, customStart, customEnd);
  const chartSource = chartResult ?? result;
  const sliced = useMemo(() => chartSource?.hours.filter(hour => {
    const day = localDate(hour.time);
    return day >= selectedPeriod.start && day <= selectedPeriod.end;
  }) ?? [], [chartSource, selectedPeriod.start, selectedPeriod.end]);
  const mixOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildMixChartOption(sliced, mixVisibility) : undefined, [sliced, mixVisibility]);
  const storageOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildStorageChartOption(sliced) : undefined, [sliced]);

  useChart('mix-chart', mixOption);
  useChart('storage-chart', storageOption);

  const update = (path: string, value: number) => setScenario(prev => setScenarioValue(prev, path, value));
  const toggleScenario = (path: string, value: boolean) => setScenario(prev => setScenarioFlag(prev, path, value));
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
            <div className="mb-2 flex shrink-0 items-baseline justify-between gap-3">
              <h2 className="text-lg font-medium tracking-[-0.03em]">Energiemix vs. Last</h2>
              <span className={cx(muted, 'text-xs')}>{formatDate(selectedPeriod.start)} – {formatDate(selectedPeriod.end)}</span>
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
          <h1 className="text-xl font-semibold tracking-[-0.04em] text-zinc-950">Netzprobe</h1>
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

          <ControlSection title="Last" sourceLabel="Energy-Charts 2025" sourceMeta={data?.loadSumTWh ? twh(data.loadSumTWh) : undefined} onPreset={() => setScenario(defaultScenario)}>
            <DemandControl
              scenario={scenario}
              onToggle={toggleScenario}
              onChange={update}
              onTuneStart={() => setIsTuning(true)}
              onTuneEnd={() => setIsTuning(false)}
            />
          </ControlSection>

          <ControlSection title="Erzeugung" sourceLabel="Energy-Charts 2025" sourceMeta={generationMeta(data)} note="Modellfaktoren: abgeleitete Solar-/Wind-Verfügbarkeit für andere Ausbauwerte." onPreset={() => setScenario(defaultScenario)}>
            <Control rows={[["PV", 'renewables.pvGW', scenario.renewables.pvGW, 0, 250, 'GW'], ["Wind Land", 'renewables.windOnGW', scenario.renewables.windOnGW, 0, 250, 'GW'], ["Wind See", 'renewables.windOffGW', scenario.renewables.windOffGW, 0, 250, 'GW']]} onChange={update} onTuneStart={() => setIsTuning(true)} onTuneEnd={() => setIsTuning(false)}/>
            <Control rows={[["Kohle", 'fossil.coalGW', scenario.fossil.coalGW, 0, 250, 'GW'], ["Gas", 'fossil.gasGW', scenario.fossil.gasGW, 0, 250, 'GW'], ["Batterie P", 'storage.batteryPowerGW', scenario.storage.batteryPowerGW, 0, 250, 'GW'], ["Batterie E", 'storage.batteryEnergyGWh', scenario.storage.batteryEnergyGWh, 0, 1200, 'GWh'], ["H₂ P", 'storage.h2PowerGW', scenario.storage.h2PowerGW, 0, 250, 'GW'], ["H₂ E", 'storage.h2EnergyGWh', scenario.storage.h2EnergyGWh, 0, 1200, 'GWh'], ["Import", 'storage.importLimitGW', scenario.storage.importLimitGW, 0, 250, 'GW']]} onChange={update} onTuneStart={() => setIsTuning(true)} onTuneEnd={() => setIsTuning(false)}/>
          </ControlSection>
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
    </div>
  </main>;
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

function ControlSection({ title, sourceLabel, sourceMeta, note, onPreset, children }: { title: string; sourceLabel: string; sourceMeta?: ReactNode; note?: string; onPreset: () => void; children: ReactNode }) {
  return <section className={cx(sectionBox, 'p-3')}>
    <div className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</span>
      <button className="grid gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-left text-sm text-zinc-950 transition hover:border-zinc-300 hover:bg-white" type="button" onClick={onPreset}>
        <span>{sourceLabel}</span>
        {sourceMeta && <span className="text-xs text-zinc-500">{sourceMeta}</span>}
      </button>
    </div>
    <div className="mt-3 grid gap-4 border-t border-zinc-100 pt-3">
      {children}
      {note && <p className="text-xs leading-5 text-zinc-500">{note}</p>}
    </div>
  </section>;
}

function PeriodControl({ preset, start, end, customStart, customEnd, onPreset, onStart, onEnd }: { preset: PeriodPreset; start: string; end: string; customStart: string; customEnd: string; onPreset: (preset: PeriodPreset) => void; onStart: (date: string) => void; onEnd: (date: string) => void }) {
  return <section className={cx(sectionBox, 'grid gap-3 p-3')}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Zeitraum</h2>
      <span className="text-xs text-zinc-500">{formatDate(start)} – {formatDate(end)}</span>
    </div>
    <select className={field} value={preset} onChange={event => onPreset(event.target.value as PeriodPreset)}>
      <option value="21d">21 Tage</option>
      <option value="90d">90 Tage</option>
      <option value="year">Ganzes Jahr</option>
      <option value="custom">Custom</option>
    </select>
    <div className="grid gap-2">
      <input className={field} type="date" min="2025-01-01" max="2025-12-31" value={preset === 'custom' ? customStart : start} onChange={event => onStart(event.target.value)}/>
      <input className={field} type="date" min="2025-01-01" max="2025-12-31" value={preset === 'custom' ? customEnd : end} onChange={event => onEnd(event.target.value)}/>
    </div>
  </section>;
}

function Control({ rows, onChange, onTuneStart, onTuneEnd, disabled = false }: { rows: ControlRow[]; onChange: (path: string, value: number) => void; onTuneStart: () => void; onTuneEnd: () => void; disabled?: boolean }) {
  return <div className={cx('grid gap-3', disabled && 'opacity-45')}>
    {rows.map(([label, path, value, min, max, unit]) => <label key={path} className="grid gap-1.5">
      <span className="flex items-center justify-between gap-4 text-xs text-zinc-700">
        {label}
        <b className="font-mono text-xs font-medium text-zinc-950">{formatControlValue(value, unit)}</b>
      </span>
      <input disabled={disabled} type="range" min={min} max={max} step={unit === 'GW' ? 0.5 : 1} value={value} onPointerDown={onTuneStart} onPointerUp={onTuneEnd} onPointerCancel={onTuneEnd} onBlur={onTuneEnd} onKeyUp={onTuneEnd} onChange={event => onChange(path, Number(event.target.value))}/>
    </label>)}
  </div>;
}

function DemandControl({ scenario, onToggle, onChange, onTuneStart, onTuneEnd }: { scenario: Scenario; onToggle: (path: string, value: boolean) => void; onChange: (path: string, value: number) => void; onTuneStart: () => void; onTuneEnd: () => void }) {
  return <div className="grid gap-3">
    <DemandItem
      label="Historische Last"
      meta="Energy-Charts 2025"
      checked={scenario.demand.historicalLoad}
      onChecked={(checked) => onToggle('demand.historicalLoad', checked)}
    >
      <Control rows={[["Lastfaktor", 'demand.basePct', scenario.demand.basePct, 50, 150, '%']]} onChange={onChange} onTuneStart={onTuneStart} onTuneEnd={onTuneEnd} disabled={!scenario.demand.historicalLoad}/>
    </DemandItem>
    <DemandItem
      label="BEV-Zusatz"
      meta="Modellierte Zusatzlast"
      checked={scenario.demand.bev}
      onChecked={(checked) => onToggle('demand.bev', checked)}
    >
      <Control rows={[["Durchdringung", 'demand.bevPct', scenario.demand.bevPct, 0, 100, '%']]} onChange={onChange} onTuneStart={onTuneStart} onTuneEnd={onTuneEnd} disabled={!scenario.demand.bev}/>
    </DemandItem>
    <DemandItem
      label="Wärmepumpen-Zusatz"
      meta="Wintergewichtet modelliert"
      checked={scenario.demand.heatPump}
      onChecked={(checked) => onToggle('demand.heatPump', checked)}
    >
      <Control rows={[["Durchdringung", 'demand.heatPumpPct', scenario.demand.heatPumpPct, 0, 100, '%']]} onChange={onChange} onTuneStart={onTuneStart} onTuneEnd={onTuneEnd} disabled={!scenario.demand.heatPump}/>
    </DemandItem>
  </div>;
}

function DemandItem({ label, meta, checked, onChecked, children }: { label: string; meta: string; checked: boolean; onChecked: (checked: boolean) => void; children: ReactNode }) {
  return <section className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2.5">
    <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-950">
      <input className="mt-0.5 accent-zinc-700" type="checkbox" checked={checked} onChange={event => onChecked(event.target.checked)} />
      <span className="grid gap-0.5">
        <span>{label}</span>
        <span className="text-xs text-zinc-500">{meta}</span>
      </span>
    </label>
    <div className="mt-2 border-t border-zinc-200/80 pt-2">{children}</div>
  </section>;
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-zinc-500">{label}</span>
    <strong className="font-medium text-zinc-950">{value}</strong>
  </div>;
}

function formatControlValue(value: number, unit: string) {
  if (unit === '%') return `${fmt0.format(value)} %`;
  if (unit === 'GWh') return `${fmt0.format(value)} GWh`;
  return gw(value);
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
