import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { Scenario } from '../types/scenario';
import type { SimulationResult } from '../types/simulation';
import { defaultScenario, normalizeScenario } from './scenarioPresets';
import { uiManifest } from './uiManifest';
import { fmt, fmt0 } from './format';
import { cx, muted } from './ui';

// CO2-freier Zubau seit 2000 als Dreisatz: was 2000 am Netz war, was heute am
// Netz ist, was Vollelektrifizierung braucht — und welcher Anteil der Luecke
// damit gebaut ist.

// 2000: Nettostromerzeugung Deutschland, AG Energiebilanzen (Datenstand
// 15.02.2024). Kernenergie 160,8 TWh; erneuerbar ohne Hausmuell = Wind onshore
// 9,3 + Wind offshore 0,0 + Wasserkraft 24,6 + Biomasse 1,5 + PV 0,0 +
// Geothermie 0,0. Hausmuell bleibt draussen, damit die Abgrenzung dieselbe ist
// wie beim 2025-Wert unten (dort zaehlt wasteTWh ebenfalls nicht als EE).
const KERNKRAFT_2000_TWH = 160.8;
const EE_2000_TWH = 35.4;
const QUELLE_2000 = 'https://ag-energiebilanzen.de/wp-content/uploads/2024/04/STRERZ_Abg_02_2024_korr.pdf';

// 2025: beobachtete Erzeugung aus model/erzeugung/2025 (Energy-Charts).
// Kernkraft ist seit dem Ausstieg 2023 null, CO2-frei ist also reine EE.
const EE_TEILE_2025 = ['pvTWh', 'windOnTWh', 'windOffTWh', 'hydroTWh', 'biomassTWh', 'geothermalTWh'] as const;

const EE_2025_TWH = (() => {
  const teile = uiManifest.generation2025.sumPartsTWh as Record<string, number> | undefined;
  if (!teile) return 0;
  return EE_TEILE_2025.reduce((summe, key) => summe + (teile[key] ?? 0), 0);
})();
const twh0 = (n: number) => `${fmt0.format(n)} TWh`;
// Alles, was aus dem e100-Szenario faellt, ist geschaetzt — die gemessene
// Historie (196/264/68 TWh) nicht. Nur Ersteres bekommt ein ≈.
const caTwh0 = (n: number) => `≈ ${fmt0.format(n)} TWh`;
const CO2FREI_2000_TWH = KERNKRAFT_2000_TWH + EE_2000_TWH;
// Kernkraft ist seit 2023 null, CO2-frei ist heute also reine EE.
const CO2FREI_2025_TWH = EE_2025_TWH;
const ZUBAU_TWH = CO2FREI_2025_TWH - CO2FREI_2000_TWH;
// Brutto-EE-Zubau: der Saldo oben verschweigt, dass ein Teil nur Kernkraft ersetzt hat.
const EE_ZUBAU_BRUTTO_TWH = EE_2025_TWH - EE_2000_TWH;

const JAHR_BASIS = 2000;
const JAHR_HEUTE = 2025;
const JAHR_ZIEL = 2045;

// Vollelektrifizierung = alle zehn e100-Sektoren an (identisch zu ?e=e100).
const e100Scenario = (): Scenario => {
  const base = normalizeScenario(defaultScenario);
  return {
    ...base,
    demand: {
      ...base.demand,
      'e100-pkw': true,
      'e100-heiz': true,
      'e100-lkw': true,
      'e100-bahn': true,
      'e100-schiff': true,
      'e100-flug': true,
      'e100-ghd': true,
      'e100-industrie-waerme': true,
      'e100-stahl': true,
      'e100-chemie': true,
    },
  };
};

function useE100BedarfTWh(): { twh: number | null; failed: boolean } {
  const [twh, setTwh] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scenario: e100Scenario(),
        view: { start: '2025-01-01', end: '2025-12-31', maxPoints: 365 },
      }),
      signal: abort.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<SimulationResult>;
      })
      .then(result => {
        const s = result.summary;
        setTwh(s.totalDemandTWh + (s.h2PoolStromReductionTWh ?? 0));
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('E100-Bedarf konnte nicht gerechnet werden:', error);
        setFailed(true);
      });
    return () => abort.abort();
  }, []);
  return { twh, failed };
}

