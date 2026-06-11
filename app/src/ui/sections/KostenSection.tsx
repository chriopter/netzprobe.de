import { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult } from '../../types/simulation';
import { HelpDot, HelpPanel, SectionHeading, StatCard, ViewPill, type SectionView, type Stat } from '../sectionUi';
import { cx } from '../ui';
import { fmt, fmt0 } from '../format';
import { computeKosten, type KostenResult } from '../kosten';
import { uiManifest } from '../uiManifest';

// Bestandteile der Systemkosten — Farben technologieneutral (Graustufen).
// CO₂-Bepreisung bewusst ausgelassen: rein politisch gesetzter Transfer.
const PARTS: Array<{ key: 'capex' | 'om' | 'fuel' | 'h2Import' | 'importNet' | 'netz'; label: string }> = [
  { key: 'capex', label: 'Kapitalkosten' },
  { key: 'om', label: 'Betrieb & Wartung' },
  { key: 'fuel', label: 'Brennstoff' },
  { key: 'h2Import', label: 'Wasserstoff-Import' },
  { key: 'importNet', label: 'Strom-Import-Saldo' },
  { key: 'netz', label: 'Netzausbau & -betrieb' },
];

// Gesamtbeträge über den Aufbauzeitraum: groß (Bio €), sonst Mrd €.
const fmtBig = (x: number) => Math.abs(x) >= 1e12
  ? `${(x / 1e12).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e12 < 10 ? 2 : 1 })} Bio €`
  : `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 })} Mrd €`;
const fmtMrd = (x: number) => `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 })} Mrd €`;
// Nackte Mrd-Zahl (ohne Einheit) für Tabellenspalten mit Einheit im Kopf.
const mrd1 = (x: number) => (x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 });

