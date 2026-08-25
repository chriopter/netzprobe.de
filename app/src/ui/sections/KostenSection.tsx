import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import QRCode from 'qrcode';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult } from '../../types/simulation';
import { HelpDot, HelpPanel, SectionHeading } from '../sectionUi';
import { cx } from '../ui';
import { fmt0 } from '../format';
import { computeHaushalt, computeKosten, type HaushaltResult, type KostenResult, type KostenTech } from '../kosten';
import { householdElectrificationTWh } from '../ScenarioSidebar';
import type { DataSet } from '../../types/data';
import { uiManifest } from '../uiManifest';
import { getPackage } from '../dataCatalog';
import { dataWikiUrl } from '../dataLinks';

// Bestandteile der Systemkosten — Farben technologieneutral (Graustufen).
// CO₂-Bepreisung bewusst ausgelassen: rein politisch gesetzter Transfer.
const PARTS: Array<{ key: 'capex' | 'om' | 'fuel' | 'h2Import' | 'importNet' | 'netz'; label: string }> = [
  { key: 'capex', label: 'Kapitalkosten' },
  { key: 'om', label: 'Betrieb & Wartung' },
  { key: 'fuel', label: 'Brennstoff' },
  { key: 'h2Import', label: 'Wasserstoff-Import' },
  { key: 'importNet', label: 'Strom-Import-Saldo' },
  { key: 'netz', label: 'Netzausbau' },
];

// Gesamtbeträge über den Aufbauzeitraum: groß (Bio €), sonst Mrd €.
// Schwelle knapp unter 1e12: Werte, die auf 1.000 Mrd runden würden, als
// »1 Bio €« zeigen statt »1.000 Mrd €« (sonst sichtbar in der Gesamt-Sicht).
const fmtBig = (x: number) => Math.abs(x) >= 999.5e9
  ? `${(x / 1e12).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e12 < 10 ? 2 : 1 })} Bio €`
  : `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 })} Mrd €`;
const fmtMrd = (x: number) => `${(x / 1e9).toLocaleString('de-DE', { maximumFractionDigits: Math.abs(x) / 1e9 < 10 ? 1 : 0 })} Mrd €`;
// Einwohner Deutschland (~83,5 Mio., 2025) für die volkswirtschaftliche Pro-Kopf-Last.
const BUNDESBUERGER = 83_500_000;

// Unterposten eines Bon-Postens: die Beiträge der einzelnen Technologien zu
// dieser Kostenart (bzw. Import/Export beim Saldo). Posten unter 50 Mio €/a
// sind Floating-Point-Staub bzw. irrelevant — weglassen.
function subItems(k: KostenResult, key: (typeof PARTS)[number]['key']): Array<{ key: string; label: string; v: number }> {
  const per = (f: (t: KostenResult['perTech'][number]) => number, exclude?: string) => k.perTech
    .filter(t => t.key !== exclude)
    .map(t => ({ key: t.key, label: t.label, v: f(t) }));
  const raw = key === 'capex' ? per(t => t.capex)
    : key === 'om' ? per(t => t.om)
      : key === 'fuel' ? per(t => t.fuel, 'h2import')
        : key === 'importNet' ? [{ key: 'stromimport', label: 'Stromimport', v: k.importCost }, { key: 'stromexport', label: 'Stromexport (Erlös)', v: -k.exportRevenue }]
          : [];
  return raw.filter(s => Math.abs(s.v) > 5e7).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
}

// Punktlinie zwischen Posten und Betrag wie auf gedruckten Rechnungen; das leere
// Inline-Element hat seine Baseline an der Unterkante, die Linie sitzt dadurch
// automatisch auf der Schriftlinie der Zeile.
const Leader = ({ faint }: { faint?: boolean }) => <span aria-hidden className={cx('mx-2 min-w-4 flex-1 border-b border-dotted', faint ? 'border-zinc-200 dark:border-zinc-700' : 'border-zinc-300 dark:border-zinc-600')}/>;

// ---------------------------------------------------------------------------
// Tiefste Aufklapp-Ebene: die Eingangsgrößen hinter jedem Posten (Investition,
// Lebensdauer, Annuität, Preise, Mengen) plus ein Satz Methodik — damit die
// Rechnung bis auf Parameter-Ebene datenexplorativ bleibt.
type Facts = { note: string; facts: Array<[string, string]>; wikiId?: string; source?: string } | null;

// Herleitungs-/Quellentext eines Pakets (method.kosten.source) bzw. einer
// preise-Felddoku — Markdown-Auszeichnung für die Klartext-Anzeige entfernen.
const plain = (s?: string) => s?.replace(/\*\*/g, '').replace(/`/g, '');
const kostenSource = (pkgId?: string): string | undefined => {
  if (!pkgId) return undefined;
  const m = getPackage(pkgId)?.method as { kosten?: { source?: string } } | undefined;
  return plain(m?.kosten?.source);
};
const preiseField = (name: string): string | undefined => {
  const m = getPackage('preise')?.method as { fields?: Array<{ name: string; description: string }> } | undefined;
  return plain(m?.fields?.find(f => f.name === name)?.description);
};

// Technologie-Key → Modellpaket im Datenhandbuch (Keys sind dort identisch).
const TECH_WIKI: Record<string, string> = {
  pv: 'pv', windon: 'windon', windoff: 'windoff', biomasse: 'biomasse', laufwasser: 'laufwasser',
  kernkraft: 'kernkraft', gas: 'gas', kohle: 'kohle',
  batterie: 'batterie', pumpspeicher: 'pumpspeicher', h2: 'h2', h2import: 'h2-handel',
};
const n0 = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 0 });
const n1 = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: 1 });
// Kleinpreise (z.B. H₂-Kavernen-Volumen 0,5 €/kWh) nicht auf ganze Zahlen runden.
const nK = (x: number) => x.toLocaleString('de-DE', { maximumFractionDigits: x < 10 ? 3 : 0 });

const h2ImportFacts = (k: KostenResult): Facts => ({
  note: 'Importpreis frei Grenze (LHV) × Menge — deckt H₂-Sektorbedarf bzw. senkt die Stromlast der Elektrolyse.',
  wikiId: 'h2-handel',
  source: preiseField('h2ImportEurPerMWh'),
  facts: [
    ['Importmenge', `${n1(k.params.h2ImportTWh)} TWh/a`],
    ['Importpreis', `${n0(k.params.h2ImportEurPerMWh)} €/MWh`],
  ],
});
const stromImportFacts = (k: KostenResult): Facts => ({
  note: 'Zugekaufter Strom zum Großhandelspreis, Menge aus der Stundensimulation.',
  wikiId: 'strom-handel',
  source: preiseField('importEurPerMWh'),
  facts: [
    ['Menge', `${n1(k.params.importTWh)} TWh/a`],
    ['Preis', `${n0(k.params.importEurPerMWh)} €/MWh`],
  ],
});
const stromExportFacts = (k: KostenResult): Facts => ({
  note: 'Exportierter Überschuss, gutgeschrieben zum mengengewichteten Capture-Preis. Dieser fällt mit steigendem EE-Anteil (Kannibalisierung: Export läuft in Überschussstunden mit niedrigen/negativen Preisen, Nachbarn haben korreliert Überschuss).',
  wikiId: 'strom-handel',
  source: preiseField('exportEurPerMWh'),
  facts: [
    ['Menge', `${n1(k.params.exportTWh)} TWh/a`],
    ['Capture-Preis', `${n0(k.params.exportEffectiveEurPerMWh)} €/MWh${k.params.exportEffectiveEurPerMWh < k.params.exportEurPerMWh ? ` (max ${n0(k.params.exportEurPerMWh)})` : ''}`],
    ['bei EE-Anteil', `${n0(k.params.exportReSharePct)} %`],
  ],
});
const netzFacts = (k: KostenResult): Facts => ({
  note: 'Zwei Pauschalen, annuisiert: je kW volatiler EE-Leistung über dem 2025-Bestand (erzeugungsgetrieben) und je kW Spitzenlast-Zuwachs (lastgetrieben: E-Mobilität, Wärmepumpen, Industrie — fällt in jedem Elektrifizierungs-Szenario an). Geeicht an Vollnetz-Schätzungen (IMK, ef.Ruhr/EWI, NEP, DIHK »Plan B«); über ~700 GW EE-Zubau bzw. ~100 GW Peak-Zuwachs nur Richtungssignal.',
  wikiId: 'preise',
  source: [preiseField('netzCapexEurPerKwAddedRE'), preiseField('netzCapexEurPerKwAddedPeakLoad')].filter(Boolean).join(' — '),
  facts: [
    ['EE-Zubau über Bestand', `${n0(k.addedReGW)} GW (Basis ${n1(k.params.netzBaselineGW)} GW)`],
    ['Pauschale EE', `${n0(k.params.netzEurPerKW)} €/kW`],
    ['davon EE-getrieben', `${n1(k.params.netzEurPerKW * k.addedReGW * 1e6 * k.params.netzCrf / 1e9)} Mrd €/a`],
    ['Peak-Zuwachs über Bestand', `${n0(k.addedPeakLoadGW)} GW (Basis ${n1(k.params.netzBaselinePeakGW)} GW)`],
    ['Pauschale Last', `${n0(k.params.netzLastEurPerKW)} €/kW`],
    ['davon lastgetrieben', `${n1(k.params.netzLastEurPerKW * k.addedPeakLoadGW * 1e6 * k.params.netzCrf / 1e9)} Mrd €/a`],
    ['Lebensdauer', `${n0(k.params.netzLifetimeYears)} a`],
    ['Bauzeit', `${n0(k.params.netzConstructionYears)} a → Bauzins-Faktor ${k.params.netzIdc.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    [`Annuität (Netz-WACC ${n0(k.params.netzWacc * 100)} %)`, `${n1(k.params.netzCrf * 100)} %/a`],
  ],
});

