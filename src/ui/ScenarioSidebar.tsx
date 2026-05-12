import { Info } from 'lucide-react';
import { dataWikiUrl, datasetIds } from './dataCatalog';
import { twh } from './format';
import { cx, field, sectionBox } from './ui';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';

export type PeriodPreset = '21d' | '90d' | 'year' | 'custom';

export function ScenarioSidebar({
  data,
  scenario,
  selectedPeriod,
  periodPreset,
  customStart,
  customEnd,
  onPreset,
  onStart,
  onEnd,
  onFaqOpen,
  onTest100TWhChange,
}: {
  data: DataSet | null;
  scenario: Scenario;
  selectedPeriod: { start: string; end: string };
  periodPreset: PeriodPreset;
  customStart: string;
  customEnd: string;
  onPreset: (preset: PeriodPreset) => void;
  onStart: (date: string) => void;
  onEnd: (date: string) => void;
  onFaqOpen: () => void;
  onTest100TWhChange: (checked: boolean) => void;
}) {
  return <aside className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,.05)] lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
    <div className="border-b border-zinc-200/80 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.04em] text-zinc-950">Netzprobe</h1>
        <button
          type="button"
          aria-label="Daten-FAQ öffnen"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-950"
          onClick={onFaqOpen}
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
        onPreset={onPreset}
        onStart={onStart}
        onEnd={onEnd}
      />

      <ScenarioChoiceSection
        title="Last"
        label="Historisch 2025"
        meta={`Energy-Charts${data?.loadSumTWh ? ` · ${twh(data.loadSumTWh)}` : ''}`}
        docId={datasetIds.loadHistorical2025}
      >
        <ScenarioCheckItem
          label="100 TWh Test"
          meta="+100 TWh gleichmäßig übers Jahr"
          checked={scenario.demand.test100TWh}
          onChecked={onTest100TWhChange}
        />
      </ScenarioChoiceSection>

      <ScenarioChoiceSection
        title="Erzeugung"
        label="Historisch 2025"
        meta={`Energy-Charts · ${generationMeta(data)}`}
        docId={datasetIds.generationHistorical2025}
      />

      <ScenarioChoiceSection
        title="Modellannahmen"
        label="Einspeisefaktoren 2025"
        meta="PV/Wind aus beobachteter Einspeisung abgeleitet"
        docId={datasetIds.feedInFactors2025}
      />
    </div>
  </aside>;
}

function ScenarioChoiceSection({ title, label, meta, docId, children }: { title: string; label: string; meta: string; docId: string; children?: React.ReactNode }) {
  return <section className={cx(sectionBox, 'p-3')}>
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</span>
    </div>
    <div className="mt-3 grid gap-2 border-t border-zinc-100 pt-3">
      <ScenarioRadioItem label={label} meta={meta} docId={docId}/>
      {children}
    </div>
  </section>;
}

function ScenarioRadioItem({ label, meta, docId }: { label: string; meta: string; docId: string }) {
  return <label className="flex items-start gap-2 text-sm text-zinc-950">
    <input className="mt-0.5 accent-zinc-700" type="radio" checked readOnly />
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        <DataInfoLink id={docId} label={`${label} erklären`}/>
      </span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </label>;
}

function ScenarioCheckItem({ label, meta, checked, onChecked }: { label: string; meta: string; checked: boolean; onChecked: (checked: boolean) => void }) {
  return <label className="flex items-start gap-2 text-sm text-zinc-950">
    <input className="mt-0.5 accent-zinc-700" type="checkbox" checked={checked} onChange={event => onChecked(event.target.checked)} />
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="truncate">{label}</span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </label>;
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

function generationMeta(data: DataSet | null) {
  const generation = data?.generationSumTWh ? twh(data.generationSumTWh) : '—';
  const imported = data?.importSumTWh ? twh(data.importSumTWh) : '—';
  return `${generation} Erzeugung · ${imported} Import`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
