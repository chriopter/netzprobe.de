import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { AlertTriangle, Banknote, Gauge, Zap } from 'lucide-react';
import { loadDefaultData } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../simulation/engine';
import { buildMixChartOption, buildStorageChartOption } from './chartOptions';
import { fmt0, gw, pct, twh } from './format';

type ControlRow = [label: string, path: string, value: number, min: number, max: number, unit: string];
type PeriodPreset = '21d' | '90d' | 'year' | 'custom';
type SimulationWorkerResponse = { requestId: number; result: SimulationResult; elapsedMs: number };

const defaultScenario: Scenario = {
  id: 'eigenes-szenario',
  name: 'Eigenes Szenario',
  description: 'Direkt einstellbares Szenario mit runden Startwerten.',
  demand: { basePct: 100, bevPct: 10, heatPumpPct: 10 },
  renewables: { pvGW: 100, windOnGW: 100, windOffGW: 10 },
  fossil: { coalGW: 10, gasGW: 10, nuclearGW: 0 },
  storage: { batteryPowerGW: 10, batteryEnergyGWh: 100, h2PowerGW: 10, h2EnergyGWh: 100, importLimitGW: 10 },
};

const shell = 'min-h-screen px-3 py-3 sm:px-4 lg:px-6';
const panel = 'rounded-2xl border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_60px_rgba(0,0,0,.28)]';
const field = 'h-9 w-full rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-indigo-300/50';
const muted = 'text-zinc-400';

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
      const chart = echarts.init(el, 'dark');
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

export function App() {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(() => scenarioFromUrl() ?? defaultScenario);
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('21d');
  const [customStart, setCustomStart] = useState('2025-01-01');
  const [customEnd, setCustomEnd] = useState('2025-01-21');
  const [chartResult, setChartResult] = useState<SimulationResult | null>(null);
  const [isTuning, setIsTuning] = useState(false);

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
  const mixOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildMixChartOption(sliced) : undefined, [sliced]);
  const storageOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildStorageChartOption(sliced) : undefined, [sliced]);

  useChart('mix-chart', mixOption);
  useChart('storage-chart', storageOption);

  const update = (path: string, value: number) => setScenario(prev => setScenarioValue(prev, path, value));
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
    <div className="mx-auto grid w-full max-w-[1540px] gap-3 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={cx(panel, 'lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto')}>
        <div className="border-b border-white/10 px-4 py-3">
          <h1 className="text-xl font-semibold tracking-[-0.04em] text-white">Netzprobe</h1>
        </div>

        <div className="space-y-3 p-4">
          <DataSourceCard />

          <ControlSection title="Last">
            <Control rows={[["Grundlast", 'demand.basePct', scenario.demand.basePct, 50, 150, '%'], ["BEV", 'demand.bevPct', scenario.demand.bevPct, 0, 100, '%'], ["Wärmepumpen", 'demand.heatPumpPct', scenario.demand.heatPumpPct, 0, 100, '%']]} onChange={update} onTuneStart={() => setIsTuning(true)} onTuneEnd={() => setIsTuning(false)}/>
          </ControlSection>

          <ControlSection title="Erzeugung & Netz">
            <Control rows={[["PV", 'renewables.pvGW', scenario.renewables.pvGW, 20, 220, 'GW'], ["Wind Land", 'renewables.windOnGW', scenario.renewables.windOnGW, 10, 180, 'GW'], ["Wind See", 'renewables.windOffGW', scenario.renewables.windOffGW, 5, 80, 'GW']]} onChange={update} onTuneStart={() => setIsTuning(true)} onTuneEnd={() => setIsTuning(false)}/>
            <Control rows={[["Kohle", 'fossil.coalGW', scenario.fossil.coalGW, 0, 40, 'GW'], ["Gas", 'fossil.gasGW', scenario.fossil.gasGW, 0, 80, 'GW'], ["Batterie P", 'storage.batteryPowerGW', scenario.storage.batteryPowerGW, 0, 80, 'GW'], ["Batterie E", 'storage.batteryEnergyGWh', scenario.storage.batteryEnergyGWh, 0, 300, 'GWh'], ["H₂ E", 'storage.h2EnergyGWh', scenario.storage.h2EnergyGWh, 0, 1200, 'GWh'], ["Import", 'storage.importLimitGW', scenario.storage.importLimitGW, 0, 35, 'GW']]} onChange={update} onTuneStart={() => setIsTuning(true)} onTuneEnd={() => setIsTuning(false)}/>
          </ControlSection>
        </div>
      </aside>

      <section className="flex min-w-0 flex-col gap-3">
        {!result ? <div className={cx(panel, 'grid min-h-80 place-items-center text-zinc-300')}>Lade Daten …</div> : <>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi icon={<Zap/>} label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
              <Kpi icon={<Gauge/>} label="CO₂ / EE" value={`${fmt0.format(result.summary.co2IntensityGPerKWh)} g/kWh`} subValue={pct(result.summary.renewableSharePct)}/>
              <Kpi icon={<AlertTriangle/>} label="Unterdeckung" value={twh(result.summary.loadSheddingTWh)} tone={result.summary.loadSheddingTWh > 1 ? 'kritisch' : result.summary.loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil'}/>
              <Kpi icon={<Banknote/>} label="Kosten" value="—" subValue="Platzhalter"/>
            </div>
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
          </div>

          <ChartPanel title="Energiemix vs. Last" meta={`${formatDate(selectedPeriod.start)} – ${formatDate(selectedPeriod.end)}`}>
            <div id="mix-chart" className="h-[340px] w-full sm:h-[420px]"/>
          </ChartPanel>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
            <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂">
              <div id="storage-chart" className="h-[240px] w-full"/>
            </ChartPanel>

            <div className={cx(panel, 'grid content-start gap-4 p-4')}>
              <MetricLine label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
              <MetricLine label="Zeitraum" value={`${sliced.length} h`}/>
            </div>
          </div>
          <footer className="mt-auto pt-2 text-xs leading-5 text-zinc-500">
            Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln. Daten auf <a className="text-zinc-200 underline decoration-white/30 underline-offset-4 hover:text-white" href="https://github.com/chriopter/netzprobe/tree/main/data" target="_blank" rel="noreferrer">GitHub</a>.
          </footer>
        </>}
      </section>
    </div>
  </main>;
}

