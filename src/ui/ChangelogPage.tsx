import { useMemo } from 'react';

const REPO_URL = 'https://github.com/chriopter/netzprobe';

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Commit = { sha: string; short: string; date: string; subject: string };

function groupByDay(commits: Commit[]): { key: string; label: string; items: Commit[] }[] {
  const groups = new Map<string, { label: string; items: Commit[] }>();
  for (const c of commits) {
    const key = dayKey(c.date);
    let g = groups.get(key);
    if (!g) {
      g = { label: formatDay(c.date), items: [] };
      groups.set(key, g);
    }
    g.items.push(c);
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([key, value]) => ({ key, label: value.label, items: value.items }));
}

export function ChangelogPage() {
  const groups = useMemo(() => groupByDay(__BUILD_COMMITS__), []);

  return <div>
    <p className="text-xs font-medium uppercase text-zinc-400">Allgemein</p>
    <h1 className="mt-2 text-4xl font-semibold leading-tight">Änderungsverlauf</h1>
    <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">
      Die letzten {__BUILD_COMMITS__.length} Commits aus <a href={`${REPO_URL}/commits/main/`} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">chriopter/netzprobe</a>, automatisch zur Build-Zeit eingelesen.
    </p>
    <p className="mt-2 text-xs text-zinc-500">
      Build{' '}
      <a
        href={`${REPO_URL}/commits/main/`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950 hover:decoration-zinc-700"
      >{__BUILD_COMMIT__}</a>
      {' · '}
      {new Date(__BUILD_TIME__).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
    </p>
    {groups.length === 0 && <p className="mt-8 text-sm text-zinc-500">Keine Commit-Historie verfügbar.</p>}
    {groups.map(group => <section key={group.key} id={`day-${group.key}`} className="mt-9 scroll-mt-8">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold tabular-nums">{group.label}</h2>
      <ul className="mt-4 grid gap-1.5 max-w-3xl">
        {group.items.map(commit => <li key={commit.sha} className="flex gap-2 text-sm leading-6 text-zinc-700">
          <a
            href={`${REPO_URL}/commit/${commit.sha}`}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 font-mono text-xs text-zinc-400 underline decoration-transparent underline-offset-4 hover:text-zinc-700 hover:decoration-zinc-300"
          >{commit.short}</a>
          <span className="min-w-0 flex-1">{commit.subject}</span>
        </li>)}
      </ul>
    </section>)}
  </div>;
}
