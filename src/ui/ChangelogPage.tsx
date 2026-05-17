import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cx } from './ui';

const REPO_URL = 'https://github.com/chriopter/netzprobe';
const OLDER_URL = `${import.meta.env.BASE_URL}commits-older.json`;

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Commit = { sha: string; short: string; date: string; subject: string; body: string };

type RecentGroup = { key: string; label: string; items: Commit[] };

function groupRecent(commits: Commit[]): RecentGroup[] {
  const groups = new Map<string, RecentGroup>();
  for (const c of commits) {
    const key = dayKey(c.date);
    let g = groups.get(key);
    if (!g) {
      g = { key, label: formatDay(c.date), items: [] };
      groups.set(key, g);
    }
    g.items.push(c);
  }
  return Array.from(groups.values()).sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));
}

function CommitRow({ commit }: { commit: Commit }) {
  const [open, setOpen] = useState(false);
  const hasBody = commit.body.length > 0;
  const toggle = () => setOpen(value => !value);
  return <li className="text-sm leading-6 text-zinc-700">
    <div
      role={hasBody ? 'button' : undefined}
      tabIndex={hasBody ? 0 : undefined}
      aria-expanded={hasBody ? open : undefined}
      aria-label={hasBody ? (open ? 'Details ausblenden' : 'Details anzeigen') : undefined}
      onClick={hasBody ? toggle : undefined}
      onKeyDown={hasBody ? (event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }) : undefined}
      className={cx(
        '-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-0.5 transition',
        hasBody && 'cursor-pointer hover:bg-zinc-50',
      )}
    >
      <a
        href={`${REPO_URL}/commit/${commit.sha}`}
        target="_blank"
        rel="noreferrer"
        onClick={event => event.stopPropagation()}
        className="shrink-0 font-mono text-xs text-zinc-400 underline decoration-transparent underline-offset-4 hover:text-zinc-700 hover:decoration-zinc-300"
      >{commit.short}</a>
      <span className="min-w-0 flex-1">{commit.subject}</span>
      {hasBody && <ChevronRight
        aria-hidden
        className={cx('h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150', open && 'rotate-90')}
      />}
    </div>
    {hasBody && open && <pre className="ml-[60px] mt-1.5 max-w-3xl whitespace-pre-wrap break-words rounded-md bg-zinc-50 px-3 py-2 text-[13px] leading-5 text-zinc-700 [font-family:inherit]">{commit.body}</pre>}
  </li>;
}

function DayHeader({ label, count, open, onToggle }: { label: string; count: number; open: boolean; onToggle: () => void }) {
  return <button
    type="button"
    aria-expanded={open}
    onClick={onToggle}
    className="group flex w-full items-center gap-2 border-b border-zinc-200 pb-2 text-left"
  >
    <ChevronRight className={cx('h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-150 group-hover:text-zinc-700', open && 'rotate-90')} aria-hidden/>
    <h2 className="text-lg font-semibold tabular-nums text-zinc-950">{label}</h2>
    <span className="ml-auto text-xs tabular-nums text-zinc-400">{count}</span>
  </button>;
}

function RecentDayGroup({ group, defaultOpen }: { group: RecentGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section id={`day-${group.key}`} className="mt-9 scroll-mt-8">
    <DayHeader label={group.label} count={group.items.length} open={open} onToggle={() => setOpen(v => !v)}/>
    {open && <ul className="mt-4 grid gap-1.5 max-w-3xl">
      {group.items.map(commit => <CommitRow key={commit.sha} commit={commit}/>)}
    </ul>}
  </section>;
}

type OlderState = { status: 'idle' } | { status: 'loading' } | { status: 'ready'; byDay: Map<string, Commit[]> } | { status: 'error'; message: string };

function OlderDaySection({
  meta,
  state,
  isOpen,
  onToggle,
}: {
  meta: { key: string; label: string; count: number };
  state: OlderState;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return <section id={`day-${meta.key}`} className="mt-9 scroll-mt-8">
    <DayHeader label={meta.label} count={meta.count} open={isOpen} onToggle={onToggle}/>
    {isOpen && <div className="mt-4 max-w-3xl">
      {state.status === 'loading' && <p className="text-sm text-zinc-500">Lade Commits …</p>}
      {state.status === 'error' && <p className="text-sm text-red-600">Konnte Commits nicht laden: {state.message}</p>}
      {state.status === 'ready' && <ul className="grid gap-1.5">
        {(state.byDay.get(meta.key) ?? []).map(commit => <CommitRow key={commit.sha} commit={commit}/>)}
      </ul>}
    </div>}
  </section>;
}

export function ChangelogPage() {
  const recentGroups = useMemo(() => groupRecent(__BUILD_COMMITS__), []);
  const recentKeys = useMemo(() => new Set(recentGroups.map(g => g.key)), [recentGroups]);
  const olderDays = useMemo(() => __BUILD_OLDER_DAYS__.filter(d => !recentKeys.has(d.key)), [recentKeys]);

  const [openOlder, setOpenOlder] = useState<Set<string>>(() => new Set());
  const [olderState, setOlderState] = useState<OlderState>({ status: 'idle' });
  const fetchPromise = useRef<Promise<void> | null>(null);

  const ensureOlderLoaded = useCallback(() => {
    if (olderState.status === 'ready' || olderState.status === 'loading') return;
    if (fetchPromise.current) return;
    setOlderState({ status: 'loading' });
    fetchPromise.current = fetch(OLDER_URL)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Commit[]>;
      })
      .then(list => {
        const byDay = new Map<string, Commit[]>();
        for (const c of list) {
          const key = dayKey(c.date);
          const arr = byDay.get(key);
          if (arr) arr.push(c); else byDay.set(key, [c]);
        }
        setOlderState({ status: 'ready', byDay });
      })
      .catch((err: unknown) => {
        setOlderState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      })
      .finally(() => { fetchPromise.current = null; });
  }, [olderState.status]);

  const toggleOlder = (key: string) => {
    setOpenOlder(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    ensureOlderLoaded();
  };

  return <div>
    <p className="text-xs font-medium uppercase text-zinc-400">Allgemein</p>
    <h1 className="mt-2 text-4xl font-semibold leading-tight">Änderungsverlauf</h1>
    <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">
      Commit-Historie von <a href={`${REPO_URL}/commits/main/`} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">chriopter/netzprobe</a>. Die letzten Tage sind aufgeklappt; ältere Tage laden ihre Commits beim Aufklappen nach.
    </p>
    {recentGroups.length === 0 && olderDays.length === 0 && <p className="mt-8 text-sm text-zinc-500">Keine Commit-Historie verfügbar.</p>}
    {recentGroups.map((group, index) => <RecentDayGroup key={group.key} group={group} defaultOpen={index < 2}/>)}
    {olderDays.map(meta => <OlderDaySection
      key={meta.key}
      meta={meta}
      state={olderState}
      isOpen={openOlder.has(meta.key)}
      onToggle={() => toggleOlder(meta.key)}
    />)}
  </div>;
}
