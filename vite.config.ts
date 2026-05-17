import { cpSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootDir = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(rootDir, 'data');
const commitHash = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
})();

const RECENT_DAY_COUNT = 2;

const allCommits = (() => {
  try {
    const out = execSync(
      'git log --no-merges --pretty=format:%H%x1f%h%x1f%aI%x1f%s%x1f%b%x1e',
      { cwd: rootDir, encoding: 'utf8' },
    );
    return out
      .split('\x1e')
      .map(record => record.replace(/^\n/, ''))
      .filter(Boolean)
      .map(record => {
        const [sha, short, date, subject, body] = record.split('\x1f');
        return { sha, short, date, subject, body: (body ?? '').trim() };
      });
  } catch {
    return [] as { sha: string; short: string; date: string; subject: string; body: string }[];
  }
})();

const dayKeyOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dayLabelOf = (iso: string) =>
  new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

const distinctDayKeys = (() => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of allCommits) {
    const key = dayKeyOf(c.date);
    if (!seen.has(key)) { seen.add(key); out.push(key); }
  }
  return out;
})();

const recentDayKeys = new Set(distinctDayKeys.slice(0, RECENT_DAY_COUNT));
const recentCommits = allCommits.filter(c => recentDayKeys.has(dayKeyOf(c.date)));
const olderCommits = allCommits.filter(c => !recentDayKeys.has(dayKeyOf(c.date)));

const olderDays = (() => {
  const map = new Map<string, { label: string; count: number }>();
  for (const c of olderCommits) {
    const key = dayKeyOf(c.date);
    const entry = map.get(key);
    if (entry) entry.count++;
    else map.set(key, { label: dayLabelOf(c.date), count: 1 });
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, value]) => ({ key, label: value.label, count: value.count }));
})();

const olderCommitsJson = JSON.stringify(olderCommits);

function commitHistory(): Plugin {
  return {
    name: 'commit-history',
    configureServer(server) {
      server.middlewares.use('/commits-older.json', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(olderCommitsJson);
      });
    },
    closeBundle() {
      writeFileSync(resolve(rootDir, 'dist/commits-older.json'), olderCommitsJson);
    },
  };
}

function topLevelData(): Plugin {
  return {
    name: 'top-level-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const rawUrl = req.url ?? '/';
        const requested = normalize(decodeURIComponent(rawUrl.split('?')[0]));
        const filePath = join(dataDir, requested);
        if (!filePath.startsWith(dataDir)) {
          res.statusCode = 403;
          res.end('Forbidden');
          return;
        }
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        const extension = extname(filePath);
        if (rawUrl.includes('?raw-text')) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(readFileSync(filePath));
          return;
        }
        if (extension === '.ts' || extension === '.tsx') return next();
        if (rawUrl.includes('?')) return next();
        res.setHeader('Content-Type', extension === '.json' ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
        res.end(readFileSync(filePath));
      });
    },
    closeBundle() {
      if (existsSync(dataDir)) cpSync(dataDir, resolve(rootDir, 'dist/data'), { recursive: true });
    },
  };
}

function precomputeDefaultResult(): Plugin {
  return {
    name: 'precompute-default-result',
    closeBundle() {
      const outPath = resolve(rootDir, 'dist/default-result.json');
      const result = spawnSync('npx', ['tsx', 'src/simulation/precomputeDefault.ts', outPath], {
        stdio: 'inherit',
        cwd: rootDir,
      });
      if (result.status !== 0) {
        throw new Error('precompute-default-result: tsx-Run fehlgeschlagen');
      }
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/netzprobe/' : '/',
  define: {
    __BUILD_COMMIT__: JSON.stringify(commitHash),
    __BUILD_COMMITS__: JSON.stringify(recentCommits),
    __BUILD_OLDER_DAYS__: JSON.stringify(olderDays),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // ECharts referenziert `global` (Node-CommonJS-Konvention). Im Browser-Main
    // ist es shim'd, im Worker-Kontext aber nicht — daher explizit auf
    // globalThis mappen, damit chart-worker.ts beim init nicht crashed.
    global: 'globalThis',
  },
  plugins: [react(), tailwindcss(), topLevelData(), commitHistory(), precomputeDefaultResult()],
  server: { port: 5177 },
  preview: { port: 4177 },
  build: { chunkSizeWarningLimit: 1500 },
});
