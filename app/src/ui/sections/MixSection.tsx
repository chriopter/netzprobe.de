import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useMainThreadChart } from '../chartHooks';
import {
  buildMixChartOption,
  buildStorageChartOption,
  EXTRA_LEAVES,
  MIX_GROUPS,
  type ChartMode,
  type ChartTheme,
  type MixLeafKey,
  type MixVisibility,
} from '../chartOptions';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult, SimHour } from '../../types/simulation';
import { fmt, fmt0, pct, twh } from '../format';
import { cx } from '../ui';
import { ChartModeToggle, ChartPanel, ComingSoonGate, StatCard, type Stat } from '../sectionUi';
import { computeKosten } from '../kosten';

function useMixChart(containerId: string, hours: SimHour[] | undefined, visibility: MixVisibility, mode: ChartMode, theme: ChartTheme, scaleMaxGW?: number): boolean {
  const data = useMemo(() => hours && hours.length ? { hours, visibility, mode, theme, scaleMaxGW } : null, [hours, visibility, mode, theme, scaleMaxGW]);
  return useMainThreadChart(containerId, data, (d, viewport) => buildMixChartOption(d.hours, d.visibility, d.mode, viewport, d.scaleMaxGW, d.theme), mode === 'sunburst');
}

function useStorageChart(containerId: string, hours: SimHour[] | undefined, theme: ChartTheme): boolean {
  const data = useMemo(() => hours && hours.length ? { hours, theme } : null, [hours, theme]);
  return useMainThreadChart(containerId, data, d => buildStorageChartOption(d.hours, d.theme));
}

function MixLegend({ visibility, onToggleLeaf, onToggleGroup }: { visibility: MixVisibility; onToggleLeaf: (key: MixLeafKey, checked: boolean) => void; onToggleGroup: (groupId: string, checked: boolean) => void }) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const renderPill = (key: MixLeafKey, label: string, color: string, glyph: string) => {
    const active = visibility[key];
    return <button
      key={key}
      type="button"
      aria-pressed={active}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 transition',
        active ? 'border-zinc-300 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100' : 'border-zinc-100 bg-white text-zinc-400 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500 dark:hover:text-zinc-300',
      )}
      onClick={() => onToggleLeaf(key, !active)}
    >
      <span aria-hidden className="text-[10px]" style={{ color: active ? color : '#d4d4d8' }}>{glyph}</span>
      <span>{label}</span>
    </button>;
  };
  const activeGroup = openGroup ? MIX_GROUPS.find(g => g.id === openGroup) : null;
  return <div className="grid gap-1.5 bg-white px-2 pb-3 pt-6 text-xs dark:bg-zinc-950 sm:px-3 sm:pb-3.5 sm:pt-8">
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      {EXTRA_LEAVES.map(item => renderPill(item.key, item.label, item.color, item.glyph))}
      {MIX_GROUPS.map(group => {
        const activeCount = group.leaves.filter(leaf => visibility[leaf.key]).length;
        const total = group.leaves.length;
        const someActive = activeCount > 0;
        const allActive = activeCount === total;
        const isOpen = openGroup === group.id;
        return <div key={group.id} className={cx(
          'inline-flex shrink-0 items-stretch overflow-hidden rounded-md border transition',
          someActive ? 'border-zinc-300 bg-white text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100' : 'border-zinc-100 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500',
        )}>
          <button
            type="button"
            aria-pressed={someActive}
            title={allActive ? 'Alle abwählen' : 'Alle aktivieren'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => onToggleGroup(group.id, !allActive)}
          >
            <span aria-hidden className="text-[10px]" style={{ color: someActive ? group.color : '#d4d4d8' }}>●</span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em]">{group.label}</span>
            <span className="text-[10px] text-zinc-400">{activeCount}/{total}</span>
          </button>
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? `${group.label} einklappen` : `${group.label} aufklappen`}
            className="inline-flex items-center border-l border-zinc-200 px-1.5 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={() => setOpenGroup(isOpen ? null : group.id)}
          >
            <ChevronRight aria-hidden className={cx('h-3 w-3 text-zinc-400 transition-transform', isOpen && 'rotate-90')}/>
          </button>
        </div>;
      })}
    </div>
    {activeGroup && <div className="flex flex-wrap items-center justify-center gap-1.5">
      {activeGroup.leaves.map(leaf => renderPill(leaf.key, leaf.label, leaf.color, '●'))}
    </div>}
  </div>;
}

