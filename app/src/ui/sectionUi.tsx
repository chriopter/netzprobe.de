import { type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';
import type { ChartMode } from './chartOptions';
import { cx, muted, panelHeader } from './ui';

export type MainViewId = 'mix' | 'flaeche' | 'ressourcen' | 'kosten';

export const MAIN_VIEW_LABELS: Record<MainViewId, string> = {
  mix: 'Energiemix',
  flaeche: 'Fläche',
  ressourcen: 'Ressourcen',
  kosten: 'Kosten',
};

// Geteilte Sektions-Kopfzeilen-Bausteine: Fragezeichen-Hilfe neben dem Titel
// und die Grafisch/Details-Pille (Stil wie die Sim/Wiki-MainTabs).
export type SectionView = 'grafisch' | 'details';

export function ViewPill({ view, onChange }: { view: SectionView; onChange: (view: SectionView) => void }) {
  const tabs = [
    { id: 'grafisch', label: 'Grafisch' },
    { id: 'details', label: 'Details' },
  ] as const;
  const activeIndex = tabs.findIndex(tab => tab.id === view);
  return <div className="relative grid grid-cols-2 overflow-hidden rounded-full border border-zinc-200 bg-white p-0.5 text-[13px] font-medium leading-none dark:border-zinc-700 dark:bg-zinc-900" role="tablist" aria-label="Darstellung wählen">
    <span
      aria-hidden="true"
      className="absolute bottom-0.5 left-0.5 top-0.5 w-[calc((100%_-_4px)/2)] rounded-full bg-zinc-950 transition-transform duration-200 ease-out dark:bg-zinc-50"
      style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
    />
    {tabs.map(tab => <button
      key={tab.id}
      type="button"
      role="tab"
      aria-selected={view === tab.id}
      onClick={() => onChange(tab.id)}
      className={cx(
        'relative z-10 rounded-full px-3 py-1.5 text-center transition-colors duration-200',
        view === tab.id ? 'text-white dark:text-zinc-950' : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50',
      )}
    >{tab.label}</button>)}
  </div>;
}

export function HelpDot({ open, onToggle, label }: { open: boolean; onToggle: () => void; label: string }) {
  return <button
    type="button"
    aria-label={label}
    aria-expanded={open}
    title={label}
    onClick={onToggle}
    className={cx('mt-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:focus-visible:ring-zinc-50/20', open ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400')}
  >
    <HelpCircle className="h-4 w-4"/>
  </button>;
}

// Hilfe-Panel unter der Kopfzeile (Inhalt des Fragezeichens). Div statt p,
// damit der Inhalt strukturiert sein darf (Absätze, Aufzählungen).
export function HelpPanel({ children }: { children: ReactNode }) {
  return <div className={cx(muted, 'rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-5 dark:border-zinc-800 dark:bg-zinc-900 [&_p+p]:mt-2 [&_ul]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4 [&_ul+p]:mt-2')}>{children}</div>;
}

export function SectionHeading({ id, placeholder }: { id: MainViewId; placeholder?: boolean }) {
  return <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
    {MAIN_VIEW_LABELS[id]}
    {placeholder && <span className="ml-2 align-middle text-sm font-normal text-zinc-400 dark:text-zinc-500">(Platzhalter)</span>}
  </h2>;
}

export function ChartPanel({ title, meta, className, children }: { title?: string; meta?: string; className?: string; children: ReactNode }) {
  return <section className={cx('min-w-0 overflow-hidden bg-white dark:bg-zinc-950', className)}>
    {title && <div className={cx(panelHeader, 'flex items-center justify-between gap-3 px-3 py-3')}>
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      {meta && <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>}
    </div>}
    {children}
  </section>;
}

export function InlineKpi({ label, value, tone, primary }: { label: string; value: string; tone?: string; primary?: boolean }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'angespannt' ? 'text-amber-600 dark:text-amber-400' : tone === 'kritisch' ? 'text-red-700 dark:text-red-400' : 'text-zinc-950 dark:text-zinc-50';
  const isAlarm = tone === 'kritisch';
  const valueSize = primary ? 'text-base' : 'text-sm';
  const containerClass = isAlarm
    ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-red-300 px-2 py-1 leading-tight dark:border-red-700 sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
    : primary
      ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-300 bg-white px-2 py-1 leading-tight dark:border-zinc-600 dark:bg-zinc-900 sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
      : 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-200 bg-white px-2 py-1 leading-tight dark:border-zinc-700 dark:bg-zinc-900 sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5';
  const alarmStyle = isAlarm
    ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(220,38,38,0.10) 0 6px, rgba(220,38,38,0.20) 6px 12px)' }
    : undefined;
  return <div className={containerClass} style={alarmStyle}>
    <span className={cx('truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em]', isAlarm ? 'text-red-700 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400')} title={label}>{label}</span>
    <span className={cx('whitespace-nowrap font-semibold tabular-nums', valueSize, toneClass)}>{value}</span>
  </div>;
}

export type Stat = { label: string; value: string; sub?: string; tone?: 'kritisch' | 'angespannt' | 'stabil' };

export function statToneClass(tone?: Stat['tone']) {
  return tone === 'kritisch' ? 'text-red-700 dark:text-red-400'
    : tone === 'angespannt' ? 'text-amber-600 dark:text-amber-400'
      : tone === 'stabil' ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-zinc-950 dark:text-zinc-50';
}

// Kategorie-Karte: Titel + Label-Wert-Zeilen. Einheitliches Stat-Layout über alle Sektionen.
export function StatCard({ title, stats }: { title: string; stats: Stat[] }) {
  return <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-zinc-400 dark:text-zinc-500">{title}</div>
    <dl className="flex flex-col gap-1.5">
      {stats.map(stat => <div key={stat.label} className="flex items-baseline justify-between gap-2">
        <dt className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={stat.label}>{stat.label}</dt>
        <dd className="shrink-0 text-right">
          <div className={cx('whitespace-nowrap text-sm font-semibold tabular-nums', statToneClass(stat.tone))}>{stat.value}</div>
          {stat.sub && <div className="whitespace-nowrap text-[10px] font-normal tabular-nums text-zinc-400 dark:text-zinc-500">{stat.sub}</div>}
        </dd>
      </div>)}
    </dl>
  </div>;
}

// Milchglas-Overlay über unfertige Platzhalter-Inhalte: backdrop-blur frostet das
// darunterliegende Mockup, ein Badge signalisiert „In Arbeit". Blockt Interaktion.
export function PlaceholderGlass({ children }: { children: ReactNode }) {
  return <div className="relative flex flex-col gap-3">
    {children}
    <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-white/30 backdrop-blur-[3px] dark:bg-zinc-950/30">
      <span className="rounded-full border border-zinc-200 bg-white/85 px-4 py-1.5 text-sm font-medium text-zinc-500 shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-300">In Arbeit</span>
    </div>
  </div>;
}

export function SegmentPill<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: ReadonlyArray<{ id: T; label: string }>; onChange: (value: T) => void; ariaLabel: string }) {
  const activeIndex = Math.max(0, options.findIndex(option => option.id === value));
  return <div
    className="relative grid overflow-hidden rounded-full border border-zinc-200 bg-white p-0.5 text-[12px] font-medium leading-none sm:text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
    style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    role="tablist"
    aria-label={ariaLabel}
  >
    <span
      aria-hidden="true"
      className="absolute bottom-0.5 left-0.5 top-0.5 rounded-full bg-zinc-950 transition-transform duration-200 ease-out dark:bg-zinc-50"
      style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${activeIndex * 100}%)` }}
    />
    {options.map(option => <button
      key={option.id}
      type="button"
      role="tab"
      aria-selected={value === option.id}
      onClick={() => onChange(option.id)}
      className={cx(
        'relative z-10 whitespace-nowrap rounded-full px-2 py-1.5 text-center transition-colors duration-200 sm:px-3',
        value === option.id ? 'text-white dark:text-zinc-950' : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50',
      )}
    >{option.label}</button>)}
  </div>;
}

export function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  return <SegmentPill
    value={mode}
    options={[{ id: 'sunburst', label: 'Polar' }, { id: 'linie', label: 'Linie' }] as const}
    onChange={onChange}
    ariaLabel="Diagrammform wählen"
  />;
}
