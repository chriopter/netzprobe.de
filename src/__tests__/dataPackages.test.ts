import { describe, expect, it } from 'vitest';
import type { DatasetDoc, ManifestEntry } from '../ui/dataCatalog';

const files = import.meta.glob('../../data/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const manifest = JSON.parse(files['../../data/manifest.json']) as ManifestEntry[];
const validKinds = new Set<DatasetDoc['kind']>(['dataset', 'scenario', 'composition', 'model', 'template']);
const jsonFiles = Object.entries(files)
  .filter(([path]) => path.match(/^\.\.\/\.\.\/data\/.*\.json$/) && !path.endsWith('manifest.json'))
  .map(([path, raw]) => [path, JSON.parse(raw)] as const);

function dataFile(path: string) {
  return files[`../../data/${path}`];
}

function readDoc(entry: ManifestEntry) {
  return JSON.parse(dataFile(entry.description)) as DatasetDoc;
}

describe('data package manifest', () => {
  it('keeps every manifest package in the strict package shape', () => {
    expect(manifest).not.toHaveLength(0);

    for (const entry of manifest) {
      expect(dataFile(`${entry.path}/description.json`), entry.path).toBeDefined();
      expect(dataFile(`${entry.path}/model.ts`), entry.path).toBeDefined();
      expect(dataFile(`${entry.path}/model.json`), entry.path).toBeUndefined();
    }
  });

  it('points to existing package descriptions with domain and kind metadata', () => {
    for (const entry of manifest) {
      expect(dataFile(entry.description), entry.description).toBeDefined();

      const doc = readDoc(entry);
      expect(doc.id, entry.description).toBe(entry.id);
      expect('code' in doc, entry.description).toBe(false);
      expect(doc.domain, entry.description).toMatch(/^(last|erzeugung|speicher|aussenhandel|presets|modell)$/);
      expect(validKinds.has(doc.kind), entry.description).toBe(true);
    }
  });

  it('links package files and scenario code that actually exist', () => {
    for (const entry of manifest) {
      const doc = readDoc(entry);
      if (doc.file) expect(dataFile(doc.file), doc.file).toBeDefined();
      for (const script of doc.scripts ?? []) {
        expect(dataFile(script), script).toBeDefined();
      }
      expect(doc.scripts).toContain(`${entry.path}/model.ts`);
      expect(doc.scripts?.every(script => script.startsWith(`${entry.path}/`)), doc.id).toBe(true);
      if (doc.file) expect(doc.file).toBe(`${entry.path}/data.json`);
      expect(doc.file?.endsWith('/model.json'), doc.id).not.toBe(true);
    }
  });

  it('does not keep a second identifier in package JSON files', () => {
    for (const [path, json] of jsonFiles) {
      expect('code' in json, path).toBe(false);
      if (json && typeof json === 'object' && 'id' in json) {
        const manifestEntry = manifest.find(entry => path.startsWith(`../../data/${entry.path}/`));
        if (manifestEntry) {
          expect(json.id, path).toBe(manifestEntry.id);
        }
      }
    }
  });
});
