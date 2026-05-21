import { useEffect, useState, type ReactNode } from 'react';
import { Activity, ArrowRightLeft, BatteryCharging, Bookmark, ChevronRight, ExternalLink, Menu, SlidersHorizontal, Zap } from 'lucide-react';
import { ApiStatusDot } from './ApiStatusDot';
import { dataFileUrl } from './dataPackages';
import type { DatasetDoc } from './dataCatalog';
import { dataWikiHomeUrl, dataWikiUrl, generatorDataJsonPathForId, generatorPackageIds, generatorPathForId, getPackage, loadGeneratorSource, loadModuleSource, modulePathForId, packageJsonPathForId } from './dataCatalog';
import { DisclaimerFooter } from './DisclaimerFooter';
import { MainTabs } from './MainTabs';
import { cx, iconButton, iconTile, panelHeader, rowActive, rowHover, sectionBox, sidebarInset, sidebarWidthClass } from './ui';

const dataFileViewerUrl = (path: string) => `${import.meta.env.BASE_URL}?view=datei&path=${encodeURIComponent(path)}`;
const domainLabels: Record<string, string> = {
  last: 'Last',
  erzeugung: 'Erzeugung',
  speicher: 'Speicher',
  aussenhandel: 'Außenhandel',
  modell: 'Modell',
  templates: 'Vorlagen',
};

const domainIcons: Record<string, typeof Zap> = {
  last: Activity,
  erzeugung: Zap,
  speicher: BatteryCharging,
  aussenhandel: ArrowRightLeft,
  modell: SlidersHorizontal,
  templates: Bookmark,
};

const domainBlurbs: Record<string, string> = {
  last: 'Stromnachfrage: historische Last 2025/2017, Sektor-Elektrifizierung (e100-*) und das e100-Preset.',
  erzeugung: 'Erzeuger-Bausteine, historische Erzeugungs-Reihen, Einspeisefaktoren und Versorgungs-Presets.',
  speicher: 'Batterie, Pumpspeicher und H₂-Saison-Speicher mit Roundtrip-Daten.',
  aussenhandel: 'Strom- und H₂-Import/-Export, Emissionsfaktoren, Bounds für Slider.',
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
type FileContentTab =
  | { id: string; label: string; kind: 'fields' }
  | { id: string; label: string; kind: 'module'; path: string }
  | { id: string; label: string; kind: 'generator'; path: string }
  | { id: string; label: string; kind: 'data-json'; path: string };

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
  return selected.method.reasoning?.filter(item => !isTechnicalMethodItem(item)) ?? [];
}

function technicalMethodItems(selected: DatasetDoc) {
  return selected.method.reasoning?.filter(isTechnicalMethodItem) ?? [];
}

function hasModelSection(selected: DatasetDoc) {
  return !!selected.method.overview?.length || !!visibleMethodItems(selected).length || !!selected.method.sections?.length || !!selected.method.caveats?.length;
}

function hasFileRows(selected: DatasetDoc) {
  return !!modulePathForId(selected.id) || !!selected.method.fields?.length || !!technicalMethodItems(selected).length || generatorPackageIds.has(selected.id);
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
    selected.method.sections?.forEach(section => items.push({ id: sectionAnchor(section.title), label: section.title, level: 2 }));
    if (selected.method.caveats?.length) items.push({ id: tocAnchors.caveats, label: 'Grenzen', level: 2 });
  }
  if (selected.method.source) items.push({ id: tocAnchors.sources, label: 'Quellen' });
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

function isChangelogRoute() {
  if (typeof window === 'undefined') return false;
  const url = new URL(window.location.href);
  const basePath = new URL(import.meta.env.BASE_URL, url.origin).pathname;
  const path = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : url.pathname.slice(1);
  return path === 'changelog' || path === 'changelog/';
}

function KindTag({ kind }: { kind: DatasetDoc['kind'] }) {
  if (kind === 'template') return <span className="ml-2 inline-flex items-center rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-sky-800">Vorlage</span>;
  if (kind !== 'composition') return null;
  return <span className="ml-2 inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">Preset</span>;
}

