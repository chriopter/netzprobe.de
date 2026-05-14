import type { ReactNode } from 'react';
import { dataFileUrl } from '../dataPackages';
import type { DatasetDoc } from './dataCatalog';
import { dataWikiHomeUrl, dataWikiUrl } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { cx } from './ui';

const dataFileViewerUrl = (path: string) => `${import.meta.env.BASE_URL}?view=datei&path=${encodeURIComponent(path)}`;
const domainLabels: Record<string, string> = {
  last: 'Last',
  erzeugung: 'Erzeugung',
  modell: 'Modell',
};
const kindLabels: Record<DatasetDoc['kind'], string> = {
  dataset: 'Datensatz',
  scenario: 'Szenario',
  composition: 'Komposition',
  model: 'Modell',
};

export function DataHandbook({ docs }: { docs: DatasetDoc[] }) {
  const params = new URL(window.location.href).searchParams;
  const selectedId = params.get('id');
  const selectedDataset = selectedId ? docs.find(doc => doc.id === selectedId) : undefined;
  const grouped = docs.reduce<Record<string, DatasetDoc[]>>((acc, doc) => {
    (acc[doc.domain] ??= []).push(doc);
    return acc;
  }, {});
  const sections = [
    ['last', 'Last'],
    ['erzeugung', 'Erzeugung'],
    ['modell', 'Modell'],
  ] as const;

  return <main className="min-h-screen bg-white px-3 py-3 text-zinc-950 sm:px-4 lg:px-6">
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="border-r border-zinc-200 pr-4 lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)] lg:overflow-y-auto">
        <div className="pb-4">
          <a href={import.meta.env.BASE_URL} className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">Netzprobe</a>
          <h1 className="mt-3 text-xl font-semibold tracking-[-0.04em]">Datenhandbuch</h1>
          <p className="mt-1 text-sm leading-5 text-zinc-500">Datensätze aus <code>data/</code>.</p>
        </div>
        <nav aria-label="Datensätze">
          <div className="grid gap-3">
            <TreeSection title="Home">
              <TreeNode href={dataWikiHomeUrl()} label="Überblick" selected={!selectedId}/>
            </TreeSection>
            {sections.map(([domain, label]) => {
              const inDomain = grouped[domain];
              if (!inDomain?.length) return null;
              const childrenByParentId = new Map<string, DatasetDoc[]>();
              for (const doc of inDomain) {
                if (!doc.parentId) continue;
                const list = childrenByParentId.get(doc.parentId) ?? [];
                list.push(doc);
                childrenByParentId.set(doc.parentId, list);
              }
              const orphans = inDomain.filter(doc => !doc.parentId && !childrenByParentId.has(doc.id));
              const parents = inDomain.filter(doc => !doc.parentId && childrenByParentId.has(doc.id));
              return <TreeSection key={domain} title={label}>
                {orphans.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id} bullet/>)}
                {parents.map(parentDoc => <div key={parentDoc.id} className="grid gap-0.5">
                  <TreeNode href={dataWikiUrl(parentDoc.id)} label={parentDoc.title} selected={selectedId === parentDoc.id} bullet/>
                  <div className="ml-5 grid gap-0.5 border-l border-zinc-100 pl-3">
                    {(childrenByParentId.get(parentDoc.id) ?? []).map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id}/>)}
                  </div>
                </div>)}
              </TreeSection>;
            })}
          </div>
        </nav>
      </aside>
      <article className="min-w-0 pb-12">
        {!docs.length ? <p className="p-5 text-zinc-500">Lade Datenhandbuch …</p> : selectedId && !selectedDataset ? <p className="p-5 text-zinc-500">Eintrag nicht gefunden.</p> : !selectedDataset ? <DataHandbookHome docs={docs}/> : <DatasetArticle selected={selectedDataset}/>}
        <DisclaimerFooter className="mt-12 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500"/>
      </article>
    </div>
  </main>;
}

