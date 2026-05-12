import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { BatteryCharging, CloudSun, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { loadDefaultData } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import { baselineScenario, scenarioPresets } from '../../scenarios/baseline';
import type { Scenario } from '../../scenarios/types';
import { runSimulation } from '../simulation/engine';
import { buildMixChartOption, buildStorageChartOption } from './chartOptions';
import { fmt0, gw, pct, twh } from './format';

type ControlRow = [label: string, path: string, value: number, min: number, max: number, unit: string];

const shell = 'min-h-screen px-4 py-4 sm:px-6 lg:px-8';
const panel = 'rounded-2xl border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_18px_60px_rgba(0,0,0,.28)]';
const muted = 'text-zinc-400';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function useChart(id: string, option: echarts.EChartsOption | undefined) {
  useEffect(() => {
    if (!option) return;
    const el = document.getElementById(id);
    if (!el) return;
    const chart = echarts.init(el, 'dark');
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
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

export function App() {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(() => scenarioFromUrl() ?? baselineScenario);
  const [range, setRange] = useState<[number, number]>([0, 24 * 21]);

  useEffect(() => {
    loadDefaultData().then(setData).catch(console.error);
  }, []);

  const result = useMemo(() => data ? runSimulation(data.hours, scenario) : null, [data, scenario]);
  const sliced = useMemo(() => result?.hours.slice(range[0], range[1]) ?? [], [result, range]);
  const mixOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildMixChartOption(sliced) : undefined, [sliced]);
  const storageOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildStorageChartOption(sliced) : undefined, [sliced]);

  useChart('mix-chart', mixOption);
  useChart('storage-chart', storageOption);

  const update = (path: string, value: number) => setScenario(prev => setScenarioValue(prev, path, value));
  const reset = (preset: Scenario) => setScenario(structuredClone(preset));
  const visibleDays = Math.round((range[1] - range[0]) / 24);

  return <main className={shell}>
    <div className="mx-auto grid w-full max-w-[1540px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={cx(panel, 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto')}>
        <div className="border-b border-white/10 p-5">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Netzprobe</h1>
          <p className="mt-1 text-sm text-zinc-500">Szenario</p>
        </div>

        <div className="space-y-5 p-5">
          <div className="grid gap-2">
            {scenarioPresets.map(preset => <button
              key={preset.id}
              className={cx(
                'rounded-xl border px-3 py-2.5 text-left text-sm transition',
                preset.id === scenario.id
                  ? 'border-indigo-300/40 bg-indigo-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/20 hover:bg-white/[0.06]',
              )}
              onClick={() => reset(preset)}
            >{preset.name}</button>)}
          </div>

          <Control title="Nachfrage" rows={[["Grundlast", 'demand.basePct', scenario.demand.basePct, 50, 150, '%'], ["BEV", 'demand.bevPct', scenario.demand.bevPct, 0, 100, '%'], ["Wärmepumpen", 'demand.heatPumpPct', scenario.demand.heatPumpPct, 0, 100, '%']]} onChange={update}/>
          <Control title="Erneuerbare" rows={[["PV", 'renewables.pvGW', scenario.renewables.pvGW, 20, 220, 'GW'], ["Wind Land", 'renewables.windOnGW', scenario.renewables.windOnGW, 10, 180, 'GW'], ["Wind See", 'renewables.windOffGW', scenario.renewables.windOffGW, 5, 80, 'GW']]} onChange={update}/>
          <Control title="Reserve & Speicher" rows={[["Kohle", 'fossil.coalGW', scenario.fossil.coalGW, 0, 40, 'GW'], ["Gas", 'fossil.gasGW', scenario.fossil.gasGW, 0, 80, 'GW'], ["Batterie P", 'storage.batteryPowerGW', scenario.storage.batteryPowerGW, 0, 80, 'GW'], ["Batterie E", 'storage.batteryEnergyGWh', scenario.storage.batteryEnergyGWh, 0, 300, 'GWh'], ["H₂ E", 'storage.h2EnergyGWh', scenario.storage.h2EnergyGWh, 0, 1200, 'GWh'], ["Importlimit", 'storage.importLimitGW', scenario.storage.importLimitGW, 0, 35, 'GW']]} onChange={update}/>
        </div>
      </aside>

      <section className="grid min-w-0 content-start gap-4">
        {!result ? <div className={cx(panel, 'grid min-h-80 place-items-center text-zinc-300')}>Lade 8760 Stunden Daten …</div> : <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi icon={<ShieldCheck/>} label="Status" value={result.summary.securityStatus.toUpperCase()} tone={result.summary.securityStatus}/>
            <Kpi icon={<Gauge/>} label="CO₂-Faktor" value={`${fmt0.format(result.summary.co2IntensityGPerKWh)} g/kWh`}/>
            <Kpi icon={<CloudSun/>} label="Erneuerbar" value={pct(result.summary.renewableSharePct)}/>
            <Kpi icon={<Zap/>} label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
            <Kpi icon={<BatteryCharging/>} label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
          </div>

          <ChartPanel title="Energiemix vs. Last" meta={`${new Date(sliced[0]?.time).toLocaleDateString('de-DE')} – ${new Date(sliced.at(-1)?.time ?? '').toLocaleDateString('de-DE')}`}>
            <div id="mix-chart" className="h-[360px] w-full sm:h-[430px]"/>
          </ChartPanel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <ChartPanel title="Speicherfüllstand" meta="Batterie und H₂">
              <div id="storage-chart" className="h-[260px] w-full"/>
            </ChartPanel>

            <div className={cx(panel, 'grid content-between gap-5 p-5')}>
              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-medium tracking-[-0.02em]">Zeitraum</h2>
                  <span className={cx(muted, 'text-sm')}>erste {visibleDays} Tage</span>
                </div>
                <input className="mt-6" type="range" min={7} max={365} value={visibleDays} onChange={e => setRange([0, Number(e.target.value) * 24])}/>
              </div>
              <footer className="text-sm leading-6 text-zinc-500">
                Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln. Daten auf <a className="text-zinc-200 underline decoration-white/30 underline-offset-4 hover:text-white" href="https://github.com/chriopter/netzprobe/tree/main/data" target="_blank" rel="noreferrer">GitHub</a>.
              </footer>
            </div>
          </div>
        </>}
      </section>
    </div>
  </main>;
}

function ChartPanel({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return <section className={cx(panel, 'min-w-0 p-4 sm:p-5')}>
    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-lg font-medium tracking-[-0.02em]">{title}</h2>
      <span className={cx(muted, 'text-sm')}>{meta}</span>
    </div>
    {children}
  </section>;
}

function Kpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: string }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-400' : tone === 'angespannt' ? 'text-amber-400' : tone === 'kritisch' ? 'text-red-400' : 'text-indigo-300';
  return <div className={cx(panel, 'min-h-28 p-4')}>
    <div className={cx('mb-3 [&_svg]:h-5 [&_svg]:w-5', toneClass)}>{icon}</div>
    <span className="text-sm text-zinc-500">{label}</span>
    <strong className="mt-1 block text-2xl font-medium tracking-[-0.04em] text-white">{value}</strong>
  </div>;
}

function Control({ title, rows, onChange }: { title: string; rows: ControlRow[]; onChange: (path: string, value: number) => void }) {
  return <section className="border-t border-white/10 pt-5">
    <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{title}</h2>
    <div className="grid gap-4">
      {rows.map(([label, path, value, min, max, unit]) => <label key={path} className="grid gap-2">
        <span className="flex items-center justify-between gap-4 text-sm text-zinc-300">
          {label}
          <b className="font-mono text-sm font-medium text-white">{formatControlValue(value, unit)}</b>
        </span>
        <input type="range" min={min} max={max} step={unit === 'GW' ? 0.5 : 1} value={value} onChange={e => onChange(path, Number(e.target.value))}/>
      </label>)}
    </div>
  </section>;
}

function formatControlValue(value: number, unit: string) {
  if (unit === '%') return `${fmt0.format(value)} %`;
  if (unit === 'GWh') return `${fmt0.format(value)} GWh`;
  return gw(value);
}
