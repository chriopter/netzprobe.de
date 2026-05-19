import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Stellt sicher, dass jedes Top-Level-Feld in `parameters` in method.fields[]
// dokumentiert ist.

function packagePaths(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'schemas') return [];
      return packagePaths(fullPath);
    }
    return entry.isFile() && entry.name === 'package.json' ? [fullPath] : [];
  });
}

describe('model package field docs', () => {
  it('documents every parameter top-level field in method.fields', () => {
    const missing = packagePaths(path.resolve('model')).flatMap(filePath => {
      const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8')) as {
        method?: { fields?: Array<{ name: string }> };
        parameters?: Record<string, unknown>;
      };
      const documented = new Set((pkg.method?.fields ?? []).map(field => field.name));
      return Object.keys(pkg.parameters ?? {})
        .filter(name => !documented.has(name))
        .map(name => `${path.relative(process.cwd(), filePath)}: ${name}`);
    });

    expect(missing).toEqual([]);
  });
});
