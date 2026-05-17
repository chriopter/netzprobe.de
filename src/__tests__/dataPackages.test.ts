import { describe, expect, it } from 'vitest';
import type { DatasetDoc } from '../ui/dataCatalog';

type Module = { description?: DatasetDoc; data?: unknown };

// Glob all TS data modules — flat single-files (`data/<domain>/<stem>.ts`) plus
// folder-form modules (`data/<domain>/<stem>/index.ts`). Eagerly load so we
// can introspect the exported description and data values.
const modules = import.meta.glob('../../data/**/*.ts', { eager: true }) as Record<string, Module>;

const validKinds = new Set<DatasetDoc['kind']>(['dataset', 'scenario', 'composition', 'model', 'template']);
const validDomains = /^(last|erzeugung|speicher|aussenhandel|presets|modell)$/;

type Entry = { path: string; stem: string; doc: DatasetDoc; module: Module };

function deriveStem(path: string): string | null {
  // Examples:
  //   '../../data/last/e100-pkw.ts'          → 'e100-pkw'
  //   '../../data/erzeugung/2017/index.ts'   → '2017'
  //   '../../data/kern.ts'                   → 'kern'
  //   '../../data/last/e100-heiz/index.ts'   → 'e100-heiz'
  const match = path.match(/\/data\/(.+)\.ts$/);
  if (!match) return null;
  const rel = match[1];
  if (rel.endsWith('/index')) return rel.slice(0, -'/index'.length).split('/').pop() ?? null;
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

describe('data single-file modules', () => {
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
