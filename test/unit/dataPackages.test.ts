import { describe, expect, it } from 'vitest';
import type { DatasetDoc } from '../../app/src/ui/dataCatalog';

type PackageJson = DatasetDoc & { parameters: Record<string, unknown> };

const modules = import.meta.glob('../../model/**/package.json', { eager: true, import: 'default' }) as Record<string, PackageJson>;

const validKinds = new Set<DatasetDoc['kind']>(['dataset', 'scenario', 'composition', 'model', 'template']);
const validDomains = /^(last|erzeugung|speicher|aussenhandel|presets|modell)$/;

type Entry = { path: string; stem: string; doc: DatasetDoc };

function deriveStem(path: string): string | null {
  const match = path.match(/\/model\/(.+)\/package\.json$/);
  if (!match) return null;
  const rel = match[1];
  return rel.split('/').pop() ?? null;
}

const entries: Entry[] = Object.entries(modules)
  .map(([path, doc]): Entry | null => {
    if (!doc || typeof doc !== 'object') return null;
    const stem = deriveStem(path);
    if (!stem) return null;
    return { path, stem, doc };
  })
  .filter((entry): entry is Entry => entry !== null);

describe('model packages', () => {
  it('discovers at least one package per known domain', () => {
    expect(entries.length).toBeGreaterThan(0);
    const domains = new Set(entries.map(entry => entry.doc.domain));
    for (const expected of ['last', 'erzeugung', 'speicher', 'aussenhandel', 'presets']) {
      expect(domains, expected).toContain(expected);
    }
  });

  it('id matches the file or folder name', () => {
    for (const { path, stem, doc } of entries) {
      const acceptedIds = new Set<string>([stem, `${doc.domain}-${stem}`]);
      expect(acceptedIds.has(doc.id), `${path}: id "${doc.id}" passt nicht zu Stem "${stem}"`).toBe(true);
    }
  });

  it('keeps the package in the DatasetDoc shape', () => {
    for (const { path, doc } of entries) {
      expect(typeof doc.id, path).toBe('string');
      expect(doc.id.length, path).toBeGreaterThan(0);
      expect(doc.domain, path).toMatch(validDomains);
      expect(validKinds.has(doc.kind), `${path}: kind "${doc.kind}"`).toBe(true);
      expect(doc.method, path).toBeDefined();
      expect(typeof doc.method.title, path).toBe('string');
      expect(typeof doc.method.source, path).toBe('string');
      expect(['string', 'object'].includes(typeof doc.method.description), path).toBe(true);
    }
  });
});
