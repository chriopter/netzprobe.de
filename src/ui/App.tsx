import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as echarts from 'echarts';
import { Activity, BatteryCharging, CloudSun, Download, Gauge, ShieldCheck, Zap } from 'lucide-react';
import { loadDefaultData } from '../data/loaders';
import type { DataSet } from '../data/types';
import { baselineScenario, scenarioPresets } from '../scenarios/baseline';
import type { Scenario } from '../scenarios/types';
import { runSimulation } from '../simulation/engine';
import { buildMixChartOption, buildStorageChartOption } from './chartOptions';
import { fmt, fmt0, gw, pct, twh } from './format';

function useChart(id: string, option: echarts.EChartsOption | undefined) {
  useEffect(() => {
    if (!option) return;
    const el = document.getElementById(id);
    if (!el) return;
    const chart = echarts.init(el, 'dark');
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.dispose(); };
  }, [id, option]);
}

function scenarioToUrl(s: Scenario) {
  const packed = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
  const url = new URL(window.location.href);
  url.searchParams.set('s', packed);
  return url.toString();
}
function scenarioFromUrl(): Scenario | null {
  try { const raw = new URL(window.location.href).searchParams.get('s'); return raw ? JSON.parse(decodeURIComponent(escape(atob(raw)))) : null; } catch { return null; }
}

