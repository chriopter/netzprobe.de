import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { dataFileUrl } from './dataPackages';
import type { DatasetDoc } from './dataCatalog';
import { dataWikiHomeUrl, dataWikiUrl } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { cx } from './ui';

const dataFileViewerUrl = (path: string) => `${import.meta.env.BASE_URL}?view=datei&path=${encodeURIComponent(path)}`;
const domainLabels: Record<string, string> = {
  last: 'Last',
  erzeugung: 'Erzeugung',
  speicher: 'Speicher',
  aussenhandel: 'Außenhandel',
  presets: 'Presets',
  modell: 'Modell',
};
const kindLabels: Record<DatasetDoc['kind'], string> = {
  dataset: 'Datensatz',
  scenario: 'Szenario',
  composition: 'Preset',
  model: 'Modell',
};

function selectedIdFromUrl() {
  const url = new URL(window.location.href);
  const basePath = new URL(import.meta.env.BASE_URL, url.origin).pathname;
  const path = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname.slice(1);
  const match = path.match(/^wiki\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : url.searchParams.get('id');
}

function KindTag({ kind }: { kind: DatasetDoc['kind'] }) {
  if (kind !== 'composition') return null;
  return <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">Preset</span>;
}

export function DataHandbook({ docs }: { docs: DatasetDoc[] }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const selectedId = selectedIdFromUrl();
  const selectedDataset = selectedId ? docs.find(doc => doc.id === selectedId) : undefined;
  const grouped = docs.reduce<Record<string, DatasetDoc[]>>((acc, doc) => {
    (acc[doc.domain] ??= []).push(doc);
    return acc;
  }, {});
  const sections = [
    ['last', 'Last'],
    ['erzeugung', 'Erzeugung'],
    ['speicher', 'Speicher'],
    ['aussenhandel', 'Außenhandel'],
    ['presets', 'Presets'],
    ['modell', 'Modell'],
  ] as const;

  return <main className="min-h-screen overflow-x-hidden bg-white text-zinc-950">
    <div className="flex w-full flex-col lg:flex-row">
      <aside className="min-w-0 border-b border-zinc-200 px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:h-screen lg:w-[320px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:px-8 lg:py-8">
        <div className="flex items-start justify-between gap-4 lg:block">
          <div className="min-w-0">
            <a href={import.meta.env.BASE_URL} className="text-sm font-medium text-zinc-500 hover:text-zinc-950">Netzprobe</a>
            <h1 className="mt-3 text-2xl font-semibold leading-tight lg:mt-4">Datenhandbuch</h1>
          </div>
          <button
            type="button"
            className="mt-0.5 rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 lg:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="data-handbook-nav"
            onClick={() => setMobileNavOpen(open => !open)}
          >
            {mobileNavOpen ? 'Schließen' : 'Menü'}
          </button>
        </div>
        <div
          id="data-handbook-nav"
          className={cx(
            'mt-5 max-h-[52vh] overflow-y-auto pr-1 lg:mt-8 lg:block lg:max-h-none lg:overflow-visible lg:pr-0',
            mobileNavOpen ? 'block' : 'hidden',
          )}
        >
          <DataHandbookNav sections={sections} grouped={grouped} selectedId={selectedId}/>
        </div>
      </aside>
      <article className="min-w-0 flex-1 px-4 pb-14 pt-8 sm:px-6 lg:max-w-[860px] lg:px-10 lg:py-8">
        {!docs.length ? <p className="p-5 text-zinc-500">Lade Datenhandbuch …</p> : selectedId && !selectedDataset ? <p className="p-5 text-zinc-500">Eintrag nicht gefunden.</p> : !selectedDataset ? <DataHandbookHome docs={docs}/> : <DatasetArticle selected={selectedDataset}/>}
        <DisclaimerFooter className="mt-12 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500"/>
      </article>
    </div>
  </main>;
}

function DataHandbookNav({
  sections,
  grouped,
  selectedId,
}: {
  sections: ReadonlyArray<readonly [string, string]>;
  grouped: Record<string, DatasetDoc[]>;
  selectedId: string | null;
}) {
  const selectedDomain = selectedId
    ? Object.entries(grouped).find(([, docs]) => docs.some(d => d.id === selectedId))?.[0]
    : null;
  return <nav aria-label="Datensätze">
    <div className="grid gap-2">
      <a
        href={dataWikiHomeUrl()}
        className={cx(
          'block rounded-md px-2 py-1.5 text-sm leading-5 transition',
          !selectedId ? 'bg-zinc-100 font-medium text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950',
        )}
      >Überblick</a>
      {sections.map(([domain, label]) => {
        const inDomain = grouped[domain];
        if (!inDomain?.length) return null;
        const bausteine = inDomain.filter(doc => doc.kind !== 'composition' && doc.kind !== 'model');
        const presets = inDomain.filter(doc => doc.kind === 'composition');
        const models = inDomain.filter(doc => doc.kind === 'model');
        const showGroups = (presets.length > 0 || models.length > 0) && bausteine.length > 0;
        return <CollapsibleSection key={domain} title={label} defaultOpen={selectedDomain === domain}>
          {!!bausteine.length && <>
            {showGroups && <TreeSubheader>Bausteine</TreeSubheader>}
            <div className={showGroups ? 'ml-2 grid gap-1 border-l border-zinc-100 pl-2' : 'grid gap-1'}>
              {bausteine.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id} bullet/>)}
            </div>
          </>}
          {!!presets.length && <>
            <TreeSubheader variant="preset">Presets</TreeSubheader>
            <div className="ml-2 grid gap-1 border-l border-amber-200 pl-2">
              {presets.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id} bullet/>)}
            </div>
          </>}
          {!!models.length && <>
            {showGroups && <TreeSubheader>Engine</TreeSubheader>}
            <div className={showGroups ? 'ml-2 grid gap-1 border-l border-zinc-100 pl-2' : 'grid gap-1'}>
              {models.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id} bullet/>)}
            </div>
          </>}
        </CollapsibleSection>;
      })}
    </div>
  </nav>;
}

