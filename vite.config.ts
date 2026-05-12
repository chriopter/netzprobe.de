import { cpSync, existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const rootDir = dirname(fileURLToPath(import.meta.url));
const dataMounts = ['data_last', 'data_erzeugung', 'data_modellfaktoren', 'data_quellen'];

function topLevelData(): Plugin {
  return {
    name: 'top-level-data',
    configureServer(server) {
      for (const mount of dataMounts) {
        const sourceDir = resolve(rootDir, mount);
        server.middlewares.use(`/${mount}`, (req, res, next) => {
          const requested = normalize(decodeURIComponent(req.url?.split('?')[0] ?? '/'));
          const filePath = join(sourceDir, requested);
          if (!filePath.startsWith(sourceDir) || !existsSync(filePath) || !statSync(filePath).isFile()) return next();
          res.setHeader('Content-Type', extname(filePath) === '.json' ? 'application/json; charset=utf-8' : 'application/octet-stream');
          res.end(readFileSync(filePath));
        });
      }
    },
    closeBundle() {
      for (const mount of dataMounts) {
        const sourceDir = resolve(rootDir, mount);
        if (existsSync(sourceDir)) cpSync(sourceDir, resolve(rootDir, `dist/${mount}`), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), topLevelData()],
  server: { port: 5177 },
  preview: { port: 4177 },
  build: { chunkSizeWarningLimit: 1500 },
});
