import { ChartPanel, PlaceholderGlass, SectionHeading, StatCard } from '../sectionUi';

// UI-Mockup: 9999-Platzhalter, bis echte Kostenkoeffizienten (Fraunhofer ISE)
// pro Modellpaket vorliegen. Layout spiegelt die spätere Struktur.
const MOCK = '9.999';
const techRows: Array<{ label: string; bar: number }> = [
  { label: 'PV', bar: 82 },
  { label: 'Wind Onshore', bar: 64 },
  { label: 'Wind Offshore', bar: 71 },
  { label: 'Biomasse', bar: 38 },
  { label: 'Laufwasser', bar: 22 },
  { label: 'Kernkraft', bar: 55 },
  { label: 'Gas', bar: 44 },
  { label: 'Kohle', bar: 33 },
  { label: 'Batterie', bar: 48 },
  { label: 'Pumpspeicher', bar: 18 },
  { label: 'Wasserstoff', bar: 60 },
];

export default function KostenSection() {
  return <section id="section-kosten" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <SectionHeading id="kosten" placeholder/>

    <PlaceholderGlass>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard title="Gesamt" stats={[{ label: 'Systemkosten', value: `${MOCK} Mrd €` }, { label: 'Strompreis', value: `${MOCK} €/MWh` }]}/>
      <StatCard title="Haushalt & CO₂" stats={[{ label: 'Pro Haushalt', value: `${MOCK} €/a` }, { label: 'CO₂-Kosten', value: `${MOCK} Mrd €` }]}/>
      <StatCard title="Investition" stats={[{ label: 'CAPEX p. a.', value: `${MOCK} Mrd €` }, { label: 'O&M', value: `${MOCK} Mrd €` }]}/>
      <StatCard title="Variabel" stats={[{ label: 'Brennstoff', value: `${MOCK} Mrd €` }, { label: 'Import-Saldo', value: `${MOCK} Mrd €` }]}/>
    </div>

    <ChartPanel className="flex flex-col rounded-lg border border-zinc-200 dark:border-transparent">
      <div className="px-3 pb-2 pt-3">
        <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Gestehungskosten je Technologie</h3>
      </div>
      <dl className="divide-y divide-zinc-100 px-3 pb-3 dark:divide-zinc-800">
        {techRows.map(row => <div key={row.label} className="flex items-center gap-3 py-2">
          <dt className="w-28 shrink-0 text-sm text-zinc-700 dark:text-zinc-300">{row.label}</dt>
          <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${row.bar}%` }}/>
          </div>
          <dd className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{MOCK} €/MWh</dd>
        </div>)}
      </dl>
    </ChartPanel>

    <ChartPanel title="Kostenbestandteile" className="rounded-lg border border-zinc-200 dark:border-transparent">
      <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {['Erzeugung', 'Speicher', 'Netzausbau', 'Backup / Reserve', 'CO₂-Bepreisung'].map(label =>
          <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-2.5">
            <dt className="text-sm text-zinc-700 dark:text-zinc-300">{label}</dt>
            <dd className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{MOCK} Mrd €</dd>
          </div>)}
      </dl>
    </ChartPanel>
    </PlaceholderGlass>
  </section>;
}