function compFacts(t: KostenTech, comp: 'capex' | 'om' | 'fuel', k: KostenResult): Facts {
  const d = t.detail;
  if (!d) return null;
  if (d.kind === 'h2import') return h2ImportFacts(k);
  const ko = d.kosten;
  if (!ko) return null;
  const waccRow: [string, string] = ['WACC real', `${n1((ko.wacc ?? 0) * 100)} %${k.params.waccShiftPp ? ` (Paket ${n1((ko.wacc ?? 0) * 100 - k.params.waccShiftPp)} %, Regler ${k.params.waccShiftPp > 0 ? '+' : ''}${n1(k.params.waccShiftPp)} pp)` : ''}`];
  const bau: [string, string] = ['Bauzeit', `${n0(ko.constructionYears ?? 0)} a → Bauzins-Faktor ${(d.idcFactor ?? 1).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`];
  const ann: [string, string] = ['Annuität', `${n1((d.crfValue ?? 0) * 100)} %/a`];
  const wikiId = TECH_WIKI[t.key];
  if (comp === 'capex') {
    if (d.kind === 'gen') {
      // Grenzkosten-Blend aktiv (z. B. PV: Bestand rooftop-lastig, Zubau
      // Freifläche): effektives Flotten-Mittel weicht vom Bestandswert ab.
      const blended = ko.capexMarginalEurPerKW != null && d.capexEffectiveEurPerKW != null
        && Math.round(d.capexEffectiveEurPerKW) !== Math.round(ko.capexEurPerKW ?? 0);
      return {
        note: blended
          ? 'Neubauwert der Flotte × Annuitätsfaktor. CAPEX als mengengewichtetes Mittel: Bestand zum Bestandswert, Zubau zum Freifläche-Grenzwert.'
          : 'Neubauwert der Flotte × Bauzins-Faktor × Annuitätsfaktor — Kapitalkosten des Anlagenbestands inklusive Bauzeitverzinsung und laufendem Ersatz.',
        wikiId,
        source: kostenSource(wikiId),
        facts: [
          ['Installierte Leistung', `${n1(d.gw ?? 0)} GW`],
          ...(blended
            ? [
              ['Bestand bis', `${n1(ko.capexBaselineGW ?? 0)} GW × ${n0(ko.capexEurPerKW ?? 0)} €/kW`],
              ['Zubau (Freifläche)', `${n0(ko.capexMarginalEurPerKW ?? 0)} €/kW`],
              ['Investition (Flotten-Mittel)', `${n0(d.capexEffectiveEurPerKW ?? 0)} €/kW`],
            ] as Array<[string, string]>
            : [['Investition', `${n0(ko.capexEurPerKW ?? 0)} €/kW`]] as Array<[string, string]>),
          ['Lebensdauer', `${n0(ko.lifetimeYears)} a`],
          bau,
          waccRow,
          ann,
        ],
      };
    }
    const split = ko.capexChargeEurPerKW != null || ko.capexDischargeEurPerKW != null;
    const power: Array<[string, string]> = split
      ? [
        ['Elektrolyseur', `${n1(d.chargeGW ?? 0)} GW × ${n0(ko.capexChargeEurPerKW ?? 0)} €/kW`],
        ['Rückverstromung', `${n1(d.dischargeGW ?? 0)} GW × ${n0(ko.capexDischargeEurPerKW ?? 0)} €/kW`],
      ]
      : [['Leistung', `${n1(Math.max(d.chargeGW ?? 0, d.dischargeGW ?? 0))} GW × ${n0(ko.capexEurPerKW ?? 0)} €/kW`]];
    return {
      note: 'Leistungs- plus Speichervolumen-Capex, annuisiert über die Lebensdauer.',
      wikiId,
      source: kostenSource(wikiId),
      facts: [
        ...power,
        ...(ko.capexEurPerKWh ? [['Speichervolumen', `${n0(d.energyGWh ?? 0)} GWh × ${nK(ko.capexEurPerKWh)} €/kWh`]] as Array<[string, string]> : []),
        ['Lebensdauer', `${n0(ko.lifetimeYears)} a`],
        bau,
        waccRow,
        ann,
      ],
    };
  }
  if (comp === 'om') {
    const facts: Array<[string, string]> = [];
    if (d.kind === 'gen') {
      if (ko.omFixEurPerKWa) facts.push(['Fix', `${n0(ko.omFixEurPerKWa)} €/kW·a × ${n1(d.gw ?? 0)} GW`]);
      if (ko.omVarEurPerMWh) facts.push(['Variabel', `${n1(ko.omVarEurPerMWh)} €/MWh × ${n1(d.genTWh ?? 0)} TWh`]);
    } else {
      if (ko.omFixChargeEurPerKWa) facts.push(['Elektrolyseur', `${n0(ko.omFixChargeEurPerKWa)} €/kW·a × ${n1(d.chargeGW ?? 0)} GW`]);
      if (ko.omFixDischargeEurPerKWa) facts.push(['Rückverstromung', `${n0(ko.omFixDischargeEurPerKWa)} €/kW·a × ${n1(d.dischargeGW ?? 0)} GW`]);
      if (ko.omFixEurPerKWa) facts.push(['Fix (Leistung)', `${n0(ko.omFixEurPerKWa)} €/kW·a × ${n1(Math.max(d.chargeGW ?? 0, d.dischargeGW ?? 0))} GW`]);
      if (ko.omEnergyEurPerKWhA) facts.push(['Fix (Energie)', `${n1(ko.omEnergyEurPerKWhA)} €/kWh·a × ${n0(d.energyGWh ?? 0)} GWh`]);
      if (ko.omVarEurPerMWh) facts.push(['Variabel', `${n1(ko.omVarEurPerMWh)} €/MWh × ${n1(d.dischargeTWh ?? 0)} TWh entladen`]);
    }
    if (!facts.length) return null;
    return { note: 'Feste Wartung je installiertem kW plus variable Kosten je erzeugter bzw. entladener MWh.', wikiId, source: kostenSource(wikiId), facts };
  }
  if (!ko.fuelEurPerMWhTh) return null;
  // Kernkraft-Konvention: fuelEurPerMWhTh ist dort bereits €/MWh ELEKTRISCH
  // (ISE 8,0 €/MWh_th ÷ 0,35), efficiency=1 reicht ihn nur durch — keine
  // thermische Einheit und keinen 100-%-Wirkungsgrad anzeigen.
  const elConvention = (ko.efficiency ?? 1) === 1;
  return {
    note: elConvention
      ? 'Brennstoffpreis je MWh elektrisch (Konvention des Pakets: Wirkungsgrad bereits eingerechnet) × erzeugte Energie aus der Stundensimulation.'
      : 'Brennstoffpreis ÷ Wirkungsgrad × erzeugte Energie aus der Stundensimulation.',
    wikiId,
    source: kostenSource(wikiId),
    facts: [
      ['Brennstoffpreis', `${n1(ko.fuelEurPerMWhTh)} €/MWh ${elConvention ? 'el' : 'th'}`],
      ...(elConvention ? [] : [['Wirkungsgrad', `${n0((ko.efficiency ?? 1) * 100)} %`]] as Array<[string, string]>),
      ['Erzeugung', `${n1(d.genTWh ?? 0)} TWh/a`],
    ],
  };
}

