import type { ReactNode } from 'react';
import type { ChartMode } from './chartOptions';
import { cx, muted, panelHeader } from './ui';

export type MainViewId = 'mix' | 'flaeche' | 'ressourcen' | 'kosten';

export const MAIN_VIEW_LABELS: Record<MainViewId, string> = {
  mix: 'Energiemix',
  flaeche: 'Fläche',
  ressourcen: 'Ressourcen',
  kosten: 'Kosten',
};

export const MAIN_VIEW_IMPLEMENTED: Record<MainViewId, boolean> = {
  mix: true,
  flaeche: true,
  ressourcen: true,
  kosten: true,
};

export function SectionHeading({ id, placeholder }: { id: MainViewId; placeholder?: boolean }) {
  return <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
    {MAIN_VIEW_LABELS[id]}
    {placeholder && <span className="ml-2 align-middle text-sm font-normal text-zinc-400 dark:text-zinc-500">(Platzhalter)</span>}
  </h2>;
}

export function ComingSoonPanel() {
  return <div className="grid min-h-[40vh] place-items-center rounded-lg border border-dashed border-zinc-200 bg-white text-center dark:border-zinc-700 dark:bg-zinc-900">
    <p className="px-6 py-12 text-sm text-zinc-500 dark:text-zinc-400">Coming soon.</p>
  </div>;
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

export type Stat = { label: string; value: string; tone?: 'kritisch' | 'angespannt' | 'stabil' };

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
        <dd className={cx('shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums', statToneClass(stat.tone))}>{stat.value}</dd>
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

export function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  const modes: Array<[ChartMode, string]> = [['sunburst', 'Polar'], ['linie', 'Linie']];
  return <div className="inline-flex shrink-0 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-800" aria-label="Diagrammform wählen">
    {modes.map(([value, label]) => <button
      key={value}
      type="button"
      aria-pressed={mode === value}
      className={cx('rounded-[5px] px-2.5 py-1 transition', mode === value ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950' : 'text-zinc-500 hover:bg-white hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50')}
      onClick={() => onChange(value)}
    >{label}</button>)}
  </div>;
}
