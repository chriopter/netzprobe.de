import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, '..');
const dataDir = resolve(rootDir, 'data');
const modelDir = resolve(rootDir, 'model');
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

function topLevelStaticTree(route: string, directory: string): Plugin {
  return {
    name: `top-level-${route}`,
    configureServer(server) {
      server.middlewares.use(`/${route}`, (req, res, next) => {
        const rawUrl = req.url ?? '/';
        const requested = normalize(decodeURIComponent(rawUrl.split('?')[0]));
        const filePath = join(directory, requested);
        if (!filePath.startsWith(directory)) {
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
      if (existsSync(directory)) cpSync(directory, resolve(rootDir, `dist/${route}`), { recursive: true });
    },
  };
}

const SITE_URL = 'https://netzprobe.de';

// Globale Head-Defaults aus index.html — müssen wortgleich sein, damit die
// Per-Seiten-Ersetzung beim Prerender greift. Bei Änderung dort hier nachziehen.
const HEAD_TITLE = 'Netzprobe – Stromsimulation Deutschland';
const HEAD_DESC = 'Interaktive Stromsystem-Simulation für Deutschland: Last, Erzeugung, Speicher, Kosten und Ressourcen für 2025 und 100%-Szenarien. Stündlicher Dispatch, quelloffen, ohne Account.';

type WikiDoc = { id: string; hasData: boolean; domain: string; title: string; desc: string; dataUrl: string };

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const stripMarkdown = (s: string) =>
  s.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

// Liest alle model/**/package.json (gleiche Quelle wie der Wiki-Katalog im Frontend).
function collectWikiDocs(dir: string): WikiDoc[] {
  const docs: WikiDoc[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (entry.name !== 'package.json') continue;
      try {
        const pkg = JSON.parse(readFileSync(full, 'utf8'));
        const m = pkg?.method;
        if (!pkg?.id || !m?.title) continue;
        const rawDesc = m.short ?? (Array.isArray(m.description) ? m.description[0] : m.description) ?? '';
        const desc = stripMarkdown(String(rawDesc)).slice(0, 200);
        const rel = relative(modelDir, d).split(/[\\/]/).join('/');
        const hasData = typeof m.file === 'string' && !!m.file;
        const dataUrl = `${SITE_URL}/model/${hasData ? m.file : `${rel}/package.json`}`;
        docs.push({ id: pkg.id, hasData, domain: pkg.domain ?? '', title: m.title, desc, dataUrl });
      } catch { /* ungültige package.json überspringen */ }
    }
  };
  if (existsSync(dir)) walk(dir);
  return docs.sort((a, b) => (a.id < b.id ? -1 : 1));
}

const ld = (obj: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

const ORG = { '@type': 'Organization', name: 'Netzprobe', url: `${SITE_URL}/` };
const SITE = { '@type': 'WebSite', name: 'Netzprobe', url: `${SITE_URL}/` };

function homepageLd(): string {
  return ld([
    { '@context': 'https://schema.org', ...SITE, inLanguage: 'de',
      description: HEAD_DESC, publisher: ORG },
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Netzprobe',
      url: `${SITE_URL}/`, applicationCategory: 'Simulation', operatingSystem: 'Web',
      inLanguage: 'de', isAccessibleForFree: true, description: HEAD_DESC },
  ]);
}

function wikiLd(doc: WikiDoc, pageUrl: string): string {
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Netzprobe', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Wiki', item: `${SITE_URL}/wiki/` },
      { '@type': 'ListItem', position: 3, name: doc.title, item: pageUrl },
    ],
  };
  const main = doc.hasData
    ? { '@context': 'https://schema.org', '@type': 'Dataset', name: doc.title, description: doc.desc,
        url: pageUrl, identifier: doc.id, inLanguage: 'de', isAccessibleForFree: true,
        keywords: ['Stromsystem', 'Energie', doc.domain].filter(Boolean), creator: ORG, isPartOf: SITE,
        distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: doc.dataUrl }] }
    : { '@context': 'https://schema.org', '@type': 'TechArticle', headline: doc.title, description: doc.desc,
        url: pageUrl, inLanguage: 'de', author: ORG, isPartOf: SITE };
  return ld(main) + ld(breadcrumb);
}