export function DataHandbookSidebar({ docs, collapsed, actionBar, onCollapsedChange }: { docs: DatasetDoc[]; collapsed: boolean; actionBar?: ReactNode; onCollapsedChange: (collapsed: boolean) => void }) {
  const selectedId = selectedIdFromUrl();
  const onChangelog = isChangelogRoute();
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
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="min-w-0 text-2xl font-semibold leading-none text-zinc-950">netzprobe.de</h1>
              <ApiStatusDot/>
            </div>
          </div>
          <MainTabs active="wiki"/>
        </div>
        <div className="mt-[7px] border-t border-zinc-200 px-1.5 pt-[7px]">
          {actionBar}
        </div>
      </section>
      <div className={cx('py-5', sidebarInset)}>
        <div className="mb-3 border-b border-zinc-200 pb-3">
          <h2 className="mb-0.5 block rounded-md px-2 py-1.5 text-sm font-medium leading-5 text-zinc-950">Allgemein</h2>
          <div className="mb-1 grid min-w-0 gap-0.5 pl-8">
            <a
              href={`${import.meta.env.BASE_URL}changelog`}
              className={cx(
                'block min-w-0 rounded-md px-2 py-1.5 text-sm leading-5 transition',
                onChangelog ? 'font-medium text-zinc-950' : `text-zinc-600 ${rowHover} hover:text-zinc-950`,
              )}
            >Changelog</a>
            <a
              href="https://github.com/chriopter/netzprobe"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm leading-5 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-950"
            >
              GitHub
              <ExternalLink className="h-3 w-3 text-zinc-400" aria-hidden="true"/>
            </a>
          </div>
        </div>
        <DataHandbookNav sections={wikiSections} grouped={grouped} selectedId={selectedId}/>
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
          !selectedId ? 'font-medium text-zinc-950' : `text-zinc-600 ${rowHover} hover:text-zinc-950`,
        )}
      >Modelle & Daten</a>
      {sections.map(([domain, label]) => {
        const inDomain = grouped[domain];
        if (!inDomain?.length) return null;
        const bausteine = inDomain.filter(doc => doc.kind !== 'composition' && doc.kind !== 'model');
        const presets = inDomain.filter(doc => doc.kind === 'composition');
        const models = inDomain.filter(doc => doc.kind === 'model');
        const showGroups = presets.length > 0 || models.length > 0;
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
            {showGroups && <TreeSubheader>Bausteine</TreeSubheader>}
            <div className={showGroups ? 'ml-1.5 grid gap-0.5 border-l border-zinc-200 pl-2' : 'grid gap-0.5'}>
              {bausteine.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.method.title} selected={selectedId === doc.id}/>)}
            </div>
          </>}
          {!!presets.length && <>
            <TreeSubheader variant="preset">Presets</TreeSubheader>
            <div className="ml-1.5 grid gap-0.5 border-l border-amber-300 pl-2">
              {presets.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.method.title} selected={selectedId === doc.id}/>)}
            </div>
          </>}
          {!!models.length && <>
            {showGroups && <TreeSubheader>Engine</TreeSubheader>}
            <div className={showGroups ? 'ml-1.5 grid gap-0.5 border-l border-zinc-200 pl-2' : 'grid gap-0.5'}>
              {models.map(doc => <TreeNode key={doc.id} href={dataWikiUrl(doc.id)} label={doc.method.title} selected={selectedId === doc.id}/>)}
            </div>
          </>}
        </CollapsibleSection>;
      })}
    </div>
  </nav>;
}

