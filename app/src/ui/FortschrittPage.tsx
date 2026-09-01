import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
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

// Gegenszenario zum eigenen e100: Fraunhofer ISE, »Wege zu einem klimaneutralen
// Energiesystem — Bundeslaender im Transformationsprozess« (2024). Die Studie
// nennt 1.150 bis 1.650 TWh Stromverbrauch 2045 je nach Szenario. Gerechnet wird
// mit dem unteren Ende, damit die Gegenposition in ihrer staerksten Form dasteht.
const ISE_BEDARF_TWH = 1150;
const ISE_BEREICH = '1.150 bis 1.650 TWh';
// Jahresreihe CO2-frei netto, gleiche Abgrenzung und Quelle wie die Eckwerte
// oben (AGEB, Datenstand Juni 2026). 2001-2004 und 2006-2009 fehlen, weil die
// Tabelle dort nur Fuenfjahresschritte fuehrt — die Kurve wird zwischen den
// Stuetzstellen linear verbunden.
const CO2FREI_HISTORIE: Array<{ jahr: number; twh: number }> = [
  { jahr: 2000, twh: 196.2 }, { jahr: 2005, twh: 213.1 }, { jahr: 2010, twh: 231.6 },
  { jahr: 2011, twh: 219.5 }, { jahr: 2012, twh: 230.1 }, { jahr: 2013, twh: 236.3 },
  { jahr: 2014, twh: 245.2 }, { jahr: 2015, twh: 266.2 }, { jahr: 2016, twh: 260.3 },
  { jahr: 2017, twh: 278.8 }, { jahr: 2018, twh: 285.6 }, { jahr: 2019, twh: 303.1 },
  { jahr: 2020, twh: 302.6 }, { jahr: 2021, twh: 293.8 }, { jahr: 2022, twh: 276.9 },
  { jahr: 2023, twh: 269.9 }, { jahr: 2024, twh: 276.1 }, { jahr: 2025, twh: 279.6 },
];

const QUELLE_ISE = 'https://www.ise.fraunhofer.de/de/presse-und-medien/presseinformationen/2024/klimaneutrales-deutschland-studie-des-fraunhofer-ise-zeigt-transformationspfade-fuer-das-deutsche-energiesystem-in-regionaler-aufloesung.html';

// Heutiger Primaerenergieverbrauch als Gegenpunkt zu den 1.808 TWh — ohne ihn
// lesen viele die 1.808 als Primaerenergie statt als Strombedarf.
// AGEB-Jahresschaetzung 2025: 10.553 PJ = 2.931 TWh (Datenlage bis 10.12.2025).
const PRIMAERENERGIE_TWH = 2931;
const QUELLE_PRIMAERENERGIE = 'https://ag-energiebilanzen.de/wp-content/uploads/quartalsbericht_q4_2025.pdf';

// Alle historischen Werte aus einer Quelle: AG Energiebilanzen, Nettostrom-
// erzeugung nach Energietraegern, Datenstand Juni 2026. Energy-charts — woher
// die Modelldaten des Rechners stammen — beginnt erst 2015 und zaehlt nur die
// oeffentliche Versorgung; fuer eine Reihe ab 2000 gibt es keine Alternative.
// CO2-frei = Kernkraft + Wind + PV + Wasserkraft + Biomasse + Geothermie.
// Hausmuell bleibt in allen Jahren draussen.
const KERNKRAFT_2000_TWH = 160.8;
const EE_2000_TEILE = [
  { label: 'Wasserkraft', twh: 24.6 },
  { label: 'Wind onshore', twh: 9.3 },
  { label: 'Biomasse', twh: 1.5 },
];
const EE_2000_TWH = EE_2000_TEILE.reduce((summe, teil) => summe + teil.twh, 0);

const EE_2025_TEILE = [
  { label: 'Wind onshore', twh: 105.5 },
  { label: 'PV', twh: 90.4 },
  { label: 'Biomasse', twh: 40.4 },
  { label: 'Wind offshore', twh: 26.2 },
  { label: 'Wasserkraft', twh: 16.9 },
  { label: 'Geothermie', twh: 0.2 },
];

const QUELLE_2000 = 'https://ag-energiebilanzen.de/wp-content/uploads/STRERZ_20260618.pdf';