export function App() {
  const [data, setData] = useState<DataSet | null>(null);
  const [scenario, setScenario] = useState<Scenario>(() => scenarioFromUrl() ?? baselineScenario);
  const [range, setRange] = useState<[number, number]>([0, 24 * 21]);

  useEffect(() => { loadDefaultData().then(setData).catch(console.error); }, []);
  const result = useMemo(() => data ? runSimulation(data.hours, scenario) : null, [data, scenario]);
  const sliced = useMemo(() => result?.hours.slice(range[0], range[1]) ?? [], [result, range]);

  const mixOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildMixChartOption(sliced) : undefined, [sliced]);

  const storageOption = useMemo<echarts.EChartsOption | undefined>(() => sliced.length ? buildStorageChartOption(sliced) : undefined, [sliced]);
  useChart('mix-chart', mixOption); useChart('storage-chart', storageOption);

  const update = (path: string, value: number) => setScenario(prev => {
    const next = structuredClone(prev) as any;
    const parts = path.split('.'); let target = next;
    for (const p of parts.slice(0, -1)) target = target[p];
    target[parts.at(-1)!] = value;
    next.id = 'eigenes-szenario'; next.name = 'Eigenes Szenario';
    return next;
  });
  const reset = (s: Scenario) => setScenario(structuredClone(s));
  const share = async () => navigator.clipboard?.writeText(scenarioToUrl(scenario));

  return <main>
    <section className="hero">
      <div className="pill"><Activity size={14}/> Keine Anmeldung · statisch hostbar · Simulation im Browser</div>
      <h1>Netzprobe</h1>
      <p>Eine klare, schnelle Netzprobe für Strommix, Speicher, Dunkelflaute und CO₂-Faktor. KISS: Daten rein, Szenario schieben, Ergebnis sehen.</p>
      <div className="hero-actions"><button onClick={share}>Szenario-Link kopieren</button><a href="/data/de-2025-hourly.json" download><Download size={16}/> Daten</a></div>
    </section>

    <section className="layout">
      <aside className="panel controls">
        <h2>Szenario</h2>
        <div className="preset-grid">{scenarioPresets.map(s => <button key={s.id} className={s.id === scenario.id ? 'active' : ''} onClick={() => reset(s)}>{s.name}</button>)}</div>
        <Control title="Nachfrage" rows={[["Grundlast", 'demand.basePct', scenario.demand.basePct, 50, 150, '%'], ["BEV", 'demand.bevPct', scenario.demand.bevPct, 0, 100, '%'], ["Wärmepumpen", 'demand.heatPumpPct', scenario.demand.heatPumpPct, 0, 100, '%']]} onChange={update}/>
        <Control title="Erneuerbare" rows={[["PV", 'renewables.pvGW', scenario.renewables.pvGW, 20, 220, 'GW'], ["Wind Land", 'renewables.windOnGW', scenario.renewables.windOnGW, 10, 180, 'GW'], ["Wind See", 'renewables.windOffGW', scenario.renewables.windOffGW, 5, 80, 'GW']]} onChange={update}/>
        <Control title="Reserve & Speicher" rows={[["Kohle", 'fossil.coalGW', scenario.fossil.coalGW, 0, 40, 'GW'], ["Gas", 'fossil.gasGW', scenario.fossil.gasGW, 0, 80, 'GW'], ["Batterie P", 'storage.batteryPowerGW', scenario.storage.batteryPowerGW, 0, 80, 'GW'], ["Batterie E", 'storage.batteryEnergyGWh', scenario.storage.batteryEnergyGWh, 0, 300, 'GWh'], ["H₂ E", 'storage.h2EnergyGWh', scenario.storage.h2EnergyGWh, 0, 1200, 'GWh'], ["Importlimit", 'storage.importLimitGW', scenario.storage.importLimitGW, 0, 35, 'GW']]} onChange={update}/>
      </aside>

      <section className="dashboard">
        {!result ? <div className="panel loading">Lade 8760 Stunden Daten …</div> : <>
          <div className="kpis">
            <Kpi icon={<ShieldCheck/>} label="Status" value={result.summary.securityStatus.toUpperCase()} tone={result.summary.securityStatus}/>
            <Kpi icon={<Gauge/>} label="CO₂-Faktor" value={`${fmt0.format(result.summary.co2IntensityGPerKWh)} g/kWh`}/>
            <Kpi icon={<CloudSun/>} label="Erneuerbar" value={pct(result.summary.renewableSharePct)}/>
            <Kpi icon={<Zap/>} label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
            <Kpi icon={<BatteryCharging/>} label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
          </div>
          <div className="panel chart-card"><div className="card-head"><h2>Energiemix vs. Last</h2><span>{new Date(sliced[0]?.time).toLocaleDateString('de-DE')} – {new Date(sliced.at(-1)?.time ?? '').toLocaleDateString('de-DE')}</span></div><div id="mix-chart" className="chart"/></div>
          <div className="panel chart-card"><div className="card-head"><h2>Speicherfüllstand</h2><span>Batterie und H₂</span></div><div id="storage-chart" className="chart small"/></div>
          <div className="panel range"><label>Zeitraum: erste {Math.round((range[1]-range[0])/24)} Tage</label><input type="range" min={7} max={365} value={Math.round((range[1]-range[0])/24)} onChange={e => setRange([0, Number(e.target.value)*24])}/></div>
          <div className="panel notes"><h2>Plausibilität</h2><p>Konstanten wurden grob gegen Energy-Charts/Fraunhofer ISE, Bundesnetzagentur, UBA, SMARD, DWD und ERA5 eingeordnet. Ergebnis: Größenordnungen sind für 2025 plausibel; Batterie-Leistung konservativ, PV/Wind eher Anfang-2025.</p></div>
        </>}
      </section>
    </section>
  </main>;
}

function Kpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone?: string }) { return <div className={`kpi ${tone ?? ''}`}>{icon}<span>{label}</span><strong>{value}</strong></div>; }
function Control({ title, rows, onChange }: { title: string; rows: [string,string,number,number,number,string][]; onChange: (path:string,value:number)=>void }) { return <div className="control"><h3>{title}</h3>{rows.map(([label,path,val,min,max,unit]) => <label key={path}><span>{label}<b>{unit === '%' ? `${fmt0.format(val)} %` : unit === 'GWh' ? `${fmt0.format(val)} GWh` : gw(val)}</b></span><input type="range" min={min} max={max} step={unit==='GW' ? 0.5 : 1} value={val} onChange={e => onChange(path, Number(e.target.value))}/></label>)}</div>; }