function DatasetArticle({ selected }: { selected: DatasetDoc }) {
  return <div>
    <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{domainLabels[selected.domain] ?? selected.domain} · {kindLabels[selected.kind]}</p>
    <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{selected.title}</h1>
    <section className="mt-8">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Übersicht</h2>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">{selected.description}</p>
      <dl className="mt-4 grid gap-1 text-sm leading-6">
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
          <dt className="font-medium text-zinc-950">ID</dt>
          <dd><code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">{selected.id}</code></dd>
        </div>
        {(selected.overview ?? [
          { label: 'Zeitraum', value: selected.period },
          { label: 'Auflösung', value: selected.resolution },
          { label: 'Einheit', value: selected.unit },
        ]).map(item => <InfoLine key={item.label} label={item.label} value={item.value}/>)}
        {!!selected.caveats?.length && <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
          <dt className="font-medium text-zinc-950">Grenzen</dt>
          <dd>
            <ul className="grid gap-1 text-zinc-700">
              {selected.caveats.map(caveat => <li key={caveat}>• {caveat}</li>)}
            </ul>
          </dd>
        </div>}
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
          <dt className="font-medium text-zinc-950">Quelle</dt>
          <dd>
            {selected.sourceUrls?.length
              ? <ul className="grid gap-1 text-zinc-700">
                  {selected.sourceUrls.map(url => <li key={url} className="break-all">• <a href={url} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{url}</a></li>)}
                </ul>
              : <span className="text-zinc-700">{selected.source}</span>}
          </dd>
        </div>
      </dl>
    </section>
    {!!selected.method?.length && <section className="mt-8">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Methode</h2>
      <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
        {selected.method.map(item => <li key={item}>• {item}</li>)}
      </ul>
    </section>}
    {(selected.file || !!selected.scripts?.length || !!selected.fields?.length) && <section className="mt-8">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Dateien</h2>
      <dl className="mt-3 grid gap-3">
        {selected.file && <div className="grid gap-1 text-sm sm:grid-cols-[180px_90px_1fr]">
          <dt><code>Datei</code></dt>
          <dd className="text-zinc-500">Pfad</dd>
          <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <a href={dataFileViewerUrl(selected.file)} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
              <code>data/{selected.file}</code>
            </a>
            <a href={dataFileUrl(selected.file)} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 underline decoration-zinc-200 underline-offset-2 hover:text-zinc-700">raw</a>
          </dd>
        </div>}
        {selected.scripts?.map(script => <div key={script} className="grid gap-1 text-sm sm:grid-cols-[180px_90px_1fr]">
          <dt><code>{script.endsWith('.ts') ? 'Code' : 'Skript'}</code></dt>
          <dd className="text-zinc-500">Pfad</dd>
          <dd>
            <a href={dataFileUrl(script)} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
              <code>data/{script}</code>
            </a>
          </dd>
        </div>)}
        {selected.fields?.map(field => <div key={field.name} className="grid gap-1 text-sm sm:grid-cols-[180px_90px_1fr]">
          <dt><code>{field.name}</code></dt>
          <dd className="text-zinc-500">{field.unit}</dd>
          <dd className="leading-5 text-zinc-700">{field.description}</dd>
        </div>)}
      </dl>
    </section>}
    {selected.sections?.map(section => <section key={section.title} className="mt-8">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">{section.title}</h2>
      <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
        {section.items.map(item => <li key={item}>• {item}</li>)}
      </ul>
    </section>)}
  </div>;
}

function DataHandbookHome({ docs }: { docs: DatasetDoc[] }) {
  return <div>
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">data/</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">Datenhandbuch</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">Dokumentation der Datensätze, die die Simulation direkt aus dem statischen <code>data/</code>-Ordner lädt.</p>
    </div>
    <section className="mt-8">
      <h2 className="border-b border-zinc-200 pb-1 text-lg font-medium">Datensätze</h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6">
        {docs.map(entry => <li key={entry.id}>
          <a href={dataWikiUrl(entry.id)} className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{entry.title}</a>
          <code className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{entry.id}</code>
          <span className="ml-2 text-xs text-zinc-400">{domainLabels[entry.domain] ?? entry.domain} · {kindLabels[entry.kind]}</span>
          <span className="text-zinc-500"> — {entry.short}</span>
        </li>)}
      </ul>
    </section>
  </div>;
}

function TreeSection({ title, children }: { title: string; children: ReactNode }) {
  return <section>
    <h2 className="pb-1 text-[11px] font-semibold text-zinc-950">{title}</h2>
    <div className="ml-1 grid gap-0.5 border-l border-zinc-200 pl-3">
      {children}
    </div>
  </section>;
}

function TreeNode({ href, label, selected, bullet = false }: { href: string; label: string; selected: boolean; bullet?: boolean }) {
  return <a
    href={href}
    className={cx(
      'block py-0.5 text-sm transition',
      selected ? 'font-medium text-zinc-950' : 'text-zinc-600 hover:text-zinc-950',
    )}
  >
    <span className="block truncate">{bullet && <span className="mr-1.5 text-zinc-400">•</span>}{label}</span>
  </a>;
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const urlMatch = value.match(/https?:\/\/\S+/);
  return <div className="grid gap-1 sm:grid-cols-[120px_1fr]">
    <dt className="font-medium text-zinc-950">{label}</dt>
    <dd className="text-zinc-700">
      {urlMatch ? <>
        {value.slice(0, urlMatch.index).trim()}
        {value.slice(0, urlMatch.index).trim() ? ' ' : ''}
        <a href={urlMatch[0]} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{urlMatch[0]}</a>
      </> : value}
    </dd>
  </div>;
}
