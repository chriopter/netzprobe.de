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
function MultipleTiles({ title, base, scen, colorClass, buildoutYear, continuous }: { title: string; base: number; scen: number; colorClass: string; buildoutYear: string; continuous?: boolean }) {
  const mult = base > 0 ? scen / base : 0;
  const visible = Math.max(1, Math.ceil(mult));
  return <div className="group relative px-3 py-2.5">
    <div className="flex items-baseline justify-between gap-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{title}</h4>
      <span className="text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{base > 0 ? `${mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}× zu 2025` : '–'}</span>
    </div>
    {continuous
      ? <div className="mt-3 flex flex-col gap-1" aria-label={`${mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-fach gegenüber 2025`}>
          {Array.from({ length: Math.max(1, Math.ceil(mult)) }, (_, i) => i).map(i => {
            const pct = Math.round(Math.max(0, Math.min(1, mult - i)) * 100);
            return <div key={i} className="h-3.5 w-full overflow-hidden rounded-full border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700">
              {pct > 0 && <div className={cx('h-full', colorClass)} style={{ width: `${pct}%` }}/>}
            </div>;
          })}
        </div>
      : <div className="mt-3 grid grid-cols-12 gap-1.5" aria-label={`${mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-fach gegenüber 2025`}>
          {Array.from({ length: visible }, (_, i) => i).map(i => {
            const pct = Math.round(Math.max(0, Math.min(1, mult - i)) * 100);
            return <span key={i} className="relative h-3.5 overflow-hidden rounded-[3px] border border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-700">
              {pct > 0 && <span className={cx('absolute inset-y-0 left-0', colorClass)} style={{ width: `${pct}%` }}/>}
            </span>;
          })}
        </div>}
    <div className="pointer-events-none absolute left-3 top-full z-30 mt-1 w-[min(280px,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white p-3 text-xs opacity-0 shadow-lg transition group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="grid gap-1.5">
        <div className="flex justify-between gap-4"><span className="text-zinc-500 dark:text-zinc-400">Heute (2025)</span><span className="font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{fmtMass(base)}</span></div>
        <div className="flex justify-between gap-4"><span className="text-zinc-500 dark:text-zinc-400">Bis {buildoutYear}</span><span className="font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{fmtMass(scen)}</span></div>
      </div>
      <div className="mt-2 border-t border-zinc-100 pt-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Gesamtbedarf über den Aufbauzeitraum. Eine Kachel = Materialbedarf des deutschen Energiesystems 2025 über denselben Zeitraum.</div>
    </div>
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

    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white py-1 dark:border-zinc-800 dark:bg-zinc-950">
      <MultipleTiles title={`Beton, Stahl & Aluminium · gesamt bis ${buildoutYear}`} base={base.bulk * buildoutYears} scen={scen.bulk * buildoutYears} colorClass="bg-zinc-400 dark:bg-zinc-500" buildoutYear={buildoutYear}/>
      <MultipleTiles title={`Spezialmaterialien · gesamt bis ${buildoutYear}`} base={base.spezial * buildoutYears} scen={scen.spezial * buildoutYears} colorClass="bg-zinc-600 dark:bg-zinc-300" buildoutYear={buildoutYear}/>
      <MultipleTiles title={`Brennstoff (Kohle, Erdgas) · gesamt bis ${buildoutYear}`} base={base.brennstoff * buildoutYears} scen={scen.brennstoff * buildoutYears} colorClass="bg-stone-700 dark:bg-stone-400" buildoutYear={buildoutYear} continuous/>
    </div>

    <details className="group rounded-lg border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90"/>
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

    <details className="group px-1">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90"/>
        Wie wird der Materialbedarf berechnet?
      </summary>
      <p className={cx(muted, 'mt-2 text-xs leading-5')}>
        Die oberen Kacheln zeigen den <strong>Gesamtbedarf über den Aufbauzeitraum</strong> bis {buildoutYear}: „Heute" = Material des deutschen Energiesystems 2025 (Erzeugung + Speicher + die 2025 bereits elektrische Flotte: ~2 Mio. E-Pkw, Wärmepumpen-Bestand, elektrifizierte Bahn) über denselben Zeitraum, „Bis {buildoutYear}" = aktuelles Szenario inkl. gesamter elektrifizierter Last. Erzeugung/Speicher kapazitätsgebunden (einmaliger Bau); elektrifizierte Last (E-Pkw/-Lkw, Wärmepumpen, Bahn) = nur das Antriebs-/Aggregat-Delta je TWh Zusatznachfrage (Schiff, Flug, Industriewärme, Stahl, Chemie noch nicht enthalten); Brennstoff (Kohle/Erdgas/Uran) = Kapazität × Volllaststunden, über den Zeitraum summiert. Die <strong>Details je Rohstoff</strong> bleiben auf Jahresbasis (dimensionsrein gegenüber der Jahresproduktion): „× 2025" = Vielfaches gegenüber dem deutschen Energiesystem 2025 (Kraftwerks-/Speicherflotte; für Bau-Material identisch zur Gesamt-Sicht), „% DE" = Anteil am gesamten deutschen Jahresverbrauch des Rohstoffs (alle Sektoren; kritische Metalle teils abgeleitet/unsicher, Uran „–" mangels Reaktoren), „% Welt" = Anteil an der globalen Jahresförderung. Quellen je Technologie im Datenhandbuch (USGS, IEA, worldsteel, WNA). Der deutsche Jahresverbrauch (% DE) ist für Stahl, Zement, Aluminium, Kupfer, Kohle und Gas gut belegt; für kritische Metalle (Lithium, Kobalt, Nickel, Seltene Erden, Mangan, Chrom, Molybdän, Silizium) nur über Endanwendungen abgeleitet (niedrige Konfidenz). Recycling und Netzinfrastruktur sind nicht enthalten.
      </p>
    </details>
  </section>;
}