function leafFacts(k: KostenResult, techKey: string, comp: 'capex' | 'om' | 'fuel'): Facts {
  if (techKey === 'stromimport') return stromImportFacts(k);
  if (techKey === 'stromexport') return stromExportFacts(k);
  const t = k.perTech.find(x => x.key === techKey);
  return t ? compFacts(t, comp, k) : null;
}

const FactsBlock = ({ f }: { f: NonNullable<Facts> }) => <div className="mb-1 mt-1.5 space-y-1 text-xs leading-normal">
  {f.facts.map(([label, value]) => <div key={label} className="flex items-baseline">
    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{label}</span>
    <Leader faint/>
    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{value}</span>
  </div>)}
  <p className="pt-0.5 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">{f.note}</p>
  {f.source && <details className="group/src">
    <summary className="cursor-pointer list-none text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500 [&::-webkit-details-marker]:hidden">
      <span aria-hidden className="mr-1"><span className="group-open/src:hidden">▸</span><span className="hidden group-open/src:inline">▾</span></span>
      Herleitung &amp; Quellen
    </summary>
    <p className="mt-1 border-l border-dotted border-zinc-300 pl-2 text-[11px] leading-snug text-zinc-400 dark:border-zinc-600 dark:text-zinc-500">{f.source}</p>
  </details>}
  {f.wikiId && <a
    href={dataWikiUrl(f.wikiId)}
    target="_blank"
    rel="noreferrer"
    onClick={event => event.stopPropagation()}
    className="inline-block text-[11px] uppercase tracking-wide text-zinc-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
  >Im Wiki nachlesen →</a>}
</div>;

// Unterposten-Zeile: aufklappbar bis auf die Parameter-Ebene, wo Daten existieren.
const LeafRow = ({ label, value, f }: { label: string; value: string; f: Facts }) => f
  ? <details className="group/leaf">
    <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-baseline">
        <span className="flex min-w-0 items-baseline gap-1 text-zinc-400 dark:text-zinc-500">
          <span aria-hidden className="w-3 shrink-0"><span className="group-open/leaf:hidden">▸</span><span className="hidden group-open/leaf:inline">▾</span></span>
          <span className="truncate">{label}</span>
        </span>
        <Leader faint/>
        <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{value}</span>
      </div>
    </summary>
    <div className="pl-4"><FactsBlock f={f}/></div>
  </details>
  : <div className="flex items-baseline">
    <span className="min-w-0 truncate pl-4 text-zinc-400 dark:text-zinc-500">{label}</span>
    <Leader faint/>
    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{value}</span>
  </div>;