function DatasetArticle({ selected }: { selected: DatasetDoc }) {
  const descriptionParas = Array.isArray(selected.method.description) ? selected.method.description : [selected.method.description];
  const descriptionMarkdown = descriptionParas.join('\n\n');
  const methodItems = visibleMethodItems(selected);
  const fileMethodItems = technicalMethodItems(selected);
  const showFileRows = hasFileRows(selected);
  const showModelSection = hasModelSection(selected);
  return <div>
    <p className="text-xs font-medium uppercase text-zinc-400">{domainLabels[selected.domain] ?? selected.domain} · {kindLabels[selected.kind]}</p>
    <h1 className="mt-2 flex flex-wrap items-center gap-x-3 text-4xl font-semibold leading-tight">
      {selected.method.title}
      <KindTag kind={selected.kind}/>
      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-normal text-zinc-700">{selected.id}</code>
    </h1>
    {selected.method.short && <p className="mt-3 max-w-3xl text-lg leading-8 text-zinc-700">{selected.method.short}</p>}
    <section id={tocAnchors.overview} className="mt-9 scroll-mt-8">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Übersicht</h2>
      <MarkdownBlock content={descriptionMarkdown} className="mt-4 max-w-3xl text-base leading-7 text-zinc-600"/>
    </section>
    {showModelSection && <section id={tocAnchors.model} className="mt-9 scroll-mt-8">
      <h2 className="border-b border-zinc-200 pb-2 text-lg font-semibold">Modellansatz</h2>
      {!!selected.method.overview?.length && <ModelOverview items={selected.method.overview}/>}
      {!!methodItems.length && <section id={tocAnchors.derivation} className="mt-7 max-w-3xl scroll-mt-8">
        <h3 className="text-base font-semibold text-zinc-900">Herleitung</h3>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
          {methodItems.map(item => <li key={item}>• {item}</li>)}
        </ul>
      </section>}
      {selected.method.sections?.map(section => <section key={section.title} id={sectionAnchor(section.title)} className="mt-7 max-w-3xl scroll-mt-8">
        <h3 className="text-base font-semibold text-zinc-900">{section.title}</h3>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
          {section.items.map(item => <li key={item}>• {item}</li>)}
        </ul>
      </section>)}
      {!!selected.method.caveats?.length && <section id={tocAnchors.caveats} className="mt-7 max-w-3xl scroll-mt-8">
        <h3 className="text-base font-semibold text-zinc-900">Grenzen</h3>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-zinc-700">
          {selected.method.caveats.map(item => <li key={item}>• {item}</li>)}
        </ul>
      </section>}
    </section>}
    {selected.method.source && <SourcesSection selected={selected}/>}
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
      <p className="text-zinc-700">{selected.method.source}</p>
      {selected.method.sourceUrls?.length
        ? <ul className="mt-3 grid gap-1 text-zinc-700">
            {selected.method.sourceUrls.map(url => <li key={url} className="break-all">• <a href={url} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">{url}</a></li>)}
          </ul>
        : null}
    </div>
  </section>;
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
    <div role="tablist" aria-label="Dateien" className="flex flex-wrap gap-1 border-b border-zinc-200">
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
      {activeTab.kind === 'fields'
        ? <FieldsTabPanel selected={selected} reproductionItems={reproductionItems}/>
        : activeTab.kind === 'data-json'
          ? <DataJsonTabPanel path={activeTab.path}/>
          : <SourceTabPanel path={activeTab.path} kind={activeTab.kind} parameters={(getPackage(selected.id)?.parameters ?? {}) as Record<string, unknown>}/>}
    </div>
  </div>;
}

function fileContentTabs(selected: DatasetDoc, reproductionItems: string[]): FileContentTab[] {
  const tabs: FileContentTab[] = [];
  if (selected.method.fields?.length || reproductionItems.length) {
    tabs.push({ id: 'fields', label: 'Modell (model.json)', kind: 'fields' });
  }
  const modulePath = modulePathForId(selected.id);
  if (modulePath) {
    const filename = modulePath.split('/').pop() ?? modulePath;
    tabs.push({ id: `module-${modulePath}`, label: `Logik (${filename})`, kind: 'module', path: modulePath });
  }
  if (generatorPackageIds.has(selected.id)) {
    const generatorPath = generatorPathForId(selected.id);
    if (generatorPath) {
      const filename = generatorPath.split('/').pop() ?? generatorPath;
      tabs.push({ id: `generator-${generatorPath}`, label: `Generator (${filename})`, kind: 'generator', path: generatorPath });
    }
    const dataJsonPath = generatorDataJsonPathForId(selected.id);
    if (dataJsonPath) {
      tabs.push({ id: `data-json-${dataJsonPath}`, label: 'data.json', kind: 'data-json', path: dataJsonPath });
    }
  }
  return tabs;
}

function resolveFieldValue(data: Record<string, unknown> | null, path: string): unknown {
  if (!data) return undefined;
  return path.split('.').reduce<unknown>((current, segment) => {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, data);
}

function formatFieldValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number') return value.toLocaleString('de-DE', { maximumFractionDigits: 4 });
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.length <= 6 && value.every(item => typeof item === 'number' || typeof item === 'string')) {
      return `[${value.map(item => typeof item === 'number' ? item.toLocaleString('de-DE', { maximumFractionDigits: 4 }) : String(item)).join(', ')}]`;
    }
    return `Array · ${value.length} Einträge`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    const preview = keys.slice(0, 4).join(', ');
    const more = keys.length > 4 ? `, …` : '';
    return `Objekt · { ${preview}${more} }`;
  }
  return String(value);
}