function DatasetArticle({ selected }: { selected: DatasetDoc }) {
  return <div>
    <p className="text-xs font-medium uppercase text-zinc-400">{domainLabels[selected.domain] ?? selected.domain} · {kindLabels[selected.kind]}</p>
    <h1 className="mt-2 flex flex-wrap items-center gap-x-3 text-4xl font-semibold leading-tight">
      {selected.title}
      <KindTag kind={selected.kind}/>
    </h1>
    <section className="mt-9">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Übersicht</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">{selected.description}</p>
      <dl className="mt-6 grid divide-y divide-zinc-100 border-y border-zinc-100 text-sm leading-6">
        <div className="grid gap-1 py-3 sm:grid-cols-[124px_1fr]">
          <dt className="font-medium text-zinc-500">ID</dt>
          <dd><code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">{selected.id}</code></dd>
        </div>
        {(selected.overview ?? [
          { label: 'Zeitraum', value: selected.period },
          { label: 'Auflösung', value: selected.resolution },
          { label: 'Einheit', value: selected.unit },
        ]).map(item => <InfoLine key={item.label} label={item.label} value={item.value}/>)}
        {!!selected.caveats?.length && <div className="grid gap-1 py-3 sm:grid-cols-[124px_1fr]">
          <dt className="font-medium text-zinc-500">Grenzen</dt>
          <dd>
            <ul className="grid gap-1 text-zinc-700">
              {selected.caveats.map(caveat => <li key={caveat}>• {caveat}</li>)}
            </ul>
          </dd>
        </div>}
        <div className="grid gap-1 py-3 sm:grid-cols-[124px_1fr]">
          <dt className="font-medium text-zinc-500">Quelle</dt>
          <dd className="grid gap-2">
            <p className="text-zinc-700">{selected.source}</p>
            {selected.sourceUrls?.length
              ? <ul className="grid gap-1 text-zinc-700">
                  {selected.sourceUrls.map(url => <li key={url} className="break-all">• <a href={url} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{url}</a></li>)}
                </ul>
              : null}
          </dd>
        </div>
      </dl>
    </section>
    {!!selected.method?.length && <section className="mt-9">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Methode</h2>
      <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
        {selected.method.map(item => <li key={item}>• {item}</li>)}
      </ul>
    </section>}
    {(selected.file || !!selected.scripts?.length || !!selected.fields?.length) && <section className="mt-9">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Dateien</h2>
      <dl className="mt-4 grid divide-y divide-zinc-100 border-y border-zinc-100">
        {selected.file && <div className="grid gap-1 py-3 text-sm sm:grid-cols-[150px_70px_1fr]">
          <dt><code>Datei</code></dt>
          <dd className="text-zinc-500">Pfad</dd>
          <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <a href={dataFileViewerUrl(selected.file)} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
              <code>data/{selected.file}</code>
            </a>
            <a href={dataFileUrl(selected.file)} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 underline decoration-zinc-200 underline-offset-2 hover:text-zinc-700">raw</a>
          </dd>
        </div>}
        {selected.scripts?.map(script => <div key={script} className="grid gap-1 py-3 text-sm sm:grid-cols-[150px_70px_1fr]">
          <dt><code>{script.endsWith('.ts') ? 'Code' : 'Skript'}</code></dt>
          <dd className="text-zinc-500">Pfad</dd>
          <dd>
            <a href={dataFileUrl(script)} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
              <code>data/{script}</code>
            </a>
          </dd>
        </div>)}
        {selected.fields?.map(field => <div key={field.name} className="grid gap-1 py-3 text-sm sm:grid-cols-[150px_70px_1fr]">
          <dt><code>{field.name}</code></dt>
          <dd className="text-zinc-500">{field.unit}</dd>
          <dd className="leading-5 text-zinc-700">{field.description}</dd>
        </div>)}
      </dl>
    </section>}
    {selected.sections?.map(section => <section key={section.title} className="mt-9">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">{section.title}</h2>
      <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
        {section.items.map(item => <li key={item}>• {item}</li>)}
      </ul>
    </section>)}
  </div>;
}