// Papieroptik: feines Korn plus leicht zerknuelltes Papier — beides als
// SVG-Rauschen (feTurbulence bzw. feDiffuseLighting), sehr dezent uebergelegt.
const PAPER_GRAIN = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.09 0'/></filter><rect width='180' height='180' filter='url(#n)'/></svg>")}")`;
const PAPER_CRUMPLE = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='420' height='420'><filter id='c'><feTurbulence type='fractalNoise' baseFrequency='0.045' numOctaves='5' stitchTiles='stitch'/><feDiffuseLighting lighting-color='#ffffff' surfaceScale='1.6'><feDistantLight azimuth='45' elevation='60'/></feDiffuseLighting></filter><rect width='420' height='420' filter='url(#c)'/></svg>")}")`;

// Signatur-Element der Sektion: die Systemkosten als Stromrechnung — inklusive
// der Umlage auf einen Durchschnittshaushalt (Verbrauch × Ø Systemkosten).
type HaushaltView = HaushaltResult & { kmPerYear: number; kwhPer100Km: number; heatKwhPerYear: number; cop: number };

function Stromrechnung({ k, hh, horizon, supplyLabel, loadLabel, shareUrl, sheddingTWh, sheddingPct }: { k: ReturnType<typeof computeKosten>; hh: HaushaltView; horizon: number; supplyLabel: string; loadLabel: string; shareUrl: string; sheddingTWh: number; sheddingPct: number }) {
  // Master-Schalter pro Jahr / Gesamt: skaliert ALLE Bon-Posten (Kostenart,
  // Technologie, SUMME) — »pro Jahr« zeigt die levelized Jahresmiete (CAPEX über
  // die Anlagenlebensdauer annuisiert, inkl. WACC), »Gesamt« multipliziert mit
  // dem Kostenzeitraum (Jahresmiete × Jahre = Vollkosten inkl. Ersatz/Finanz.).
  const [scope, setScope] = useState<'jahr' | 'gesamt'>('gesamt');
  const mult = scope === 'gesamt' ? horizon : 1;
  // je-Einheit-Anzeige: Default kWh, Inline-Umschalter auf MWh.
  const [unit, setUnit] = useState<'kwh' | 'mwh'>('kwh');
  // Mode-bewusster Geldformatierer: skaliert den Betrag und schaltet ab 1 Bio €
  // automatisch von »Mrd« auf »Bio« um. Intensitäten (je MWh/kWh, €/MWh
  // Gestehung) und die einmalige Bauinvestition laufen NICHT über G.
  const G = (v: number) => fmtBig(v * mult);
  // Gesamtkosten über den Zeitraum = levelized Jahresmiete × Jahre (undiskontiert).
  const gesamt = k.total * horizon;
  // Zwei Gruppierungen derselben Summe als Akkordeon: Kostenart oder Technologie.
  const [group, setGroup] = useState<'art' | 'tech'>('art');
  // Posten unter 50 Mio €/a sind Floating-Point-Staub (z. B. Netz exakt auf der
  // 2025-Basis) — auf dem Bon weglassen.
  const items = PARTS.filter(p => Math.abs(k.breakdown[p.key]) > 5e7);
  const techs = k.perTech.filter(t => Math.abs(t.total) > 5e7);
  // Nur die tatsächlich überschrittenen Treiber nennen (EE > ~700 GW, Peak > ~100 GW).
  const netzTrigger = [
    k.addedReGW > 700 ? `EE-Zubau ${Math.round(k.addedReGW).toLocaleString('de-DE')} GW (geeicht bis ~700 GW)` : null,
    k.addedPeakLoadGW > 100 ? `Peak-Zuwachs ${Math.round(k.addedPeakLoadGW).toLocaleString('de-DE')} GW (geeicht bis ~100 GW)` : null,
  ].filter(Boolean).join(' und ');
  const netzHint = k.netzExtrapolated ? `Extrapoliert: ${netzTrigger} liegt über dem geeichten Bereich der Netzkosten-Heuristik — implizit ${(k.breakdown.netz / k.params.netzIdc / k.params.netzCrf / 1e12).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Bio. € Netz-Investition, nur Richtungssignal.` : undefined;
  const exportHint = k.exportAtCap ? `Export läuft praktisch dauerhaft am Cap (~${n0(k.params.exportTWh)} TWh/a, ≥95 % der Cap-Energie) — die Erlösgutschrift ist eine Obergrenze; ob die Nachbarn den Dauerexport abnehmen, modelliert die Kupferplatte nicht.` : undefined;
  // Kapazitätsunabhängige Posten gehören in beide Gruppierungen — nur so summieren
  // sich beide Knoten auf dieselbe SUMME.
  const sysRows = [
    { key: 'netz', label: 'Netzausbau', v: k.breakdown.netz, hint: netzHint },
    { key: 'importNet', label: 'Strom-Import-Saldo', v: k.breakdown.importNet, hint: exportHint },
  ].filter(r => Math.abs(r.v) > 5e7);
  // Nadeldrucker-Balken aus Blockzeichen (░) in derselben Zeile: das Label
  // endet an einer festen Spaltenkante, ab dort wächst der Balken Richtung
  // Betrag — alle Balken starten also auf gleicher Höhe und bleiben vergleichbar.
  const BAR_CH = 35;
  const maxArt = Math.max(1, ...items.map(p => Math.abs(k.breakdown[p.key])));
  const maxTech = Math.max(1, ...techs.map(t => t.total), ...sysRows.map(r => Math.abs(r.v)));
  const segCh = (v: number, max: number) => v > 5e7 ? Math.max(1, Math.round(v / max * BAR_CH)) : 0;
  const pctOf = (v: number) => k.total > 0 ? <span className="ml-1.5 text-zinc-400 dark:text-zinc-500">({Math.round(v / k.total * 100)} %)</span> : null;
  const rowGrid = 'grid grid-cols-[minmax(0,15.5rem)_minmax(0,1fr)_auto] items-baseline gap-x-2';
  const barInline = 'select-none overflow-hidden whitespace-nowrap text-xs leading-none text-zinc-700 dark:text-zinc-300';
  const NodeHead = ({ id, label }: { id: 'art' | 'tech'; label: string }) => (
    <button
      type="button"
      onClick={() => setGroup(id)}
      aria-expanded={group === id}
      className={cx('flex w-full items-center gap-1.5 text-sm font-bold uppercase tracking-[0.15em] transition-colors', group === id
        ? 'text-zinc-950 dark:text-zinc-50'
        : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300')}
    >
      <span aria-hidden className="w-3.5 shrink-0">{group === id ? '▾' : '▸'}</span>{label}
    </button>
  );
  // QR-Code mit der aktuellen Szenario-URL (wie der kopierbare Link oben) —
  // synchron generiert, Module als ein SVG-Pfad.
  const qrUrl = shareUrl || (typeof window !== 'undefined' ? window.location.href : 'https://netzprobe.de');
  const qr = useMemo(() => {
    const code = QRCode.create(qrUrl, { errorCorrectionLevel: 'M' });
    const size = code.modules.size;
    let d = '';
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (code.modules.get(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { size, d };
  }, [qrUrl]);
  const [copied, setCopied] = useState(false);
  const copyShareUrl = () => {
    navigator.clipboard?.writeText(qrUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };
  return <div className="w-full font-mono text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
    <div className="relative flex aspect-[210/297] flex-col border border-zinc-200 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.10)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_2px_6px_rgba(0,0,0,0.4),0_16px_40px_rgba(0,0,0,0.5)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-multiply dark:mix-blend-screen" style={{ backgroundImage: PAPER_GRAIN }}/>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.175] mix-blend-multiply dark:opacity-[0.06] dark:mix-blend-normal" style={{ backgroundImage: PAPER_CRUMPLE, backgroundSize: '420px 420px' }}/>
      <a
        href={dataWikiUrl('preise')}
        target="_blank"
        rel="noreferrer"
        data-shot-hide
        aria-label="Kosten-Annahmen im Wiki öffnen"
        title="Kosten-Annahmen im Wiki öffnen"
        className="absolute right-4 top-4 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      >
        <Info className="h-3.5 w-3.5"/>
      </a>
      <div className="relative flex flex-1 flex-col px-6 pb-8 pt-8 sm:px-10">
      <p className="text-center text-lg font-bold uppercase tracking-[0.3em] text-zinc-950 dark:text-zinc-50">Stromrechnung</p>
      {/* Preisstand-Hinweis in der Kopfzeile: der Bon rechnet bewusst Heute-
          Preise — er ordnet Verhältnisse ein, prognostiziert nicht 2045. */}
      <p className="mt-1.5 text-center text-xs uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-500">Kostenzeitraum {horizon} Jahre · Heutige Preise ohne Lernkurven</p>
      <p className="mt-1 text-center text-xs text-zinc-400 dark:text-zinc-500">Erzeugung: {supplyLabel} · Last: {loadLabel}</p>
      {k.hasCostOverrides && <p className="mt-2 text-center"><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">Eigene Kostenannahmen aktiv{k.params.waccShiftPp ? ` · WACC ${k.params.waccShiftPp > 0 ? '+' : ''}${n1(k.params.waccShiftPp)} pp` : ''}</span></p>}
      {/* Master-Schalter: skaliert den GANZEN Bon (jede Kostenart, jede
          Technologie, SUMME) wahlweise pro Jahr oder über den Kostenzeitraum. */}
      <div className="mt-4 flex justify-center">
        <div className="flex border border-zinc-300 text-[10px] uppercase tracking-[0.15em] dark:border-zinc-600" role="group" aria-label="Beträge pro Jahr oder über den Kostenzeitraum">
          {([['jahr', 'pro Jahr'], ['gesamt', `Gesamt · ${horizon} J`]] as const).map(([m, label]) => (
            <button key={m} type="button" aria-pressed={scope === m} onClick={() => setScope(m)}
              className={cx('px-3 py-1 transition-colors', scope === m
                ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200')}
            >{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-5 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-5">
        <NodeHead id="art" label="Nach Kostenart"/>
        {group === 'art' && <div className="mt-4 space-y-4">
          {items.map(p => {
            const subs = subItems(k, p.key);
            const hint = p.key === 'netz' ? netzHint : p.key === 'importNet' ? exportHint : undefined;
            const mark = !!hint;
            const bar = '░'.repeat(segCh(Math.abs(k.breakdown[p.key]), maxArt));
            const own = p.key === 'netz' ? netzFacts(k) : p.key === 'h2Import' ? h2ImportFacts(k) : null;
            if (!subs.length && !own) return <div key={p.key} className={rowGrid}>
              <span className={cx('min-w-0 truncate pl-5 text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400', mark && 'cursor-help')} title={hint}>
                {p.label}{pctOf(k.breakdown[p.key])}{mark && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400" aria-hidden>*</span>}
              </span>
              <span aria-hidden className={barInline}>{bar}</span>
              <span className="shrink-0 tabular-nums">{G(k.breakdown[p.key])}</span>
            </div>;
            return <details key={p.key} className="group/it">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className={rowGrid}>
                  <span className={cx('flex min-w-0 items-baseline gap-1.5 text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400', mark && 'cursor-help')} title={hint}>
                    <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500">
                      <span className="group-open/it:hidden">▸</span><span className="hidden group-open/it:inline">▾</span>
                    </span>
                    <span className="truncate">{p.label}{pctOf(k.breakdown[p.key])}{mark && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400" aria-hidden>*</span>}</span>
                  </span>
                  <span aria-hidden className={barInline}>{bar}</span>
                  <span className="shrink-0 tabular-nums">{G(k.breakdown[p.key])}</span>
                </div>
              </summary>
              <div className="mb-1.5 mt-2 space-y-1.5 pl-5 text-[13px] leading-normal">
                {subs.length > 0
                  ? subs.map(s => <LeafRow key={s.key} label={s.label} value={G(s.v)} f={leafFacts(k, s.key, p.key === 'om' || p.key === 'fuel' ? p.key : 'capex')}/>)
                  : own && <FactsBlock f={own}/>}
              </div>
            </details>;
          })}
        </div>}
      </div>
      <div className="mt-5 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-5">
        <NodeHead id="tech" label="Nach Technologie"/>
        {group === 'tech' && <div className="mt-4 space-y-4">
          {techs.map(t => {
            const comps = ([['capex', 'Kapitalkosten', t.capex], ['om', 'Betrieb & Wartung', t.om], ['fuel', 'Brennstoff', t.fuel]] as const).filter(([, , v]) => v > 5e7);
            // Aufklappbar, sobald es etwas zu zeigen gibt: Kostenarten mit
            // Parameter-Ebene oder die Gestehungskosten je erzeugter MWh.
            const expandable = comps.length > 0 || t.eurPerMWh != null;
            const bar = '░'.repeat(segCh(Math.max(0, t.total), maxTech));
            const head = <div className={rowGrid}>
              <span className="flex min-w-0 items-baseline gap-1.5 text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {expandable
                  ? <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500">
                    <span className="group-open/tr:hidden">▸</span><span className="hidden group-open/tr:inline">▾</span>
                  </span>
                  : <span aria-hidden className="w-3.5 shrink-0"/>}
                <span className="truncate">{t.label}{pctOf(t.total)}</span>
              </span>
              <span aria-hidden className={barInline}>{bar}</span>
              <span className="shrink-0 tabular-nums">{G(t.total)}</span>
            </div>;
            if (!expandable) return <div key={t.key}>{head}</div>;
            return <details key={t.key} className="group/tr">
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                {head}
              </summary>
              <div className="mb-1.5 mt-2 space-y-1.5 pl-5 text-[13px] leading-normal">
                {comps.map(([ck, label, v]) => <LeafRow key={ck} label={label} value={G(v)} f={compFacts(t, ck, k)}/>)}
                {t.eurPerMWh != null && <div className="flex items-baseline">
                  {/* H₂-Import ist €/MWh H₂ (LHV), nicht €/MWh elektrisch — Einheit ausweisen. */}
                  <span className="min-w-0 truncate pl-4 text-zinc-400 dark:text-zinc-500" title="Jahreskosten ÷ erzeugte bzw. gelieferte Energie">{t.key === 'h2import' ? '≙ je gelieferter MWh H₂ (LHV)' : '≙ je erzeugter MWh'}</span>
                  <Leader faint/>
                  <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{fmt0.format(t.eurPerMWh)} €</span>
                </div>}
              </div>
            </details>;
          })}
          {sysRows.map(r => <details key={r.key} className="group/sr">
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className={rowGrid}>
                <span className={cx('flex min-w-0 items-baseline gap-1.5 text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400', r.hint && 'cursor-help')} title={r.hint}>
                  <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500">
                    <span className="group-open/sr:hidden">▸</span><span className="hidden group-open/sr:inline">▾</span>
                  </span>
                  <span className="truncate">{r.label}{pctOf(r.v)}{r.hint && <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400" aria-hidden>*</span>}</span>
                </span>
                <span aria-hidden className={barInline}>{'░'.repeat(segCh(Math.abs(r.v), maxTech))}</span>
                <span className="shrink-0 tabular-nums">{G(r.v)}</span>
              </div>
            </summary>
            <div className="mb-1.5 mt-2 space-y-1.5 pl-5 text-[13px] leading-normal">
              {r.key === 'netz'
                ? <FactsBlock f={netzFacts(k)!}/>
                : <>
                  {Math.abs(k.importCost) > 5e7 && <LeafRow label="Stromimport" value={G(k.importCost)} f={stromImportFacts(k)}/>}
                  {Math.abs(k.exportRevenue) > 5e7 && <LeafRow label="Stromexport (Erlös)" value={G(-k.exportRevenue)} f={stromExportFacts(k)}/>}
                </>}
            </div>
          </details>)}
        </div>}
      </div>
      <div className="mt-5 border-t-4 border-double border-zinc-300 dark:border-zinc-600"/>
      <div className="mt-5 flex items-baseline text-xl font-bold tracking-wider text-zinc-950 dark:text-zinc-50">
        <span>SUMME · {scope === 'gesamt' ? `${horizon} Jahre` : 'pro Jahr'}</span>
        <Leader/>
        <span className="shrink-0 tabular-nums">{G(k.total)}</span>
      </div>
      {/* Volkswirtschaftliche Pro-Kopf-Last, folgt dem Schalter (gesamt oder pro Jahr). */}
      <div className="mt-1.5 flex items-baseline text-base font-bold text-zinc-800 dark:text-zinc-100">
        <span className="min-w-0 truncate">pro Bundesbürger</span>
        <Leader/>
        <span className="shrink-0 tabular-nums">{n0(k.total * mult / BUNDESBUERGER)} €</span>
      </div>
      {/* Gegensicht-Aggregat (aufklappbar): die jeweils ANDERE Skala mit Kostenart-Zerlegung. */}
      <div className="mt-3 border-t border-dashed border-zinc-200 pt-3 dark:border-zinc-700"/>
      <details className="group/agg">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-baseline text-sm text-zinc-500 dark:text-zinc-400">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"><span className="group-open/agg:hidden">▸</span><span className="hidden group-open/agg:inline">▾</span></span>
              <span className="truncate">{scope === 'gesamt' ? 'Ø pro Jahr (levelized)' : `Gesamt über ${horizon} Jahre`}</span>
            </span>
            <Leader faint/>
            <span className="shrink-0 tabular-nums">{scope === 'gesamt' ? fmtMrd(k.total) : fmtBig(gesamt)}</span>
          </div>
        </summary>
        <div className="mb-1 mt-1.5 space-y-1 pl-5 text-xs leading-normal">
          {PARTS.filter(p => Math.abs(k.breakdown[p.key]) > 5e7).map(p =>
            <div key={p.key} className="flex items-baseline">
              <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{p.label}</span>
              <Leader faint/>
              <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{fmtBig(k.breakdown[p.key] * (scope === 'gesamt' ? 1 : horizon))}</span>
            </div>)}
        </div>
      </details>
      {/* Einmalige Bauinvestition (aufklappbar): Neubauwert, zeitraum-unabhängig. */}
      <details className="group/inv mt-1.5">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-baseline text-sm text-zinc-400 dark:text-zinc-500">
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span aria-hidden className="w-3.5 shrink-0"><span className="group-open/inv:hidden">▸</span><span className="hidden group-open/inv:inline">▾</span></span>
              <span className="truncate">einmalige Bauinvestition (Neubauwert, einmalig)</span>
            </span>
            <Leader faint/>
            <span className="shrink-0 tabular-nums">{fmtBig(k.investEur)}</span>
          </div>
        </summary>
        <div className="mb-1 mt-1.5 space-y-1 pl-5 text-xs leading-normal">
          {([['Erzeugung', k.investParts.erzeugung], ['Speicher', k.investParts.speicher], ['Netz', k.investParts.netz]] as const).filter(([, v]) => Math.abs(v) > 5e7).map(([label, v]) =>
            <div key={label} className="flex items-baseline">
              <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{label}</span>
              <Leader faint/>
              <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{fmtBig(v)}</span>
            </div>)}
          <p className="pt-0.5 text-zinc-400 dark:text-zinc-500">Neubauwert der Zielflotte ohne Annuisierung — skaliert nicht mit dem Zeitraum.</p>
        </div>
      </details>
      {/* je-Einheit (aufklappbar): EINE Zeile, Default kWh, Inline-Umschalter MWh/kWh. */}
      {(() => {
        const unitSum = unit === 'mwh' ? `${k.perMWh.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €` : `${(k.perMWh / 10).toLocaleString('de-DE', { maximumFractionDigits: 1 })} ct`;
        const unitPart = (v: number) => unit === 'mwh' ? `${n1(v)} €` : `${(v / 10).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ct`;
        const toggle = <span className="ml-1 inline-flex border border-zinc-300 text-[9px] uppercase leading-none tracking-[0.1em] dark:border-zinc-600" role="group" aria-label="Einheit kWh oder MWh">
          {([['kwh', 'kWh'], ['mwh', 'MWh']] as const).map(([u, lab]) => (
            <button key={u} type="button" aria-pressed={unit === u}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setUnit(u); }}
              className={cx('px-1.5 py-0.5 transition-colors', unit === u ? 'bg-zinc-700 text-zinc-50 dark:bg-zinc-200 dark:text-zinc-900' : 'text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300')}
            >{lab}</button>
          ))}
        </span>;
        return k.perMWh > 0 ? <details className="group/unit mt-1.5">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <div className="flex items-baseline text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"><span className="group-open/unit:hidden">▸</span><span className="hidden group-open/unit:inline">▾</span></span>
                <span className="truncate">je {unit === 'mwh' ? 'MWh' : 'kWh'}</span>
                {toggle}
              </span>
              <Leader faint/>
              <span className="shrink-0 tabular-nums">{unitSum}</span>
            </div>
          </summary>
          <div className="mb-1 mt-1.5 space-y-1 pl-5 text-xs leading-normal">
            {PARTS.filter(p => Math.abs(k.breakdown[p.key]) > 5e7).map(p =>
              <div key={p.key} className="flex items-baseline">
                <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{p.label}</span>
                <Leader faint/>
                <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{unitPart(k.breakdown[p.key] / (k.total / k.perMWh))}</span>
              </div>)}
            <p className="pt-0.5 text-zinc-400 dark:text-zinc-500">Nenner: versorgte Nachfrage {n0(k.total / k.perMWh / 1e6)} TWh/a (Stromlast + H₂-Pool-Äquivalent).</p>
          </div>
        </details> : <div className="mt-1.5 flex items-baseline text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex min-w-0 items-baseline gap-1.5"><span className="truncate">je {unit === 'mwh' ? 'MWh' : 'kWh'}</span>{toggle}</span>
          <Leader faint/>
          <span className="shrink-0 tabular-nums">{unitSum}</span>
        </div>;
      })()}
      <details className="group/gk mt-3">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300">
            <span aria-hidden className="w-3 shrink-0"><span className="group-open/gk:hidden">▸</span><span className="hidden group-open/gk:inline">▾</span></span>
            Wie wird gerechnet?
          </span>
        </summary>
        <p className="mt-1.5 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">Der Schalter »pro Jahr / Gesamt« oben skaliert jeden Posten: <strong>pro Jahr</strong> ist die levelized Jahresmiete (CAPEX über die <em>Anlagenlebensdauer</em> annuisiert mit technologiespezifischem realem WACC — z. B. PV 3,5 %, Kernkraft 7,8 % —, plus Betrieb; beides je Technologie in der Seitenleiste unter »Kosten-Annahmen« änderbar); <strong>Gesamt</strong> multipliziert mit dem Kostenzeitraum (Jahresmiete × {horizon} Jahre). Weil die Annuität die Baukosten über die Lebensdauer streckt, zählt »× Jahre« den Ersatz kurzlebiger Anlagen automatisch mit — eine Batterie mit ~15 a Lebensdauer wird über 30 Jahre zweimal gebaut. Das Ergebnis sind die Vollkosten des Stromsystems (undiskontiert), <em>nicht</em> die »Mehrinvestitionen« gegenüber einem Referenzpfad. Gerechnet wird die <strong>fertige Zielflotte im Dauerbetrieb</strong> — Hochlauf, Brückenbrennstoff und CO₂ der Übergangsjahre sind nicht enthalten. <em>Nicht</em> mitskaliert: die <strong>Ø Preise je kWh/MWh</strong> (Intensität, zeitraumunabhängig) und die <strong>einmalige Bauinvestition</strong> — der reine Overnight-Neubauwert der Zielflotte (Erzeugung + Speicher + Netz, ohne Annuisierung und ohne Bauzeitverzinsung), die Größenordnung des Anschubs, nicht die Gesamtkosten.</p>
      </details>
      {k.netzExtrapolated && <p className="mt-3 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
        ⚠ Netzausbau extrapoliert: {netzTrigger} liegt über dem geeichten Bereich der Netzkosten-Heuristik — der Posten ({fmtBig(k.breakdown.netz * mult)}) ist nur ein Richtungssignal.
      </p>}
      {sheddingTWh > 1 && <p className="mt-3 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
        ⚠ {n0(sheddingTWh)} TWh/a ({n1(sheddingPct)} % der Nachfrage) bleiben unversorgt — bepreist ist nur die gelieferte Energie; der Wert entgangener Last ist nicht bilanziert.
      </p>}
      <div className="mt-8 border-t-4 border-double border-zinc-300 dark:border-zinc-600"/>
      {(() => {
        const eur = (ct: number) => ct / 100 * hh.kwh / 12;
        const restCt = hh.bridge.reduce((a, r) => a + r.ct, 0) + hh.mwstCt;
        const row = 'flex items-baseline text-sm text-zinc-500 dark:text-zinc-400';
        return <div className="mt-5">
          <div className="flex items-baseline text-xl font-bold tracking-wider text-zinc-950 dark:text-zinc-50">
            <span className="min-w-0 truncate">MUSTERHAUSHALT</span>
            <Leader/>
            <span className="shrink-0 tabular-nums">≈ {n0(hh.endkundeEurPerMonth)} € / Monat</span>
          </div>
          <div className="mt-3 space-y-2.5">
              <details className="group/hh">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className={row}>
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"><span className="group-open/hh:hidden">▸</span><span className="hidden group-open/hh:inline">▾</span></span>
                      <span className="truncate">Zusammensetzung Verbrauch</span>
                    </span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums">{n0(hh.kwh)} kWh/a</span>
                  </div>
                </summary>
                <div className="mb-1.5 mt-2 space-y-1 pl-5 text-[13px] leading-normal">
                  <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">Grundbedarf (heutiger Ø-Haushalt)</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n0(hh.baseKwh)} kWh</span>
                  </div>
                  {hh.pkwKwh > 0 && <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">E-Auto ({n0(hh.kmPerYear)} km/a × {n1(hh.kwhPer100Km)} kWh/100 km)</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n0(hh.pkwKwh)} kWh</span>
                  </div>}
                  {hh.heizKwh > 0 && <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">Wärmepumpe ({n0(hh.heatKwhPerYear)} kWh Wärme ÷ JAZ {n1(hh.cop)})</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n0(hh.heizKwh)} kWh</span>
                  </div>}
                </div>
              </details>
              <details className="group/kwh">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className={row}>
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"><span className="group-open/kwh:hidden">▸</span><span className="hidden group-open/kwh:inline">▾</span></span>
                      <span className="truncate">Zusammensetzung kWh</span>
                    </span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums">{n1(hh.endkundeCt)} ct/kWh</span>
                  </div>
                </summary>
                <div className="mb-1.5 mt-2 space-y-1 pl-5 text-[13px] leading-normal">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Systemkosten</p>
                  <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">Systemkosten ab Werk (dieses Szenario)</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n1(hh.abWerkCt)} ct</span>
                  </div>
                  <p className="pt-2 text-[11px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Netzentgelte, Steuern &amp; Co</p>
                  {hh.bridge.map(r => <div key={r.key} className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">{r.label}</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n1(r.ct)} ct</span>
                  </div>)}
                  <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">Mehrwertsteuer 19 % (auf alle Bestandteile)</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n1(hh.mwstCt)} ct</span>
                  </div>
                  <div className="flex items-baseline border-t border-dashed border-zinc-200 pt-1.5 font-semibold dark:border-zinc-700">
                    <span className="min-w-0 truncate text-zinc-500 dark:text-zinc-400">= Endkundenpreis (geschätzt)</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-700 dark:text-zinc-300">{n1(hh.endkundeCt)} ct</span>
                  </div>
                  <p className="pt-1.5 text-[11px] leading-snug text-zinc-400 dark:text-zinc-500">Nur die Systemkosten folgen den Slidern; alle übrigen Bestandteile konstant auf 2025-Niveau (BDEW). Geschätzter Endkundenpreis — folgt den Last-Reglern.</p>
                  <a
                    href={dataWikiUrl('preise')}
                    target="_blank"
                    rel="noreferrer"
                    onClick={event => event.stopPropagation()}
                    className="inline-block text-[11px] uppercase tracking-wide text-zinc-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-zinc-700 dark:text-zinc-300"
                  >Im Wiki nachlesen →</a>
                </div>
              </details>
              <details className="group/mon">
                <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <div className={row}>
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span aria-hidden className="w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"><span className="group-open/mon:hidden">▸</span><span className="hidden group-open/mon:inline">▾</span></span>
                      <span className="truncate">Monatliche Kosten</span>
                    </span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums">{n0(hh.endkundeEurPerMonth)} €</span>
                  </div>
                </summary>
                <div className="mb-1.5 mt-2 space-y-1 pl-5 text-[13px] leading-normal">
                  <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">Systemkosten</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n0(eur(hh.abWerkCt))} €</span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="min-w-0 truncate text-zinc-400 dark:text-zinc-500">Netzentgelte, Steuern &amp; Co</span>
                    <Leader faint/>
                    <span className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400">{n0(eur(restCt))} €</span>
                  </div>
                </div>
              </details>
            </div>
        </div>;
      })()}
      <div className="mt-8 border-t border-dashed border-zinc-300 dark:border-zinc-600"/>
      <div className="flex flex-1 items-center justify-center pb-5 pt-10">
      <button type="button" onClick={copyShareUrl} className="block w-fit cursor-pointer" title="Szenario-Link kopieren">
        <span className="mx-auto block w-fit rounded-sm bg-white p-1.5 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
          <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="h-24 w-24" shapeRendering="crispEdges" role="img" aria-label="QR-Code: Link zu diesem Szenario">
            <path d={qr.d} fill="#000"/>
          </svg>
        </span>
        <span className="mt-2 block pl-[0.35em] text-center text-[10px] uppercase tracking-[0.35em] text-zinc-400 dark:text-zinc-500">{copied ? 'Link kopiert' : 'Dieses Szenario'}</span>
      </button>
      </div>
      </div>
    </div>
  </div>;
}

export default function KostenSection({ scenario, result, periodYears, waccShiftPp, supplyLabel, loadLabel, data, shareUrl }: { scenario: Scenario; result: SimulationResult; periodYears: string; waccShiftPp: number; supplyLabel: string; loadLabel: string; data: DataSet | null; shareUrl: string }) {
  const k = useMemo(() => computeKosten(scenario, result, waccShiftPp), [scenario, result, waccShiftPp]);
  // Musterhaushalt: kWh-Anteile aus den haushaltsrelevanten Last-Reglern,
  // Anzeige-Fakten (km, JAZ) direkt aus den e100-Paketen.
  const hh = useMemo<HaushaltView>(() => {
    const { pkwTWh, heizTWh } = householdElectrificationTWh(scenario, data);
    const base = computeHaushalt(k, pkwTWh, heizTWh);
    const P = uiManifest.prices as Record<string, number>;
    const households = P.households ?? 41_100_000;
    const pkw = data?.['e100-pkw'];
    const heiz = data?.['e100-heiz'];
    const kmPerYear = pkw ? Math.max(0, scenario.demand['e100-pkw-million-km'] - pkw.alreadyElectricMillionKm) * 1e6 / households : 0;
    const heatKwhPerYear = heiz ? Math.max(0, scenario.demand['e100-heiz-target-heat-twh'] - heiz.alreadyElectricHeatTWh) * 1e9 / households : 0;
    return { ...base, kmPerYear, kwhPer100Km: pkw?.kwhPer100Km ?? 0, heatKwhPerYear, cop: heiz?.seasonalCop ?? 0 };
  }, [k, scenario, data]);
  const horizon = Math.max(1, Number(periodYears));
  const [helpOpen, setHelpOpen] = useState(false);

  return <section id="section-kosten" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <div className="flex items-center gap-2">
      <SectionHeading id="kosten"/>
      <HelpDot open={helpOpen} onToggle={() => setHelpOpen(open => !open)} label="Wie werden die Kosten berechnet?"/>
    </div>
    {helpOpen && <HelpPanel>
      <p>Berechnet werden die <strong>Gesamtsystemkosten</strong> der <strong>fertigen Zielflotte im Dauerbetrieb</strong> — nicht die Gestehungskosten einzelner Anlagen und nicht der Übergangspfad: Hochlaufphase, fossiler Brückenbrennstoff und CO₂ der Bauzeit-Jahre sind nicht modelliert. Integrationskosten (Speicher, Backup, Überbau) stecken so automatisch in der Summe; einer Einzelbetrachtung „Was kostet eine kWh Wind?" fehlen dagegen Redispatch und Reserve. Die <strong>SUMME</strong> ist die levelized Jahresmiete: die Baukosten sind über die <em>Anlagenlebensdauer</em> annuisiert (CAPEX × Annuitätsfaktor), plus Betrieb und Brennstoff. In der Sicht <strong>pro Jahr</strong> ist diese Zahl horizont-unabhängig und der faire Vergleich zwischen Szenarien; der Schalter oben am Bon stellt wahlweise auf <strong>Gesamt</strong> um und multipliziert dann jeden Posten mit dem Kostenzeitraum.</p>
      <ul>
        <li><strong>Kapitalkosten (annuisiert)</strong> — Overnight-Baukosten der <em>gesamten</em> Flotte, über die Bauzeit mit dem WACC aufgezinst (Bauzeitverzinsung, Faktor ((1+r)^T−1)/(r·T): PV 1 a → 1,00, Gas 3 a → 1,07, Kernkraft 7 a → 1,27 bei 7,8 %) und mit dem Kapitalwiedergewinnungsfaktor über die Lebensdauer umgelegt (technologiespezifischer realer WACC: PV 3,5 %, Wind onshore 3,9 %, Batterie 5 %, Gas 6,5 %, Kernkraft 7,8 %; Netz reguliert 5 %): die jährlichen Kapitalkosten des Anlagenbestands inklusive Ersatz auslaufender Anlagen, nicht die Mehrinvestition gegenüber heute — auch das heutige System bindet so dauerhaft Kapital.</li>
        <li><strong>Betrieb &amp; Wartung</strong> — feste (€/kW·a) plus variable (€/MWh) Kosten.</li>
        <li><strong>Brennstoff</strong> — Brennstoffpreis ÷ Wirkungsgrad × erzeugte Energie aus der Stundensimulation (Gas, Kohle, Biomasse, Kernkraft).</li>
        <li><strong>Wasserstoff-Import</strong> — importierte H₂-Menge × Importpreis (frei Grenze, LHV).</li>
        <li><strong>Strom-Import-Saldo</strong> — Stromimport minus -export zum Großhandelspreis.</li>
        <li><strong>Netzausbau</strong> — zwei Invest-Pauschalen, annuisiert über 40 Jahre (Betrieb des Bestandsnetzes steckt im Netzentgelt der Haushalts-Brücke; Betrieb des Zubaus ist nicht bepreist): 1.000 €/kW je kW volatiler EE-Leistung über dem 2025-Bestand (174,7 GW; erzeugungsgetrieben: Übertragungsnetz, EE-Anschluss) plus 1.200 €/kW je kW Spitzenlast-Zuwachs über 2025 (75,6 GW; lastgetrieben: Verteilnetz für E-Mobilität, Wärmepumpen, Industrie — fällt in jedem Elektrifizierungs-Szenario an). Im 2025-Bestand null (Kupferplatte als Nullpunkt). Geeicht an Vollnetz-Schätzungen (IMK ~651 Mrd €, NEP ~320 Mrd € nur Übertragung, Frontier/DIHK »Plan B« ~1,2 Bio € als oberer Rand); strikt linear, ohne Spannungsebenen — über ~700 GW EE-Zubau bzw. ~100 GW Peak-Zuwachs nur als Richtungssignal zu lesen.</li>
      </ul>
      <p>Die <strong>Ø Stromkosten</strong> sind Jahres-Gesamtkosten ÷ gedeckte Jahresnachfrage. Dazu zählt neben der Stromlast auch die strom-äquivalent vom H₂-Pool gedeckte Sektor-Nachfrage (Stahl/Chemie/Schiff/Flug): H₂-Produktion bzw. -Import senkt die Stromlast, wird aber vom selben System bezahlt. Ein Systemdurchschnitt, kein Endkunden-Strompreis (ohne Netzentgelte, Steuern, Marge).</p>
      <p>Der <strong>Musterhaushalt</strong> unten folgt den Last-Reglern: 3.000 kWh Grundbedarf plus PKW- und Wärmepumpen-Strom des Szenarios je Haushalt. Sein Preis ist eine geschätzte Endkunden-Stromrechnung — Systemkosten ab Werk plus Netzentgelte, Steuern, Umlagen, Vertrieb und MwSt auf 2025-Niveau (BDEW); aufklappbar bis auf die Bestandteile, Methodik im Datenhandbuch (»preise«). Weil der Energieanteil kostenbasiert ab Werk gerechnet wird (statt Marktpreis + Marge), liegt das absolute Niveau ~10 % unter der realen BDEW-Rechnung — die Szenario-Vergleiche untereinander bleiben gültig.</p>
      <p>In der <strong>Gesamt</strong>-Sicht (Schalter oben) zeigt jeder Posten die levelized Jahresmiete × <strong>Kostenzeitraum</strong> (Regler in der Seitenleiste, 20/30/40 Jahre). Weil die Jahresmiete die Baukosten über die Anlagenlebensdauer annuisiert — inklusive technologiespezifischem realem WACC (PV 3,5 %, Wind 3,9–6 %, Gas 6,5 %, Kernkraft 7,8 %; je Technologie in der Seitenleiste änderbar) und dem Ersatz kurzlebiger Anlagen (eine Batterie mit ~15 a Lebensdauer wird über 30 Jahre zweimal gebaut, was die Annuität automatisch abbildet) —, ist die Summe über den Zeitraum die ehrlichen Vollkosten inklusive Finanzierung und Ersatz. Nachrichtlich steht die <strong>einmalige Bauinvestition</strong> daneben: der reine Neubauwert der gesamten Zielflotte (Erzeugung + Speicher + Netz, ohne Annuisierung) — die Größenordnung des Anschubs, nicht die Gesamtkosten. Es sind Vollkosten des Stromsystems, nicht die »Mehrinvestitionen« aus Energiewende-Studien (Differenz zu einem Referenzpfad); die Referenz 2025 enthält zudem keine fossilen Endenergiekosten der nicht-elektrifizierten Sektoren (~70–90 Mrd €/a).</p>
      <p><strong>Nicht enthalten:</strong> CO₂-Bepreisung (staatlich festgesetzter Transfer, kein Ressourcenaufwand des Systems) und nachfrageseitige Kosten (E-Fahrzeuge, Wärmepumpen). Kostenparameter und Preisannahmen mit Quellen im Datenhandbuch (Fraunhofer ISE, DEA, NREL ATB, IRENA).</p>
    </HelpPanel>}

    <div className="mx-auto mt-2 w-full max-w-[700px]">
      <Stromrechnung k={k} hh={hh} horizon={horizon} supplyLabel={supplyLabel} loadLabel={loadLabel} shareUrl={shareUrl} sheddingTWh={result.summary.loadSheddingTWh} sheddingPct={100 * result.summary.loadSheddingTWh / Math.max(1, result.summary.totalDemandTWh + (result.summary.h2PoolStromReductionTWh ?? 0))}/>
    </div>
  </section>;
}