const EE_2025_TWH = EE_2025_TEILE.reduce((summe, teil) => summe + teil.twh, 0);
// Derselbe Posten in der Abgrenzung des Rechners (Energy-Charts, nur oeffentliche
// Versorgung). Steht in den Quellen als Vergleich, damit die Differenz zum
// Dashboard nicht unerklaert bleibt.
const EE_OEFFENTLICH_2025_TWH = (() => {
  const teile = uiManifest.generation2025.sumPartsTWh as Record<string, number> | undefined;
  const keys = ['pvTWh', 'windOnTWh', 'windOffTWh', 'hydroTWh', 'biomassTWh', 'geothermalTWh'] as const;
  return keys.reduce((summe, key) => summe + (teile?.[key] ?? 0), 0);
})();
const twh0 = (n: number) => `${fmt0.format(n)} TWh`;
// Alles, was aus dem e100-Szenario faellt, ist geschaetzt — die gemessene
// Historie (196/264/68 TWh) nicht. Nur Ersteres bekommt ein ≈.
const caTwh0 = (n: number) => `≈ ${fmt0.format(n)} TWh`;
// Wie viel des e100-Bedarfs nicht direkt elektrisch ist, sondern ueber
// Wasserstoff oder strombasierte Kraftstoffe laeuft. Alle Werte sind bereits
// Strom (nicht Brennstoff-Energie) — nachgerechnet aus den Sektor-Parametern,
// damit sich der Split mitzieht, wenn die Modelle sich aendern.
const H2_SEKTOREN = (() => {
  const zahl = (quelle: Record<string, unknown>, key: string) => {
    const wert = quelle[key];
    return typeof wert === 'number' ? wert : 0;
  };
  const flug = uiManifest.e100.flug as Record<string, unknown>;
  const schiff = uiManifest.e100.schiff as Record<string, unknown>;
  const stahl = uiManifest.e100.stahl as Record<string, unknown>;
  const chemie = uiManifest.e100.chemie as Record<string, unknown>;
  const ptlWirkungsgrad = zahl(flug, 'ptlEfficiency');
  return [
    // Kerosin per Power-to-Liquid: Brennstoffenergie durch PtL-Wirkungsgrad.
    { label: 'Flug', twh: ptlWirkungsgrad > 0 ? zahl(flug, 'kerosineEnergyTWh') / ptlWirkungsgrad : 0 },
    // Chemie: Ammoniak, Methanol und Olefine ueber H2 — der direkt elektrische
    // Teil (Prozesswaerme, Sockel) steckt nicht in diesen drei Posten.
    { label: 'Chemie', twh: zahl(chemie, 'hydrogenAmmoniaTWh') + zahl(chemie, 'hydrogenMethanolTWh') + zahl(chemie, 'eOlefinsViaH2TWh') },
    // Stahl: Direktreduktion, Strom für die Elektrolyse (ohne den Lichtbogenofen).
    { label: 'Stahl', twh: zahl(stahl, 'defaultTargetMioTon') * zahl(stahl, 'hydrogenKgPerTonSteel') * zahl(stahl, 'electrolyzerKwhPerKgH2') / 1000 },
    // Seeschifffahrt: PtL-Bunkerung, ohne die direkt elektrische Binnenschifffahrt.
    { label: 'Schiff', twh: zahl(schiff, 'eFuelSynthesisTWh') },
  ].sort((a, b) => b.twh - a.twh);
})();
const H2_TWH = H2_SEKTOREN.reduce((summe, sektor) => summe + sektor.twh, 0);

const posten = (teile: Array<{ label: string; twh: number }>) =>
  teile.map(teil => `${teil.label} ${fmt.format(teil.twh)}`).join(', ');

// Einmal runden, dann nur noch mit den gerundeten Werten rechnen. Sonst runden
// die Enden gegenlaeufig (196,2 -> 196 ab, 279,6 -> 280 auf) und die angezeigte
// Differenz stimmt nicht mit dem angezeigten Zuwachs ueberein.
const KERNKRAFT_2000_ANZEIGE = Math.round(KERNKRAFT_2000_TWH);
const EE_2000_ANZEIGE = Math.round(EE_2000_TWH);
const CO2FREI_2000_TWH = KERNKRAFT_2000_ANZEIGE + EE_2000_ANZEIGE;
// Kernkraft ist seit 2023 null, CO2-frei ist heute also reine EE.
const CO2FREI_2025_TWH = Math.round(EE_2025_TWH);
const ZUBAU_TWH = CO2FREI_2025_TWH - CO2FREI_2000_TWH;
// Brutto-EE-Zubau: der Saldo oben verschweigt, dass ein Teil nur Kernkraft ersetzt hat.
const EE_ZUBAU_BRUTTO_TWH = CO2FREI_2025_TWH - EE_2000_ANZEIGE;

