import { describe, expect, it } from 'vitest';
import type { DatasetDoc } from '../../app/src/ui/dataCatalog';

// Drift-Test (Wiki ↔ data): prueft, ob kritische konkrete Werte im
// exportierten `data`-Objekt (z. B. Default-Slider-Werte, Slider-Maxima,
// Slider-Minima, installierte Leistungen, Emissionsfaktoren) auch in der
// `description` (in Backticks) auftauchen.
//
// Wir gehen bewusst von data → description statt von description → data:
// Beschreibungen enthalten viele abgeleitete Werte (z. B. "rund 72 TWh/a
// Jahresertrag" als Produkt aus installierter Leistung und Volllaststunden),
// die nicht 1:1 in data stehen. Defaults und Slider-Grenzen dagegen
// SOLLTEN in der description als konkrete Werte stehen — sonst driftet die
// Wiki.

type Module = { description?: DatasetDoc; data?: unknown };

const modules = import.meta.glob('../../model/**/package.json', { eager: true, import: 'default' }) as Record<string, Module>;

type Entry = { path: string; doc: DatasetDoc; module: Module };

const entries: Entry[] = Object.entries(modules)
  .map(([path, module]): Entry | null => {
    const doc = module.description;
    if (!doc || typeof doc !== 'object') return null;
    return { path, doc, module };
  })
  .filter((entry): entry is Entry => entry !== null);

// Felder im data, deren Werte zwingend in der description auftauchen sollten.
// Wir matchen ueber Namen-Suffixe — das erfasst alle Varianten wie
// defaultInstalledGW, defaultTargetMillionKm, maxTargetTWh, stepGW, etc.
const CRITICAL_SUFFIXES = [
  /^default[A-Z0-9].*/,
  /^max[A-Z0-9].*/,
  /^min[A-Z0-9].*/,
  /^installed[A-Z0-9].*/,
];

function isCriticalKey(key: string): boolean {
  return CRITICAL_SUFFIXES.some(re => re.test(key));
}

function gatherDescriptionText(doc: DatasetDoc): string {
  const parts: string[] = [];
  const descriptionList = Array.isArray(doc.description) ? doc.description : [doc.description];
  parts.push(...descriptionList);
  doc.overview?.forEach(item => parts.push(item.value));
  doc.method?.forEach(item => parts.push(item));
  doc.caveats?.forEach(item => parts.push(item));
  parts.push(doc.short ?? '');
  parts.push(doc.source ?? '');
  return parts.join('\n');
}

// Liefert alle Strings, die wie die uebergebene Zahl aussehen koennten:
// "102.5" → ["102.5", "102,5"], "1000" → ["1000", "1.000", "1,000"].
function numberVariants(value: number): string[] {
  if (!Number.isFinite(value)) return [];
  if (value === 0) return ['0'];
  const variants = new Set<string>();
  // Wir wollen tolerant gegenueber Rundung sein: pruefe Wert + +- 1 letzte
  // Stelle, falls die Description rundet (z. B. 102.5 → "102").
  const baseFormats = (n: number) => {
    const asString = String(n);
    variants.add(asString);
    variants.add(asString.replace('.', ','));
    // Tausenderpunkt (de): 1000 → 1.000.
    const intPart = Math.trunc(Math.abs(n));
    if (intPart >= 1000) {
      const intStr = String(intPart);
      const withDot = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const decimalPart = asString.includes('.') ? asString.split('.')[1] : null;
      variants.add(decimalPart ? `${withDot},${decimalPart}` : withDot);
      const withSep = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, '_');
      variants.add(decimalPart ? `${withSep}.${decimalPart}` : withSep);
    }
  };
  baseFormats(value);
  // Gerundete Variante (Description rundet oft).
  if (!Number.isInteger(value)) {
    baseFormats(Math.round(value));
  }
  return [...variants];
}

// Pruefe, ob eine der Varianten als WORT in der Description vorkommt (also
// nicht als Teilstring einer groesseren Zahl wie "1024" in "10240").
function containsAsWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  // Wortgrenzen-Match: links/rechts kein Ziffer/Komma/Punkt.
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,])`);
  return re.test(haystack);
}

type DriftCase = {
  modulePath: string;
  key: string;
  value: number;
};

function collectCriticalValues(data: unknown, prefix = ''): Array<{ key: string; value: number }> {
  if (data === null || typeof data !== 'object') return [];
  const out: Array<{ key: string; value: number }> = [];
  for (const [key, raw] of Object.entries(data as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof raw === 'number' && isCriticalKey(key)) {
      out.push({ key: fullKey, value: raw });
    } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      out.push(...collectCriticalValues(raw, fullKey));
    }
  }
  return out;
}

describe('wiki ↔ data drift', () => {
  it('discovers at least one module with descriptions', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('reflects critical data fields (defaults, min/max, installed) in the description', () => {
    const drifts: DriftCase[] = [];
    let checked = 0;
    for (const { path, doc, module } of entries) {
      const data = module.data;
      if (data === undefined || data === null || typeof data !== 'object') continue;
      const criticalValues = collectCriticalValues(data);
      if (criticalValues.length === 0) continue;
      const haystack = gatherDescriptionText(doc);
      for (const { key, value } of criticalValues) {
        checked += 1;
        const variants = numberVariants(value);
        if (variants.length === 0) continue;
        const matched = variants.some(v => containsAsWord(haystack, v));
        if (!matched) {
          drifts.push({ modulePath: path, key, value });
        }
      }
    }
    if (drifts.length > 0) {
      const summary = drifts
        .map(d => `  - ${d.modulePath}: ${d.key} = ${d.value} fehlt in der description`)
        .join('\n');
      throw new Error(
        `Wiki-Drift: ${drifts.length} kritische data-Werte (von ${checked} geprueft) fehlen in der description:\n${summary}`,
      );
    }
    expect(drifts.length).toBe(0);
  });
});