// Gemeinsame Optik der Einblendungen: dunkle Karte mit Kopfzeile aus Label und
// Wert, darunter die Erlaeuterung. Aussen sitzt die Positionierung (transform),
// innen die Animation — sonst ueberschreibt die Keyframe das Verschieben.
function Einblendung({ titel, wert, text, className, style }: {
  titel: string;
  wert: string;
  text: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return <span className={cx('pointer-events-none absolute z-20 block', className)} style={style}>
    <span className="block w-max max-w-[19rem] rounded-lg bg-zinc-900 px-3 py-2 shadow-xl ring-1 ring-inset ring-white/10 motion-safe:animate-[einblenden_120ms_ease-out] dark:bg-zinc-50 dark:ring-zinc-950/10">
      <span className="flex items-baseline justify-between gap-6">
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{titel}</span>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-50 dark:text-zinc-900">{wert}</span>
      </span>
      <span className="mt-1 block text-xs leading-5 text-zinc-300 dark:text-zinc-600">{text}</span>
    </span>
  </span>;
}

// Verweise auf ein Szenario oeffnen den Rechner damit in einem neuen Tab.
// target=_blank ist noetig, sonst faengt der Client-Router den Link ab.
function SzenarioLink({ query, titel, children }: { query: string; titel: string; children: ReactNode }) {
  return <a
    href={`${import.meta.env.BASE_URL}${query}`}
    target="_blank"
    rel="noreferrer"
    title={titel}
    className="underline decoration-zinc-300 decoration-dotted underline-offset-4 transition-colors hover:text-zinc-950 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:text-zinc-50 dark:hover:decoration-zinc-400"
  >{children}</a>;
}

const Zahl = ({ children }: { children: ReactNode }) =>
  <strong className="font-semibold text-zinc-950 dark:text-zinc-50">{children}</strong>;

export function FortschrittPage() {
  const { twh: bedarfZielTWh, failed } = useE100BedarfTWh();
  const [hover, setHover] = useState<number | null>(null);

  const co2frei2000 = CO2FREI_2000_TWH;
  const co2frei2025 = CO2FREI_2025_TWH;
  const zubau = ZUBAU_TWH;
  const jahre = JAHR_HEUTE - JAHR_BASIS;
  const proJahr = zubau / jahre;

  // Gesamtaufgabe = alles, was zwischen 2000 und 2045 CO2-frei dazukommen muss.
  // So sind »geschafft« und »noch offen« Teile derselben Menge und ergeben 100 %.
  const aufgabe = bedarfZielTWh != null ? bedarfZielTWh - co2frei2000 : null;
  const rest = bedarfZielTWh != null ? bedarfZielTWh - co2frei2025 : null;
  const anteilPct = aufgabe != null && aufgabe > 0 ? (zubau / aufgabe) * 100 : null;
  const restPct = anteilPct != null ? 100 - anteilPct : null;

  // Segmentbreiten als Anteil am 2045er Bedarf; ohne Bedarf bleibt der Balken leer.
  const anteilVon = (n: number) => (bedarfZielTWh != null && bedarfZielTWh > 0 ? (n / bedarfZielTWh) * 100 : 0);
  // Balken und Legende lesen dieselbe Liste, damit Farbe und Wert nicht auseinanderlaufen.
  const segmente = [
    {
      key: 'basis',
      label: `${JAHR_BASIS} schon am Netz`,
      wert: co2frei2000,
      farbe: 'bg-green-200 dark:bg-green-900',
      kurz: `${JAHR_BASIS} am Netz`,
      detail: `Kernkraft ${fmt.format(KERNKRAFT_2000_TWH)} + EE ${fmt.format(EE_2000_TWH)}.`,
    },
    {
      key: 'zubau',
      label: `Zuwachs seit ${JAHR_BASIS}`,
      wert: zubau,
      farbe: 'bg-green-600 dark:bg-green-400',
      kurz: `Zuwachs seit ${JAHR_BASIS}`,
      detail: `Im Schnitt ${fmt.format(proJahr)} TWh pro Jahr.`,
    },
    {
      key: 'rest',
      label: `Fehlt bis ${JAHR_ZIEL}`,
      wert: rest ?? 0,
      farbe: 'bg-red-200 dark:bg-red-900',
      kurz: `fehlt bis ${JAHR_ZIEL}`,
      detail: 'Bedarf laut Szenario e100.',
    },
  ];
  // Tooltip sitzt ueber der Mitte des gehoverten Segments.
  const mitteVon = (index: number) =>
    segmente.slice(0, index).reduce((sum, seg) => sum + anteilVon(seg.wert), 0) + anteilVon(segmente[index].wert) / 2;
  const balkenLabel = bedarfZielTWh != null
    ? `Bedarf ${JAHR_ZIEL}: ${twh0(bedarfZielTWh)}. Davon ${JAHR_BASIS} schon am Netz ${twh0(co2frei2000)}, seit ${JAHR_BASIS} gebaut ${twh0(zubau)}, offen ${rest != null ? twh0(rest) : '–'}.`
    : 'Balken lädt';

  // max-w-4xl statt 3xl: die Ueberschrift ist eine Zeile Fliesstext und brach
  // bei 3xl (~730 px Inhalt) um, obwohl der Bildschirm breit genug ist.
  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 pb-16 pt-16 sm:pt-24">
    <header className="flex flex-col gap-3">
      {/* Die Seite hat keine Sidebar — dieser Knopf verankert sie und fuehrt
          zurueck zum Rechner. */}
      <a
        href={import.meta.env.BASE_URL}
        className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-zinc-200 bg-white pl-2 pr-3 text-sm font-medium tracking-tight text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4"/>
        netzprobe.de
      </a>
      {/* So knapp, dass jedes Wort traegt — deshalb durchgehend in voller Tinte
          statt einzelne Zahlen hervorzuheben. */}
      <h1 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
        {anteilPct != null && restPct != null
          ? <>
              Saubere Energie: {fmt.format(anteilPct)} % in {jahre} Jahren geschafft –
              {' '}{fmt.format(restPct)} % bis {JAHR_ZIEL} noch offen.
            </>
          : failed
            ? <>Die Rust-API antwortet nicht — der {JAHR_ZIEL}er Bedarf lässt sich gerade nicht rechnen.</>
            : <>Rechne den Strombedarf für die Dekarbonisierung aller Sektoren …</>}
      </h1>
      {/* Erklaert die Prozente der Ueberschrift: ein Satz je Zeile, in der
          Reihenfolge Rahmen — Stand — Rest. */}
      <p className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
        Für die Dekarbonisierung aller Sektoren braucht Deutschland{' '}
        <SzenarioLink query="?e=e100" titel="Szenario e100 im Rechner öffnen">
          <Zahl>{bedarfZielTWh != null ? caTwh0(bedarfZielTWh) : '…'}</Zahl>
        </SzenarioLink>
        {' '}jährlich.<br/>
        {JAHR_BASIS} waren <Zahl>{twh0(co2frei2000)}</Zahl> des Stroms CO₂-frei, heute sind es{' '}
        <SzenarioLink query="" titel="Szenario 2025 im Rechner öffnen">
          <Zahl>{twh0(co2frei2025)}</Zahl>
        </SzenarioLink>
        {' '}(+ {twh0(zubau)}).<br/>
        Von den bis {JAHR_ZIEL} nötigen <Zahl>{aufgabe != null ? caTwh0(aufgabe) : '…'}</Zahl> an sauberer Energie
        {' '}sind damit seit {JAHR_BASIS}
        {' '}<Zahl>{anteilPct != null ? `≈ ${fmt.format(anteilPct)} %` : '…'}</Zahl> hinzugekommen –{' '}
        <Zahl>{rest != null ? caTwh0(rest) : '…'}</Zahl> fehlen.
      </p>
    </header>

    {/* Balken = der Bedarf 2045, aufgeteilt in das, was 2000 schon CO2-frei am
        Netz war, den Zubau seit 2000 und die Fehlmenge. Zwei Stufen derselben
        Gruenskala fuer »CO2-frei«, Rot fuer das, was fehlt. */}
    <div className="relative">
      {/* Ein durchgehender Balken: aussen eine gerundete Form, innen nur 2px
          Trennfugen in Flaechenfarbe — nicht drei einzelne Pillen. Beschriftet
          wird ueber die Achse darunter. */}
      <div
        className="flex h-14 w-full overflow-hidden rounded-xl ring-1 ring-inset ring-zinc-950/5 dark:ring-zinc-50/10"
        role="img"
        aria-label={balkenLabel}
      >
        {segmente.map((seg, i) => <div
          key={seg.key}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(h => (h === i ? null : h))}
          className={cx(
            'h-full transition duration-150',
            seg.farbe,
            i > 0 && 'border-l-2 border-white dark:border-zinc-950',
            hover === i && 'ring-2 ring-inset ring-zinc-950/25 dark:ring-zinc-50/40',
          )}
          style={{ width: `${anteilVon(seg.wert)}%` }}
        />)}
      </div>
      {/* Achse unter dem Balken: ein Strich aus der Mitte jedes Abschnitts, das
          Label linksbuendig daran. Der Zubau-Abschnitt ist mit ~4 % zu schmal
          fuer ein Label im Balken, und seine Mitte liegt dicht an der des ersten
          Abschnitts — deshalb steht der erste eine Zeile tiefer, sonst
          ueberlappen die beiden Labels. */}
      <div className="relative mt-3 h-14 text-xs leading-4">
        {segmente.map((seg, i) => {
          const tief = seg.key === 'basis';
          return <div
            key={seg.key}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(h => (h === i ? null : h))}
            className="absolute top-0 flex flex-col items-start"
            style={{ left: `${mitteVon(i)}%` }}
          >
            <span aria-hidden="true" className={cx('w-px bg-zinc-300 dark:bg-zinc-700', tief ? 'h-8' : 'h-2.5')}/>
            <span className={cx(
              'mt-1 whitespace-nowrap tabular-nums transition-colors duration-150',
              hover === i ? 'text-zinc-950 dark:text-zinc-50' : muted,
            )}>{seg.kurz} · {seg.key === 'rest' ? caTwh0(seg.wert) : twh0(seg.wert)}</span>
          </div>;
        })}
      </div>

      {hover != null && segmente[hover] && <Einblendung
        className={cx(
          'bottom-full mb-2',
          // An den Raendern nicht ueber den Balken hinauslaufen.
          mitteVon(hover) < 15 ? 'translate-x-0' : mitteVon(hover) > 85 ? '-translate-x-full' : '-translate-x-1/2',
        )}
        style={{ left: `${Math.max(0, Math.min(100, mitteVon(hover)))}%` }}
        titel={segmente[hover].label}
        wert={segmente[hover].key === 'rest' ? caTwh0(segmente[hover].wert) : twh0(segmente[hover].wert)}
        text={<>{fmt.format(anteilVon(segmente[hover].wert))} % vom Bedarf {JAHR_ZIEL}. {segmente[hover].detail}</>}
      />}
    </div>

  </div>;
}