// Ab dieser Segmentbreite (Prozent der Aufgabe) passt »x TWh« ins Segment.
const PLATZ_FUER_LABEL = 12;

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

type Ziel = 'e100' | 'ise';

// Welcher 2045er Bedarf als Nenner gilt. Die Wahl aendert die Prozente deutlich,
// deshalb steht sie sichtbar auf der Seite statt versteckt in den Annahmen.
function ZielUmschalter({ ziel, onZiel }: { ziel: Ziel; onZiel: (ziel: Ziel) => void }) {
  const optionen: Array<{ id: Ziel; label: string }> = [
    { id: 'e100', label: 'Netzprobe e100' },
    { id: 'ise', label: 'Fraunhofer ISE' },
  ];
  return <div className="inline-flex w-fit items-center gap-0.5 rounded-full border border-zinc-200 bg-white p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
    {optionen.map(option => <button
      key={option.id}
      type="button"
      aria-pressed={ziel === option.id}
      onClick={() => onZiel(option.id)}
      className={cx(
        'rounded-full px-2.5 py-1 transition-colors',
        ziel === option.id
          ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
          : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50',
      )}
    >{ziel === option.id ? `nach ${option.label}` : option.label}</button>)}
  </div>;
}

// Verlaufsgrafik: was seit 2000 tatsaechlich dazukam, was bei diesem Tempo bis
// 2045 daraus wuerde, und welche Kurve noetig waere. Bewusst als SVG von Hand
// statt ECharts — drei Linien und eine Achse brauchen keine Chart-Engine, und so
// laesst sich die Optik der Seite exakt treffen.
function VerlaufsGrafik({ bedarf, tempoProJahr, quelle }: {
  bedarf: number;
  tempoProJahr: number;
  quelle: string;
}) {
  const B = 720, H = 252;                       // viewBox
  // Zeichenflaeche 162 statt 270 hoch — zwei Fuenftel weniger. Der Rand unten
  // (64) bleibt, dort stehen die Jahreszahlen.
  // L/R auf die viewBox-Kanten, damit die Kurve exakt so breit laeuft wie der
  // Balken darueber. Der Zielpunkt ragt dadurch um seinen Radius hinaus — dafuer
  // steht die SVG auf overflow-visible.
  const L = 0, R = B, O = 26, U = 188;          // Plotflaeche
  const jahrVon = CO2FREI_HISTORIE[0].jahr;
  const heute = CO2FREI_HISTORIE[CO2FREI_HISTORIE.length - 1];
  const start = CO2FREI_HISTORIE[0];
  const yMax = Math.ceil((bedarf * 1.1) / 250) * 250;
  const [aktiv, setAktiv] = useState<number | null>(null);

  const sx = (jahr: number) => L + ((jahr - jahrVon) / (JAHR_ZIEL - jahrVon)) * (R - L);
  const sy = (twh: number) => U - (twh / yMax) * (U - O);

  const istPfad = CO2FREI_HISTORIE.map(p => `${sx(p.jahr)},${sy(p.twh)}`).join(' ');
  const jahreRest = JAHR_ZIEL - heute.jahr;
  const hoch = CO2FREI_HISTORIE.reduce((a, b) => (b.twh > a.twh ? b : a));
  const luecke = bedarf - heute.twh;

  // Historie plus Zielpunkt als eine Liste — der Zeiger rastet auf den naechsten ein.
  const punkte = [
    ...CO2FREI_HISTORIE.map(p => ({
      jahr: p.jahr,
      twh: p.twh,
      titel: String(p.jahr),
      wert: twh0(p.twh),
      text: p.jahr === jahrVon
        ? <>Ausgangspunkt der Rechnung.</>
        : <>{fmt0.format(Math.round(p.twh) - Math.round(start.twh))} TWh mehr als {jahrVon}
          {p.jahr === hoch.jahr ? ' — der bisher höchste Wert.' : '.'}</>,
    })),
    {
      jahr: JAHR_ZIEL,
      twh: bedarf,
      titel: `Ziel ${JAHR_ZIEL}`,
      wert: caTwh0(bedarf),
      text: <>{quelle}. Von heute aus {fmt0.format(luecke / jahreRest)} TWh pro Jahr —
        bisher waren es {fmt.format(tempoProJahr)}.</>,
    },
  ];

  // Zeigerposition in Jahre umrechnen und auf den naechsten Punkt runden, damit
  // ueberall auf der Flaeche etwas passiert, nicht nur genau auf der Linie.
  const beiBewegung = (event: ReactMouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0) return;
    const x = ((event.clientX - box.left) / box.width) * B;
    const jahr = jahrVon + ((x - L) / (R - L)) * (JAHR_ZIEL - jahrVon);
    let naechster = 0;
    punkte.forEach((p, i) => {
      if (Math.abs(p.jahr - jahr) < Math.abs(punkte[naechster].jahr - jahr)) naechster = i;
    });
    setAktiv(naechster);
  };

  const punkt = aktiv != null ? punkte[aktiv] : null;
  const jahrAnker = (jahr: number) => (jahr === jahrVon ? 'start' : jahr === JAHR_ZIEL ? 'end' : 'middle');

  // Die Seite setzt gap-12 (48px) zwischen ihre Bloecke; zum Balken darueber
  // sollen es 8px sein, beide gehoeren zusammen. 48 - 40 = 8.
  return <figure className="-mt-10">
    <div className="relative">
      <svg
        viewBox={`0 0 ${B} ${H}`}
        className="w-full overflow-visible"
        role="img"
        aria-label={`CO₂-freie Erzeugung ${jahrVon} bis ${heute.jahr} und das Ziel ${JAHR_ZIEL}`}
        onMouseMove={beiBewegung}
        onMouseLeave={() => setAktiv(null)}
      >
        <line x1={L} x2={R} y1={U} y2={U} className="stroke-zinc-200 dark:stroke-zinc-800" strokeWidth={1}/>

        {/* Die Luecke als Strecke, nicht als leere Flaeche: vom heutigen Stand
            senkrecht hinauf zum Ziel. Beschriftet ist sie nicht — die Zahl steht
            im Text ueber der Grafik. */}
        <line x1={sx(JAHR_ZIEL)} x2={sx(JAHR_ZIEL)} y1={sy(heute.twh)} y2={sy(bedarf)} strokeDasharray="4 4"
          className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth={1}/>

        {punkt && <line x1={sx(punkt.jahr)} x2={sx(punkt.jahr)} y1={O} y2={U}
          className="stroke-zinc-300 dark:stroke-zinc-600" strokeWidth={1}/>}

        <polyline points={istPfad} fill="none" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round"
          className="stroke-green-600 dark:stroke-green-400"/>
        {/* Nur das Kurvenende ist beschriftet; der Startwert steht im Text darueber. */}
        <text x={sx(heute.jahr) + 10} y={sy(heute.twh) - 8} textAnchor="start"
          className="fill-green-700 text-[11px] dark:fill-green-400">CO₂-frei</text>
        <text x={sx(heute.jahr) + 10} y={sy(heute.twh) + 8} textAnchor="start"
          className="fill-green-700 text-[12px] font-medium tabular-nums dark:fill-green-400">{twh0(heute.twh)}</text>

        <circle cx={sx(JAHR_ZIEL)} cy={sy(bedarf)} r={4.5} className="fill-red-500 dark:fill-red-400"/>
        <text x={sx(JAHR_ZIEL) - 12} y={sy(bedarf) - 6} textAnchor="end"
          className="fill-red-600 text-[11px] dark:fill-red-400">Ziel {JAHR_ZIEL}</text>
        <text x={sx(JAHR_ZIEL) - 12} y={sy(bedarf) + 10} textAnchor="end"
          className="fill-red-600 text-[12px] font-medium tabular-nums dark:fill-red-400">{caTwh0(bedarf)}</text>

        {punkt && <circle cx={sx(punkt.jahr)} cy={sy(punkt.twh)} r={4} className="fill-zinc-950 dark:fill-zinc-50"/>}

        {[jahrVon, heute.jahr, JAHR_ZIEL].map(jahr => <text key={jahr}
          x={sx(jahr)} y={U + 20} textAnchor={jahrAnker(jahr)}
          className="fill-zinc-400 text-[12px] tabular-nums dark:fill-zinc-500">{jahr}</text>)}
      </svg>
      {punkt && <Einblendung
        className={cx('-translate-y-full', sx(punkt.jahr) / B > 0.8 ? '-translate-x-full' : '-translate-x-1/2')}
        style={{ left: `${(sx(punkt.jahr) / B) * 100}%`, top: `${(sy(punkt.twh) / H) * 100 - 2}%` }}
        titel={punkt.titel}
        wert={punkt.wert}
        text={punkt.text}
      />}
    </div>
  </figure>;
}

