import { Fragment, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult } from '../../types/simulation';
import { SectionHeading, StatCard } from '../sectionUi';
import { cx, muted } from '../ui';
import { computeKosten, type KostenTech } from '../kosten';

const STORAGE = new Set(['batterie', 'pumpspeicher', 'h2']);

// Bestandteile der Systemkosten — Farben technologieneutral (Graustufen).
// CO₂-Bepreisung bewusst ausgelassen: rein politisch gesetzter Transfer.
const PARTS: Array<{ key: 'capex' | 'om' | 'fuel' | 'h2Import' | 'importNet'; label: string; color: string }> = [
  { key: 'capex', label: 'Kapitalkosten (annuisiert)', color: 'bg-zinc-700 dark:bg-zinc-300' },
  { key: 'om', label: 'Betrieb & Wartung', color: 'bg-zinc-500 dark:bg-zinc-500' },
  { key: 'fuel', label: 'Brennstoff', color: 'bg-stone-600 dark:bg-stone-400' },
  { key: 'h2Import', label: 'Wasserstoff-Import', color: 'bg-sky-700 dark:bg-sky-400' },
  { key: 'importNet', label: 'Strom-Import-Saldo', color: 'bg-zinc-400 dark:bg-zinc-600' },
];

// Gesamtbeträge über den Aufbauzeitraum: groß (Bio €), sonst Mrd €.
const fmtBig = (x: number) => Math.abs(x) >= 1e12
  ? `${(x / 1e12).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e12 < 10 ? 2 : 1 })} Bio €`
  : `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 })} Mrd €`;
const fmtMrd = (x: number) => `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 })} Mrd €`;
const fmtEurMWh = (x: number | null) => x == null ? '–' : `${x.toLocaleString('de-DE', { maximumFractionDigits: x < 100 ? 1 : 0 })} €/MWh`;

// Spaltenkopf mit sofortigem Hover-Tooltip (wie in der Ressourcen-Sektion).
function ColHead({ label, hint }: { label: string; hint: string }) {
  return <dt className="group/h relative cursor-help text-right underline decoration-dotted decoration-zinc-300 underline-offset-2">
    {label}
    <span className="pointer-events-none absolute right-0 top-full z-40 mt-1 hidden w-max max-w-[220px] rounded-md border border-zinc-200 bg-white p-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-600 shadow-lg group-hover/h:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{hint}</span>
  </dt>;
}