export type MixSectionProps = {
  result: SimulationResult;
  resolvedScenario: Scenario;
  electrifiedPct: number | null;
  buildoutYear: string;
  chartMode: ChartMode;
  setChartMode: (mode: ChartMode) => void;
  mixVisibility: MixVisibility;
  setMixVisibility: Dispatch<SetStateAction<MixVisibility>>;
  isPending: boolean;
  isOutdated: boolean;
  sliderActive: boolean;
  liveSimulation: boolean;
  deferredChartSource: SimulationResult | null;
  sliced: SimHour[];
  referenceScaleMaxGW: number | undefined;
  resetMixScale: () => void;
  runSimulationNow: () => void;
  theme: ChartTheme;
};

export default function MixSection(props: MixSectionProps) {
  const {
    result,
    resolvedScenario,
    electrifiedPct,
    buildoutYear,
    chartMode,
    setChartMode,
    mixVisibility,
    setMixVisibility,
    isPending: parentPending,
    isOutdated,
    sliderActive,
    liveSimulation,
    deferredChartSource,
    sliced,
    referenceScaleMaxGW,
    resetMixScale,
    runSimulationNow,
    theme,
  } = props;

  const mixPending = useMixChart('mix-chart', sliced, mixVisibility, chartMode, theme, referenceScaleMaxGW);
  const storagePending = useStorageChart('storage-chart', sliced, theme);
  const isPending = parentPending || mixPending || storagePending;
  const blackout = result.summary.hoursWithLoadShedding;
  const kosten = useMemo(() => computeKosten(resolvedScenario, result), [resolvedScenario, result]);
  const kostenHorizon = Math.max(1, Number(buildoutYear) - 2025);
  const kostenGesamt = kosten.total * kostenHorizon;
  const kostenStr = Math.abs(kostenGesamt) >= 1e12
    ? `${(kostenGesamt / 1e12).toLocaleString('de-DE', { maximumFractionDigits: kostenGesamt / 1e12 < 10 ? 1 : 0 })} Bio €`
    : `${fmt0.format(kostenGesamt / 1e9)} Mrd €`;
  // Hero-Werte ampelfarbig nach Ergebnis: grün gut, amber mittel, rot schlecht.
  const good = 'text-emerald-600 dark:text-emerald-400';
  const warn = 'text-amber-600 dark:text-amber-400';
  const bad = 'text-red-600 dark:text-red-400';
  const neutral = 'text-zinc-950 dark:text-white';
  const elecTone = electrifiedPct == null ? neutral : electrifiedPct >= 0.8 ? good : electrifiedPct >= 0.4 ? warn : bad;
  const blackoutTone = blackout === 0 ? good : blackout <= 100 ? warn : bad;

  const s = result.summary;
  const statGroups: Array<{ title: string; stats: Stat[] }> = [
    { title: 'Last', stats: [
      { label: 'Jahreslast', value: twh(s.totalDemandTWh) },
      { label: 'Peak-Last', value: `${fmt0.format(s.peakLoadGW)} GW` },
    ] },
    { title: 'Versorgung', stats: [
      { label: 'Fehlend', value: twh(s.loadSheddingTWh), tone: s.loadSheddingTWh > 0.1 ? 'kritisch' : 'stabil' },
      { label: 'Stunden Fehlend', value: `${fmt0.format(s.hoursWithLoadShedding)} h`, tone: s.hoursWithLoadShedding > 0 ? 'angespannt' : 'stabil' },
    ] },
    { title: 'Handel', stats: [
      { label: 'Import', value: resolvedScenario.import.h2TWh > 0 ? `${fmt.format(s.importTWh)} / ${fmt0.format(resolvedScenario.import.h2TWh)} TWh H₂` : twh(s.importTWh) },
      { label: 'Export', value: twh(s.exportTWh) },
    ] },
    { title: 'Erzeugung', stats: [
      { label: 'EE-Anteil', value: pct(s.renewableSharePct) },
      { label: 'Abregelung', value: twh(s.curtailmentTWh) },
    ] },
    { title: 'Emissionen', stats: [
      { label: 'CO₂-Intensität', value: `${fmt0.format(s.co2GperKWh)} g/kWh` },
      { label: 'CO₂ Jahr', value: `${fmt.format(s.co2MtPerYear)} Mt` },
    ] },
  ];

  return <section id="section-mix" className="flex flex-col gap-4 scroll-mt-14 pt-3">
    <ComingSoonGate id="hero">
      <p className="text-balance text-2xl font-bold leading-snug tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
        <span className={cx('whitespace-nowrap', elecTone)}>{electrifiedPct != null ? `${fmt0.format(electrifiedPct * 100)} %` : 'X %'}</span> elektrifiziert, <span className={cx('whitespace-nowrap', blackoutTone)}>{fmt0.format(blackout)} h ohne Strom</span> — für <span className="whitespace-nowrap text-zinc-950 dark:text-white">{kostenStr}</span> bis {buildoutYear}.
      </p>
    </ComingSoonGate>
    <ChartPanel className="flex flex-col sm:h-[calc(100vh-3.5rem)]">
      <div className="relative aspect-square min-h-0 w-full bg-white dark:bg-zinc-950 sm:aspect-auto sm:flex-1">
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 sm:right-3 sm:top-3">
          <div className="pointer-events-auto">
            <button
              type="button"
              aria-label="Skala zurücksetzen"
              title="Skala auf aktuelles Szenario zurücksetzen"
              className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20"
              onClick={resetMixScale}
              disabled={!deferredChartSource}
            >
              <RotateCcw className="h-4 w-4"/>
            </button>
          </div>
          <div className="pointer-events-auto">
            <ChartModeToggle mode={chartMode} onChange={setChartMode}/>
          </div>
        </div>
        <div
          id="mix-chart"
          className={cx(
            'h-full w-full transition-opacity duration-150',
            isPending || isOutdated ? 'opacity-40' : 'opacity-100',
          )}
        />
        <div
          aria-hidden={!isPending}
          className={cx(
            'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-zinc-100/60 transition-opacity duration-150 dark:bg-zinc-800/60',
            isPending ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-950 to-transparent dark:via-zinc-50"/>
        </div>
        <div
          aria-hidden={!isOutdated || isPending}
          className={cx(
            'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-zinc-100/60 transition-opacity duration-150 dark:bg-zinc-800/60',
            isOutdated && !isPending ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="h-full w-full bg-zinc-950/30 dark:bg-zinc-50/30"/>
        </div>
        <div
          aria-hidden={!isPending}
          className={cx(
            'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150',
            isPending ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white dark:bg-zinc-50/90 dark:text-zinc-950">
            Aktualisiere …
          </div>
        </div>
        <div
          aria-hidden={!isOutdated || isPending}
          className={cx(
            'absolute inset-0 flex items-center justify-center transition-opacity duration-150',
            isOutdated && !isPending ? 'opacity-100' : 'pointer-events-none opacity-0',
            liveSimulation && 'pointer-events-none',
          )}
        >
          {liveSimulation
            ? <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white dark:bg-zinc-50/90 dark:text-zinc-950">
                {sliderActive ? 'Eingabe läuft …' : 'Warte auf Berechnung …'}
              </div>
            : <button
                type="button"
                className="rounded-full bg-zinc-950/90 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-zinc-50/25"
                onClick={runSimulationNow}
              >
                Berechnen
              </button>}
        </div>
      </div>
      <MixLegend
        visibility={mixVisibility}
        onToggleLeaf={(key, checked) => setMixVisibility(prev => ({ ...prev, [key]: checked }))}
        onToggleGroup={(groupId, checked) => setMixVisibility(prev => {
          const group = MIX_GROUPS.find(g => g.id === groupId);
          if (!group) return prev;
          const next = { ...prev };
          for (const leaf of group.leaves) next[leaf.key] = checked;
          return next;
        })}
      />
    </ChartPanel>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {statGroups.map(group => <StatCard key={group.title} title={group.title} stats={group.stats}/>)}
    </div>

    <ChartPanel title="Speicherfüllstand" meta="Batterie / H₂" className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div id="storage-chart" className="h-[240px] w-full px-3 pb-3 pt-1"/>
    </ChartPanel>
  </section>;
}