// Unterposten eines Bon-Postens: die Beiträge der einzelnen Technologien zu
// dieser Kostenart (bzw. Import/Export beim Saldo). Posten unter 50 Mio €/a
// sind Floating-Point-Staub bzw. irrelevant — weglassen.
function subItems(k: KostenResult, key: (typeof PARTS)[number]['key']): Array<{ label: string; v: number }> {
  const per = (f: (t: KostenResult['perTech'][number]) => number, exclude?: string) => k.perTech
    .filter(t => t.key !== exclude)
    .map(t => ({ label: t.label, v: f(t) }));
  const raw = key === 'capex' ? per(t => t.capex)
    : key === 'om' ? per(t => t.om)
      : key === 'fuel' ? per(t => t.fuel, 'h2import')
        : key === 'importNet' ? [{ label: 'Stromimport', v: k.importCost }, { label: 'Stromexport (Erlös)', v: -k.exportRevenue }]
          : [];
  return raw.filter(s => Math.abs(s.v) > 5e7).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

// Zackenrand unten wie bei einem abgerissenen Kassenbon (clip-path, dark-mode-sicher).
const receiptClip = (() => {
  const teeth = 28;
  const points: string[] = ['0% 0%', '100% 0%'];
  for (let i = teeth; i >= 0; i--) {
    const x = (i / teeth * 100).toFixed(2);
    points.push(`${x}% ${i % 2 === 0 ? '100%' : 'calc(100% - 7px)'}`);
  }
  return `polygon(${points.join(', ')})`;
})();

// Signatur-Element der Sektion: die Systemkosten als Stromrechnung — inklusive
// der Umlage auf einen Durchschnittshaushalt (Verbrauch × Ø Systemkosten).
function Stromrechnung({ k, buildoutYear, horizon }: { k: ReturnType<typeof computeKosten>; buildoutYear: string; horizon: number }) {
  const P = uiManifest.prices as Record<string, number>;
  const kwh = P.householdConsumptionKWhPerA ?? 3000;
  const perMonth = k.perMWh * kwh / 1000 / 12;
  const G = (x: number) => fmtBig(x * horizon);
  // Posten unter 50 Mio €/a sind Floating-Point-Staub (z. B. Netz exakt auf der
  // 2025-Basis) — auf dem Bon weglassen.
  const items = PARTS.filter(p => Math.abs(k.breakdown[p.key]) > 5e7);
  return <div className="mx-auto w-full max-w-[560px] font-mono text-[15px] leading-relaxed">
    <div className="border border-zinc-200 bg-white px-5 pb-7 pt-5 text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" style={{ clipPath: receiptClip }}>
      <p className="text-center text-base font-bold uppercase tracking-[0.2em] text-zinc-950 dark:text-zinc-50">Stromrechnung</p>
      <p className="mt-0.5 text-center text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Deutschland · heute bis {buildoutYear}</p>
      <div className="mt-3 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-3 space-y-2">
        {items.map(p => {
          const subs = subItems(k, p.key);
          if (!subs.length) return <div key={p.key} className="flex items-baseline justify-between gap-3">
            <span className="truncate pl-4 text-zinc-500 dark:text-zinc-400">{p.label}</span>
            <span className="shrink-0 tabular-nums">{G(k.breakdown[p.key])}</span>
          </div>;
          return <details key={p.key} className="group/it">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-1 text-zinc-500 dark:text-zinc-400">
                <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-open/it:rotate-90 dark:text-zinc-500"/>
                <span className="truncate">{p.label}</span>
              </span>
              <span className="shrink-0 tabular-nums">{G(k.breakdown[p.key])}</span>
            </summary>
            <div className="mb-1 mt-1 space-y-1 pl-6 text-xs leading-normal">
              {subs.map(s => <div key={s.label} className="flex items-baseline justify-between gap-3">
                <span className="truncate text-zinc-400 dark:text-zinc-500">{s.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{G(s.v)}</span>
              </div>)}
            </div>
          </details>;
        })}
      </div>
      <div className="mt-3 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-3 flex items-baseline justify-between gap-3 text-lg font-bold text-zinc-950 dark:text-zinc-50">
        <span>SUMME</span>
        <span className="tabular-nums">{G(k.total)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 text-zinc-500 dark:text-zinc-400">
        <span>≙ pro Jahr · {horizon} Jahre</span>
        <span className="tabular-nums">{fmtMrd(k.total)}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3 text-zinc-500 dark:text-zinc-400">
        <span>entspricht je MWh</span>
        <span className="tabular-nums">{k.perMWh.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</span>
      </div>
      <div className="mt-3 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-3 rounded-md bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Haushalt mit {kwh.toLocaleString('de-DE')} kWh/a</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">{perMonth.toLocaleString('de-DE', { maximumFractionDigits: 0 })} € <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">/ Monat</span></p>
      </div>
      {k.netzExtrapolated && <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        Netzposten extrapoliert: EE-Zubau {Math.round(k.addedReGW).toLocaleString('de-DE')} GW liegt über dem geeichten Bereich der Netzkosten-Heuristik (~700 GW) — nur als Richtungssignal lesen.
      </p>}
      <p className="mt-4 text-center text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">
        Systemkosten ab Werk — ohne Netzentgelt-Detail, Steuern, Abgaben, Marge. Annahmen im Datenhandbuch.
      </p>
    </div>
  </div>;
}

// Graustufen je Kostenart (technologieneutral, keine Tech-Farben): dunkel =
// Kapital, mittel = Betrieb, stone = Brennstoff — dieselbe Brennstoff-Farbe
// wie in der Ressourcen-Sektion.
const COST_SHADES = [
  { key: 'capex', label: 'Kapitalkosten', cls: 'bg-zinc-700 dark:bg-zinc-200' },
  { key: 'om', label: 'Betrieb & Wartung', cls: 'bg-zinc-400 dark:bg-zinc-500' },
  { key: 'fuel', label: 'Brennstoff', cls: 'bg-stone-500 dark:bg-stone-400' },
] as const;

const techRowGrid = 'grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_4rem_3.5rem] items-center gap-x-3 sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_4.5rem_4rem]';

// Begleittafel zum Bon: Jahreskosten je Technologie als horizontale Graustufen-
// Stapelbalken (Kapital / Betrieb / Brennstoff) mit Mrd €/a und €/MWh, darunter
// die kapazitätsunabhängigen Systemposten (Netz, Strom-Import-Saldo) einfarbig.
function TechKostenPanel({ k }: { k: KostenResult }) {
  const techs = k.perTech.filter(t => Math.abs(t.total) > 5e7);
  const system: Array<{ label: string; v: number; hint?: string; mark?: boolean }> = [
    { label: 'Netzausbau & -betrieb', v: k.breakdown.netz, mark: k.netzExtrapolated, hint: k.netzExtrapolated ? 'Außerhalb des geeichten Bereichs der Netzkosten-Heuristik — nur Richtungssignal' : undefined },
    { label: 'Strom-Import-Saldo', v: k.breakdown.importNet, hint: `Stromimport ${mrd1(k.importCost)} − Export-Erlös ${mrd1(k.exportRevenue)} Mrd €/a` },
  ].filter(s => Math.abs(s.v) > 5e7);
  const max = Math.max(1, ...techs.map(t => t.total), ...system.map(s => Math.abs(s.v)));
  const num = 'text-right tabular-nums';

  return <div className="flex min-w-0 flex-1 flex-col rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Jahreskosten je Technologie</h3>
    <div className={cx(techRowGrid, 'mt-3 border-b border-zinc-200 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500')}>
      <span>Technologie</span>
      <span/>
      <span className={num}>Mrd €/a</span>
      <span className={cx(num, 'cursor-help underline decoration-dotted decoration-zinc-300 underline-offset-2')} title="Jahreskosten ÷ erzeugte bzw. gelieferte Energie. Speicher erzeugen nicht selbst — dort „–“.">€/MWh</span>
    </div>
    {techs.map(t => <div key={t.key} className={cx(techRowGrid, 'border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800')}>
      <span className="truncate text-zinc-700 dark:text-zinc-300" title={t.label}>{t.label}</span>
      <div className="flex h-3 items-stretch gap-px" title={`Kapital ${mrd1(t.capex)} · Betrieb ${mrd1(t.om)} · Brennstoff ${mrd1(t.fuel)} Mrd €/a`}>
        {COST_SHADES.map(p => {
          const w = t[p.key] / max * 100;
          return w > 0.3 ? <span key={p.key} className={cx('rounded-[2px]', p.cls)} style={{ width: `${w}%` }}/> : null;
        })}
      </div>
      <span className={cx(num, 'font-medium text-zinc-950 dark:text-zinc-50')}>{mrd1(t.total)}</span>
      <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>{t.eurPerMWh != null ? fmt0.format(t.eurPerMWh) : '–'}</span>
    </div>)}
    {system.length > 0 && <>
      <div className="pt-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Systemposten</div>
      {system.map(s => <div key={s.label} className={cx(techRowGrid, 'border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800')}>
        <span className={cx('truncate text-zinc-700 dark:text-zinc-300', s.hint && 'cursor-help')} title={s.hint ?? s.label}>
          {s.label}
          {s.mark && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400" aria-hidden>*</span>}
        </span>
        <div className="flex h-3 items-stretch" title={s.hint}>
          <span
            className={s.v >= 0 ? 'rounded-[2px] bg-zinc-300 dark:bg-zinc-600' : 'rounded-[2px] border border-zinc-400 dark:border-zinc-500'}
            style={{ width: `${Math.abs(s.v) / max * 100}%` }}
          />
        </div>
        <span className={cx(num, 'font-medium text-zinc-950 dark:text-zinc-50')}>{mrd1(s.v)}</span>
        <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>–</span>
      </div>)}
    </>}
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
      {COST_SHADES.map(p => <span key={p.key} className="flex items-center gap-1.5">
        <span className={cx('h-2 w-2 rounded-[2px]', p.cls)}/>{p.label}
      </span>)}
      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-zinc-300 dark:bg-zinc-600"/>Systemposten</span>
      <span className="ml-auto text-zinc-400 dark:text-zinc-500">Balkenlänge = Jahreskosten{k.netzExtrapolated ? ' · * extrapoliert' : ''}</span>
    </div>
  </div>;
}

// Details-Ansicht: dieselben Jahreskosten als Zahlentabelle mit allen
// Komponenten-Spalten statt Stapelbalken.
function KostenDetailTable({ k }: { k: KostenResult }) {
  const techs = k.perTech.filter(t => Math.abs(t.total) > 5e7);
  const system: Array<{ label: string; v: number; mark?: boolean; hint?: string }> = [
    { label: 'Netzausbau & -betrieb', v: k.breakdown.netz, mark: k.netzExtrapolated, hint: k.netzExtrapolated ? 'Außerhalb des geeichten Bereichs der Netzkosten-Heuristik — nur Richtungssignal' : undefined },
    { label: 'Strom-Import-Saldo', v: k.breakdown.importNet, hint: `Stromimport ${mrd1(k.importCost)} − Export-Erlös ${mrd1(k.exportRevenue)} Mrd €/a` },
  ].filter(s => Math.abs(s.v) > 5e7);
  const grid = 'grid grid-cols-[minmax(0,1fr)_4rem_4rem_4.5rem_4.5rem_3.5rem] items-center gap-x-3';
  const num = 'text-right tabular-nums';
  return <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Jahreskosten je Technologie</h3>
    <div className={cx(grid, 'mt-3 border-b border-zinc-200 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500')}>
      <span>Technologie</span>
      <span className={num}>Kapital</span>
      <span className={num}>Betrieb</span>
      <span className={num}>Brennstoff</span>
      <span className={num}>Gesamt</span>
      <span className={cx(num, 'cursor-help underline decoration-dotted decoration-zinc-300 underline-offset-2')} title="Jahreskosten ÷ erzeugte bzw. gelieferte Energie. Speicher erzeugen nicht selbst — dort „–“.">€/MWh</span>
    </div>
    {techs.map(t => <div key={t.key} className={cx(grid, 'border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800')}>
      <span className="truncate text-zinc-700 dark:text-zinc-300" title={t.label}>{t.label}</span>
      <span className={cx(num, 'text-zinc-500 dark:text-zinc-400')}>{t.capex > 5e7 ? mrd1(t.capex) : '–'}</span>
      <span className={cx(num, 'text-zinc-500 dark:text-zinc-400')}>{t.om > 5e7 ? mrd1(t.om) : '–'}</span>
      <span className={cx(num, 'text-zinc-500 dark:text-zinc-400')}>{t.fuel > 5e7 ? mrd1(t.fuel) : '–'}</span>
      <span className={cx(num, 'font-medium text-zinc-950 dark:text-zinc-50')}>{mrd1(t.total)}</span>
      <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>{t.eurPerMWh != null ? fmt0.format(t.eurPerMWh) : '–'}</span>
    </div>)}
    {system.length > 0 && <>
      <div className="pt-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Systemposten</div>
      {system.map(s => <div key={s.label} className={cx(grid, 'border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800')}>
        <span className={cx('truncate text-zinc-700 dark:text-zinc-300', s.hint && 'cursor-help')} title={s.hint ?? s.label}>
          {s.label}
          {s.mark && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400" aria-hidden>*</span>}
        </span>
        <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>–</span>
        <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>–</span>
        <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>–</span>
        <span className={cx(num, 'font-medium text-zinc-950 dark:text-zinc-50')}>{mrd1(s.v)}</span>
        <span className={cx(num, 'text-zinc-400 dark:text-zinc-500')}>–</span>
      </div>)}
    </>}
    <div className={cx(grid, 'py-2 text-sm font-semibold')}>
      <span className="text-zinc-950 dark:text-zinc-50">Summe</span>
      <span className={cx(num, 'text-zinc-500 dark:text-zinc-400')}>{mrd1(k.breakdown.capex)}</span>
      <span className={cx(num, 'text-zinc-500 dark:text-zinc-400')}>{mrd1(k.breakdown.om)}</span>
      <span className={cx(num, 'text-zinc-500 dark:text-zinc-400')}>{mrd1(k.breakdown.fuel + k.breakdown.h2Import)}</span>
      <span className={cx(num, 'text-zinc-950 dark:text-zinc-50')}>{mrd1(k.total)}</span>
      <span className={num}/>
    </div>
    <div className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-500">Alle Werte Mrd €/a · Brennstoff-Spalte inkl. H₂-Import{k.netzExtrapolated ? ' · * extrapoliert' : ''}</div>
  </div>;
}

export default function KostenSection({ scenario, result, buildoutYear }: { scenario: Scenario; result: SimulationResult; buildoutYear: string }) {
  const k = useMemo(() => computeKosten(scenario, result), [scenario, result]);
  const horizon = Math.max(1, Number(buildoutYear) - 2025);
  const [helpOpen, setHelpOpen] = useState(false);
  // Rechte Spalte: Stapelbalken-Tafel (Grafisch) oder Zahlentabelle (Details).
  const [view, setView] = useState<SectionView>('grafisch');

  const P = uiManifest.prices as Record<string, number>;
  const kwh = P.householdConsumptionKWhPerA ?? 3000;
  const perMonth = k.perMWh * kwh / 1000 / 12;
  const share = (x: number) => k.total > 0 ? `${Math.round(x / k.total * 100)} %` : '–';
  // Laufende Bezüge = Brennstoff + H₂-Import + Stromimport-Saldo (nur wenn er
  // netto kostet) — der Gegenpol zum gebundenen Kapital.
  const laufend = k.breakdown.fuel + k.breakdown.h2Import + Math.max(0, k.breakdown.importNet);
  const statGroups: Array<{ title: string; stats: Stat[] }> = [
    { title: 'Umlage', stats: [
      { label: 'Ø Stromkosten', value: `${fmt0.format(k.perMWh)} €/MWh`, sub: `≙ ${fmt.format(k.perMWh / 10)} ct/kWh` },
      { label: `Haushalt, ${fmt0.format(kwh)} kWh/a`, value: `${fmt0.format(perMonth)} €/Monat` },
    ] },
    { title: 'Zeitraum', stats: [
      { label: 'Pro Jahr', value: fmtMrd(k.total) },
      { label: `Gesamt bis ${buildoutYear}`, value: fmtBig(k.total * horizon), sub: `${horizon} Jahre` },
    ] },
    { title: 'Kostenarten', stats: [
      { label: 'Kapitalkosten', value: share(k.breakdown.capex), sub: `${fmtMrd(k.breakdown.capex)}/a` },
      { label: 'Brennstoff & Importe', value: share(laufend), sub: `${fmtMrd(laufend)}/a` },
    ] },
  ];

  return <section id="section-kosten" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <div className="flex items-center gap-2">
      <SectionHeading id="kosten"/>
      <HelpDot open={helpOpen} onToggle={() => setHelpOpen(open => !open)} label="Wie werden die Kosten berechnet?"/>
      <div className="ml-auto"><ViewPill view={view} onChange={setView}/></div>
    </div>
    {helpOpen && <HelpPanel>
        Berechnet werden die <strong>Gesamtsystemkosten</strong> über den Aufbauzeitraum (heute bis {buildoutYear}, {horizon} Jahre) — nicht die Gestehungskosten einzelner Anlagen. Das ist der Vorteil einer Gesamtsystem-Rechnung: Integrationskosten (Speicher, Backup, Überbau) stecken automatisch in der Summe — bei einer Einzelbetrachtung „Was kostet eine kWh Wind?" fehlen Redispatch und Reserve dagegen. Die Jahreskosten werden für den „Gesamt"-Wert mit der Anzahl Jahre multipliziert. Posten: <strong>Kapitalkosten (annuisiert)</strong> = die Baukosten der <em>gesamten</em> Flotte, mit dem Kapitalwiedergewinnungsfaktor über die Lebensdauer umgelegt (realer WACC 5 %) — also die jährlichen Kapitalkosten des gesamten Anlagenbestands (inkl. Ersatz auslaufender Anlagen), nicht die Mehrinvestition gegenüber heute. Auch das heutige System bindet so dauerhaft Kapital. <strong>Betrieb &amp; Wartung</strong> = feste (€/kW·a) + variable (€/MWh) Kosten. <strong>Brennstoff</strong> = Brennstoffpreis ÷ Wirkungsgrad × erzeugte Energie aus der Stundensimulation (Gas, Kohle, Biomasse, Kernkraft). <strong>Wasserstoff-Import</strong> = importierte H₂-Menge × Importpreis (frei Grenze, LHV). <strong>Strom-Import-Saldo</strong> = Stromimport minus -export zum Großhandelspreis. <strong>Netzausbau &amp; -betrieb</strong> = grobe Pauschale 1.200 €/kW je kW volatiler EE-Leistung über dem 2025-Bestand (174,7 GW, dort null — die 2025-Kupferplatte ist der Nullpunkt), annuisiert über 40 Jahre. Der Faktor orientiert sich an der mittleren Vollnetz-Investitionsschätzung (IMK ~651 Mrd, NEP ~320 Mrd nur Übertragung, Frontier/DIHK »Plan B« ~1,2 Bio all-in als oberer Rand); der BMWK-O45-Strom-Pfad 2045 (630 GW) ergibt so bei Aufbau bis 2050 rund 0,8 Bio €. Ohne Spannungsebenen-Auflösung und strikt linear — außerhalb des geeichten Bereichs (EE-Zubau bis ~700 GW) nur als Richtungssignal zu lesen. Die „Ø Stromkosten" sind Jahres-Gesamtkosten ÷ gedeckte Jahresnachfrage — dazu zählt neben der Stromlast auch die strom-äquivalent vom H₂-Pool gedeckte Sektor-Nachfrage (Stahl/Chemie/Schiff/Flug): H₂-Produktion bzw. -Import senkt die Stromlast, wird aber vom selben System bezahlt, also wird auf beides umgelegt. Ein systemweiter Durchschnitt, kein Endkunden-Strompreis (ohne Netzentgelte, Steuern, Marge). <strong>Nicht enthalten:</strong> die CO₂-Bepreisung (rein politisch gesetzter Transfer, kein Ressourcenaufwand) sowie nachfrageseitige Kosten (E-Fahrzeuge, Wärmepumpen). Kostenparameter je Technologie und Preisannahmen mit Quellen im Datenhandbuch (Fraunhofer ISE, DEA, NREL ATB, IRENA).
    </HelpPanel>}

    <div className="grid gap-3 lg:grid-cols-[minmax(360px,2fr)_minmax(0,3fr)] lg:gap-6">
      <Stromrechnung k={k} buildoutYear={buildoutYear} horizon={horizon}/>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-3">
          {statGroups.map(group => <StatCard key={group.title} title={group.title} stats={group.stats}/>)}
        </div>
        {view === 'grafisch' ? <TechKostenPanel k={k}/> : <KostenDetailTable k={k}/>}
      </div>
    </div>
  </section>;
}