function TechRow({ t, maxTotal, horizon }: { t: KostenTech; maxTotal: number; horizon: number }) {
  const pct = maxTotal > 0 ? Math.round(t.total / maxTotal * 100) : 0;
  return <div className="group/r relative grid grid-cols-[minmax(0,1fr)_5rem_5rem_6rem] items-center gap-x-3 border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800">
    <dt className="min-w-0">
      <div className="truncate text-zinc-700 dark:text-zinc-300">{t.label}</div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${pct}%` }}/>
      </div>
    </dt>
    <dd className="text-right tabular-nums text-zinc-950 dark:text-zinc-50">{fmtEurMWh(t.eurPerMWh)}</dd>
    <dd className="text-right tabular-nums text-zinc-600 dark:text-zinc-400">{fmtMrd(t.total)}/a</dd>
    <dd className="text-right tabular-nums text-zinc-950 dark:text-zinc-50">{fmtBig(t.total * horizon)}</dd>
    <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 w-[min(280px,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white p-3 text-xs opacity-0 shadow-lg transition group-hover/r:opacity-100 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="grid gap-1.5">
        {([['Kapitalkosten (annuisiert)', t.capex], ['Betrieb & Wartung', t.om], ['Brennstoff', t.fuel]] as const).map(([l, v]) =>
          <div key={l} className="flex justify-between gap-4"><span className="text-zinc-500 dark:text-zinc-400">{l}</span><span className="font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{fmtMrd(v)}/a</span></div>)}
      </div>
      <div className="mt-2 border-t border-zinc-100 pt-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Gesamt = Jahreskosten × {horizon} Jahre. Import-Saldo wird systemweit ausgewiesen, nicht je Technologie.</div>
    </div>
  </div>;
}

export default function KostenSection({ scenario, result, buildoutYear }: { scenario: Scenario; result: SimulationResult; buildoutYear: string }) {
  const k = useMemo(() => computeKosten(scenario, result), [scenario, result]);
  const horizon = Math.max(1, Number(buildoutYear) - 2025);

  // Fester Maßstab: ein voller Balken = 10.000 Mrd € (10 Bio €), Überlauf in weitere Zeilen.
  const REF_MRD = 10_000;
  const totalMult = k.total * horizon / 1e9 / REF_MRD;
  const costRows = Math.max(1, Math.ceil(totalMult));
  const erzeugung = k.perTech.filter(t => !STORAGE.has(t.key) && t.key !== 'h2import');
  const speicher = k.perTech.filter(t => STORAGE.has(t.key));
  const importGrp = k.perTech.filter(t => t.key === 'h2import');
  const maxTotal = Math.max(1, ...k.perTech.map(t => t.total));
  const G = (x: number) => fmtBig(x * horizon); // Gesamt über den Aufbauzeitraum

  return <section id="section-kosten" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <SectionHeading id="kosten"/>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard title={`Gesamt bis ${buildoutYear}`} stats={[{ label: 'Systemkosten', value: G(k.total), sub: `${fmtMrd(k.total)}/a` }, { label: 'Ø Stromkosten', value: `${k.perMWh.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €/MWh` }]}/>
      <StatCard title="Kapitalkosten" stats={[{ label: 'Kapital', value: G(k.breakdown.capex), sub: `${fmtMrd(k.breakdown.capex)}/a` }, { label: 'O&M', value: G(k.breakdown.om), sub: `${fmtMrd(k.breakdown.om)}/a` }]}/>
      <StatCard title="Variabel" stats={[{ label: 'Brennstoff', value: G(k.breakdown.fuel), sub: `${fmtMrd(k.breakdown.fuel)}/a` }, { label: 'H₂-Import', value: G(k.breakdown.h2Import), sub: `${fmtMrd(k.breakdown.h2Import)}/a` }]}/>
      <StatCard title="Handel & Dauer" stats={[{ label: 'Strom-Import-Saldo', value: G(k.breakdown.importNet), sub: `${fmtMrd(k.breakdown.importNet)}/a` }, { label: 'Zeitraum', value: `${horizon} Jahre` }]}/>
    </div>

    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Kostenbestandteile · gesamt bis {buildoutYear}</h3>
        <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{G(k.total)}</span>
      </div>
      <div className="mt-3 flex flex-col gap-1" aria-label={`Gesamtkosten — ein voller Balken = ${REF_MRD.toLocaleString('de-DE')} Mrd €`}>
        {Array.from({ length: costRows }, (_, i) => i).map(i => {
          const pct = Math.round(Math.max(0, Math.min(1, totalMult - i)) * 100);
          return <div key={i} className="h-3.5 w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800">
            {pct > 0 && <div className="h-full rounded-full bg-zinc-700 dark:bg-zinc-300" style={{ width: `${pct}%` }}/>}
          </div>;
        })}
      </div>
      <p className="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">Maßstab: ein voller Balken = 10.000 Mrd € (10 Bio €).</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
        {PARTS.filter(p => k.breakdown[p.key] !== 0).map(p => <div key={p.key} className="flex items-center gap-1.5 text-xs">
          <span className={cx('h-2 w-2 shrink-0 rounded-sm', p.color)}/>
          <span className="truncate text-zinc-500 dark:text-zinc-400">{p.label}</span>
          <span className="ml-auto shrink-0 font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{G(k.breakdown[p.key])}</span>
        </div>)}
      </dl>
    </div>

    <details className="group rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90"/>
        Kosten je Technologie
      </summary>
      <dl className="mt-3">
        <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_6rem] gap-x-3 border-b border-zinc-200 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <dt>Technologie</dt>
          <ColHead label="Effektiv" hint="Effektivkosten je gelieferter MWh: (CAPEX + O&M + Brennstoff) ÷ tatsächlicher Jahreserzeugung — inklusive Abregelung/Auslastung, daher höher und szenarioabhängig. KEINE reinen Stromgestehungskosten (LCOE)."/>
          <ColHead label="pro Jahr" hint="Jahreskosten dieser Technologie: annuisiertes CAPEX + Betrieb + Brennstoff."/>
          <ColHead label="Gesamt" hint={`Jahreskosten × ${horizon} Jahre — die Gesamtkosten über den Aufbauzeitraum bis ${buildoutYear}.`}/>
        </div>
        {([['Erzeugung', erzeugung], ['Speicher', speicher], ['Import', importGrp]] as const).map(([title, grp]) => grp.length
          ? <Fragment key={title}>
              <div className="pt-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{title}</div>
              {grp.map(t => <TechRow key={t.key} t={t} maxTotal={maxTotal} horizon={horizon}/>)}
            </Fragment>
          : null)}
      </dl>
    </details>

    <details className="group px-1">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90"/>
        Wie werden die Kosten berechnet?
      </summary>
      <p className={cx(muted, 'mt-2 text-xs leading-5')}>
        Berechnet werden die <strong>Gesamtsystemkosten</strong> über den Aufbauzeitraum (heute bis {buildoutYear}, {horizon} Jahre) — nicht die Gestehungskosten einzelner Anlagen. Das ist der Vorteil einer Gesamtsystem-Rechnung: Integrationskosten (Speicher, Backup, Überbau) stecken automatisch in der Summe — bei einer Einzelbetrachtung „Was kostet eine kWh Wind?" fehlen Redispatch und Reserve dagegen. Die Jahreskosten werden für den „Gesamt"-Wert mit der Anzahl Jahre multipliziert. Posten: <strong>Kapitalkosten (annuisiert)</strong> = die Baukosten der <em>gesamten</em> Flotte, mit dem Kapitalwiedergewinnungsfaktor über die Lebensdauer umgelegt (realer WACC 5 %) — also die jährlichen Kapitalkosten des gesamten Anlagenbestands (inkl. Ersatz auslaufender Anlagen), nicht die Mehrinvestition gegenüber heute. Auch das heutige System bindet so dauerhaft Kapital. <strong>Betrieb &amp; Wartung</strong> = feste (€/kW·a) + variable (€/MWh) Kosten. <strong>Brennstoff</strong> = Brennstoffpreis ÷ Wirkungsgrad × erzeugte Energie aus der Stundensimulation (Gas, Kohle, Biomasse, Kernkraft). <strong>Wasserstoff-Import</strong> = importierte H₂-Menge × Importpreis (frei Grenze, LHV). <strong>Strom-Import-Saldo</strong> = Stromimport minus -export zum Großhandelspreis. Die „Ø Stromkosten" sind Jahres-Gesamtkosten ÷ tatsächlich gedeckte Jahreslast — ein systemweiter Durchschnitt, kein Endkunden-Strompreis (ohne Netzentgelte, Steuern, Marge). <strong>Nicht enthalten:</strong> die CO₂-Bepreisung (rein politisch gesetzter Transfer, kein Ressourcenaufwand), Übertragungs-/Verteilnetzkosten (das Modell ist eine Kupferplatte) sowie nachfrageseitige Kosten (E-Fahrzeuge, Wärmepumpen). Kostenparameter je Technologie und Preisannahmen mit Quellen im Datenhandbuch (Fraunhofer ISE, DEA, NREL ATB, IRENA).
      </p>
    </details>
  </section>;
}
