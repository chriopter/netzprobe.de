import { useEffect, useState, type ReactNode } from 'react';
import { Activity, ArrowRightLeft, BatteryCharging, Bookmark, ChevronRight, ExternalLink, Menu, SlidersHorizontal, Zap } from 'lucide-react';
import { dataFileUrl } from './dataPackages';
import type { DatasetDoc } from './dataCatalog';
import { dataWikiHomeUrl, dataWikiUrl } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { MainTabs } from './MainTabs';
import { cx, iconButton, iconTile, panelHeader, rowActive, rowHover, sectionBox, sidebarInset, sidebarWidthClass } from './ui';

const dataFileViewerUrl = (path: string) => `${import.meta.env.BASE_URL}?view=datei&path=${encodeURIComponent(path)}`;
const dataPlainTextUrl = (path: string) => `${dataFileUrl(path)}?raw-text`;
const domainLabels: Record<string, string> = {
  last: 'Last',
  erzeugung: 'Erzeugung',
  speicher: 'Speicher',
  aussenhandel: 'Außenhandel',
  presets: 'Presets',
  modell: 'Modell',
  templates: 'Vorlagen',
};

const domainIcons: Record<string, typeof Zap> = {
  last: Activity,
  erzeugung: Zap,
  speicher: BatteryCharging,
  aussenhandel: ArrowRightLeft,
  presets: Bookmark,
  modell: SlidersHorizontal,
  templates: Bookmark,
};

const domainBlurbs: Record<string, string> = {
  last: 'Stromnachfrage: historische Last 2025/2017 und Sektor-Elektrifizierung (e100-*).',
  erzeugung: 'Erzeuger-Bausteine, historische Erzeugungs-Reihen und Einspeisefaktoren.',
  speicher: 'Batterie, Pumpspeicher und H₂-Saison-Speicher mit Roundtrip-Daten.',
  aussenhandel: 'Strom- und H₂-Import/-Export, Emissionsfaktoren, Bounds für Slider.',
  presets: 'Vorkonfigurierte Kombinationen für Last und Versorgung.',
  modell: 'Dispatch-Engine: stündliche Bilanz, Speicherlogik, CO₂.',
  templates: 'Arbeitsvorlagen für Datenpakete und Wiki-Einträge.',
};
const kindLabels: Record<DatasetDoc['kind'], string> = {
  dataset: 'Datensatz',
  scenario: 'Szenario',
  composition: 'Preset',
  model: 'Modell',
  template: 'Vorlage',
};
type TocItem = { id: string; label: string; level?: 1 | 2 };
type FileContentTab = {
  id: string;
  label: string;
  kind: 'dataset' | 'code' | 'script';
  path?: string;
};

const tocAnchors = {
  overview: 'uebersicht',
  model: 'modellansatz',
  derivation: 'herleitung',
  caveats: 'grenzen',
  sources: 'quellen',
  files: 'files',
  homeDomains: 'wiki-domaenen',
} as const;

const wikiSections = [
  ['last', 'Last'],
  ['erzeugung', 'Erzeugung'],
  ['speicher', 'Speicher'],
  ['aussenhandel', 'Außenhandel'],
  ['presets', 'Presets'],
  ['modell', 'Modell'],
  ['templates', 'Vorlagen'],
] as const;

function groupDocsForWiki(docs: DatasetDoc[]) {
  return docs.reduce<Record<string, DatasetDoc[]>>((acc, doc) => {
    (acc[doc.domain] ??= []).push(doc);
    return acc;
  }, {});
}

function visibleMethodItems(selected: DatasetDoc) {
  return selected.method?.filter(item => !isTechnicalMethodItem(item)) ?? [];
}

function technicalMethodItems(selected: DatasetDoc) {
  return selected.method?.filter(isTechnicalMethodItem) ?? [];
}

function hasModelSection(selected: DatasetDoc) {
  return !!selected.overview?.length || !!visibleMethodItems(selected).length || !!selected.sections?.length || !!selected.caveats?.length;
}

function hasFileRows(selected: DatasetDoc) {
  return !!selected.file || !!selected.scripts?.length || !!selected.fields?.length || !!technicalMethodItems(selected).length;
}

