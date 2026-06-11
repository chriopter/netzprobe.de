import { Fragment, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import type { DataSet } from '../../types/data';
import { SectionHeading } from '../sectionUi';
import { e100ElectricTWh } from '../ScenarioSidebar';
import { cx, muted } from '../ui';
import { defaultScenario, normalizeScenario } from '../scenarioPresets';
import { annualByMaterial, groupSums, BULK, FUEL, type MaterialInfo } from '../ressourcen';
import { uiManifest } from '../uiManifest';
import { ELEMENTS, MATERIAL_ELEMENT, NON_ELEMENT_MATERIALS } from '../periodicElements';

const scenarioBase = normalizeScenario(defaultScenario);

const catColor = (m: string) => FUEL.has(m) ? 'bg-stone-700 dark:bg-stone-400' : BULK.has(m) ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-zinc-600 dark:bg-zinc-300';

const fmtMass = (t: number) => t >= 1e6
  ? `${(t / 1e6).toLocaleString('de-DE', { maximumFractionDigits: t / 1e6 < 10 ? 1 : 0 })} Mt`
  : `${(t / 1e3).toLocaleString('de-DE', { maximumFractionDigits: t / 1e3 < 10 ? 1 : 0 })} kt`;
const factorStr = (scen: number, base: number) => base > 0 ? `${(scen / base).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` : (scen > 0 ? 'neu' : '–');
const pctStr = (p: number) => p <= 0 ? '0 %' : p < 0.01 ? '<0,01 %' : `${p.toLocaleString('de-DE', { maximumFractionDigits: p < 1 ? 2 : 1 })} %`;

// Spaltenkopf mit sofortigem Hover-Tooltip (statt traegem nativem title).
function ColHead({ label, hint }: { label: string; hint: string }) {
  return <dt className="group/h relative cursor-help text-right underline decoration-dotted decoration-zinc-300 underline-offset-2">
    {label}
    <span className="pointer-events-none absolute right-0 top-full z-40 mt-1 hidden w-max max-w-[220px] rounded-md border border-zinc-200 bg-white p-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-600 shadow-lg group-hover/h:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{hint}</span>
  </dt>;
}

// Kachel-Vergleich wie Saarland: eine Kachel = 1× heutiger Bedarf, Fuellung = Vielfaches.
// Immer mindestens eine volle 6er-Zeile, damit Headroom sichtbar ist und alle
// drei Karten dieselbe Metapher nutzen; Massenwerte (heute → Zieljahr) sichtbar darunter.
function MultipleTiles({ title, base, scen, colorClass, buildoutYear }: { title: string; base: number; scen: number; colorClass: string; buildoutYear: string }) {
  const mult = base > 0 ? scen / base : 0;
  const slots = Math.max(6, Math.ceil(mult));
  const track = 'border-zinc-200 bg-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-800/60';
  return <div className="group relative rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex items-baseline justify-between gap-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h4>
      <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {base > 0 ? <>{mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}×<span className="ml-1 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">zu 2025</span></> : '–'}
      </span>
    </div>
    <div className="mt-3 grid grid-cols-6 gap-1.5" aria-label={`${mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-fach gegenüber 2025`}>
      {Array.from({ length: slots }, (_, i) => i).map(i => {
        const pct = Math.round(Math.max(0, Math.min(1, mult - i)) * 100);
        return <span key={i} className={cx('relative h-3.5 overflow-hidden rounded-[3px] border', track)}>
          {pct > 0 && <span className={cx('absolute inset-y-0 left-0', colorClass)} style={{ width: `${pct}%` }}/>}
        </span>;
      })}
    </div>
    <div className="mt-2 flex items-baseline justify-between gap-3 text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
      <span>heute {fmtMass(base)}</span>
      <span>bis {buildoutYear} <span className="font-medium text-zinc-600 dark:text-zinc-300">{fmtMass(scen)}</span></span>
    </div>
    <div className="pointer-events-none absolute left-3 top-full z-30 mt-1 w-[min(280px,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white p-3 text-xs opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="grid gap-1.5">
        <div className="flex justify-between gap-4"><span className="text-zinc-500 dark:text-zinc-400">Heute (2025)</span><span className="font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{fmtMass(base)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-zinc-500 dark:text-zinc-400">Bis {buildoutYear}</span><span className="font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{fmtMass(scen)}</span></div>
      </div>
      <div className="mt-2 border-t border-zinc-100 pt-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Gesamtbedarf über den Aufbauzeitraum. Eine Kachel = Materialbedarf des deutschen Energiesystems 2025 über denselben Zeitraum.</div>
    </div>
  </div>;
}

type MaterialRow = { m: string; label: string; cat: 'bulk' | 'spezial' | 'brennstoff'; s: number; b: number; pct: number; pctDE: number | null };

// Stufige, absolut definierte Farbskala für den Anteil an der globalen
// Jahresförderung: vier klar unterscheidbare Klassen statt kontinuierlicher
// Alphawerte — dadurch ist die Legende eine echte Skala und die Färbung
// über Szenarien hinweg vergleichbar.
const PCT_STEPS = [
  { min: 0.5, label: '≥ 0,5', cls: 'bg-sky-800 text-white ring-sky-900/40 dark:bg-sky-400 dark:text-sky-950 dark:ring-sky-300/60' },
  { min: 0.1, label: '0,1–0,5', cls: 'bg-sky-600 text-white ring-sky-700/40 dark:bg-sky-600 dark:text-white dark:ring-sky-500/60' },
  { min: 0.01, label: '0,01–0,1', cls: 'bg-sky-300 text-sky-950 ring-sky-400/50 dark:bg-sky-800 dark:text-sky-100 dark:ring-sky-700/60' },
  { min: 0, label: '< 0,01', cls: 'bg-sky-100 text-sky-800 ring-sky-300/60 dark:bg-sky-950 dark:text-sky-300 dark:ring-sky-800/80' },
] as const;
const stepFor = (pct: number) => PCT_STEPS.find(s => pct >= s.min) ?? PCT_STEPS[3];

// Skala + Materialien ohne Element-Kachel (Beton/Zement, Erdgas). Sitzt auf
// Desktop fachbuchartig im natürlichen Freiraum des Periodensystems
// (Zeilen 1–3, Spalten 3–12), auf Mobile unterhalb der Tabelle.
function ScaleLegend({ chips }: { chips: MaterialRow[] }) {
  return <div className="flex min-w-0 flex-col gap-2">
    <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Füllung = Anteil an der Welt-Jahresförderung in % · Grau = nicht benötigt</div>
    <div className="flex items-start gap-px">
      {[...PCT_STEPS].reverse().map(s => <div key={s.min} className="flex w-[4.5rem] flex-col items-stretch gap-1">
        <span className={cx('h-2.5 rounded-[2px] ring-1 ring-inset', s.cls)}/>
        <span className="text-center text-[9px] tabular-nums text-zinc-400 dark:text-zinc-500">{s.label}</span>
      </div>)}
    </div>
    {chips.length > 0 && <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
      <span className="text-zinc-400 dark:text-zinc-500">Ohne Element-Kachel:</span>
      {chips.map(r => <span key={r.m} className={cx('inline-flex items-center rounded-[3px] px-1.5 py-0.5 font-medium tabular-nums ring-1 ring-inset', stepFor(r.pct).cls)}>
        {r.label} · {fmtMass(r.s)}/a · {pctStr(r.pct)}
      </span>)}
    </div>}
  </div>;
}

// Signatur-Element der Sektion: ein Periodensystem, in dem die Szenario-
// Materialien aufleuchten. Genutzte Elemente tragen Wert-Badge (% Welt) und
// Stufenfarbe, ungenutzte sind stille Kulisse.
function PeriodicTable({ rows }: { rows: MaterialRow[] }) {
  const bySymbol = new Map<string, MaterialRow>();
  for (const r of rows) {
    const symbol = MATERIAL_ELEMENT[r.m];
    if (symbol && r.s > 0) bySymbol.set(symbol, r);
  }
  const chips = rows.filter(r => NON_ELEMENT_MATERIALS.includes(r.m) && r.s > 0);

  return <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Was das Szenario aus dem Periodensystem braucht</h3>
    <div className="mt-3 overflow-x-auto">
      <div className="grid w-full min-w-[480px] gap-[3px]" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
        <div className="z-10 hidden items-center md:flex" style={{ gridRow: '1 / 4', gridColumn: '3 / 13' }}>
          <ScaleLegend chips={chips}/>
        </div>
        {ELEMENTS.map(el => {
          const hit = bySymbol.get(el.symbol);
          if (!hit) return <div
            key={el.symbol}
            className="grid aspect-square place-items-center rounded-[3px] bg-zinc-100/70 text-[8px] leading-none text-zinc-300 sm:text-[9px] dark:bg-zinc-900/50 dark:text-zinc-700"
            style={{ gridRow: el.row, gridColumn: el.col }}
          >{el.symbol}</div>;
          return <div
            key={el.symbol}
            className={cx('group/el relative flex aspect-square cursor-help flex-col items-center justify-center rounded-[4px] leading-none shadow-sm ring-1 ring-inset', stepFor(hit.pct).cls)}
            style={{ gridRow: el.row, gridColumn: el.col }}
          >
            <span className="text-[10px] font-bold sm:text-xs">{el.symbol}</span>
            <span className="mt-1 hidden text-[8px] font-medium tabular-nums opacity-85 sm:block lg:text-[9px]">{pctStr(hit.pct)}</span>
            <span className={cx(
              'pointer-events-none absolute z-30 hidden w-max rounded-md border border-zinc-200 bg-white p-2 text-left text-[11px] font-normal leading-snug text-zinc-600 shadow-lg group-hover/el:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
              el.row <= 4 ? 'top-full mt-1' : 'bottom-full mb-1',
              el.col <= 2 ? 'left-0' : 'left-1/2 -translate-x-1/2',
            )}>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">{hit.label}</span><br/>
              {fmtMass(hit.s)}/a · {factorStr(hit.s, hit.b)} zu 2025<br/>
              {pctStr(hit.pct)} der Weltförderung{hit.pctDE != null ? <><br/>{pctStr(hit.pctDE)} des DE-Jahresverbrauchs</> : null}
            </span>
          </div>;
        })}
      </div>
    </div>
    <div className="mt-3 md:hidden"><ScaleLegend chips={chips}/></div>
    <details className="group/det mt-3 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open/det:rotate-90"/>
        Details je Rohstoff
      </summary>
      <dl className="mt-3">
        <div className="grid grid-cols-[minmax(0,1fr)_4rem_5rem_5rem] gap-x-3 border-b border-zinc-200 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          <dt>Rohstoff</dt>
          <ColHead label="× 2025" hint="Vielfaches gegenüber dem deutschen Energiesystem 2025 (Kraftwerks-/Speicherflotte)"/>
          <ColHead label="% DE" hint="Anteil am gesamten deutschen Jahresverbrauch des Rohstoffs (alle Sektoren)"/>
          <ColHead label="% Welt" hint="Anteil an der globalen Jahresförderung"/>
        </div>
        {([
          ['bulk', 'Beton, Stahl & Aluminium'],
          ['spezial', 'Spezialmaterialien'],
          ['brennstoff', 'Brennstoff (Kohle, Erdgas)'],
        ] as const).map(([key, title]) => {
          const grp = rows.filter(r => r.cat === key);
          if (!grp.length) return null;
          return <Fragment key={key}>
            <div className="pt-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{title}</div>
            {grp.map(r => <div key={r.m} className="grid grid-cols-[minmax(0,1fr)_4rem_5rem_5rem] items-center gap-x-3 border-b border-zinc-100 py-1.5 text-sm dark:border-zinc-800">
              <dt className="flex items-center gap-2 truncate text-zinc-700 dark:text-zinc-300"><span className={cx('inline-block h-2 w-2 shrink-0 rounded-sm', catColor(r.m))}/>{r.label}</dt>
              <dd className="text-right tabular-nums text-zinc-950 dark:text-zinc-50">{factorStr(r.s, r.b)}</dd>
              <dd className="text-right tabular-nums text-zinc-950 dark:text-zinc-50">{r.pctDE == null ? '–' : pctStr(r.pctDE)}</dd>
              <dd className="text-right tabular-nums text-zinc-950 dark:text-zinc-50">{pctStr(r.pct)}</dd>
            </div>)}
          </Fragment>;
        })}
      </dl>
    </details>
  </div>;
}

export default function RessourcenSection({ scenario, buildoutYear, data }: { scenario: Scenario; buildoutYear: string; data: DataSet | null }) {
  const buildoutYears = Math.max(1, Number(buildoutYear) - 2025);

  const { scen, base, rows } = useMemo(() => {
    const scA = annualByMaterial(scenario, buildoutYears, e100ElectricTWh(scenario, data));
    const baseA = annualByMaterial(scenarioBase, buildoutYears, e100ElectricTWh(scenarioBase, data));
    const materials = uiManifest.materials as Record<string, MaterialInfo>;
    const rows = Object.keys(materials).map(m => {
      const s = scA[m] ?? 0, b = baseA[m] ?? 0, world = materials[m].globalProductionTPerYear;
      const de = materials[m].germanyDemandTPerYear ?? 0;
      const cat: 'bulk' | 'spezial' | 'brennstoff' = FUEL.has(m) ? 'brennstoff' : BULK.has(m) ? 'bulk' : 'spezial';
      return { m, label: materials[m].label, cat, s, b, world, pct: world > 0 ? s / world * 100 : 0, pctDE: de > 0 ? s / de * 100 : null };
    }).filter(r => r.s > 0 || r.b > 0).sort((a, x) => x.pct - a.pct);
    return { scen: groupSums(scA), base: groupSums(baseA), rows };
  }, [scenario, buildoutYears, data]);

  return <section id="section-ressourcen" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <SectionHeading id="ressourcen"/>

    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <PeriodicTable rows={rows}/>
      <div className="grid content-start gap-3 sm:grid-cols-3 lg:grid-cols-1">
        <MultipleTiles title="Beton, Stahl & Alu" base={base.bulk * buildoutYears} scen={scen.bulk * buildoutYears} colorClass="bg-zinc-400 dark:bg-zinc-500" buildoutYear={buildoutYear}/>
        <MultipleTiles title="Spezialmaterialien" base={base.spezial * buildoutYears} scen={scen.spezial * buildoutYears} colorClass="bg-zinc-600 dark:bg-zinc-300" buildoutYear={buildoutYear}/>
        <MultipleTiles title="Brennstoff" base={base.brennstoff * buildoutYears} scen={scen.brennstoff * buildoutYears} colorClass="bg-stone-700 dark:bg-stone-400" buildoutYear={buildoutYear}/>
      </div>
    </div>

    <details className="group px-1">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90"/>
        Wie wird der Materialbedarf berechnet?
      </summary>
      <p className={cx(muted, 'mt-2 text-xs leading-5')}>
        Die oberen Kacheln zeigen den <strong>Gesamtbedarf über den Aufbauzeitraum</strong> bis {buildoutYear}: „Heute" = Material des deutschen Energiesystems 2025 (Erzeugung + Speicher + die 2025 bereits elektrische Flotte: ~2 Mio. E-Pkw, Wärmepumpen-Bestand, elektrifizierte Bahn) über denselben Zeitraum, „Bis {buildoutYear}" = aktuelles Szenario inkl. gesamter elektrifizierter Last. Erzeugung/Speicher kapazitätsgebunden, mit <strong>Erneuerung über Lebensdauer</strong> (Bau-Material × <code>max(1, Horizont/Lebensdauer)</code> je Technologie — Batterie 15 a, PV/Gas/H₂ 30 a, Wind/Biomasse 25 a, Kohle 35 a, Kernkraft 45 a, Pumpspeicher/Laufwasser 60 a; analog zur annuisierten Kostenseite); elektrifizierte Last (E-Pkw/-Lkw, Wärmepumpen, Bahn) = nur das Antriebs-/Aggregat-Delta je TWh Zusatznachfrage (Schiff, Flug, Industriewärme, Stahl, Chemie noch nicht enthalten); Brennstoff (Kohle/Erdgas/Uran) = Kapazität × Volllaststunden, über den Zeitraum summiert. Die <strong>Details je Rohstoff</strong> bleiben auf Jahresbasis (dimensionsrein gegenüber der Jahresproduktion): „× 2025" = Vielfaches gegenüber dem deutschen Energiesystem 2025 (Kraftwerks-/Speicherflotte; für Bau-Material identisch zur Gesamt-Sicht), „% DE" = Anteil am gesamten deutschen Jahresverbrauch des Rohstoffs (alle Sektoren; kritische Metalle teils abgeleitet/unsicher, Uran „–" mangels Reaktoren), „% Welt" = Anteil an der globalen Jahresförderung. Quellen je Technologie im Datenhandbuch (USGS, IEA, worldsteel, WNA). Der deutsche Jahresverbrauch (% DE) ist für Stahl, Zement, Aluminium, Kupfer, Kohle und Gas gut belegt; für kritische Metalle (Lithium, Kobalt, Nickel, Seltene Erden, Mangan, Chrom, Molybdän, Silizium) nur über Endanwendungen abgeleitet (niedrige Konfidenz). Recycling und Netzinfrastruktur sind nicht enthalten.
      </p>
    </details>
  </section>;
}