function DataHandbookHome({ docs }: { docs: DatasetDoc[] }) {
  return <div>
    <div>
      <p className="text-xs font-medium uppercase text-zinc-400">data/</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight">Datenhandbuch</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">Dokumentation der Datensätze, die die Simulation direkt aus dem statischen <code>data/</code>-Ordner lädt.</p>
    </div>
    <section className="mt-9">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Datensätze</h2>
      <ul className="grid divide-y divide-zinc-100 border-b border-zinc-100 text-sm">
        {docs.map(entry => <li key={entry.id} className="min-w-0 py-4">
          <a href={dataWikiUrl(entry.id)} className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{entry.title}</a>
          <KindTag kind={entry.kind}/>
          <code className="ml-2 break-all rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{entry.id}</code>
          <div className="mt-1 text-xs text-zinc-400">{domainLabels[entry.domain] ?? entry.domain} · {kindLabels[entry.kind]}</div>
          <p className="mt-1 leading-6 text-zinc-600">{entry.short}</p>
        </li>)}
      </ul>
    </section>
  </div>;
}

function CollapsibleSection({ title, defaultOpen, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const Chevron = open ? ChevronDown : ChevronRight;
  return <section className="min-w-0">
    <button
      type="button"
      onClick={() => setOpen(o => !o)}
      aria-expanded={open}
      className="group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-base font-semibold leading-5 text-zinc-900 transition hover:bg-zinc-50"
    >
      <Chevron className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:text-zinc-700" aria-hidden/>
      <span className="truncate">{title}</span>
    </button>
    {open && <div className="mt-1 grid min-w-0 gap-1 pl-5">
      {children}
    </div>}
  </section>;
}

function TreeNode({ href, label, selected, bullet = false, tag }: { href: string; label: string; selected: boolean; bullet?: boolean; tag?: ReactNode }) {
  return <a
    href={href}
    className={cx(
      'block min-w-0 rounded-md px-2 py-1.5 text-sm leading-5 transition',
      selected ? 'bg-zinc-100 font-medium text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950',
    )}
  >
    <span className="flex min-w-0 items-center gap-1">
      {bullet && <span className="text-zinc-400">•</span>}
      <span className="truncate">{label}</span>
      {tag}
    </span>
  </a>;
}

function TreeSubheader({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'preset' }) {
  return <div className={cx(
    'px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide',
    variant === 'preset' ? 'text-amber-700' : 'text-zinc-500',
  )}>{children}</div>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const urlMatch = value.match(/https?:\/\/\S+/);
  return <div className="grid gap-1 py-3 sm:grid-cols-[124px_1fr]">
    <dt className="font-medium text-zinc-500">{label}</dt>
    <dd className="text-zinc-700">
      {urlMatch ? <>
        {value.slice(0, urlMatch.index).trim()}
        {value.slice(0, urlMatch.index).trim() ? ' ' : ''}
        <a href={urlMatch[0]} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{urlMatch[0]}</a>
      </> : value}
    </dd>
  </div>;
}
