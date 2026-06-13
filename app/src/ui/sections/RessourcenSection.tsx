import { Fragment, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import type { DataSet } from '../../types/data';
import type { SimulationResult } from '../../types/simulation';
import { HelpDot, HelpPanel, SectionHeading, ViewPill, type SectionView } from '../sectionUi';
import { e100ElectricTWh } from '../ScenarioSidebar';
import { cx } from '../ui';
import { defaultScenario, normalizeScenario } from '../scenarioPresets';
import { annualByMaterial, BULK, FUEL, type MaterialInfo, fuelTWhBase2025, fuelTWhFromResult } from '../ressourcen';
import { uiManifest } from '../uiManifest';
import { ELEMENTS, MATERIAL_ELEMENT } from '../periodicElements';

const scenarioBase = normalizeScenario(defaultScenario);

const catColor = (m: string) => FUEL.has(m) ? 'bg-stone-700 dark:bg-stone-400' : BULK.has(m) ? 'bg-zinc-400 dark:bg-zinc-500' : 'bg-zinc-600 dark:bg-zinc-300';

const fmtMass = (t: number) => t >= 1e6
  ? `${(t / 1e6).toLocaleString('de-DE', { maximumFractionDigits: t / 1e6 < 10 ? 1 : 0 })} Mt`
  : `${(t / 1e3).toLocaleString('de-DE', { maximumFractionDigits: t / 1e3 < 10 ? 1 : 0 })} kt`;
const factorStr = (scen: number, base: number) => base > 0 ? `${(scen / base).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` : (scen > 0 ? 'neu' : '–');
const pctStr = (p: number) => p <= 0 ? '0 %' : p < 0.01 ? '<0,01 %' : `${p.toLocaleString('de-DE', { maximumFractionDigits: p < 1 ? 2 : 1 })} %`;
// Kompakt fürs Kachel-Badge: ohne Leerzeichen vor %, damit es auch in schmalen
// Kacheln einzeilig bleibt (Tabelle/Tooltips nutzen die ausführliche Form).
const pctBadge = (p: number) => pctStr(p).replace(/\s+%$/, '%');

// Spaltenkopf mit sofortigem Hover-Tooltip (statt traegem nativem title).
function ColHead({ label, hint }: { label: string; hint: string }) {
  return <dt className="group/h relative cursor-help text-right underline decoration-dotted decoration-zinc-300 underline-offset-2">
    {label}
    <span className="pointer-events-none absolute right-0 top-full z-40 mt-1 hidden w-max max-w-[220px] rounded-md border border-zinc-200 bg-white p-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-600 shadow-lg group-hover/h:block dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{hint}</span>
  </dt>;
}

type MaterialRow = { m: string; label: string; cat: 'bulk' | 'spezial' | 'brennstoff'; s: number; b: number; pct: number; pctDE: number | null };

// Slot-Reihe: eine Kachel = 1× heutiger Bedarf, Füllung = Vielfaches.
// Immer mindestens eine volle 6er-Zeile, damit Headroom sichtbar ist.
function SlotRow({ mult, colorClass }: { mult: number; colorClass: string }) {
  const slots = Math.max(6, Math.ceil(mult));
  const track = 'border-zinc-200 bg-zinc-100 dark:border-zinc-700/70 dark:bg-zinc-800/60';
  return <div className="grid grid-cols-6 gap-1.5" aria-label={`${mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}-fach gegenüber 2025`}>
    {Array.from({ length: slots }, (_, i) => i).map(i => {
      const pct = Math.round(Math.max(0, Math.min(1, mult - i)) * 100);
      return <span key={i} className={cx('relative h-3.5 overflow-hidden rounded-[3px] border', track)}>
        {pct > 0 && <span className={cx('absolute inset-y-0 left-0', colorClass)} style={{ width: `${pct}%` }}/>}
      </span>;
    })}
  </div>;
}

const multStr = (mult: number, base: number) => base > 0
  ? <>{mult.toLocaleString('de-DE', { maximumFractionDigits: 1 })}×<span className="ml-1 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">2025</span></>
  : <>neu</>;

// Bedarfs-Karte mit Ausklapper: zusammengeklappt der kombinierte Balken der
// Gruppe, aufgeklappt eine Zeile mit eigenem Balken je Material.
function MultiMaterialTiles({ title, rows, colorClass, forceOpen }: { title: string; rows: MaterialRow[]; colorClass: string; forceOpen?: boolean }) {
  const sorted = [...rows].sort((a, b) => b.s - a.s);
  const scen = rows.reduce((sum, r) => sum + r.s, 0);
  const base = rows.reduce((sum, r) => sum + r.b, 0);
  const mult = base > 0 ? scen / base : 0;
  return <details open={forceOpen} className="group/mat rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-open/mat:rotate-90 dark:text-zinc-500"/>
          <span className="truncate">{title}</span>
        </h4>
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          {multStr(mult, base)}
          <span className="ml-1.5 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">({fmtMass(scen)}/a)</span>
        </span>
      </div>
      <div className="mt-3" title="Eine Kachel = Jahresbedarf des deutschen Energiesystems 2025 (Erneuerung über Lebensdauer anteilig eingerechnet)."><SlotRow mult={mult} colorClass={colorClass}/></div>
    </summary>
    <div className="mt-3 flex flex-col gap-2.5 border-t border-zinc-100 pt-2.5 dark:border-zinc-800">
      {sorted.map(r => {
        const rowMult = r.b > 0 ? r.s / r.b : 0;
        return <div key={r.m}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{r.label}</span>
            <span className="whitespace-nowrap text-xs font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {multStr(rowMult, r.b)}
              <span className="ml-1.5 text-[10px] font-normal text-zinc-400 dark:text-zinc-500">({fmtMass(r.s)}/a)</span>
            </span>
          </div>
          <div className="mt-1"><SlotRow mult={rowMult} colorClass={colorClass}/></div>
        </div>;
      })}
    </div>
  </details>;
}

// CO₂-Ausstoß als Output-Karte: gleiche Kachel-Metapher, aber Emission statt
// Materialbedarf — bewusst abgesetzt (rote Füllung, Output-Fußnote). Anker für
// das Vielfache ist der 2025-Replay-Messwert aus historisch-2025.
function Co2Card({ result, forceOpen }: { result: SimulationResult; forceOpen?: boolean }) {
  const base2025 = Number((uiManifest.historisch2025 as Record<string, unknown>).co2MtPerYear) || 0;
  const scenMt = result.summary.co2MtPerYear;
  const baseMt = base2025;
  const mult = baseMt > 0 ? scenMt / baseMt : 0;
  return <details open={forceOpen} className="group/co2 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-baseline justify-between gap-4">
        <h4 className="flex min-w-0 items-center gap-1 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-open/co2:rotate-90 dark:text-zinc-500"/>
          <span className="truncate">CO₂-Stromsektor</span>
        </h4>
        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
          {multStr(mult, baseMt)}
          <span className="ml-1.5 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">({fmtMass(scenMt * 1e6)}/a)</span>
        </span>
      </div>
      <div className="mt-3" title="Eine Kachel = CO₂-Jahresausstoß des deutschen Stromsystems 2025."><SlotRow mult={mult} colorClass="bg-zinc-500 dark:bg-zinc-400"/></div>
    </summary>
    <div className="mt-3 border-t border-zinc-100 pt-2.5 text-[11px] leading-4 text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
      Output aus der Stundensimulation. 1× = öffentliche Stromerzeugung 2025 inkl. Importen, ohne Fernwärme — nicht die deutschen Gesamtemissionen (~650 Mt); bei Elektrifizierung deckt das simulierte System zusätzliche Sektoren ab, verdrängte fossile Emissionen werden nicht gutgeschrieben.
    </div>
  </details>;
}

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

// Signatur-Element der Sektion: ein Periodensystem, in dem die Szenario-
// Materialien aufleuchten. Genutzte Elemente tragen Wert-Badge (% Welt) und
// Stufenfarbe, ungenutzte sind stille Kulisse.
function PeriodicTable({ rows }: { rows: MaterialRow[] }) {
  const bySymbol = new Map<string, MaterialRow>();
  for (const r of rows) {
    const symbol = MATERIAL_ELEMENT[r.m];
    if (symbol && r.s > 0) bySymbol.set(symbol, r);
  }

  // Rahmenlose Abbildung (analog zur Deutschlandkarte der Fläche-Sektion):
  // ohne Padding, damit die letzte Element-Reihe die Unterkante des Bento-
  // Grids definiert und die rechte Kartenspalte exakt damit abschließt.
  return <div>
    <div className="@container overflow-x-auto">
      <div className="grid w-full min-w-[480px] gap-[3px]" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))' }}>
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
            {/* Badge nur, wenn die Kacheln breit genug sind — gemessen an der
                Tabellenbreite (Container-Query), nicht am Viewport: bei offener
                Sidebar sind die Kacheln sonst zu schmal und der Wert läuft über. */}
            <span className="mt-1 hidden whitespace-nowrap text-[8px] font-medium tabular-nums opacity-85 @[42rem]:block @[54rem]:text-[9px]">{pctBadge(hit.pct)}</span>
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
  </div>;
}