function ChartPanel({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return <section className={cx(panel, 'min-w-0 p-4')}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-medium tracking-[-0.02em]">{title}</h2>
      <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>
    </div>
    {children}
  </section>;
}

function Kpi({ icon, label, value, subValue, tone }: { icon: ReactNode; label: string; value: string; subValue?: string; tone?: string }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-400' : tone === 'angespannt' ? 'text-amber-400' : tone === 'kritisch' ? 'text-red-400' : 'text-indigo-300';
  return <div className={cx(panel, 'min-h-20 p-3')}>
    <div className={cx('mb-2 [&_svg]:h-4 [&_svg]:w-4', toneClass)}>{icon}</div>
    <span className="text-xs text-zinc-500">{label}</span>
    <strong className="mt-1 block text-xl font-medium tracking-[-0.04em] text-white">{value}</strong>
    {subValue && <span className="mt-1 block text-xs text-zinc-500">{subValue}</span>}
  </div>;
}

function DataSourceCard() {
  return <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
    <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Daten</h2>
    <div className="grid gap-2">
      <label className="grid gap-1">
        <span className="text-xs text-zinc-400">Last</span>
        <select className={field} value="last_energy-charts-2025" disabled>
          <option value="last_energy-charts-2025">Energy-Charts 2025</option>
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs text-zinc-400">Erzeugung</span>
        <select className={field} value="erzeugung_energy-charts-2025" disabled>
          <option value="erzeugung_energy-charts-2025">Energy-Charts 2025</option>
        </select>
      </label>
    </div>
    <details className="group mt-2">
      <summary className="cursor-pointer list-none text-xs text-zinc-400 hover:text-white">Details</summary>
      <p className="mt-2 text-xs leading-5 text-zinc-500">Modellfaktoren sind abgeleitete Solar-/Wind-Verfügbarkeiten, keine Rohwetterdaten.</p>
    </details>
  </section>;
}

function ControlSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
    <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">{title}</h2>
    <div className="mt-3 grid gap-4 border-t border-white/10 pt-3">
      {children}
    </div>
  </section>;
}

function PeriodControl({ preset, start, end, customStart, customEnd, onPreset, onStart, onEnd }: { preset: PeriodPreset; start: string; end: string; customStart: string; customEnd: string; onPreset: (preset: PeriodPreset) => void; onStart: (date: string) => void; onEnd: (date: string) => void }) {
  return <section className={cx(panel, 'grid gap-3 p-3')}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Zeitraum</h2>
      <span className="text-xs text-zinc-500">{formatDate(start)} – {formatDate(end)}</span>
    </div>
    <select className={field} value={preset} onChange={event => onPreset(event.target.value as PeriodPreset)}>
      <option value="21d">21 Tage</option>
      <option value="90d">90 Tage</option>
      <option value="year">Ganzes Jahr</option>
      <option value="custom">Custom</option>
    </select>
    <div className="grid grid-cols-2 gap-2">
      <input className={field} type="date" min="2025-01-01" max="2025-12-31" value={preset === 'custom' ? customStart : start} onChange={event => onStart(event.target.value)}/>
      <input className={field} type="date" min="2025-01-01" max="2025-12-31" value={preset === 'custom' ? customEnd : end} onChange={event => onEnd(event.target.value)}/>
    </div>
  </section>;
}

function Control({ rows, onChange, onTuneStart, onTuneEnd }: { rows: ControlRow[]; onChange: (path: string, value: number) => void; onTuneStart: () => void; onTuneEnd: () => void }) {
  return <div className="grid gap-3">
    {rows.map(([label, path, value, min, max, unit]) => <label key={path} className="grid gap-1.5">
      <span className="flex items-center justify-between gap-4 text-xs text-zinc-300">
        {label}
        <b className="font-mono text-xs font-medium text-white">{formatControlValue(value, unit)}</b>
      </span>
      <input type="range" min={min} max={max} step={unit === 'GW' ? 0.5 : 1} value={value} onPointerDown={onTuneStart} onPointerUp={onTuneEnd} onPointerCancel={onTuneEnd} onBlur={onTuneEnd} onKeyUp={onTuneEnd} onChange={event => onChange(path, Number(event.target.value))}/>
    </label>)}
  </div>;
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm">
    <span className="text-zinc-500">{label}</span>
    <strong className="font-medium text-white">{value}</strong>
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
