import { ChartPanel, PlaceholderGlass, SectionHeading } from '../sectionUi';
import { cx, muted } from '../ui';

// UI-Mockup: 9999-Platzhalter, bis echte Materialintensitäten (DERA / IEA)
// und globale Förderzahlen (USGS) vorliegen. Layout spiegelt die spätere Struktur.
const MOCK = '9.999';

// Pro kritischem Material: Balkenbreite = 100 % der heutigen globalen Jahresförderung.
// heutePct = annualisierter Materialbedarf Deutschland 2025, szenarioPct = zusätzlicher
// annualisierter Bedarf im Szenario. Werte hier nur als Mockup-Optik.
const materials: Array<{ label: string; heutePct: number; szenarioPct: number }> = [
  { label: 'Lithium', heutePct: 4, szenarioPct: 58 },
  { label: 'Neodym / Dysprosium', heutePct: 3, szenarioPct: 44 },
  { label: 'Nickel / Kobalt', heutePct: 2, szenarioPct: 28 },
  { label: 'Kupfer', heutePct: 5, szenarioPct: 17 },
  { label: 'Silber', heutePct: 6, szenarioPct: 12 },
];

export default function RessourcenSection({ buildoutYear }: { buildoutYear: string }) {
  return <section id="section-ressourcen" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <SectionHeading id="ressourcen" placeholder/>

    <PlaceholderGlass>
    <ChartPanel className="flex flex-col rounded-lg border border-zinc-200 dark:border-transparent">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 pb-1 pt-3">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Anteil an der globalen Jahresförderung</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-zinc-400 dark:bg-zinc-500"/>Deutschland 2025</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-500/80"/>Szenario</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800"/>Weltförderung gesamt</span>
        </div>
      </div>
      <p className={cx(muted, 'px-3 pb-2 text-xs')}>Balkenbreite = heutige Weltförderung · annualisiert über Aufbau bis {buildoutYear}</p>

      <dl className="px-3 pb-3">
        {materials.map(m => <div key={m.label} className="flex items-center gap-3 border-b border-zinc-100 py-2.5 dark:border-zinc-800">
          <dt className="w-32 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">{m.label}</dt>
          <div className="group relative min-w-0 flex-1">
            <div className="flex h-3 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className="h-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${m.heutePct}%` }}/>
              <div className="h-full bg-rose-500/80" style={{ width: `${m.szenarioPct}%` }}/>
            </div>
            <div className="pointer-events-none absolute bottom-full left-0 z-10 mb-2 hidden w-max max-w-xs rounded-md border border-zinc-200 bg-white p-2.5 text-xs shadow-lg group-hover:block dark:border-zinc-700 dark:bg-zinc-900">
              <div className="mb-1.5 font-semibold text-zinc-950 dark:text-zinc-50">{m.label}</div>
              <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 tabular-nums">
                <dt className="text-zinc-500 dark:text-zinc-400">Weltförderung</dt>
                <dd className="text-right text-zinc-950 dark:text-zinc-50">{MOCK} kt/a</dd>
                <dt className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"><span className="inline-block h-2 w-2 rounded-sm bg-zinc-400 dark:bg-zinc-500"/>Deutschland 2025</dt>
                <dd className="text-right text-zinc-950 dark:text-zinc-50">{MOCK} kt/a · {MOCK} %</dd>
                <dt className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400"><span className="inline-block h-2 w-2 rounded-sm bg-rose-500/80"/>Szenario</dt>
                <dd className="text-right text-zinc-950 dark:text-zinc-50">{MOCK} kt/a · {MOCK} %</dd>
              </dl>
            </div>
          </div>
          <dd className="flex items-baseline gap-3 text-right">
            <span className={cx(muted, 'hidden text-xs sm:inline')}>heute {MOCK} %</span>
            <span className="w-20 shrink-0 text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{MOCK} %</span>
          </dd>
        </div>)}
      </dl>
    </ChartPanel>
    </PlaceholderGlass>
  </section>;
}
