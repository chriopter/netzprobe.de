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

function topLevelData(): Plugin {
  return {
    name: 'top-level-data',
    configureServer(server) {
      server.middlewares.use('/data', (req, res, next) => {
        const requested = normalize(decodeURIComponent(req.url?.split('?')[0] ?? '/'));
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
        if (extension === '.ts' || extension === '.tsx') return next();
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
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react(), tailwindcss(), topLevelData()],
  server: { port: 5177 },
  preview: { port: 4177 },
  build: { chunkSizeWarningLimit: 1500 },
});