// Quellen und Abgrenzung stehen unter dem Footer-Trennstrich, nicht im Seitenfluss.
export function FortschrittQuellen() {
  const [quellenOffen, setQuellenOffen] = useState(false);
  return <div className="flex flex-col gap-2">
    <button
      type="button"
      aria-expanded={quellenOffen}
      onClick={() => setQuellenOffen(open => !open)}
      className={cx('flex w-fit items-center gap-1 text-xs transition-colors hover:text-zinc-700 dark:hover:text-zinc-200', muted)}
    >
      <ChevronRight aria-hidden className={cx('h-3.5 w-3.5 shrink-0 transition-transform', quellenOffen && 'rotate-90')}/>
      Quellen &amp; Abgrenzung
    </button>
    {quellenOffen && <p className={cx('max-w-3xl text-xs leading-6', muted)}>
      {JAHR_BASIS}: Nettostromerzeugung nach{' '}
      <a href={QUELLE_2000} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:decoration-zinc-600 dark:hover:text-zinc-50">AG Energiebilanzen</a>
      {' '}(Datenstand 15.02.2024). {JAHR_HEUTE}: beobachtete Erzeugung aus <code>model/erzeugung/2025</code> (Energy-Charts).
      {' '}{JAHR_ZIEL}: Jahreslast des e100-Szenarios, live aus der Rust-API — darin laufen Flug und Seeschifffahrt
      über e-Kerosin/PtL, die Primärstahlerzeugung über grünen Wasserstoff und die Chemie inklusive H₂-Feedstock,
      deren Strombedarf samt Umwandlungsverlusten also mitgezählt ist. CO₂-frei = Kernkraft + Wind + PV +
      Wasserkraft + Biomasse + Geothermie; Hausmüll zählt in beiden Jahren nicht mit. Die {twh0(ZUBAU_TWH)} sind ein
      Saldo: brutto kamen {twh0(EE_ZUBAU_BRUTTO_TWH)} EE dazu, {fmt.format(KERNKRAFT_2000_TWH)} davon haben die
      abgeschaltete Kernkraft ersetzt. Die Aufgabe ist reine Strommenge — Netz, Speicher und Gleichzeitigkeit
      stecken nicht darin.
    </p>}
  </div>;
}