function sectionAnchor(title: string) {
  return `modell-${title.toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
}

function articleToc(selected: DatasetDoc): TocItem[] {
  const items: TocItem[] = [
    { id: tocAnchors.overview, label: 'Übersicht' },
  ];
  if (hasModelSection(selected)) {
    items.push({ id: tocAnchors.model, label: 'Modellansatz' });
    if (visibleMethodItems(selected).length) items.push({ id: tocAnchors.derivation, label: 'Herleitung', level: 2 });
    selected.sections?.forEach(section => items.push({ id: sectionAnchor(section.title), label: section.title, level: 2 }));
    if (selected.caveats?.length) items.push({ id: tocAnchors.caveats, label: 'Grenzen', level: 2 });
  }
  if (selected.source) items.push({ id: tocAnchors.sources, label: 'Quellen' });
  if (hasFileRows(selected)) items.push({ id: tocAnchors.files, label: 'Files' });
  return items;
}

function selectedIdFromUrl() {
  const url = new URL(window.location.href);
  const basePath = new URL(import.meta.env.BASE_URL, url.origin).pathname;
  const path = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname.slice(1);
  const match = path.match(/^wiki\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : url.searchParams.get('id');
}

function KindTag({ kind }: { kind: DatasetDoc['kind'] }) {
  if (kind === 'template') return <span className="ml-2 inline-flex items-center rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">Vorlage</span>;
  if (kind !== 'composition') return null;
  return <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">Preset</span>;
}

export function DataHandbookSidebar({ docs, collapsed, actionBar, onCollapsedChange }: { docs: DatasetDoc[]; collapsed: boolean; actionBar?: ReactNode; onCollapsedChange: (collapsed: boolean) => void }) {
  const selectedId = selectedIdFromUrl();
  const grouped = groupDocsForWiki(docs);
  if (collapsed) return null;
  return <aside
    aria-label="Wiki-Navigation"
    className={cx(
      'min-w-0 overflow-hidden bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:border-r lg:border-zinc-200',
      sidebarWidthClass,
    )}
  >
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-zinc-100/40 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin]">
      <section className={cx(panelHeader, sidebarInset, 'sticky top-0 z-30 py-3 backdrop-blur')}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <button
              type="button"
              aria-label="Sidebar einklappen"
              aria-expanded={true}
              title="Sidebar einklappen"
              className={cx(iconButton, 'shrink-0')}
              onClick={() => onCollapsedChange(true)}
            >
              <Menu className="h-4 w-4" aria-hidden="true"/>
            </button>
            <h1 className="min-w-0 text-2xl font-semibold leading-none text-zinc-950">netzprobe.de</h1>
            <MainTabs active="wiki"/>
          </div>
        </div>
        <div className="mt-[7px] border-t border-zinc-200 px-1.5 pt-[7px]">
          {actionBar}
        </div>
      </section>
      <div className={cx('py-5', sidebarInset)}>
        <DataHandbookNav sections={wikiSections} grouped={grouped} selectedId={selectedId}/>
        <div className="mt-4 border-t border-zinc-200 pt-3">
          <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">Über die App</p>
          <a href={`${import.meta.env.BASE_URL}changelog`} className="block rounded-md px-2 py-1.5 text-sm leading-5 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950">Changelog</a>
          <a href="https://github.com/chriopter/netzprobe" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm leading-5 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950">
            GitHub
            <ExternalLink className="h-3 w-3 text-zinc-400" aria-hidden="true"/>
          </a>
        </div>
      </div>
    </div>
  </aside>;
}

export function DataHandbookContent({ docs, sidebarCollapsed, onOpenSidebar }: { docs: DatasetDoc[]; sidebarCollapsed?: boolean; onOpenSidebar?: () => void }) {
  const selectedId = selectedIdFromUrl();
  const selectedDataset = selectedId ? docs.find(doc => doc.id === selectedId) : undefined;
  const tocItems = selectedDataset
    ? articleToc(selectedDataset)
    : !selectedId && docs.length
      ? [{ id: tocAnchors.homeDomains, label: 'Domänen' }]
      : [];
  return <section className="flex min-w-0 flex-col gap-3">
    {sidebarCollapsed && onOpenSidebar && <div><button
      type="button"
      aria-label="Sidebar öffnen"
      aria-expanded={false}
      title="Sidebar öffnen"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/20"
      onClick={onOpenSidebar}
    >
      <Menu className="h-4 w-4" aria-hidden="true"/>
    </button></div>}
    <div className="flex min-w-0 rounded-lg border border-zinc-200 bg-white">
      <article className="min-w-0 flex-1 px-4 pb-14 pt-8 sm:px-6 lg:px-10 lg:py-8">
        {!docs.length ? <p className="p-5 text-zinc-500">Lade Wiki …</p> : selectedId && !selectedDataset ? <p className="p-5 text-zinc-500">Eintrag nicht gefunden.</p> : !selectedDataset ? <DataHandbookHome docs={docs}/> : <DatasetArticle selected={selectedDataset}/>}
        <DisclaimerFooter className="mt-12 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500"/>
      </article>
      <ArticleToc items={tocItems}/>
    </div>
  </section>;
}

function ArticleToc({ items }: { items: TocItem[] }) {
  const itemIds = items.map(item => item.id);
  const itemKey = itemIds.join('|');
  const [activeId, setActiveId] = useState(itemIds[0] ?? '');
  useEffect(() => {
    if (!itemIds.length) return;
    const updateActiveId = () => {
      const anchors = itemIds
        .map(id => document.getElementById(id))
        .filter((element): element is HTMLElement => !!element);
      if (!anchors.length) return;

      let next = anchors[0].id;
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= 96) next = anchor.id;
        else break;
      }
      const bottomReached = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (bottomReached) next = anchors[anchors.length - 1].id;
      setActiveId(next);
    };

    updateActiveId();
    window.addEventListener('scroll', updateActiveId, { passive: true });
    window.addEventListener('resize', updateActiveId);
    window.addEventListener('hashchange', updateActiveId);
    return () => {
      window.removeEventListener('scroll', updateActiveId);
      window.removeEventListener('resize', updateActiveId);
      window.removeEventListener('hashchange', updateActiveId);
    };
  }, [itemKey]);

  if (!items.length) return null;
  return <aside className="hidden w-[220px] shrink-0 self-start px-6 py-8 xl:sticky xl:top-0 xl:block xl:h-screen xl:overflow-y-auto">
    <nav className="border-l border-zinc-200 pl-4" aria-label="Inhalt">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Inhalt</p>
      <div className="mt-3 grid gap-1">
        {items.map(item => {
          const active = item.id === activeId;
          return <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? 'true' : undefined}
            className={cx(
              'block rounded-md px-2 py-1 text-sm leading-5 transition',
              item.level === 2 ? 'ml-2' : 'font-medium',
              active ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-500 hover:text-zinc-950',
            )}
          >{item.label}</a>;
        })}
      </div>
    </nav>
  </aside>;
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
    ? Object.entries(grouped).find(([, docs]) => docs.some(d => d.id === selectedId))?.[0] ?? null
    : null;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(selectedDomain ? [selectedDomain] : []));
  useEffect(() => {
    if (selectedDomain) setExpanded(prev => prev.has(selectedDomain) ? prev : new Set(prev).add(selectedDomain));
  }, [selectedDomain]);
  const toggle = (domain: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(domain)) next.delete(domain); else next.add(domain);
    return next;
  });
  return <nav aria-label="Datensätze">
    <div className="grid gap-1">
      <a
        href={dataWikiHomeUrl()}
        className={cx(
          'mb-2 block rounded-md px-2 py-1.5 text-sm leading-5 transition',
          !selectedId ? rowActive + ' font-medium text-zinc-950' : `text-zinc-600 ${rowHover} hover:text-zinc-950`,
        )}
      >Modelle & Daten</a>
      {sections.map(([domain, label]) => {
        const inDomain = grouped[domain];
        if (!inDomain?.length) return null;
        const bausteine = inDomain.filter(doc => doc.kind !== 'composition' && doc.kind !== 'model');
        const presets = inDomain.filter(doc => doc.kind === 'composition');
        const models = inDomain.filter(doc => doc.kind === 'model');
        const showGroups = presets.length > 0 || models.length > 0 || (domain === 'presets' && bausteine.length > 0);
        const Icon = domainIcons[domain] ?? Zap;
        return <CollapsibleSection
          key={domain}
          title={label}
          icon={<Icon className="h-4 w-4"/>}
          count={inDomain.length}
          open={expanded.has(domain)}
          active={selectedDomain === domain}
          onToggle={() => toggle(domain)}
        >
          {!!bausteine.length && <>
            {showGroups && <TreeSubheader>{domain === 'presets' ? 'Baustein-Presets' : 'Bausteine'}</TreeSubheader>}
            <div className={showGroups ? 'ml-1.5 grid gap-0.5 border-l border-zinc-200 pl-2' : 'grid gap-0.5'}>
              {bausteine.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id}/>)}
            </div>
          </>}
          {!!presets.length && <>
            <TreeSubheader variant="preset">Presets</TreeSubheader>
            <div className="ml-1.5 grid gap-0.5 border-l border-amber-300 pl-2">
              {presets.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id}/>)}
            </div>
          </>}
          {!!models.length && <>
            {showGroups && <TreeSubheader>Engine</TreeSubheader>}
            <div className={showGroups ? 'ml-1.5 grid gap-0.5 border-l border-zinc-200 pl-2' : 'grid gap-0.5'}>
              {models.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.title} selected={selectedId === doc.id}/>)}
            </div>
          </>}
        </CollapsibleSection>;
      })}
    </div>
  </nav>;
}

function DatasetArticle({ selected }: { selected: DatasetDoc }) {
  const descriptionParas = Array.isArray(selected.description) ? selected.description : [selected.description];
  const descriptionMarkdown = descriptionParas.join('\n\n');
  const methodItems = visibleMethodItems(selected);
  const fileMethodItems = technicalMethodItems(selected);
  const showFileRows = hasFileRows(selected);
  const showModelSection = hasModelSection(selected);
  return <div>
    <p className="text-xs font-medium uppercase text-zinc-400">{domainLabels[selected.domain] ?? selected.domain} · {kindLabels[selected.kind]}</p>
    <h1 className="mt-2 flex flex-wrap items-center gap-x-3 text-4xl font-semibold leading-tight">
      {selected.title}
      <KindTag kind={selected.kind}/>
    </h1>
    {selected.short && <p className="mt-3 max-w-3xl text-lg leading-8 text-zinc-700">{selected.short}</p>}
    <DatasetMeta selected={selected}/>
    <section id={tocAnchors.overview} className="mt-9 scroll-mt-8">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Übersicht</h2>
      <MarkdownBlock content={descriptionMarkdown} className="mt-4 max-w-3xl text-base leading-7 text-zinc-600"/>
    </section>
    {showModelSection && <section id={tocAnchors.model} className="mt-9 scroll-mt-8">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Modellansatz</h2>
      {!!selected.overview?.length && <ModelOverview items={selected.overview}/>}
      {!!methodItems.length && <section id={tocAnchors.derivation} className="mt-7 max-w-3xl scroll-mt-8">
        <h3 className="text-base font-semibold text-zinc-900">Herleitung</h3>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
          {methodItems.map(item => <li key={item}>• {item}</li>)}
        </ul>
      </section>}
      {selected.sections?.map(section => <section key={section.title} id={sectionAnchor(section.title)} className="mt-7 max-w-3xl scroll-mt-8">
        <h3 className="text-base font-semibold text-zinc-900">{section.title}</h3>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
          {section.items.map(item => <li key={item}>• {item}</li>)}
        </ul>
      </section>)}
      {!!selected.caveats?.length && <section id={tocAnchors.caveats} className="mt-7 max-w-3xl scroll-mt-8">
        <h3 className="text-base font-semibold text-zinc-900">Grenzen</h3>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
          {selected.caveats.map(item => <li key={item}>• {item}</li>)}
        </ul>
      </section>}
    </section>}
    {selected.source && <SourcesSection selected={selected}/>}
    {showFileRows && <section id={tocAnchors.files} className="mt-9 scroll-mt-8">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Files</h2>
      <FileContentTabs selected={selected} reproductionItems={fileMethodItems}/>
    </section>}
  </div>;
}

function SourcesSection({ selected }: { selected: DatasetDoc }) {
  return <section id={tocAnchors.sources} className="mt-9 scroll-mt-8">
    <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Quellen</h2>
    <div className="mt-4 max-w-3xl text-sm leading-6">
      <p className="text-zinc-700">{selected.source}</p>
      {selected.sourceUrls?.length
        ? <ul className="mt-3 grid gap-1 text-zinc-700">
            {selected.sourceUrls.map(url => <li key={url} className="break-all">• <a href={url} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{url}</a></li>)}
          </ul>
        : null}
    </div>
  </section>;
}

function DatasetMeta({ selected }: { selected: DatasetDoc }) {
  return <dl className="mt-6 grid max-w-3xl gap-x-6 gap-y-3 border-y border-zinc-100 py-4 text-sm leading-5 sm:grid-cols-2">
    <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-3">
      <dt className="font-medium text-zinc-400">ID</dt>
      <dd className="min-w-0"><code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-700">{selected.id}</code></dd>
    </div>
    <MetaLine label="Zeitraum" value={selected.period}/>
    <MetaLine label="Auflösung" value={selected.resolution}/>
    <MetaLine label="Einheit" value={selected.unit}/>
  </dl>;
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-3">
    <dt className="font-medium text-zinc-400">{label}</dt>
    <dd className="min-w-0 text-zinc-700">{value}</dd>
  </div>;
}

function MarkdownBlock({ content, className }: { content: string; className?: string }) {
  const blocks = markdownBlocks(content);
  return <div className={cx('space-y-4', className)}>
    {blocks.map((block, index) => {
      if (block.kind === 'list') {
        return <ul key={index} className="grid gap-1 pl-5">
          {block.items.map(item => <li key={item} className="list-disc marker:text-zinc-300">{markdownInline(item)}</li>)}
        </ul>;
      }
      return <p key={index}>{markdownInline(block.text)}</p>;
    })}
  </div>;
}

function markdownBlocks(content: string) {
  const rawBlocks = content.trim().split(/\n\s*\n/).map(block => block.trim()).filter(Boolean);
  return rawBlocks.map(block => {
    const lines = block.split('\n').map(line => line.trim()).filter(Boolean);
    const listItems = lines.map(line => line.match(/^[-*]\s+(.+)$/)?.[1]);
    if (listItems.every(Boolean)) return { kind: 'list' as const, items: listItems as string[] };
    return { kind: 'paragraph' as const, text: lines.join(' ') };
  });
}

function markdownInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|https?:\/\/\S+)/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={nodes.length} className="font-semibold text-zinc-800">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      nodes.push(<code key={nodes.length} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.9em] text-zinc-800">{token.slice(1, -1)}</code>);
    } else if (token.startsWith('[')) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      nodes.push(link
        ? <a key={nodes.length} href={link[2]} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{link[1]}</a>
        : token);
    } else {
      nodes.push(<a key={nodes.length} href={token} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{token}</a>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function ModelOverview({ items }: { items: Array<{ label: string; value: string }> }) {
  return <dl className="mt-4 max-w-3xl divide-y divide-zinc-100 border-y border-zinc-100 text-sm leading-6">
    {items.map(item => <div key={item.label} className="grid gap-1 py-3 sm:grid-cols-[124px_1fr]">
      <dt className="font-medium text-zinc-500">{item.label}</dt>
      <dd className="text-zinc-700">{markdownInline(item.value)}</dd>
    </div>)}
  </dl>;
}

function FileContentTabs({ selected, reproductionItems }: { selected: DatasetDoc; reproductionItems: string[] }) {
  const tabs = fileContentTabs(selected, reproductionItems);
  const tabKey = tabs.map(tab => tab.id).join('|');
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? '');
  useEffect(() => {
    setActiveTabId(tabs[0]?.id ?? '');
  }, [selected.id, tabKey]);
  const activeTab = tabs.find(tab => tab.id === activeTabId) ?? tabs[0];
  if (!activeTab) return null;

  return <div className="mt-4 max-w-3xl">
    <div role="tablist" aria-label="Files" className="flex flex-wrap gap-1 border-b border-zinc-200">
      {tabs.map(tab => {
        const active = tab.id === activeTab.id;
        const tabId = `file-tab-${tab.id}`;
        const panelId = `file-panel-${tab.id}`;
        return <button
          key={tab.id}
          id={tabId}
          type="button"
          role="tab"
          aria-selected={active}
          aria-controls={panelId}
          tabIndex={active ? 0 : -1}
          className={cx(
            '-mb-px rounded-t-md border border-transparent px-3 py-2 text-sm leading-5 transition',
            active ? 'border-zinc-200 border-b-white bg-white font-medium text-zinc-950' : 'text-zinc-500 hover:text-zinc-950',
          )}
          onClick={() => setActiveTabId(tab.id)}
        >{tab.label}</button>;
      })}
    </div>
    <div
      id={`file-panel-${activeTab.id}`}
      role="tabpanel"
      aria-labelledby={`file-tab-${activeTab.id}`}
      className="rounded-b-lg border border-t-0 border-zinc-200 bg-white p-4"
    >
      {activeTab.kind === 'dataset'
        ? <DatasetFilePanel selected={selected} reproductionItems={reproductionItems} path={activeTab.path}/>
        : <ScriptFilePanel tab={activeTab}/>}
    </div>
  </div>;
}

function fileContentTabs(selected: DatasetDoc, reproductionItems: string[]): FileContentTab[] {
  const tabs: FileContentTab[] = [];
  if (selected.file || selected.fields?.length || reproductionItems.length) {
    tabs.push({ id: selected.file ?? 'dataset', label: 'Datensatz', kind: 'dataset', path: selected.file });
  }
  selected.scripts?.forEach(script => {
    tabs.push({
      id: script,
      label: script.split('/').pop() ?? script,
      kind: script.endsWith('.ts') ? 'code' : 'script',
      path: script,
    });
  });
  return tabs;
}

function DatasetFilePanel({ selected, reproductionItems, path }: { selected: DatasetDoc; reproductionItems: string[]; path?: string }) {
  return <div>
    <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
      {path && <FilePathLine label="Datensatz" path={path} viewer/>}
      {selected.fields?.map(field => <div key={field.name} className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,150px)_70px_minmax(0,1fr)]">
        <dt className="min-w-0"><code className="break-words">{field.name}</code></dt>
        <dd className="min-w-0 text-zinc-500">{field.unit}</dd>
        <dd className="min-w-0 leading-5 text-zinc-700">{field.description}</dd>
      </div>)}
      {reproductionItems.map(item => <div key={item} className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,150px)_70px_minmax(0,1fr)]">
        <dt className="min-w-0"><code className="break-words">Reproduktion</code></dt>
        <dd className="min-w-0 text-zinc-500">Hinweis</dd>
        <dd className="min-w-0 leading-5 text-zinc-700">{item.replace(/^Datei:\s*/, '')}</dd>
      </div>)}
    </dl>
  </div>;
}

function ScriptFilePanel({ tab }: { tab: FileContentTab }) {
  if (!tab.path) return null;
  return <div>
    <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
      <FilePathLine label={tab.kind === 'code' ? 'Code' : 'Skript'} path={tab.path}/>
    </dl>
    <CodeFileBox path={tab.path}/>
  </div>;
}

function CodeFileBox({ path }: { path: string }) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    fetch(dataPlainTextUrl(path))
      .then(response => response.ok ? response.text() : Promise.reject(new Error(`${response.status} ${response.statusText}`)))
      .then(text => {
        if (!cancelled) setContent(text);
      })
      .catch(err => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (error) return <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Konnte Datei nicht laden: {error}</p>;
  if (content === null) return <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">Lade Datei …</p>;
  return <pre className="mt-4 max-h-[70vh] max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-4 text-[11px] leading-5 text-zinc-100 [scrollbar-color:#71717a_transparent] [scrollbar-width:thin]"><code>{content}</code></pre>;
}

function FilePathLine({ label, path, viewer = false }: { label: string; path: string; viewer?: boolean }) {
  return <div className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,150px)_70px_minmax(0,1fr)]">
    <dt className="min-w-0"><code className="break-words">{label}</code></dt>
    <dd className="min-w-0 text-zinc-500">Pfad</dd>
    <dd className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <a href={viewer ? dataFileViewerUrl(path) : dataFileUrl(path)} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
        <code>data/{path}</code>
      </a>
      <a href={dataFileUrl(path)} target="_blank" rel="noreferrer" className="text-xs text-zinc-400 underline decoration-zinc-200 underline-offset-2 hover:text-zinc-700">raw</a>
    </dd>
  </div>;
}

function isTechnicalMethodItem(item: string) {
  return /^Datei:/.test(item);
}

function DataHandbookHome({ docs }: { docs: DatasetDoc[] }) {
  const grouped = groupDocsForWiki(docs);
  const domains: ReadonlyArray<readonly [string, string]> = [
    ['last', 'Last'],
    ['erzeugung', 'Erzeugung'],
    ['speicher', 'Speicher'],
    ['aussenhandel', 'Außenhandel'],
    ['presets', 'Presets'],
    ['modell', 'Modell'],
    ['templates', 'Vorlagen'],
  ];
  return <div>
    <div>
      <p className="text-xs font-medium uppercase text-zinc-400">data/</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight">netzprobe.de Wiki</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">Dokumentation der Datensätze, die die Simulation direkt aus dem statischen <code>data/</code>-Ordner lädt. Sechs Domänen, eine Engine.</p>
    </div>
    <section id={tocAnchors.homeDomains} className="mt-10 scroll-mt-8">
      <div className="grid gap-3 sm:grid-cols-2">
        {domains.map(([domain, label]) => {
          const items = grouped[domain];
          if (!items?.length) return null;
          const Icon = domainIcons[domain] ?? Zap;
          return <a
            key={domain}
            href={dataWikiUrl(items[0].id)}
            className={cx(sectionBox, 'group block p-5 transition hover:border-zinc-300')}
          >
            <div className="flex items-center gap-3">
              <span className={cx(iconTile, 'h-9 w-9 text-zinc-700 transition group-hover:bg-zinc-900 group-hover:text-white')}>
                <Icon className="h-5 w-5"/>
              </span>
              <h2 className="text-base font-semibold text-zinc-950">{label}</h2>
              <span className="ml-auto text-xs tabular-nums text-zinc-400">{items.length} {items.length === 1 ? 'Eintrag' : 'Einträge'}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{domainBlurbs[domain] ?? ''}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {items.slice(0, 6).map(item => <li key={item.id}>
                <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] leading-5 text-zinc-700">{item.title}</span>
              </li>)}
              {items.length > 6 && <li>
                <span className="inline-block rounded-full px-2 py-0.5 text-[11px] leading-5 text-zinc-400">+{items.length - 6}</span>
              </li>}
            </ul>
          </a>;
        })}
      </div>
    </section>
  </div>;
}

function CollapsibleSection({
  title, icon, count, open, active, onToggle, children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return <section className="min-w-0">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cx(
        'group flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[15px] font-semibold leading-5 transition',
        active ? `text-zinc-950 ${rowActive}` : `text-zinc-800 ${rowHover}`,
      )}
    >
      <ChevronRight
        className={cx(
          'h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-150 group-hover:text-zinc-700',
          open && 'rotate-90',
        )}
        aria-hidden
      />
      <span className={cx(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition',
        active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200',
      )}>{icon}</span>
      <span className="flex-1 truncate">{title}</span>
      <span className={cx(
        'text-xs font-normal tabular-nums transition',
        active ? 'text-zinc-700' : 'text-zinc-400',
      )}>{count}</span>
    </button>
    {open && <div className="mt-0.5 mb-1 grid min-w-0 gap-0.5 pl-8">
      {children}
    </div>}
  </section>;
}

function TreeNode({ href, label, selected, tag }: { href: string; label: string; selected: boolean; tag?: ReactNode }) {
  return <a
    href={href}
    className={cx(
      'block min-w-0 rounded-md px-2 py-1 text-[13px] leading-5 transition',
      selected ? 'bg-zinc-950 font-medium text-white' : `text-zinc-600 ${rowHover} hover:text-zinc-950`,
    )}
  >
    <span className="flex min-w-0 items-center gap-1">
      <span className="truncate">{label}</span>
      {tag}
    </span>
  </a>;
}

function TreeSubheader({ children, variant = 'default' }: { children: ReactNode; variant?: 'default' | 'preset' }) {
  return <div className={cx(
    'px-2 pt-2 pb-0.5 text-[10px] font-medium uppercase tracking-wider',
    variant === 'preset' ? 'text-amber-700' : 'text-zinc-400',
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
