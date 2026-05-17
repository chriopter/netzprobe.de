import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
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

const commits = (() => {
  try {
    const out = execSync(
      'git log -50 --no-merges --pretty=format:%H%x1f%h%x1f%aI%x1f%s%x1e',
      { cwd: rootDir, encoding: 'utf8' },
    );
    return out
      .split('\x1e')
      .map(record => record.replace(/^\n/, ''))
      .filter(Boolean)
      .map(record => {
        const [sha, short, date, subject] = record.split('\x1f');
        return { sha, short, date, subject };
      });
  } catch {
    return [];
  }
})();

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

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/netzprobe/' : '/',
  define: {
    __BUILD_COMMIT__: JSON.stringify(commitHash),
    __BUILD_COMMITS__: JSON.stringify(commits),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // ECharts referenziert `global` (Node-CommonJS-Konvention). Im Browser-Main
    // ist es shim'd, im Worker-Kontext aber nicht — daher explizit auf
    // globalThis mappen, damit chart-worker.ts beim init nicht crashed.
    global: 'globalThis',
  },
  plugins: [react(), tailwindcss(), topLevelData()],
  server: { port: 5177 },
  preview: { port: 4177 },
  build: { chunkSizeWarningLimit: 1500 },
});