function FieldsTabPanel({ selected, reproductionItems }: { selected: DatasetDoc; reproductionItems: string[] }) {
  // Werte koennen am Root (id/domain/kind), in method.* oder in parameters.*
  // liegen — der Felder-Tab gruppiert sie entsprechend der JSON-Struktur.
  const pkg = getPackage(selected.id) as Record<string, unknown> | null;
  const method = (pkg?.method ?? {}) as Record<string, unknown>;
  const parameters = (pkg?.parameters ?? {}) as Record<string, unknown>;
  const fields = selected.method.fields ?? [];
  const packagePath = packageJsonPathForId(selected.id);

  const ROOT_KEYS = new Set(['id', 'domain', 'kind']);
  const methodKeys = new Set(Object.keys(method));
  const groups: Array<{ title: string; items: typeof fields; data: Record<string, unknown> }> = [
    {
      title: 'Identifikation',
      items: fields.filter(f => ROOT_KEYS.has(f.name)),
      data: { id: pkg?.id, domain: pkg?.domain, kind: pkg?.kind },
    },
    {
      title: 'method',
      items: fields.filter(f => !ROOT_KEYS.has(f.name) && methodKeys.has(f.name)),
      data: method,
    },
    {
      title: 'parameters',
      items: fields.filter(f => !ROOT_KEYS.has(f.name) && !methodKeys.has(f.name)),
      data: parameters,
    },
  ];

  const renderRow = (field: typeof fields[number], data: Record<string, unknown>) => {
    const rawValue = resolveFieldValue(data, field.name);
    const formatted = rawValue === undefined ? null : formatFieldValue(rawValue);
    return <div key={field.name} className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_70px_minmax(0,1.5fr)]">
      <dt className="min-w-0"><code className="break-words">{field.name}</code></dt>
      <dd className="min-w-0 leading-5 text-zinc-900">
        {formatted !== null
          ? <code className="break-words rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800">{formatted}</code>
          : <span className="text-zinc-400">–</span>}
      </dd>
      <dd className="min-w-0 text-zinc-500">{field.unit}</dd>
      <dd className="min-w-0 leading-5 text-zinc-700">{field.description}</dd>
    </div>;
  };

  return <div>
    {packagePath && <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
      <FilePathLine label="Modell" path={packagePath}/>
    </dl>}
    {groups.map(group => {
      if (group.items.length === 0) return null;
      const header = <div className="hidden gap-1 py-2 text-xs font-medium uppercase tracking-wider text-zinc-400 sm:grid sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_70px_minmax(0,1.5fr)]">
        <span>Feld</span>
        <span>Wert</span>
        <span>Typ</span>
        <span>Beschreibung</span>
      </div>;
      // method ist im Wiki-Hauptbereich schon ausfuehrlich dargestellt — hier
      // standardmaessig eingeklappt.
      if (group.title === 'method') {
        return <details key={group.title} className={cx(packagePath && 'mt-6')}>
          <summary className="mb-1 cursor-pointer list-none text-xs font-medium uppercase tracking-wider text-zinc-500 hover:text-zinc-950">▸ {group.title}</summary>
          <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
            {header}
            {group.items.map(field => renderRow(field, group.data))}
          </dl>
        </details>;
      }
      return <section key={group.title} className={cx(packagePath && 'mt-6')}>
        <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">{group.title}</h3>
        <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
          {header}
          {group.items.map(field => renderRow(field, group.data))}
        </dl>
      </section>;
    })}
    {reproductionItems.length > 0 && <section className="mt-6">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">Reproduktion</h3>
      <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
        {reproductionItems.map(item => <div key={item} className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,150px)_minmax(0,1fr)_70px_minmax(0,1.5fr)]">
          <dt className="min-w-0"><code className="break-words">Reproduktion</code></dt>
          <dd className="min-w-0"><span className="text-zinc-400">–</span></dd>
          <dd className="min-w-0 text-zinc-500">Hinweis</dd>
          <dd className="min-w-0 leading-5 text-zinc-700">{item.replace(/^Datei:\s*/, '')}</dd>
        </div>)}
      </dl>
    </section>}
  </div>;
}

function SourceTabPanel({ path, kind, parameters }: { path: string; kind: 'module' | 'generator'; parameters?: Record<string, unknown> }) {
  const label = kind === 'generator' ? 'Generator' : 'Modul';
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setSource(null);
    setError(null);
    const loader = kind === 'generator' ? loadGeneratorSource(path) : loadModuleSource(path);
    loader
      .then(text => { if (!cancelled) setSource(text ?? ''); })
      .catch(err => { if (!cancelled) setError(String(err)); });
    return () => { cancelled = true; };
  }, [path, kind]);
  return <div>
    <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
      <FilePathLine label={label} path={path}/>
    </dl>
    {error
      ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">Konnte Datei nicht laden: {error}</p>
      : source === null
        ? <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">Lade Datei …</p>
        : <pre className="mt-4 max-h-[70vh] max-w-full overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-4 text-[11px] leading-5 text-zinc-100 [scrollbar-color:#71717a_transparent] [scrollbar-width:thin]"><code>{highlightParameters(source, parameters)}</code></pre>}
  </div>;
}

