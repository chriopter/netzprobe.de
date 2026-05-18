import { describe, expect, it } from 'vitest';
import type { DatasetDoc } from '../../app/src/ui/dataCatalog';

type Module = { description?: DatasetDoc; data?: unknown };
type PackageJson = Module;

// Glob all model package JSON files. Eagerly load so we can introspect the
// description and data values.
const modules = import.meta.glob('../../model/**/package.json', { eager: true, import: 'default' }) as Record<string, PackageJson>;

const validKinds = new Set<DatasetDoc['kind']>(['dataset', 'scenario', 'composition', 'model', 'template']);
const validDomains = /^(last|erzeugung|speicher|aussenhandel|presets|modell)$/;

type Entry = { path: string; stem: string; doc: DatasetDoc; module: Module };

function deriveStem(path: string): string | null {
  // Examples:
  //   '../../model/last/e100-pkw/package.json'        → 'e100-pkw'
  //   '../../model/erzeugung/2017/package.json'       → '2017'
  //   '../../model/kern/kern/package.json'            → 'kern'
  const match = path.match(/\/model\/(.+)\/package\.json$/);
  if (!match) return null;
  const rel = match[1];
  return rel.split('/').pop() ?? null;
}

const entries: Entry[] = Object.entries(modules)
  .map(([path, module]): Entry | null => {
    const doc = module.description;
    if (!doc || typeof doc !== 'object') return null;
    const stem = deriveStem(path);
    if (!stem) return null;
    return { path, stem, doc, module };
  })
  .filter((entry): entry is Entry => entry !== null);

describe('model packages', () => {
  it('discovers at least one description per known domain', () => {
    expect(entries.length).toBeGreaterThan(0);
    const domains = new Set(entries.map(entry => entry.doc.domain));
    for (const expected of ['last', 'erzeugung', 'speicher', 'aussenhandel', 'presets']) {
      expect(domains, expected).toContain(expected);
    }
  });

  it('exports a description whose id matches the file or folder name', () => {
    for (const { path, stem, doc } of entries) {
      // Akzeptierte Varianten: reiner Stem (z.B. `e100-pkw`, `pv`, `kern`) oder
      // `<domain>-<stem>` (z.B. `last-2025`, `erzeugung-2025`).
      const acceptedIds = new Set<string>([stem, `${doc.domain}-${stem}`]);
      expect(acceptedIds.has(doc.id), `${path}: id "${doc.id}" passt nicht zu Stem "${stem}"`).toBe(true);
    }
  });

  it('keeps the description in the strict DatasetDoc shape', () => {
    for (const { path, doc } of entries) {
      expect(typeof doc.id, path).toBe('string');
      expect(doc.id.length, path).toBeGreaterThan(0);
      expect(typeof doc.title, path).toBe('string');
      expect(doc.domain, path).toMatch(validDomains);
      expect(validKinds.has(doc.kind), `${path}: kind "${doc.kind}"`).toBe(true);
      expect(typeof doc.source, path).toBe('string');
      // `description` ist string oder string[]
      expect(['string', 'object'].includes(typeof doc.description), path).toBe(true);
    }
  });

  it('keeps description.id consistent with data.id when data carries one', () => {
    for (const { path, doc, module } of entries) {
      const data = module.data;
      if (data && typeof data === 'object' && 'id' in (data as Record<string, unknown>)) {
        expect((data as { id: unknown }).id, path).toBe(doc.id);
      }
    }
  });
});
