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
  type LoadView,
  type MixLeafKey,
  type MixVisibility,
} from '../chartOptions';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult, SimHour } from '../../types/simulation';
import { fmt, fmt0, pct, twh } from '../format';
import { cx } from '../ui';
import { ChartDropdown, ChartModeToggle, ChartPanel, HelpDot, HelpPanel, statToneClass, type Stat } from '../sectionUi';
import { computeKosten } from '../kosten';

// Inhalt der Hauptblume: nur Energiemix, Mix mit Speicher-Füllstand-Overlay
// (Standard) oder nur der Speicher-Füllstand.
export type MixContent = 'mix' | 'kombi' | 'speicher';

function useMixChart(containerId: string, hours: SimHour[] | undefined, visibility: MixVisibility, mode: ChartMode, theme: ChartTheme, content: MixContent, scaleMaxGW: number | undefined, loadView: LoadView): boolean {
  const data = useMemo(() => hours && hours.length ? { hours, visibility, mode, theme, scaleMaxGW, content, loadView } : null, [hours, visibility, mode, theme, scaleMaxGW, content, loadView]);
  return useMainThreadChart(containerId, data, (d, viewport) => d.content === 'speicher'
    ? buildStorageChartOption(d.hours, d.theme, d.mode, viewport)
    : buildMixChartOption(d.hours, d.visibility, d.mode, viewport, d.scaleMaxGW, d.theme, d.content === 'kombi', d.loadView), mode === 'sunburst');
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
            <span className="text-[10px] font-semibold uppercase tracking-wide">{group.label}</span>
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
  periodYears: string;
  chartMode: ChartMode;
  setChartMode: (mode: ChartMode) => void;
  mixContent: MixContent;
  setMixContent: (content: MixContent) => void;
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
    periodYears,
    chartMode,
    setChartMode,
    mixContent,
    setMixContent,
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

  // Last-Sicht: verbrauchsorientiert (wann gebraucht) vs. erzeugungsorientiert
  // (wann der Strom gezogen wird). Default verbrauchsorientiert.
  const [loadView, setLoadView] = useState<LoadView>('verbrauch');
  const mixPending = useMixChart('mix-chart', sliced, mixVisibility, chartMode, theme, mixContent, referenceScaleMaxGW, loadView);
  const isPending = parentPending || mixPending;
  const blackout = result.summary.hoursWithLoadShedding;
  // Nur der ANTEIL der elektrifizierten Last, der auch versorgt wird: bei
  // Unterdeckung (Lastabwurf) liegt die effektiv gedeckte Elektrifizierung unter
  // dem Ziel — »100 % elektrifiziert« bei 8.760 h ohne Strom wäre irreführend.
  // Ohne Lastabwurf = Elektrifizierungs-Ziel (unverändert).
  const servedFraction = result.summary.totalDemandTWh > 0
    ? Math.max(0, 1 - result.summary.loadSheddingTWh / result.summary.totalDemandTWh)
    : 1;
  const electrifiedDelivered = electrifiedPct == null ? null : electrifiedPct * servedFraction;
  // Methodik-Text hinter dem Fragezeichen am Chart (wie in den anderen Sektionen).
  const [helpOpen, setHelpOpen] = useState(false);
  // Kennzahlen-Kacheln hinter einem Sub-Satz verstecken (Disclosure wie überall).
  const [kpisOpen, setKpisOpen] = useState(false);
  const kosten = useMemo(() => computeKosten(resolvedScenario, result), [resolvedScenario, result]);
  const kostenHorizon = Math.max(1, Number(periodYears));
  const kostenGesamt = kosten.total * kostenHorizon;
  const kostenStr = Math.abs(kostenGesamt) >= 1e12
    ? `${(kostenGesamt / 1e12).toLocaleString('de-DE', { maximumFractionDigits: kostenGesamt / 1e12 < 10 ? 1 : 0 })} Bio €`
    : `${fmt0.format(kostenGesamt / 1e9)} Mrd €`;
  // Hero-Werte ampelfarbig nach Ergebnis: grün gut, amber mittel, rot schlecht.
  const good = 'text-emerald-600 dark:text-emerald-400';
  const warn = 'text-amber-600 dark:text-amber-400';
  const bad = 'text-red-600 dark:text-red-400';
  const neutral = 'text-zinc-950 dark:text-white';
  const elecTone = electrifiedDelivered == null ? neutral : electrifiedDelivered >= 0.8 ? good : electrifiedDelivered >= 0.4 ? warn : bad;
  const blackoutTone = blackout === 0 ? good : blackout <= 100 ? warn : bad;

  const s = result.summary;
  const statGroups: Array<{ title: string; stats: Stat[] }> = [
    { title: 'Last', stats: [
      { label: 'Stromlast', value: twh(s.totalDemandTWh) },
      { label: 'Peak-Last', value: `${fmt0.format(s.peakLoadGW)} GW` },
      // Sektoren, die der H₂-Pool strom-äquivalent deckt (Stahl/Chemie/Schiff/
      // Flug): zählen zur Last-Karte der Sidebar, nicht zur Stromlast.
      ...((s.h2PoolStromReductionTWh ?? 0) > 0.05 ? [{ label: 'via H₂-Pool', value: `+${twh(s.h2PoolStromReductionTWh ?? 0)}` }] : []),
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
    // Überwiegend Lebenszyklus-Faktoren (PV/Wind/Wasser/Kernkraft nach UNECE/
    // IPCC — deshalb nicht 0); Kohle/Biomasse ohne volle Vorkette.
    { title: 'Emissionen · Lebenszyklus', stats: [
      { label: 'CO₂-Intensität', value: `${fmt0.format(s.co2GperKWh)} g/kWh` },
      { label: 'CO₂ Jahr', value: `${fmt.format(s.co2MtPerYear)} Mt` },
    ] },
  ];

  return <section id="section-mix" className="flex flex-col gap-3 scroll-mt-14 pt-8">
      <p className="mx-auto max-w-4xl text-balance text-center text-2xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
        <span className={cx('whitespace-nowrap', elecTone)}>{electrifiedDelivered != null ? `${fmt0.format(electrifiedDelivered * 100)} %` : 'X %'}</span> elektrifiziert, <span className={cx('whitespace-nowrap', blackoutTone)}>{fmt0.format(blackout)} h ohne Strom</span> — für <span className="whitespace-nowrap text-zinc-950 dark:text-white">{kostenStr}</span> über {periodYears} Jahre.
      </p>
      <button
        type="button"
        aria-expanded={kpisOpen}
        onClick={() => setKpisOpen(open => !open)}
        className="group/kpi mx-auto mt-3 flex max-w-4xl items-baseline justify-center gap-1.5 text-balance text-center text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <span>
          Mit <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{twh(s.totalDemandTWh + (s.h2PoolStromReductionTWh ?? 0))}</strong> Jahreslast,{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{pct(s.renewableSharePct)}</strong> EE-Anteil,{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{fmt0.format(s.co2GperKWh)} g/kWh</strong> CO₂ und{' '}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-200">{twh(s.importTWh)}</strong> Stromimport.
        </span>
        <ChevronRight aria-hidden className={cx('h-4 w-4 shrink-0 self-center text-zinc-400 transition-transform dark:text-zinc-500', kpisOpen && 'rotate-90')}/>
      </button>
      {kpisOpen && <div className="mx-auto mt-4 grid w-full max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {statGroups.map(group => <div
          key={group.title}
          className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <dl className="space-y-1.5">
            {group.stats.map(stat => <div key={stat.label} className="flex items-baseline justify-between gap-2">
              <dt className="truncate text-xs text-zinc-600 dark:text-zinc-300" title={stat.label}>{stat.label}</dt>
              <dd className={cx('whitespace-nowrap text-base font-semibold tabular-nums', statToneClass(stat.tone))}>{stat.value}</dd>
            </div>)}
          </dl>
        </div>)}
      </div>}
    <div className="mb-2 mt-5 border-t border-zinc-200 dark:border-zinc-800"/>
    <ChartPanel className="flex flex-col sm:h-[calc(100vh-3.5rem)]">
      <div className="relative aspect-square min-h-0 w-full bg-white dark:bg-zinc-950 sm:aspect-auto sm:flex-1">
        <div className="pointer-events-auto absolute left-2 top-2 z-10 flex items-center gap-1.5 sm:left-3 sm:top-3">
          <HelpDot open={helpOpen} onToggle={() => setHelpOpen(open => !open)} label="Wie liest man den Energiemix?"/>
        </div>
        {/* Aufklapp-Hilfe als Overlay unter dem Fragezeichen — verschiebt das Layout nicht. */}
        {helpOpen && <div className="absolute left-2 top-12 z-20 max-h-[calc(100%-3.5rem)] w-[min(38rem,calc(100%-1rem))] overflow-auto rounded-lg shadow-lg sm:left-3">
          <HelpPanel>
          <p>Die Blume zeigt die <strong>Stundensimulation eines Jahres</strong>: Der Winkel ist der Jahresverlauf (Januar oben, im Uhrzeigersinn), der Radius die Leistung in GW. Über „Polar / Linie" rechts oben gibt es dieselben Daten als klassische Zeitachse.</p>
          <ul>
          <li><strong>Flächen</strong> — Erzeugung je Technologie, gestapelt in Einsatzreihenfolge. Die <strong>schwarze Linie „Last"</strong> hat zwei Sichten (Umschalter unter dem Chart): <em>Verbrauch</em> = wann Energie gebraucht wird (Direktlast + Industrie-H₂; kann im Winter über dem Stapel liegen, weil der Strom dafür im Sommer als H₂ erzeugt und gespeichert wurde) und <em>Erzeugung</em> = wann der Strom tatsächlich erzeugt/gezogen wird (Direktlast + Elektrolyse + Speicher-Laden; liegt immer im Erzeugungs-Stapel). Die Differenz der beiden Sichten ist die zeitliche Verschiebung durch Speicher.</li>
          <li><strong>Dispatch je Stunde</strong> — Erneuerbare speisen vorrangig ein; die Residuallast decken zuerst Speicher, dann regelbare Kraftwerke, zuletzt Import (rot). Bleibt eine Lücke, erscheint sie dunkelrot als „Fehlend". Überschüsse laden erst die Speicher, dann Export, der Rest wird abgeregelt.</li>
          <li><strong>Mix + Speicher / Speicher</strong> — Füllstände von Batterie und H₂-Speicher: kombiniert als gestrichelte Linien (0–100 % des jeweiligen Speichermaximums), solo in absoluten GWh.</li>
          <li><strong>Legende</strong> — Serien einzeln zuschaltbar; der Kreis-Pfeil setzt die eingefrorene Radius-Skala auf das aktuelle Szenario zurück.</li>
          </ul>
          <p>Die <strong>Stromlast</strong> kann unter der Last-Summe der Sidebar liegen: Sektoren wie Stahl, Chemie, Schiff und Flug deckt das System über den H₂-Pool (Elektrolyse bzw. Import) — sie zählen zur Sektor-Nachfrage, tauchen aber nicht als Stromlast auf („via H₂-Pool" in der Last-Kachel). Dispatch-Regeln, Wirkungsgrade und Quellen im Datenhandbuch (Kernmodell).</p>
          <p><strong>Rückverstromung — keine Doppelzählung:</strong> H₂, das später wieder zu Strom wird, erscheint als Wasserstoff-<em>Einspeisung</em> (Erzeugungsseite, meist Winter). Der Strom, der dieses H₂ erzeugt hat, lief vorher als Elektrolyse-<em>Last</em> („Last + H₂", meist Sommer). Das sind zwei reale, zeitlich getrennte Flüsse auf verschiedenen Seiten der Bilanz — nicht dasselbe doppelt. Der Roundtrip-Verlust (nur ~⅓ kommt als Strom zurück) bedeutet: es geht mehr Strom in den Speicher als wieder heraus. Wer die Jahres-<em>Erzeugung</em> aufsummiert, zählt die Rückverstromung mit, obwohl sie aus früherem Strom stammt — das ist der normale Speicher-Effekt, kein Fehler.</p>
          </HelpPanel>
        </div>}
        <div className="pointer-events-none absolute bottom-2 right-2 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center justify-end gap-1.5 sm:bottom-auto sm:right-3 sm:top-3">
          <div className="pointer-events-auto">
            <ChartDropdown
              value={mixContent}
              options={[
                { id: 'mix', label: 'Mix', description: 'Erzeugung je Technologie + Last-Linie' },
                { id: 'kombi', label: 'Mix + Speicher', description: 'Erzeugung plus Speicher-Füllstände' },
                { id: 'speicher', label: 'Speicher', description: 'nur Speicher-Füllstände (GWh)' },
              ] as const}
              onChange={setMixContent}
              ariaLabel="Mix oder Speicher anzeigen"
            />
          </div>
          {mixContent !== 'speicher' && <div className="pointer-events-auto">
            <ChartDropdown
              value={loadView}
              options={[
                { id: 'verbrauch', label: 'Verbrauch', description: 'Wann Energie gebraucht wird (Last + Industrie-H₂). Im Winter höher.' },
                { id: 'erzeugung', label: 'Erzeugung', description: 'Wann der Strom erzeugt/gezogen wird (Last + Elektrolyse + Speicher-Laden).' },
              ] as const}
              onChange={setLoadView}
              ariaLabel="Last: wann gebraucht oder wann der Strom gezogen wird"
            />
          </div>}
          <div className="pointer-events-auto">
            <button
              type="button"
              aria-label="Skala zurücksetzen"
              title="Skala auf aktuelles Szenario zurücksetzen"
              className="inline-flex h-[31px] w-[31px] items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20"
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
      {mixContent === 'speicher' && <div className="flex items-center justify-center gap-4 bg-white px-2 pb-3 pt-3 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300 sm:pt-4">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: '#10b981' }}/>Batterie</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: '#0891b2' }}/>Wasserstoff</span>
        <span className="text-zinc-400 dark:text-zinc-500">Füllstand in GWh</span>
      </div>}
      {mixContent !== 'speicher' && <MixLegend
        visibility={mixVisibility}
        onToggleLeaf={(key, checked) => setMixVisibility(prev => ({ ...prev, [key]: checked }))}
        onToggleGroup={(groupId, checked) => setMixVisibility(prev => {
          const group = MIX_GROUPS.find(g => g.id === groupId);
          if (!group) return prev;
          const next = { ...prev };
          for (const leaf of group.leaves) next[leaf.key] = checked;
          return next;
        })}
      />}
    </ChartPanel>

  </section>;
}