// Rohstoff-Tabelle (Details-Ansicht der linken Spalte).
function RohstoffTable({ rows }: { rows: MaterialRow[] }) {
  return <dl className="px-1">
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
    </dl>;
}

export default function RessourcenSection({ scenario, result, periodYears, data }: { scenario: Scenario; result: SimulationResult; periodYears: string; data: DataSet | null }) {
  const buildoutYears = Math.max(1, Number(periodYears));
  // Methodik-Text hinter dem Fragezeichen neben der Überschrift.
  const [helpOpen, setHelpOpen] = useState(false);
  // Linke Spalte: Periodensystem (Grafisch) oder Rohstoff-Tabelle (Details).
  const [view, setView] = useState<SectionView>('grafisch');

  const { rows } = useMemo(() => {
    // Brennstoffmengen folgen dem Dispatch des Szenarios; die 1×-Basis nutzt
    // die dokumentierte Ist-Erzeugung 2025 (historisch-2025-Paket).
    const scA = annualByMaterial(scenario, buildoutYears, e100ElectricTWh(scenario, data), fuelTWhFromResult(result));
    const baseA = annualByMaterial(scenarioBase, buildoutYears, e100ElectricTWh(scenarioBase, data), fuelTWhBase2025());
    const materials = uiManifest.materials as Record<string, MaterialInfo>;
    const rows = Object.keys(materials).map(m => {
      const s = scA[m] ?? 0, b = baseA[m] ?? 0, world = materials[m].globalProductionTPerYear;
      const de = materials[m].germanyDemandTPerYear ?? 0;
      const cat: 'bulk' | 'spezial' | 'brennstoff' = FUEL.has(m) ? 'brennstoff' : BULK.has(m) ? 'bulk' : 'spezial';
      return { m, label: materials[m].label, cat, s, b, world, pct: world > 0 ? s / world * 100 : 0, pctDE: de > 0 ? s / de * 100 : null };
    }).filter(r => r.s > 0 || r.b > 0).sort((a, x) => x.pct - a.pct);
    return { rows };
  }, [scenario, buildoutYears, data, result]);

  return <section id="section-ressourcen" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pb-8 pt-10 dark:border-zinc-800">
    <div className="flex items-center gap-2">
      <SectionHeading id="ressourcen"/>
      <HelpDot open={helpOpen} onToggle={() => setHelpOpen(open => !open)} label="Wie wird der Materialbedarf berechnet?"/>
      <div className="ml-auto"><ViewPill view={view} onChange={setView}/></div>
    </div>
    {helpOpen && <HelpPanel>
      <p>Die Kacheln rechts zeigen den <strong>jährlichen Materialbedarf</strong>. Eine Kachel (1×) entspricht dem Jahresbedarf des deutschen Energiesystems 2025; Erneuerung über Lebensdauer ist anteilig eingerechnet.</p>
      <ul>
        <li><strong>Basis (1×)</strong> — Material des Energiesystems 2025: Erzeugung, Speicher und die schon elektrische Flotte (~2 Mio. E-Pkw, Wärmepumpen-Bestand, elektrifizierte Bahn).</li>
        <li><strong>Erneuerung über Lebensdauer</strong> — Bau-Material × <code>max(1, Horizont/Lebensdauer)</code> je Technologie: Batterie 15 a, PV/Gas/H₂ 30 a, Wind/Biomasse 25 a, Kohle 35 a, Kernkraft 45 a, Pumpspeicher/Laufwasser 60 a (analog zur annuisierten Kostenseite).</li>
        <li><strong>Elektrifizierte Last</strong> — das Antriebs-/Aggregat-Delta je TWh Zusatznachfrage (E-Pkw/-Lkw, Wärmepumpen, Bahn), ebenfalls erneuerungs-aware: E-Pkw/Wärmepumpen 18 a, E-Lkw 12 a, Bahn-Oberleitung 40 a. Schiff, Flug, Industriewärme, Stahl und Chemie sind noch nicht enthalten.</li>
        <li><strong>Brennstoff</strong> — Kohle, Erdgas und Uran aus der <em>simulierten Erzeugung</em> der Stundensimulation (t je TWh × dispatchte TWh; 1× = Ist-Erzeugung 2025); importierter Wasserstoff als Massenstrom (33,33 kWh/kg LHV). Inlands-Elektrolyse zählt nicht doppelt — ihr Strom und ihre Anlagen sind bereits erfasst.</li>
      </ul>
      <p>Die <strong>Details je Rohstoff</strong> bleiben auf Jahresbasis (dimensionsrein gegenüber der Jahresproduktion):</p>
      <ul>
        <li><strong>× 2025</strong> — Vielfaches gegenüber dem deutschen Energiesystem 2025 (Kraftwerks-/Speicherflotte; für Bau-Material identisch zur Gesamt-Sicht).</li>
        <li><strong>% DE</strong> — Anteil am gesamten deutschen Jahresverbrauch des Rohstoffs (alle Sektoren). Für Stahl, Zement, Aluminium, Kupfer, Kohle und Gas gut belegt; für kritische Metalle (Lithium, Kobalt, Nickel, Seltene Erden, Mangan, Chrom, Molybdän, Silizium) nur über Endanwendungen abgeleitet (niedrige Konfidenz); Uran „–" mangels Reaktoren.</li>
        <li><strong>% Welt</strong> — Anteil an der globalen Jahresförderung.</li>
      </ul>
      <p><strong>Nicht enthalten:</strong> Recycling und Netzinfrastruktur. Quellen je Technologie im Datenhandbuch (USGS, IEA, worldsteel, WNA).</p>
    </HelpPanel>}

    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-6">
      {view === 'grafisch' ? <PeriodicTable rows={rows}/> : <RohstoffTable rows={rows}/>}
      <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:flex-col">
        <MultiMaterialTiles title="Beton, Stahl & Alu" rows={rows.filter(r => r.cat === 'bulk' && (r.s > 0 || r.b > 0))} colorClass="bg-zinc-400 dark:bg-zinc-500" forceOpen={view === 'details'}/>
        <MultiMaterialTiles title="Spezialmaterialien" rows={rows.filter(r => r.cat === 'spezial' && (r.s > 0 || r.b > 0))} colorClass="bg-zinc-600 dark:bg-zinc-300" forceOpen={view === 'details'}/>
        <MultiMaterialTiles title="Brennstoff" rows={rows.filter(r => r.cat === 'brennstoff' && (r.s > 0 || r.b > 0))} colorClass="bg-stone-700 dark:bg-stone-400" forceOpen={view === 'details'}/>
        <Co2Card result={result} forceOpen={view === 'details'}/>
      </div>
    </div>
  </section>;
}
