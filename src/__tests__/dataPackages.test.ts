import { describe, expect, it } from 'vitest';
import type { DatasetDoc, ManifestEntry } from '../ui/dataCatalog';

const files = import.meta.glob('../../data/**/*', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const manifest = JSON.parse(files['../../data/manifest.json']) as ManifestEntry[];
const validKinds = new Set<DatasetDoc['kind']>(['dataset', 'scenario', 'composition', 'model']);
const jsonFiles = Object.entries(files)
  .filter(([path]) => path.match(/^\.\.\/\.\.\/data\/[^/]+\/.*\.json$/))
  .map(([path, raw]) => [path, JSON.parse(raw)] as const);
const packageNames = Array.from(new Set(
  Object.keys(files)
    .map(path => path.match(/^\.\.\/\.\.\/data\/([^/]+)\//)?.[1])
    .filter((name): name is string => Boolean(name)),
)).sort();

function dataFile(path: string) {
  return files[`../../data/${path}`];
}

function readDoc(entry: ManifestEntry) {
  return JSON.parse(dataFile(entry.description)) as DatasetDoc;
}

function packageNameFromDescription(description: string) {
  return description.split('/')[0];
}

describe('data package manifest', () => {
  it('keeps every data package in the strict package shape', () => {
    expect(packageNames).not.toHaveLength(0);

    for (const packageName of packageNames) {
      expect(dataFile(`${packageName}/description.json`), packageName).toBeDefined();
      expect(dataFile(`${packageName}/model.ts`), packageName).toBeDefined();
      expect(dataFile(`${packageName}/model.json`), packageName).toBeUndefined();
    }
  });

  it('points to existing package descriptions with domain and kind metadata', () => {
    expect(manifest).not.toHaveLength(0);

    for (const entry of manifest) {
      expect(dataFile(entry.description), entry.description).toBeDefined();

      const doc = readDoc(entry);
      const packageName = packageNameFromDescription(entry.description);
      expect(entry.id, entry.description).toBe(packageName);
      expect(doc.id, entry.description).toBe(packageName);
      expect(doc.id, entry.description).toBe(entry.id);
      expect('code' in doc, entry.description).toBe(false);
      expect(doc.domain, entry.description).toMatch(/^(last|erzeugung|modell)$/);
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
      const packageName = packageNameFromDescription(entry.description);
      expect(doc.scripts).toContain(`${packageName}/model.ts`);
      expect(doc.scripts?.every(script => script.startsWith(`${packageName}/`)), doc.id).toBe(true);
      if (doc.file) expect(doc.file).toBe(`${packageName}/data.json`);
      expect(doc.file?.endsWith('/model.json'), doc.id).not.toBe(true);
    }
  });

  it('does not keep a second identifier in package JSON files', () => {
    for (const [path, json] of jsonFiles) {
      expect('code' in json, path).toBe(false);
      const packageName = path.match(/^\.\.\/\.\.\/data\/([^/]+)\//)?.[1];
      if (json && typeof json === 'object' && 'id' in json) {
        expect(json.id, path).toBe(packageName);
      }
    }
  });
});