// Haengt eine Einblendung an einen Wert im Fliesstext.
function MitEinblendung({ titel, wert, text, rechts, children }: {
  titel: string;
  wert: string;
  text: ReactNode;
  // Werte am Zeilenende richten die Karte nach rechts aus, sonst laeuft sie raus.
  rechts?: boolean;
  children: ReactNode;
}) {
  const [zeigen, setZeigen] = useState(false);
  return <span
    className="relative inline-block cursor-help"
    onMouseEnter={() => setZeigen(true)}
    onMouseLeave={() => setZeigen(false)}
  >
    {children}
    {zeigen && <Einblendung
      className={cx('top-full mt-1', rechts ? 'right-0' : 'left-0')}
      titel={titel}
      wert={wert}
      text={text}
    />}
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
  const { twh: e100TWh, failed: e100Fehlt } = useE100BedarfTWh();
  const [ziel, setZiel] = useState<Ziel>('e100');
  // Der ISE-Wert ist eine Konstante, nur e100 kommt aus der Rust-API.
  const bedarfRoh = ziel === 'e100' ? e100TWh : ISE_BEDARF_TWH;
  const bedarfZielTWh = bedarfRoh != null ? Math.round(bedarfRoh) : null;
  const failed = ziel === 'e100' && e100Fehlt;
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
      tinte: 'text-green-950 dark:text-green-100',
      detail: `Kernkraft ${fmt.format(KERNKRAFT_2000_TWH)} + EE ${fmt.format(EE_2000_TWH)}.`,
    },
    {
      key: 'zubau',
      label: `Zuwachs seit ${JAHR_BASIS}`,
      wert: zubau,
      farbe: 'bg-green-600 dark:bg-green-400',
      tinte: 'text-white dark:text-green-950',
      detail: `Im Schnitt ${fmt.format(proJahr)} TWh pro Jahr.`,
    },
    {
      key: 'rest',
      label: `Fehlt bis ${JAHR_ZIEL}`,
      wert: rest ?? 0,
      farbe: 'bg-red-200 dark:bg-red-900',
      tinte: 'text-red-950 dark:text-red-100',
      detail: ziel === 'e100' ? 'Bedarf laut Szenario e100.' : 'Bedarf laut Fraunhofer ISE.',
    },
  ];
  // Tooltip sitzt ueber der Mitte des gehoverten Segments.
  // Der 2000er Sockel steht ausserhalb der Messung: gemessen wird nur, was seit
  // 2000 dazukommen muss. Deshalb rechnen die beiden rechten Segmente gegen die
  // Aufgabe, nicht gegen den Bedarf — sonst waere der gruene Streifen 3,8 % breit,
  // waehrend daneben 4,2 % steht.
  const [sockel, ...messbar] = segmente;
  const aufgabeSumme = messbar.reduce((summe, seg) => summe + seg.wert, 0);
  const anteilInAufgabe = (n: number) => (aufgabeSumme > 0 ? (n / aufgabeSumme) * 100 : 0);
  const mitteVon = (index: number) =>
    segmente.slice(0, index).reduce((sum, seg) => sum + anteilVon(seg.wert), 0) + anteilVon(segmente[index].wert) / 2;
  const balkenLabel = bedarfZielTWh != null
    ? `Aufgabe ${JAHR_BASIS} bis ${JAHR_ZIEL}: ${aufgabe != null ? twh0(aufgabe) : '–'}. Davon seit ${JAHR_BASIS} dazugekommen ${twh0(zubau)}, offen ${rest != null ? twh0(rest) : '–'}.`
    : 'Balken lädt';

  // max-w-4xl statt 3xl: die Ueberschrift ist eine Zeile Fliesstext und brach
  // bei 3xl (~730 px Inhalt) um, obwohl der Bildschirm breit genug ist.
  return <div className="mx-auto flex w-full max-w-4xl flex-col gap-12 px-4 pb-16 pt-16 sm:pt-24">
    <header className="flex flex-col gap-3">
      {/* Kopfzeile: links zurueck zum Rechner, rechts die Wahl des Nenners. */}
      <div className="flex items-center justify-between gap-4">
        <a
          href={import.meta.env.BASE_URL}
          className="inline-flex h-8 w-fit items-center gap-1.5 rounded-full border border-zinc-200 bg-white pl-2 pr-3 text-sm font-medium tracking-tight text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/20"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4"/>
          netzprobe.de
        </a>
        <ZielUmschalter ziel={ziel} onZiel={setZiel}/>
      </div>
      {/* So knapp, dass jedes Wort traegt — deshalb durchgehend in voller Tinte
          statt einzelne Zahlen hervorzuheben. */}
      <h1 className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
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
        <MitEinblendung
          titel={`Bedarf ${JAHR_ZIEL}`}
          wert={bedarfZielTWh != null ? caTwh0(bedarfZielTWh) : '…'}
          text={ziel === 'e100'
            ? <>Eigenes Szenario: alle Sektoren umgestellt, ohne Effizienzgewinne.
              {' '}{bedarfZielTWh != null ? caTwh0(bedarfZielTWh - H2_TWH) : '…'} direkt elektrisch,
              {' '}{caTwh0(H2_TWH)} über Wasserstoff und E-Fuels ({posten(H2_SEKTOREN)}).</>
            : <>Fraunhofer ISE (2024) nennt {ISE_BEREICH} Stromverbrauch {JAHR_ZIEL} je nach Szenario.
              {' '}Gerechnet wird hier mit dem unteren Ende.</>}
        >
          {ziel === 'e100'
            ? <SzenarioLink query="?e=e100" titel="Szenario e100 im Rechner öffnen">
                <Zahl>{bedarfZielTWh != null ? caTwh0(bedarfZielTWh) : '…'}</Zahl>
              </SzenarioLink>
            : <a
                href={QUELLE_ISE}
                target="_blank"
                rel="noreferrer"
                title="Studie beim Fraunhofer ISE öffnen"
                className="underline decoration-zinc-300 decoration-dotted underline-offset-4 transition-colors hover:text-zinc-950 hover:decoration-zinc-500 dark:decoration-zinc-600 dark:hover:text-zinc-50 dark:hover:decoration-zinc-400"
              ><Zahl>{caTwh0(ISE_BEDARF_TWH)}</Zahl></a>}
        </MitEinblendung>
        {' '}jährlich (heute{' '}
        <MitEinblendung
          rechts
          titel={`Primärenergie ${JAHR_HEUTE}`}
          wert={caTwh0(PRIMAERENERGIE_TWH)}
          text={<>AGEB-Jahresschätzung: 10.553 PJ. Darin stecken die Verbrennungsverluste von Kraftwerken,
            {' '}Motoren und Heizungen — die fallen bei der Elektrifizierung weg, deshalb liegt der Bedarf
            {' '}danach deutlich darunter.</>}
        ><Zahl>{caTwh0(PRIMAERENERGIE_TWH)}</Zahl></MitEinblendung>
        {' '}Primärenergie).<br/>
        {JAHR_BASIS} waren{' '}
        <MitEinblendung
          titel={`CO₂-frei ${JAHR_BASIS}`}
          wert={twh0(co2frei2000)}
          text={<>Kernkraft {fmt.format(KERNKRAFT_2000_TWH)}, {posten(EE_2000_TEILE)}. PV und Offshore lagen bei null.</>}
        ><Zahl>{twh0(co2frei2000)}</Zahl></MitEinblendung>
        {' '}des Stroms CO₂-frei, heute sind es{' '}
        <MitEinblendung
          titel={`CO₂-frei ${JAHR_HEUTE}`}
          wert={twh0(co2frei2025)}
          text={<>{posten(EE_2025_TEILE)}. Kernkraft null seit dem Ausstieg 2023.</>}
        >
          <SzenarioLink query="" titel="Szenario 2025 im Rechner öffnen">
            <Zahl>{twh0(co2frei2025)}</Zahl>
          </SzenarioLink>
        </MitEinblendung>
        {' '}(
        <MitEinblendung
          rechts
          titel={`Zuwachs seit ${JAHR_BASIS}`}
          wert={`+ ${twh0(zubau)}`}
          text={<>Ein Saldo: gebaut wurden {twh0(EE_ZUBAU_BRUTTO_TWH)} EE, {fmt0.format(KERNKRAFT_2000_ANZEIGE)} davon
            {' '}haben die abgeschaltete Kernkraft ersetzt. Bleiben {fmt.format(proJahr)} TWh pro Jahr.</>}
        >+ {twh0(zubau)}</MitEinblendung>
        ).<br/>
        Von den bis {JAHR_ZIEL} nötigen{' '}
        <MitEinblendung
          titel={`Aufgabe ${JAHR_BASIS}–${JAHR_ZIEL}`}
          wert={aufgabe != null ? caTwh0(aufgabe) : '…'}
          text={<>Bedarf {JAHR_ZIEL} {bedarfZielTWh != null ? caTwh0(bedarfZielTWh) : '…'} minus die {twh0(co2frei2000)},
            {' '}die {JAHR_BASIS} schon CO₂-frei am Netz standen.</>}
        ><Zahl>{aufgabe != null ? caTwh0(aufgabe) : '…'}</Zahl></MitEinblendung>
        {' '}an sauberer Energie sind damit seit {JAHR_BASIS}{' '}
        <MitEinblendung
          titel="Anteil des Zuwachses"
          wert={anteilPct != null ? `≈ ${fmt.format(anteilPct)} %` : '…'}
          text={<>{twh0(zubau)} ÷ {aufgabe != null ? fmt0.format(aufgabe) : '…'} TWh, gerechnet über {jahre} Jahre.</>}
        ><Zahl>{anteilPct != null ? `≈ ${fmt.format(anteilPct)} %` : '…'}</Zahl></MitEinblendung>
        {' '}hinzugekommen –{' '}
        <MitEinblendung
          rechts
          titel={`Fehlt bis ${JAHR_ZIEL}`}
          wert={rest != null ? caTwh0(rest) : '…'}
          text={<>Bedarf {JAHR_ZIEL} minus die {twh0(co2frei2025)} von heute. Verteilt auf die {JAHR_ZIEL - JAHR_HEUTE} Jahre
            {' '}bis {JAHR_ZIEL} sind das {rest != null ? fmt0.format(rest / (JAHR_ZIEL - JAHR_HEUTE)) : '…'} TWh pro Jahr —
            {' '}bisher waren es {fmt.format(proJahr)}.</>}
        ><Zahl>{rest != null ? caTwh0(rest) : '…'}</Zahl></MitEinblendung>
        {' '}fehlen.
      </p>
    </header>

    {/* Balken = der Bedarf 2045, aufgeteilt in das, was 2000 schon CO2-frei am
        Netz war, den Zubau seit 2000 und die Fehlmenge. Zwei Stufen derselben
        Gruenskala fuer »CO2-frei«, Rot fuer das, was fehlt. */}
    <div className="relative">
      {/* Links der Sockel, der 2000 schon stand — durch eine Luecke abgetrennt,
          weil er nicht mitgemessen wird. Rechts der Messbalken: er ist die
          Aufgabe und damit die 100 %, auf die sich alle Prozente beziehen.
          Beide im selben Massstab, der Sockel behaelt also seine echte Groesse. */}
      <div className="flex items-stretch gap-3">
        <div
          onMouseEnter={() => setHover(0)}
          onMouseLeave={() => setHover(h => (h === 0 ? null : h))}
          role="img"
          aria-label={`${sockel.label}: ${twh0(sockel.wert)}`}
          className={cx(
            'h-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-zinc-950/5 transition duration-150 dark:ring-zinc-50/10',
            sockel.farbe,
            hover === 0 && 'ring-2 ring-zinc-950/25 dark:ring-zinc-50/40',
          )}
          style={{ width: `${anteilVon(sockel.wert)}%` }}
        >
          <span className={cx('flex h-full flex-col items-center justify-center leading-none', sockel.tinte)}>
            <span className="text-[11px] font-medium tabular-nums">{fmt0.format(sockel.wert)}</span>
            <span className="mt-0.5 text-[9px]">TWh</span>
          </span>
        </div>
        <div
          className="flex h-14 min-w-0 flex-1 overflow-hidden rounded-xl ring-1 ring-inset ring-zinc-950/5 dark:ring-zinc-50/10"
          role="img"
          aria-label={balkenLabel}
        >
          {messbar.map((seg, i) => <div
            key={seg.key}
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(h => (h === i + 1 ? null : h))}
            className={cx(
              'relative h-full transition duration-150',
              seg.farbe,
              i > 0 && 'border-l-2 border-white dark:border-zinc-950',
              hover === i + 1 && 'ring-2 ring-inset ring-zinc-950/25 dark:ring-zinc-50/40',
            )}
            style={{ width: `${anteilInAufgabe(seg.wert)}%` }}
          >
            {anteilInAufgabe(seg.wert) >= PLATZ_FUER_LABEL
              ? <span className={cx('flex h-full flex-col items-center justify-center leading-none', seg.tinte)}>
                  <span className="text-[11px] font-medium tabular-nums">{fmt0.format(seg.wert)}</span>
                  <span className="mt-0.5 text-[9px]">TWh</span>
                </span>
              // Zu schmal fuer »68 TWh« in einer Zeile: gestapelt. Unter sm reicht
              // auch das nicht, dort steht die Fahne ueber dem Balken.
              : <span className={cx('hidden h-full flex-col items-center justify-center gap-0 leading-none sm:flex', seg.tinte)}>
                  <span className="text-[11px] font-medium tabular-nums">{fmt0.format(seg.wert)}</span>
                  <span className="mt-0.5 text-[9px]">TWh</span>
                </span>}
          </div>)}
        </div>
      </div>
      {messbar
        .map((seg, i) => ({ seg, index: i + 1 }))
        .filter(({ seg }) => anteilInAufgabe(seg.wert) < PLATZ_FUER_LABEL)
        .map(({ seg, index }) => <span
          key={seg.key}
          className="pointer-events-none absolute bottom-full z-10 flex -translate-x-1/2 flex-col items-center sm:hidden"
          style={{ left: `${mitteVon(index)}%` }}
        >
          <span className="whitespace-nowrap text-[11px] font-medium leading-4 tabular-nums text-zinc-700 dark:text-zinc-300">
            {twh0(seg.wert)}
          </span>
          <span aria-hidden="true" className="h-2 w-px bg-zinc-300 dark:bg-zinc-600"/>
        </span>)}

      {/* Achse: eine Klammer je Bereich. Die rechte grenzt ab, worauf sich die
          Prozente beziehen — genau das war am durchgehenden Balken unklar. */}
      <div className="mt-2 flex items-start gap-3 text-xs">
        <div className="shrink-0" style={{ width: `${anteilVon(sockel.wert)}%` }}>
          <span aria-hidden="true" className="block h-2 border-x border-t border-zinc-300 dark:border-zinc-700"/>
          <span className={cx('mt-1 block leading-4', hover === 0 ? 'text-zinc-950 dark:text-zinc-50' : muted)}>
            {JAHR_BASIS} · Bestand
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <span aria-hidden="true" className="block h-2 border-x border-t border-zinc-300 dark:border-zinc-700"/>
          <span className={cx('mt-1 block text-balance text-center leading-4', muted)}>
            Aufgabe {JAHR_BASIS}–{JAHR_ZIEL} · {aufgabe != null ? caTwh0(aufgabe) : '…'}
          </span>
        </div>
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
        text={hover === 0
          ? <>Stand {JAHR_BASIS} schon, zählt bei der Aufgabe nicht mit. {segmente[hover].detail}</>
          : <>{fmt.format(anteilInAufgabe(segmente[hover].wert))} % der Aufgabe. {segmente[hover].detail}</>}
      />}
    </div>

    {bedarfZielTWh != null && <VerlaufsGrafik
      bedarf={bedarfZielTWh}
      tempoProJahr={proJahr}
      quelle={ziel === 'e100' ? 'Eigenes Szenario e100' : 'Fraunhofer ISE, unteres Szenario'}
    />}
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
      {JAHR_HEUTE}: Primärenergieverbrauch nach{' '}
      <a href={QUELLE_PRIMAERENERGIE} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:decoration-zinc-600 dark:hover:text-zinc-50">AG Energiebilanzen</a>
      {' '}(Jahresschätzung, vorläufig). Gegenszenario:{' '}
      <a href={QUELLE_ISE} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:decoration-zinc-600 dark:hover:text-zinc-50">Fraunhofer ISE</a>
      {' '}(2024), {ISE_BEREICH} Stromverbrauch {JAHR_ZIEL} je nach Szenario; gerechnet mit dem unteren Ende.
      {' '}{JAHR_BASIS} und {JAHR_HEUTE}: Nettostromerzeugung nach{' '}
      <a href={QUELLE_2000} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 dark:decoration-zinc-600 dark:hover:text-zinc-50">AG Energiebilanzen</a>
      {' '}(Datenstand Juni 2026), beide Jahre aus derselben Tabelle — sonst wäre die Differenz keine Zeitreihe.
      {' '}Der Rechner zeigt für {JAHR_HEUTE} {twh0(EE_OEFFENTLICH_2025_TWH)}, weil sein Modell auf Energy-Charts läuft und
      {' '}dort nur die öffentliche Versorgung zählt; die Differenz von {twh0(EE_2025_TWH - EE_OEFFENTLICH_2025_TWH)} ist
      {' '}im Wesentlichen erneuerbare Eigenerzeugung der Industrie.
      {' '}{JAHR_ZIEL}: Jahreslast des e100-Szenarios, live aus der Rust-API — darin laufen Flug und Seeschifffahrt
      über e-Kerosin/PtL, die Primärstahlerzeugung über grünen Wasserstoff und die Chemie inklusive H₂-Feedstock,
      deren Strombedarf samt Umwandlungsverlusten also mitgezählt ist. CO₂-frei = Kernkraft + Wind + PV +
      Wasserkraft + Biomasse + Geothermie; Hausmüll zählt in beiden Jahren nicht mit. Die Aufgabe ist reine Strommenge — Netz, Speicher und Gleichzeitigkeit
      stecken nicht darin.
    </p>}
  </div>;
}