function seo(): Plugin {
  const sitemapXml = () => {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = [
      `${SITE_URL}/`,
      `${SITE_URL}/wiki/`,
      ...collectWikiDocs(modelDir).map(d => `${SITE_URL}/wiki/${encodeURIComponent(d.id)}`),
    ];
    const body = urls.map(loc => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  };
  return {
    name: 'seo',
    enforce: 'post' as const,
    configureServer(server) {
      server.middlewares.use('/sitemap.xml', (_req, res) => {
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(sitemapXml());
      });
    },
    // writeBundle statt closeBundle: das gebaute index.html kommt race-frei aus dem
    // In-Memory-Bundle, nicht von der Platte (closeBundle kann vor dem HTML-Flush laufen).
    writeBundle(_options, bundle: Record<string, { type: string; source?: unknown; fileName: string }>) {
      const distDir = resolve(rootDir, 'dist');
      writeFileSync(resolve(distDir, 'sitemap.xml'), sitemapXml());

      const htmlAsset = Object.values(bundle).find(a => a.type === 'asset' && a.fileName === 'index.html');
      const template = typeof htmlAsset?.source === 'string'
        ? htmlAsset.source
        : readFileSync(resolve(distDir, 'index.html'), 'utf8');
      const inject = (html: string, snippet: string) =>
        html.replace('</head>', `    ${snippet}\n  </head>`);

      // Startseite: WebSite + WebApplication JSON-LD.
      writeFileSync(resolve(distDir, 'index.html'), inject(template, homepageLd()));

      // Per Wiki-Eintrag eine statische index.html mit eigenem Head + JSON-LD.
      // React mountet in #root wie gehabt (kein Hydration-Mismatch, Body identisch).
      let count = 0;
      for (const doc of collectWikiDocs(modelDir)) {
        const pageUrl = `${SITE_URL}/wiki/${doc.id}`;
        const pageTitle = `${doc.title} – Netzprobe`;
        let html = template
          .split(HEAD_TITLE).join(escapeHtml(pageTitle))
          .split(HEAD_DESC).join(escapeHtml(doc.desc))
          .split(`"${SITE_URL}/"`).join(`"${escapeHtml(pageUrl)}"`);
        html = inject(html, wikiLd(doc, pageUrl));
        const outDir = resolve(distDir, 'wiki', doc.id);
        mkdirSync(outDir, { recursive: true });
        writeFileSync(resolve(outDir, 'index.html'), html);
        count++;
      }
      // eslint-disable-next-line no-console
      console.log(`[seo] sitemap.xml + ${count} prerendered /wiki/* pages + JSON-LD`);
    },
  };
}

export default defineConfig({
  root: appDir,
  base: process.env.GITHUB_PAGES === 'true' ? '/netzprobe/' : '/',
  define: {
    __BUILD_COMMIT__: JSON.stringify(commitHash),
    __BUILD_COMMITS__: JSON.stringify(recentCommits),
    __BUILD_OLDER_DAYS__: JSON.stringify(olderDays),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    // ECharts referenziert `global` (Node-CommonJS-Konvention); im Browser
    // explizit auf globalThis mappen.
    global: 'globalThis',
  },
  plugins: [react(), tailwindcss(), topLevelStaticTree('data', dataDir), topLevelStaticTree('model', modelDir), commitHistory(), seo()],
  server: {
    port: 5177,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
  preview: { port: 4177 },
  build: {
    chunkSizeWarningLimit: 1500,
    outDir: resolve(rootDir, 'dist'),
    emptyOutDir: true,
  },
});
