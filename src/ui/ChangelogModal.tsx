import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import changelogRaw from '../../CHANGELOG.md?raw';
import { cx } from './ui';

type Block =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: BulletNode[] };

type BulletNode = { text: string; children: BulletNode[] };

function parseBullets(lines: string[], start: number, baseIndent: number): { nodes: BulletNode[]; next: number } {
  const nodes: BulletNode[] = [];
  let i = start;
  while (i < lines.length) {
    const raw = lines[i];
    const m = raw.match(/^(\s*)[-*]\s+(.*)$/);
    if (!m) break;
    const indent = m[1].length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) break;
    const node: BulletNode = { text: m[2].trim(), children: [] };
    i++;
    const next = lines[i];
    if (next) {
      const childMatch = next.match(/^(\s*)[-*]\s+/);
      if (childMatch && childMatch[1].length > baseIndent) {
        const { nodes: children, next: after } = parseBullets(lines, i, childMatch[1].length);
        node.children = children;
        i = after;
      }
    }
    nodes.push(node);
  }
  return { nodes, next: i };
}

function parseChangelog(source: string): Block[] {
  const stripped = source.replace(/<!--[\s\S]*?-->/g, '');
  const lines = stripped.split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', text: paragraph.join(' ').trim() });
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      flushParagraph();
      i++;
      continue;
    }
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flushParagraph();
      blocks.push({ type: 'h2', text: h2[1].trim() });
      i++;
      continue;
    }
    if (line.match(/^#\s+/)) { flushParagraph(); i++; continue; }
    const bullet = line.match(/^(\s*)[-*]\s+/);
    if (bullet) {
      flushParagraph();
      const { nodes, next } = parseBullets(lines, i, bullet[1].length);
      blocks.push({ type: 'ul', items: nodes });
      i = next;
      continue;
    }
    paragraph.push(line.trim());
    i++;
  }
  flushParagraph();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      out.push(<strong key={key++} className="font-semibold text-zinc-950">{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      out.push(<code key={key++} className="rounded bg-zinc-100 px-1 py-0.5 text-[0.85em] text-zinc-700">{match[2]}</code>);
    } else if (match[3] && match[4]) {
      const isExternal = match[4].startsWith('http');
      out.push(<a key={key++} href={match[4]} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noreferrer' : undefined} className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{match[3]}</a>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Bullets({ nodes, level = 0 }: { nodes: BulletNode[]; level?: number }) {
  // Bindestrich als echtes Textzeichen statt CSS-Marker, damit beim Kopieren
  // jede Zeile mit "- " in der Zwischenablage landet (markdown-tauglich).
  return <ul className={cx('grid gap-1.5', level === 0 ? 'mt-2' : 'mt-1.5')}>
    {nodes.map((node, i) => <li key={i} className="flex gap-1.5 text-sm leading-6 text-zinc-700">
      <span className="shrink-0 text-zinc-400" aria-hidden>{'- '}</span>
      <div className="min-w-0 flex-1">
        <span>{renderInline(node.text)}</span>
        {node.children.length > 0 && <Bullets nodes={node.children} level={level + 1}/>}
      </div>
    </li>)}
  </ul>;
}

const blocks = parseChangelog(changelogRaw);

export function ChangelogModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="changelog-title"
    className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50/60 px-6 py-4">
        <div className="min-w-0">
          <h2 id="changelog-title" className="text-lg font-semibold text-zinc-950">Änderungsverlauf</h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Build{' '}
            <a
              href="https://github.com/chriopter/netzprobe/commits/main/"
              target="_blank"
              rel="noreferrer"
              className="font-mono text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 hover:decoration-zinc-700"
            >{__BUILD_COMMIT__}</a>
            {' · '}
            {new Date(__BUILD_TIME__).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950"
        >
          <X className="h-4 w-4" aria-hidden/>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {blocks.map((block, i) => {
          if (block.type === 'h2') {
            return <h3 key={i} className="mt-5 border-b border-zinc-100 pb-1.5 text-sm font-semibold tabular-nums text-zinc-950 first:mt-0">{block.text}</h3>;
          }
          if (block.type === 'ul') {
            return <Bullets key={i} nodes={block.items}/>;
          }
          return null;
        })}
      </div>
    </div>
  </div>;
}
