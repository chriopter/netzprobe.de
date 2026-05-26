import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useMainThreadChart } from '../chartHooks';
import {
  buildMixChartOption,
  buildStorageChartOption,
  EXTRA_LEAVES,
  MIX_GROUPS,
  type ChartMode,
  type MixLeafKey,
  type MixVisibility,
} from '../chartOptions';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult, SimHour } from '../../types/simulation';
import { fmt, fmt0, pct, twh } from '../format';
import { cx } from '../ui';
import { ChartModeToggle, ChartPanel, InlineKpi, SectionHeading } from '../sectionUi';

function useMixChart(containerId: string, hours: SimHour[] | undefined, visibility: MixVisibility, mode: ChartMode, scaleMaxGW?: number): boolean {
  const data = useMemo(() => hours && hours.length ? { hours, visibility, mode, scaleMaxGW } : null, [hours, visibility, mode, scaleMaxGW]);
  return useMainThreadChart(containerId, data, (d, viewport) => buildMixChartOption(d.hours, d.visibility, d.mode, viewport, d.scaleMaxGW), mode === 'sunburst');
}

function useStorageChart(containerId: string, hours: SimHour[] | undefined): boolean {
  const data = useMemo(() => hours && hours.length ? { hours } : null, [hours]);
  return useMainThreadChart(containerId, data, d => buildStorageChartOption(d.hours));
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
        active ? 'border-zinc-300 bg-white text-zinc-800' : 'border-zinc-100 bg-white text-zinc-400 hover:text-zinc-700',
      )}
      onClick={() => onToggleLeaf(key, !active)}
    >
      <span aria-hidden className="text-[10px]" style={{ color: active ? color : '#d4d4d8' }}>{glyph}</span>
      <span>{label}</span>
    </button>;
  };
  const activeGroup = openGroup ? MIX_GROUPS.find(g => g.id === openGroup) : null;
  return <div className="grid gap-1.5 bg-white px-2 pb-3 pt-6 text-xs sm:px-3 sm:pb-3.5 sm:pt-8">
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
          someActive ? 'border-zinc-300 bg-white text-zinc-800' : 'border-zinc-100 bg-white text-zinc-400',
        )}>
          <button
            type="button"
            aria-pressed={someActive}
            title={allActive ? 'Alle abwählen' : 'Alle aktivieren'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 transition hover:bg-zinc-50"
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
            className="inline-flex items-center border-l border-zinc-200 px-1.5 transition hover:bg-zinc-50"
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
};

export default function MixSection(props: MixSectionProps) {
  const {
    result,
    resolvedScenario,
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
  } = props;

  const mixPending = useMixChart('mix-chart', sliced, mixVisibility, chartMode, referenceScaleMaxGW);
  const storagePending = useStorageChart('storage-chart', sliced);
  const isPending = parentPending || mixPending || storagePending;

  return <section id="section-mix" className="flex flex-col gap-3 scroll-mt-14">
    <SectionHeading id="mix"/>
    <ChartPanel className="flex flex-col sm:h-[calc(100vh-3.5rem)]">
      <div className="shrink-0 border-b border-zinc-200/70 px-2 py-2 sm:px-3 sm:py-3">
        <div className="flex min-w-0 gap-1.5 overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-visible">
          <InlineKpi label="EE-Anteil" value={pct(result.summary.renewableSharePct)} primary/>
          <InlineKpi label="Jahreslast" value={twh(result.summary.totalDemandTWh)}/>
          <InlineKpi label="Import" value={resolvedScenario.import.h2TWh > 0 ? `${fmt.format(result.summary.importTWh)} / ${fmt0.format(resolvedScenario.import.h2TWh)} TWh H₂` : twh(result.summary.importTWh)}/>
          <InlineKpi label="Fehlend" value={twh(result.summary.loadSheddingTWh)} tone={result.summary.loadSheddingTWh > 0.1 ? 'kritisch' : 'stabil'} primary/>
          <InlineKpi label="Abregelung" value={twh(result.summary.curtailmentTWh)}/>
          <InlineKpi label="CO₂-Intensität" value={`${fmt0.format(result.summary.co2GperKWh)} g/kWh`} primary/>
          <InlineKpi label="CO₂ Jahr" value={`${fmt.format(result.summary.co2MtPerYear)} Mt`}/>
          <InlineKpi label="Export" value={twh(result.summary.exportTWh)}/>
          <InlineKpi label="Peak-Last" value={`${fmt0.format(result.summary.peakLoadGW)} GW`}/>
          <InlineKpi label="Stunden Fehlend" value={`${fmt0.format(result.summary.hoursWithLoadShedding)} h`} tone={result.summary.hoursWithLoadShedding > 0 ? 'angespannt' : 'stabil'}/>
        </div>
      </div>
      <div className="relative aspect-square min-h-0 w-full bg-white sm:aspect-auto sm:flex-1">
        <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 sm:right-3 sm:top-3">
          <div className="pointer-events-auto">
            <button
              type="button"
              aria-label="Skala zurücksetzen"
              title="Skala auf aktuelles Szenario zurücksetzen"
              className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
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
            'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-zinc-100/60 transition-opacity duration-150',
            isPending ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="h-full w-1/3 animate-[indeterminate_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-zinc-950 to-transparent"/>
        </div>
        <div
          aria-hidden={!isOutdated || isPending}
          className={cx(
            'pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden bg-zinc-100/60 transition-opacity duration-150',
            isOutdated && !isPending ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="h-full w-full bg-zinc-950/30"/>
        </div>
        <div
          aria-hidden={!isPending}
          className={cx(
            'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150',
            isPending ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white">
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
            ? <div className="rounded-full bg-zinc-950/85 px-3 py-1 text-[11px] font-medium text-white">
                {sliderActive ? 'Eingabe läuft …' : 'Warte auf Berechnung …'}
              </div>
            : <button
                type="button"
                className="rounded-full bg-zinc-950/90 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25"
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

    <ChartPanel title="Speicherfüllstand" meta="Batterie/H₂">
      <div id="storage-chart" className="h-[240px] w-full px-3 py-3"/>
    </ChartPanel>
  </section>;
}