// CamelCase -> snake_case (Rust-Konvention: TWh bleibt ein Wort = twh).
function camelToSnake(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

// Sammelt rekursiv alle Pfade in einem parameters-Objekt.
type ParamHit = { path: string[]; value: unknown };
function collectParamPaths(obj: unknown, prefix: string[] = [], out: ParamHit[] = []): ParamHit[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = [...prefix, k];
    out.push({ path, value: v });
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      collectParamPaths(v, path, out);
    }
  }
  return out;
}

// Generiert plausible Identifier-Varianten fuer einen Pfad (camelCase + snake_case,
// volle Konkatenation, plus Parent ohne Suffixe wie "Profile"/"Scales"/"Data").
function identifierVariants(path: string[]): string[] {
  const last = path[path.length - 1];
  const out = new Set<string>();
  out.add(last);
  out.add(camelToSnake(last));
  if (path.length > 1) {
    out.add(path.map(camelToSnake).join('_'));
    out.add([...path].map(camelToSnake).reduce((a, b) => `${a}_${b}`));
    const parent = path[path.length - 2];
    const stripped = parent.replace(/(Profile|Scales|Data|Config|Info|Settings)$/, '');
    if (stripped && stripped !== parent) {
      out.add(`${camelToSnake(stripped)}_${camelToSnake(last)}`);
    }
  }
  return Array.from(out).filter(v => v.length > 0);
}

// Markiert in Source-Code alle Bezeichner, die zu einem Pfad im parameters-Tree
// passen — rekursiv ueber alle Ebenen.
function highlightParameters(source: string, parameters?: Record<string, unknown>): React.ReactNode {
  if (!parameters || Object.keys(parameters).length === 0) return source;
  const hits = collectParamPaths(parameters);
  const lookup = new Map<string, ParamHit>();
  for (const hit of hits) {
    for (const variant of identifierVariants(hit.path)) {
      if (!lookup.has(variant)) lookup.set(variant, hit);
    }
  }
  const all = Array.from(lookup.keys()).sort((a, b) => b.length - a.length);
  if (all.length === 0) return source;
  const re = new RegExp(`\\b(${all.map(s => s.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')).join('|')})\\b`, 'g');
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m.index > last) out.push(source.slice(last, m.index));
    const hit = m[0];
    const param = lookup.get(hit);
    const value = param?.value;
    const isScalar = value !== undefined && value !== null && typeof value !== 'object';
    const valueStr = isScalar ? String(value) : null;
    const pathStr = param ? param.path.join('.') : hit;
    out.push(
      <span key={`${m.index}-${hit}`} className="text-red-400" title={`${pathStr} aus model.json${valueStr ? ` = ${valueStr}` : ''}`}>
        {hit}
        {valueStr && <span className="text-amber-300">⟨{valueStr}⟩</span>}
      </span>
    );
    last = m.index + hit.length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

function DataJsonTabPanel({ path }: { path: string }) {
  return <div>
    <dl className="grid divide-y divide-zinc-100 border-y border-zinc-100">
      <FilePathLine label="Generator-Output" path={path} viewer/>
    </dl>
  </div>;
}

function FilePathLine({ label, path, viewer = false }: { label: string; path: string; viewer?: boolean }) {
  return <div className="grid min-w-0 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,150px)_70px_minmax(0,1fr)]">
    <dt className="min-w-0"><code className="break-words">{label}</code></dt>
    <dd className="min-w-0 text-zinc-500">Pfad</dd>
    <dd className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
      <a href={viewer ? dataFileViewerUrl(path) : dataFileUrl(path)} target="_blank" rel="noreferrer" className="break-all underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-700">
        <code>model/{path}</code>
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
    ['modell', 'Modell'],
    ['templates', 'Vorlagen'],
  ];
  return <div>
    <div>
      <p className="text-xs font-medium uppercase text-zinc-400">model/</p>
      <h1 className="mt-2 text-4xl font-semibold leading-tight">netzprobe.de Wiki</h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-600">Dokumentation der Modellpakete, die UI und Rust-API aus dem statischen <code>model/</code>-Ordner laden. Sechs Domänen, eine Engine.</p>
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
                <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] leading-5 text-zinc-700">{item.method.title}</span>
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
      selected ? 'font-semibold text-zinc-950' : `text-zinc-600 ${rowHover} hover:text-zinc-950`,
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
