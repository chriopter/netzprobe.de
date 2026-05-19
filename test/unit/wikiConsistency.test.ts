import { describe, expect, it } from 'vitest';
import type { DatasetDoc } from '../../app/src/ui/dataCatalog';

// Drift-Test (method ↔ parameters): prueft, ob kritische konkrete Parameter
// (z. B. Default-Slider-Werte, Slider-Maxima, Slider-Minima, installierte
// Leistungen) auch in der method-Beschreibung (in Backticks) auftauchen.

type PackageJson = DatasetDoc & { parameters: Record<string, unknown> };

const modules = import.meta.glob('../../model/**/package.json', { eager: true, import: 'default' }) as Record<string, PackageJson>;

type Entry = { path: string; doc: DatasetDoc; pkg: PackageJson };

const entries: Entry[] = Object.entries(modules)
  .map(([path, pkg]): Entry | null => {
    if (!pkg || typeof pkg !== 'object') return null;
    return { path, doc: pkg, pkg };
  })
  .filter((entry): entry is Entry => entry !== null);

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
  const descriptionList = Array.isArray(doc.method.description) ? doc.method.description : [doc.method.description];
  parts.push(...descriptionList);
  doc.method.overview?.forEach(item => parts.push(item.value));
  doc.method.reasoning?.forEach(item => parts.push(item));
  doc.method.caveats?.forEach(item => parts.push(item));
  parts.push(doc.method.short ?? '');
  parts.push(doc.method.source ?? '');
  return parts.join('\n');
}

function numberVariants(value: number): string[] {
  if (!Number.isFinite(value)) return [];
  if (value === 0) return ['0'];
  const variants = new Set<string>();
  const baseFormats = (n: number) => {
    const asString = String(n);
    variants.add(asString);
    variants.add(asString.replace('.', ','));
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
  if (!Number.isInteger(value)) {
    baseFormats(Math.round(value));
  }
  return [...variants];
}

function containsAsWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,])`);
  return re.test(haystack);
}

type DriftCase = {
  modulePath: string;
  key: string;
  value: number;
};

function collectCriticalValues(parameters: Record<string, unknown>): Array<{ key: string; value: number }> {
  const out: Array<{ key: string; value: number }> = [];
  function walk(obj: unknown, prefix: string) {
    if (obj === null || typeof obj !== 'object') return;
    for (const [key, raw] of Object.entries(obj as Record<string, unknown>)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof raw === 'number' && isCriticalKey(key)) {
        out.push({ key: fullKey, value: raw });
      } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        walk(raw, fullKey);
      }
    }
  }
  walk(parameters, '');
  return out;
}

describe('method ↔ parameters drift', () => {
  it('discovers at least one package', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('reflects critical parameter fields (defaults, min/max, installed) in the method description', () => {
    const drifts: DriftCase[] = [];
    let checked = 0;
    for (const { path, doc, pkg } of entries) {
      const criticalValues = collectCriticalValues(pkg.parameters ?? {});
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
        .map(d => `  - ${d.modulePath}: ${d.key} = ${d.value} fehlt in der method.description`)
        .join('\n');
      throw new Error(
        `Drift: ${drifts.length} kritische parameter-Werte (von ${checked} geprueft) fehlen in der method-description:\n${summary}`,
      );
    }
    expect(drifts.length).toBe(0);
  });
});
