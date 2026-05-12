import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { BatteryCharging, CloudSun, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { loadDefaultData } from '../loaders/defaultData';
import type { DataSet } from '../types/data';
import { baselineScenario } from '../../scenarios/baseline';
import type { Scenario } from '../../scenarios/types';
import { runSimulation } from '../simulation/engine';
import { buildMixChartOption, buildStorageChartOption } from './chartOptions';
import { fmt0, gw, pct, twh } from './format';

type ControlRow = [label: string, path: string, value: number, min: number, max: number, unit: string];
type DemandScenario = { id: string; name: string; description: string; values: Scenario['demand'] };
type SupplyScenario = { id: string; name: string; description: string; values: Pick<Scenario, 'renewables' | 'fossil' | 'storage'> };

const demandScenarios: DemandScenario[] = [
  { id: 'demand-demo', name: 'Demo-Nachfrage', description: 'Runde Platzhalterwerte für Last, BEV und Wärme.', values: { basePct: 100, bevPct: 10, heatPumpPct: 10 } },
  { id: 'demand-low', name: 'Niedrige Nachfrage', description: 'Platzhalter für einen sparsameren Verbrauchspfad.', values: { basePct: 90, bevPct: 10, heatPumpPct: 10 } },
  { id: 'demand-high', name: 'Hohe Nachfrage', description: 'Platzhalter für Elektrifizierung und mehr Verbrauch.', values: { basePct: 110, bevPct: 30, heatPumpPct: 30 } },
];

const supplyScenarios: SupplyScenario[] = [
  { id: 'supply-demo', name: 'Demo-Netz', description: 'Runde Platzhalterwerte für Erzeugung, Reserve und Speicher.', values: { renewables: { pvGW: 100, windOnGW: 100, windOffGW: 10 }, fossil: { coalGW: 10, gasGW: 10, nuclearGW: 0 }, storage: { batteryPowerGW: 10, batteryEnergyGWh: 100, h2PowerGW: 10, h2EnergyGWh: 100, importLimitGW: 10 } } },
  { id: 'supply-renewable', name: 'Mehr Erneuerbare', description: 'Platzhalter für stärkeren PV- und Wind-Ausbau.', values: { renewables: { pvGW: 160, windOnGW: 140, windOffGW: 30 }, fossil: { coalGW: 5, gasGW: 20, nuclearGW: 0 }, storage: { batteryPowerGW: 30, batteryEnergyGWh: 200, h2PowerGW: 20, h2EnergyGWh: 400, importLimitGW: 15 } } },
  { id: 'supply-reserve', name: 'Mehr Reserve', description: 'Platzhalter für mehr steuerbare Leistung und Import.', values: { renewables: { pvGW: 100, windOnGW: 100, windOffGW: 10 }, fossil: { coalGW: 20, gasGW: 40, nuclearGW: 0 }, storage: { batteryPowerGW: 20, batteryEnergyGWh: 150, h2PowerGW: 20, h2EnergyGWh: 300, importLimitGW: 25 } } },
];

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

function setDemandScenario(scenario: Scenario, demand: Scenario['demand']): Scenario {
  return { ...structuredClone(scenario), id: 'eigenes-szenario', name: 'Eigenes Szenario', demand: structuredClone(demand) };
}

function setSupplyScenario(scenario: Scenario, values: SupplyScenario['values']): Scenario {
  return { ...structuredClone(scenario), id: 'eigenes-szenario', name: 'Eigenes Szenario', ...structuredClone(values) };
}

function isEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function matchingDemandName(demand: Scenario['demand']) {
  return demandScenarios.find(preset => isEqual(preset.values, demand))?.name ?? 'Eigenes Szenario';
}

function matchingSupplyName(scenario: Scenario) {
  return supplyScenarios.find(preset => isEqual(preset.values.renewables, scenario.renewables) && isEqual(preset.values.fossil, scenario.fossil) && isEqual(preset.values.storage, scenario.storage))?.name ?? 'Eigenes Szenario';
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
  const selectDemand = (preset: DemandScenario) => setScenario(prev => setDemandScenario(prev, preset.values));
  const selectSupply = (preset: SupplyScenario) => setScenario(prev => setSupplyScenario(prev, preset.values));
  const visibleDays = Math.round((range[1] - range[0]) / 24);

  return <main className={shell}>
    <div className="mx-auto grid w-full max-w-[1540px] gap-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={cx(panel, 'lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto')}>
        <div className="border-b border-white/10 p-5">
          <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Netzprobe</h1>
          <p className="mt-1 text-sm text-zinc-500">Daten · Nachfrage · Netz</p>
        </div>

        <div className="space-y-4 p-5">
          <SourceScenarioCard />

          <ScenarioSection
            title="Nachfrage"
            activeName={matchingDemandName(scenario.demand)}
            presets={demandScenarios}
            isActive={preset => isEqual(preset.values, scenario.demand)}
            onSelect={selectDemand}
          >
            <Control rows={[["Grundlast", 'demand.basePct', scenario.demand.basePct, 50, 150, '%'], ["BEV", 'demand.bevPct', scenario.demand.bevPct, 0, 100, '%'], ["Wärmepumpen", 'demand.heatPumpPct', scenario.demand.heatPumpPct, 0, 100, '%']]} onChange={update}/>
          </ScenarioSection>

          <ScenarioSection
            title="Netz, Erneuerbare & Erzeugung"
            activeName={matchingSupplyName(scenario)}
            presets={supplyScenarios}
            isActive={preset => isEqual(preset.values.renewables, scenario.renewables) && isEqual(preset.values.fossil, scenario.fossil) && isEqual(preset.values.storage, scenario.storage)}
            onSelect={selectSupply}
          >
            <Control rows={[["PV", 'renewables.pvGW', scenario.renewables.pvGW, 20, 220, 'GW'], ["Wind Land", 'renewables.windOnGW', scenario.renewables.windOnGW, 10, 180, 'GW'], ["Wind See", 'renewables.windOffGW', scenario.renewables.windOffGW, 5, 80, 'GW']]} onChange={update}/>
            <Control rows={[["Kohle", 'fossil.coalGW', scenario.fossil.coalGW, 0, 40, 'GW'], ["Gas", 'fossil.gasGW', scenario.fossil.gasGW, 0, 80, 'GW'], ["Batterie P", 'storage.batteryPowerGW', scenario.storage.batteryPowerGW, 0, 80, 'GW'], ["Batterie E", 'storage.batteryEnergyGWh', scenario.storage.batteryEnergyGWh, 0, 300, 'GWh'], ["H₂ E", 'storage.h2EnergyGWh', scenario.storage.h2EnergyGWh, 0, 1200, 'GWh'], ["Importlimit", 'storage.importLimitGW', scenario.storage.importLimitGW, 0, 35, 'GW']]} onChange={update}/>
          </ScenarioSection>
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

function SourceScenarioCard() {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Quelle historische Daten</h2>
        <p className="mt-2 text-sm font-medium text-white">Energy-Charts 2025</p>
      </div>
      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-xs text-emerald-300">aktiv</span>
    </div>
    <p className="text-sm leading-5 text-zinc-500">Last und Erzeugung aus public_power; installierte Leistung aus installed_power. Wetterwerte sind daraus abgeleitete Modellwerte.</p>
    <details className="group mt-3">
      <summary className="cursor-pointer list-none text-sm text-zinc-300 transition hover:text-white">Details <span className="text-zinc-600 group-open:hidden">anzeigen</span><span className="hidden text-zinc-600 group-open:inline">ausblenden</span></summary>
      <div className="mt-3 grid gap-2 text-sm text-zinc-500">
        <p>Datensatz: Deutschland, stündlich, 2025.</p>
        <p>Platzhalter für spätere Datenquellen-Auswahl.</p>
      </div>
    </details>
  </section>;
}

function ScenarioSection<T extends { id: string; name: string; description: string }>({ title, activeName, presets, isActive, onSelect, children }: { title: string; activeName: string; presets: T[]; isActive: (preset: T) => boolean; onSelect: (preset: T) => void; children: ReactNode }) {
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <div className="mb-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">Szenario: <span className="font-medium text-white">{activeName}</span></p>
    </div>
    <div className="grid gap-2">
      {presets.map(preset => <button
        key={preset.id}
        className={cx(
          'rounded-xl border px-3 py-2.5 text-left transition',
          isActive(preset) ? 'border-indigo-300/40 bg-indigo-500/20' : 'border-white/10 bg-black/10 hover:border-white/20 hover:bg-white/[0.05]',
        )}
        onClick={() => onSelect(preset)}
      >
        <span className="block text-sm font-medium text-white">{preset.name}</span>
        <span className="mt-1 block text-xs leading-5 text-zinc-500">{preset.description}</span>
      </button>)}
    </div>
    <details className="group mt-4">
      <summary className="cursor-pointer list-none text-sm text-zinc-300 transition hover:text-white">Details <span className="text-zinc-600 group-open:hidden">anzeigen</span><span className="hidden text-zinc-600 group-open:inline">ausblenden</span></summary>
      <div className="mt-4 grid gap-5 border-t border-white/10 pt-4">
        {children}
      </div>
    </details>
  </section>;
}

function Control({ rows, onChange }: { rows: ControlRow[]; onChange: (path: string, value: number) => void }) {
  return <div className="grid gap-4">
    {rows.map(([label, path, value, min, max, unit]) => <label key={path} className="grid gap-2">
      <span className="flex items-center justify-between gap-4 text-sm text-zinc-300">
        {label}
        <b className="font-mono text-sm font-medium text-white">{formatControlValue(value, unit)}</b>
      </span>
      <input type="range" min={min} max={max} step={unit === 'GW' ? 0.5 : 1} value={value} onChange={e => onChange(path, Number(e.target.value))}/>
    </label>)}
  </div>;
}

function formatControlValue(value: number, unit: string) {
  if (unit === '%') return `${fmt0.format(value)} %`;
  if (unit === 'GWh') return `${fmt0.format(value)} GWh`;
  return gw(value);
}
