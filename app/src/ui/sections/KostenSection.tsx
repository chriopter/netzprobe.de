import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult } from '../../types/simulation';
import { SectionHeading } from '../sectionUi';
import { cx, muted } from '../ui';
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
  return <div className="mx-auto my-3 w-full max-w-[340px] font-mono text-[13px] leading-relaxed">
    <div className="border border-zinc-200 bg-white px-5 pb-7 pt-5 text-zinc-800 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200" style={{ clipPath: receiptClip }}>
      <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-zinc-950 dark:text-zinc-50">Stromrechnung</p>
      <p className="mt-0.5 text-center text-[11px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Deutschland · heute bis {buildoutYear}</p>
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
            <div className="mb-1 mt-1 space-y-1 pl-6 text-[11px] leading-normal">
              {subs.map(s => <div key={s.label} className="flex items-baseline justify-between gap-3">
                <span className="truncate text-zinc-400 dark:text-zinc-500">{s.label}</span>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{G(s.v)}</span>
              </div>)}
            </div>
          </details>;
        })}
      </div>
      <div className="mt-3 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-3 flex items-baseline justify-between gap-3 text-base font-bold text-zinc-950 dark:text-zinc-50">
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
      {k.netzExtrapolated && <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] leading-snug text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
        Netzposten extrapoliert: EE-Zubau {Math.round(k.addedReGW).toLocaleString('de-DE')} GW liegt über dem geeichten Bereich der Netzkosten-Heuristik (~700 GW) — nur als Richtungssignal lesen.
      </p>}
      <p className="mt-4 text-center text-[10px] leading-snug text-zinc-400 dark:text-zinc-500">
        Systemkosten ab Werk — ohne Netzentgelt-Detail, Steuern, Abgaben, Marge. Annahmen im Datenhandbuch.
      </p>
    </div>
  </div>;
}

export default function KostenSection({ scenario, result, buildoutYear }: { scenario: Scenario; result: SimulationResult; buildoutYear: string }) {
  const k = useMemo(() => computeKosten(scenario, result), [scenario, result]);
  const horizon = Math.max(1, Number(buildoutYear) - 2025);

  return <section id="section-kosten" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <SectionHeading id="kosten"/>

    <Stromrechnung k={k} buildoutYear={buildoutYear} horizon={horizon}/>

    <details className="group px-1">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90"/>
        Wie werden die Kosten berechnet?
      </summary>
      <p className={cx(muted, 'mt-2 text-xs leading-5')}>
        Berechnet werden die <strong>Gesamtsystemkosten</strong> über den Aufbauzeitraum (heute bis {buildoutYear}, {horizon} Jahre) — nicht die Gestehungskosten einzelner Anlagen. Das ist der Vorteil einer Gesamtsystem-Rechnung: Integrationskosten (Speicher, Backup, Überbau) stecken automatisch in der Summe — bei einer Einzelbetrachtung „Was kostet eine kWh Wind?" fehlen Redispatch und Reserve dagegen. Die Jahreskosten werden für den „Gesamt"-Wert mit der Anzahl Jahre multipliziert. Posten: <strong>Kapitalkosten (annuisiert)</strong> = die Baukosten der <em>gesamten</em> Flotte, mit dem Kapitalwiedergewinnungsfaktor über die Lebensdauer umgelegt (realer WACC 5 %) — also die jährlichen Kapitalkosten des gesamten Anlagenbestands (inkl. Ersatz auslaufender Anlagen), nicht die Mehrinvestition gegenüber heute. Auch das heutige System bindet so dauerhaft Kapital. <strong>Betrieb &amp; Wartung</strong> = feste (€/kW·a) + variable (€/MWh) Kosten. <strong>Brennstoff</strong> = Brennstoffpreis ÷ Wirkungsgrad × erzeugte Energie aus der Stundensimulation (Gas, Kohle, Biomasse, Kernkraft). <strong>Wasserstoff-Import</strong> = importierte H₂-Menge × Importpreis (frei Grenze, LHV). <strong>Strom-Import-Saldo</strong> = Stromimport minus -export zum Großhandelspreis. <strong>Netzausbau &amp; -betrieb</strong> = grobe Pauschale 1.200 €/kW je kW volatiler EE-Leistung über dem 2025-Bestand (174,7 GW, dort null — die 2025-Kupferplatte ist der Nullpunkt), annuisiert über 40 Jahre. Der Faktor orientiert sich an der mittleren Vollnetz-Investitionsschätzung (IMK ~651 Mrd, NEP ~320 Mrd nur Übertragung, Frontier/DIHK »Plan B« ~1,2 Bio all-in als oberer Rand); der BMWK-O45-Strom-Pfad 2045 (630 GW) ergibt so bei Aufbau bis 2050 rund 0,8 Bio €. Ohne Spannungsebenen-Auflösung und strikt linear — außerhalb des geeichten Bereichs (EE-Zubau bis ~700 GW) nur als Richtungssignal zu lesen. Die „Ø Stromkosten" sind Jahres-Gesamtkosten ÷ gedeckte Jahresnachfrage — dazu zählt neben der Stromlast auch die strom-äquivalent vom H₂-Pool gedeckte Sektor-Nachfrage (Stahl/Chemie/Schiff/Flug): H₂-Produktion bzw. -Import senkt die Stromlast, wird aber vom selben System bezahlt, also wird auf beides umgelegt. Ein systemweiter Durchschnitt, kein Endkunden-Strompreis (ohne Netzentgelte, Steuern, Marge). <strong>Nicht enthalten:</strong> die CO₂-Bepreisung (rein politisch gesetzter Transfer, kein Ressourcenaufwand) sowie nachfrageseitige Kosten (E-Fahrzeuge, Wärmepumpen). Kostenparameter je Technologie und Preisannahmen mit Quellen im Datenhandbuch (Fraunhofer ISE, DEA, NREL ATB, IRENA).
      </p>
    </details>
  </section>;
}
