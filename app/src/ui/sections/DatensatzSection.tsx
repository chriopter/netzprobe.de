import { useMemo, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { datasetDocs, getPackage } from '../dataCatalog';
import { computeKosten } from '../kosten';
import { annualByMaterial, groupSums, fuelTWhFromResult } from '../ressourcen';
import { e100ElectricTWh } from '../ScenarioSidebar';
import { cx } from '../ui';
import { HelpDot, HelpPanel } from '../sectionUi';
import type { Scenario } from '../../types/scenario';
import type { SimulationResult } from '../../types/simulation';
import type { DataSet } from '../../types/data';

const stringify = (value: unknown) => JSON.stringify(value, null, 2);

function scalarStr(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return '[]';
  if (typeof value === 'object') return '{}';
  return String(value);
}

// Sehr große Arrays (z. B. die 8.760-Stunden-Reihe) nicht über „Alle aufklappen"
// automatisch öffnen — sie bleiben aber per Klick einzeln aufklappbar.
const OVERSIZED = 1000;

// Rekursiver ASCII-Baum-Knoten (├─ │ └─), monospace, Kinder lazy gerendert.
function AsciiNode({ name, value, prefix, last, seedOpen }: { name: string; value: unknown; prefix: string; last: boolean; seedOpen: boolean }) {
  const isObj = value !== null && typeof value === 'object';
  const entries: Array<[string, unknown]> = !isObj ? [] : Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const expandable = entries.length > 0;
  const oversized = Array.isArray(value) && value.length > OVERSIZED;
  const [open, setOpen] = useState(expandable && seedOpen && !oversized);
  const branch = prefix + (last ? '└─ ' : '├─ ');
  const childPrefix = prefix + (last ? '   ' : '│  ');
  const tag = !isObj ? '' : Array.isArray(value) ? `[${entries.length}]` : `{${entries.length}}`;
  return <>
    <div
      className={cx('whitespace-pre-wrap [overflow-wrap:anywhere]', expandable && 'cursor-pointer')}
      style={{ paddingLeft: `${branch.length}ch`, textIndent: `-${branch.length}ch` }}
      onClick={expandable ? () => setOpen(o => !o) : undefined}
    >
      <span className="text-zinc-300 dark:text-zinc-600">{branch}</span>
      {expandable && <span className="text-zinc-400 dark:text-zinc-500">{open ? '▾ ' : '▸ '}</span>}
      <span className="text-zinc-700 dark:text-zinc-300">{name}</span>
      {expandable
        ? <span className="text-zinc-400 dark:text-zinc-500"> {tag}</span>
        : <><span className="text-zinc-400 dark:text-zinc-500">: </span><span className="text-emerald-700 dark:text-emerald-400">{scalarStr(value)}</span></>}
    </div>
    {expandable && open && entries.map(([k, v], i) => <AsciiNode key={k} name={k} value={v} prefix={childPrefix} last={i === entries.length - 1} seedOpen={false}/>)}
  </>;
}

const ICON_BTN = 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50';

function CopyIconBtn({ getText }: { getText: () => string }) {
  const [done, setDone] = useState(false);
  return <span className="relative inline-flex">
    <button
      type="button"
      aria-label="Gesamten Datensatz als JSON kopieren"
      title="Gesamten Datensatz als JSON kopieren"
      onClick={() => navigator.clipboard?.writeText(getText()).then(() => { setDone(true); window.setTimeout(() => setDone(false), 1600); }).catch(() => {})}
      className={cx(
        'inline-flex h-7 w-7 items-center justify-center rounded-md border transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20',
        done
          ? 'scale-110 border-emerald-500 bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.20)]'
          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50',
      )}
    >{done ? <Check className="h-4 w-4"/> : <Copy className="h-4 w-4"/>}</button>
    {done && <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white shadow-md">Kopiert ✓</span>}
  </span>;
}

function OpenTabBtn({ getText }: { getText: () => string }) {
  return <button
    type="button"
    aria-label="JSON in neuem Tab öffnen"
    title="JSON in neuem Tab öffnen"
    onClick={() => {
      const url = URL.createObjectURL(new Blob([getText()], { type: 'application/json' }));
      window.open(url, '_blank', 'noopener');
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }}
    className={ICON_BTN}
  ><ExternalLink className="h-4 w-4"/></button>;
}

// Primitive Blätter rekursiv zählen (für die Übersicht: Anzahl Parameter).
function countLeaves(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((s, v) => s + countLeaves(v), 0);
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).reduce<number>((s, v) => s + countLeaves(v), 0);
  return 1;
}

export default function DatensatzSection({ resolvedScenario, result, periodYears, waccShiftPp, data, shareUrl }: { resolvedScenario: Scenario; result: SimulationResult; periodYears: string; waccShiftPp: number; data: DataSet | null; shareUrl: string }) {
  const kosten = useMemo(() => computeKosten(resolvedScenario, result, waccShiftPp), [resolvedScenario, result, waccShiftPp]);
  const ressourcen = useMemo(() => {
    const fuelTWh = fuelTWhFromResult(result);
    const annual = annualByMaterial(resolvedScenario, Math.max(1, Number(periodYears)), e100ElectricTWh(resolvedScenario, data), fuelTWh);
    return { annualByMaterial: annual, gruppen: groupSums(annual), fuelTWhProTech: fuelTWh };
  }, [resolvedScenario, result, periodYears, data]);

  // Alle Modell-Pakete automatisch aus dem import.meta.glob (dataCatalog) —
  // VOLLSTÄNDIG (method = Wiki-Texte/Quellen/Caveats + parameters), damit ein
  // LLM Methodik und Zahlen gemeinsam prüfen kann. Neue Pakete/Parameter
  // erscheinen ohne Codeänderung.
  const modellPakete = useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const doc of [...datasetDocs].sort((a, b) => (a.domain + a.id).localeCompare(b.domain + b.id))) {
      out[`${doc.domain}/${doc.id}`] = getPackage(doc.id) ?? doc;
    }
    return out;
  }, []);

  const lauf = useMemo(() => ({
    szenario: resolvedScenario,
    ergebnisKennzahlen: result.summary,
    ergebnisStundenreihe: result.hours,
    kosten,
    ressourcen,
  }), [resolvedScenario, result, kosten, ressourcen]);

  // Legende NICHT hartkodiert: kommt aus dem kern-Paket (parameters.datensatz),
  // wird also auch im Wiki gepflegt und beim Überarbeiten des Modells gesehen.
  const legende = useMemo(() => (getPackage('kern')?.parameters as { datensatz?: unknown })?.datensatz ?? null, []);

  // quelle: reproduzierbarer, teilbarer Link auf genau dieses Szenario(-Set) —
  // damit der Datensatz nicht nur eine flüchtige blob-UUID, sondern seine
  // Herkunft mitträgt (Öffnen der URL erzeugt bit-identisch dieselben Daten).
  const root = useMemo(() => ({ quelle: { tool: 'netzprobe.de', szenarioUrl: shareUrl }, legende, lauf, modellPakete }), [shareUrl, legende, lauf, modellPakete]);
  const rootEntries = Object.entries(root);

  // Pro-Modus: erst auf Klick ausklappen. Solange eingeklappt, wird der teure
  // JSON-Dump (inkl. 8.760-Stunden-Reihe) gar nicht erzeugt.
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const fullJson = useMemo(() => (open ? stringify(root) : ''), [open, root]);
  const lineCount = useMemo(() => (open ? fullJson.split('\n').length : 0), [open, fullJson]);
  const uebersicht = useMemo(() => ({
    pakete: Object.keys(modellPakete).length,
    parameter: Object.values(modellPakete).reduce<number>((s, pkg) => s + countLeaves((pkg as { parameters?: unknown })?.parameters ?? {}), 0),
  }), [modellPakete]);
  const n0 = (x: number) => x.toLocaleString('de-DE');

  return <section id="section-datensatz" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <div className="flex items-center gap-2">
      <h2 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">Datensatz</h2>
      <HelpDot open={helpOpen} onToggle={() => setHelpOpen(o => !o)} label="Was steht im Datensatz?"/>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="ml-auto inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[13px] font-medium text-zinc-600 transition hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
      >
        <span className={cx('inline-block transition-transform', open && 'rotate-90')}>▸</span>
        {open ? 'Rohdaten ausblenden' : 'Rohdaten anzeigen'}
      </button>
    </div>
    {helpOpen && <HelpPanel>
      <p>Vollständige, <strong>automatisch erzeugte</strong> und <strong>selbstbeschreibende</strong> Aufstellung aller Daten dieser Rechnung — zum Aufklappen (per Klick) und als JSON kopierbar (Kopier-Symbol). Gedacht zum Hineinkopieren in ein LLM, um Methodik und Zahlen prüfen zu lassen. Eine <code>legende</code> oben erklärt Struktur, Einheiten und nicht offensichtliche Felder; <code>modellPakete</code> liest direkt aus <code>model/**/package.json</code>, neue Parameter erscheinen ohne Codeänderung.</p>
      <ul>
        <li><strong>quelle</strong> — teilbarer Link auf genau dieses Szenario(-Set); Öffnen reproduziert die Daten bit-identisch.</li>
        <li><strong>legende</strong> — Struktur, automatisch abgeleitete Einheiten und Feld-Glossar.</li>
        <li><strong>lauf</strong> — die konkreten Ein- und Ausgaben: aufgelöstes Szenario, Ergebnis-Kennzahlen, die vollständige Stundenreihe, sowie der Kosten- und Ressourcen-Rechenweg mit echten Zahlen.</li>
        <li><strong>modellPakete</strong> — alle Pakete <em>vollständig</em>: <code>parameters</code> plus die Wiki-Texte unter <code>method</code> (Titel, Beschreibung, Quelle, sourceUrls, Herleitung, Grenzen).</li>
      </ul>
    </HelpPanel>}

    {open && <div className="border border-zinc-200 bg-white p-4 shadow-[0_2px_6px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.10)] sm:p-6 dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_2px_6px_rgba(0,0,0,0.4),0_16px_40px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-2">
        <span className="min-w-0 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">{n0(uebersicht.pakete)} Pakete · {n0(uebersicht.parameter)} Parameter · {n0(lineCount)} Zeilen</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <OpenTabBtn getText={() => fullJson}/>
          <CopyIconBtn getText={() => fullJson}/>
        </span>
      </div>

      <div className="mt-3 border-t border-zinc-100 pt-3 font-mono text-[11px] leading-5 text-zinc-800 dark:border-zinc-800 dark:text-zinc-200">
        {rootEntries.map(([k, v], i) => <AsciiNode key={k} name={k} value={v} prefix="" last={i === rootEntries.length - 1} seedOpen={k !== 'legende'}/>)}
      </div>
    </div>}
  </section>;
}
