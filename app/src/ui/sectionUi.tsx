import type { ReactNode } from 'react';
import type { ChartMode } from './chartOptions';
import { cx, muted, panelHeader } from './ui';

export type MainViewId = 'mix' | 'flaeche' | 'ressourcen' | 'netz' | 'kosten';

export const MAIN_VIEW_LABELS: Record<MainViewId, string> = {
  mix: 'Energiemix',
  flaeche: 'Fläche',
  ressourcen: 'Ressourcen',
  netz: 'Netz',
  kosten: 'Kosten',
};

export const MAIN_VIEW_IMPLEMENTED: Record<MainViewId, boolean> = {
  mix: true,
  flaeche: true,
  ressourcen: false,
  netz: false,
  kosten: false,
};

export function SectionHeading({ id }: { id: MainViewId }) {
  return <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{MAIN_VIEW_LABELS[id]}</h2>;
}

export function ComingSoonPanel() {
  return <div className="grid min-h-[40vh] place-items-center rounded-lg border border-dashed border-zinc-200 bg-white text-center">
    <p className="px-6 py-12 text-sm text-zinc-500">Coming soon.</p>
  </div>;
}

export function ChartPanel({ title, meta, className, children }: { title?: string; meta?: string; className?: string; children: ReactNode }) {
  return <section className={cx('min-w-0 overflow-hidden bg-white', className)}>
    {title && <div className={cx(panelHeader, 'flex items-center justify-between gap-3 px-3 py-3')}>
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      {meta && <span className={cx(muted, 'text-xs sm:text-sm')}>{meta}</span>}
    </div>}
    {children}
  </section>;
}

export function InlineKpi({ label, value, tone, primary }: { label: string; value: string; tone?: string; primary?: boolean }) {
  const toneClass = tone === 'stabil' ? 'text-emerald-600' : tone === 'angespannt' ? 'text-amber-600' : tone === 'kritisch' ? 'text-red-700' : 'text-zinc-950';
  const isAlarm = tone === 'kritisch';
  const valueSize = primary ? 'text-base' : 'text-sm';
  const containerClass = isAlarm
    ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-red-300 px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
    : primary
      ? 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-300 bg-white px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5'
      : 'grid w-[7.2rem] shrink-0 gap-0.5 overflow-hidden rounded-md border border-zinc-200 bg-white px-2 py-1 leading-tight sm:w-auto sm:min-w-0 sm:px-2.5 sm:py-1.5';
  const alarmStyle = isAlarm
    ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(220,38,38,0.10) 0 6px, rgba(220,38,38,0.20) 6px 12px)' }
    : undefined;
  return <div className={containerClass} style={alarmStyle}>
    <span className={cx('truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em]', isAlarm ? 'text-red-700' : 'text-zinc-500')} title={label}>{label}</span>
    <span className={cx('whitespace-nowrap font-semibold tabular-nums', valueSize, toneClass)}>{value}</span>
  </div>;
}

export function ChartModeToggle({ mode, onChange }: { mode: ChartMode; onChange: (mode: ChartMode) => void }) {
  const modes: Array<[ChartMode, string]> = [['sunburst', 'Polar'], ['linie', 'Linie']];
  return <div className="inline-flex shrink-0 rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-xs" aria-label="Diagrammform wählen">
    {modes.map(([value, label]) => <button
      key={value}
      type="button"
      aria-pressed={mode === value}
      className={cx('rounded-[5px] px-2.5 py-1 transition', mode === value ? 'bg-zinc-950 text-white' : 'text-zinc-500 hover:bg-white hover:text-zinc-950')}
      onClick={() => onChange(value)}
    >{label}</button>)}
  </div>;
}
