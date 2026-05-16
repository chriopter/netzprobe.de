import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Activity,
  BatteryCharging,
  BookOpen,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Database,
  Factory,
  Flame,
  History,
  Info,
  PanelLeftClose,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { ChangelogModal } from './ChangelogModal';

// Lucide hat aus Markenrechtsgründen kein GitHub-Logo — eigenes inline-SVG.
function GithubMark({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-1.94c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.27-5.24-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.9-.39.99 0 1.98.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.73.8 1.18 1.82 1.18 3.07 0 4.4-2.7 5.36-5.26 5.65.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.79.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
  </svg>;
}
import { supplyPillIds, supplyPillLabels, supplyPillDescriptions, supplyPillWikiIds, type SupplyPillId } from './supplyPresets';
import { dataWikiHomeUrl, dataWikiUrl, datasetIds } from './dataCatalog';
import { fmt0, twh, twh0 } from './format';
import { cx, sidebarWidthClass } from './ui';
import { additionalTWh as e100PkwAdditionalTWh } from '../../data/last/e100-pkw/model';
import { additionalElectricityTWh as e100HeizAdditionalElectricityTWh } from '../../data/last/e100-heiz/model';
import { additionalTWh as e100LkwAdditionalTWh } from '../../data/last/e100-lkw/model';
import { additionalTWh as e100BahnAdditionalTWh } from '../../data/last/e100-bahn/model';
import { additionalTWh as e100SchiffAdditionalTWh } from '../../data/last/e100-schiff/model';
import { additionalTWh as e100FlugAdditionalTWh } from '../../data/last/e100-flug/model';
import { additionalElectricityTWh as e100GhdAdditionalElectricityTWh } from '../../data/last/e100-ghd/model';
import { additionalElectricityTWh as e100IndustrieAdditionalElectricityTWh } from '../../data/last/e100-industrie-waerme/model';
import { additionalTWh as e100StahlAdditionalTWh } from '../../data/last/e100-stahl/model';
import { additionalTWh as e100ChemieAdditionalTWh } from '../../data/last/e100-chemie/model';
import type { DataSet } from '../types/data';
import type { Scenario } from '../types/scenario';

export type PeriodPreset = '21d' | '90d' | 'year' | 'custom';

type ScenarioSidebarProps = {
  data: DataSet | null;
  scenario: Scenario;
  selectedPeriod: { start: string; end: string };
  periodPreset: PeriodPreset;
  customStart: string;
  customEnd: string;
  collapsed: boolean;
  openSectors: SidebarOpenSectors;
  expandedRow: SidebarExpandedRow;
  actionBar?: ReactNode;
  onCollapsedChange: (collapsed: boolean) => void;
  onOpenSectorsChange: (openSectors: SidebarOpenSectors) => void;
  onExpandedRowChange: (row: SidebarExpandedRow) => void;
  onPreset: (preset: PeriodPreset) => void;
  onStart: (date: string) => void;
  onEnd: (date: string) => void;
  onHistoricalLoadChange: (checked: boolean) => void;
  onLoadYearChange: (year: 2025 | 2017) => void;
  onE100PkwChange: (checked: boolean) => void;
  onE100PkwMillionKmChange: (millionKm: number) => void;
  onE100HeizChange: (checked: boolean) => void;
  onE100HeizTargetHeatTWhChange: (heatTWh: number) => void;
  onE100LkwChange: (checked: boolean) => void;
  onE100LkwTargetChange: (bnKm: number) => void;
  onE100BahnChange: (checked: boolean) => void;
  onE100BahnTargetChange: (twh: number) => void;
  onE100SchiffChange: (checked: boolean) => void;
  onE100SchiffTargetChange: (twh: number) => void;
  onE100FlugChange: (checked: boolean) => void;
  onE100FlugTargetChange: (twh: number) => void;
  onE100GhdChange: (checked: boolean) => void;
  onE100GhdTargetChange: (twh: number) => void;
  onE100IndustrieWaermeChange: (checked: boolean) => void;
  onE100IndustrieWaermeTargetChange: (twh: number) => void;
  onE100StahlChange: (checked: boolean) => void;
  onE100StahlTargetChange: (mioTon: number) => void;
  onE100ChemieChange: (checked: boolean) => void;
  onE100ChemieTargetChange: (twh: number) => void;
  onH2ImportTWhChange: (twh: number) => void;
  onGenerationChange: (field: keyof Scenario['generation'], value: number) => void;
  onStorageChange: (field: keyof Scenario['storage'], value: number) => void;
  supplyPreset: Scenario['supplyPreset'];
  onSupplyPresetChange: (preset: Scenario['supplyPreset']) => void;
};

export type SidebarSectorId = 'verkehr' | 'waerme' | 'industrie';
export type SidebarOpenSectors = Record<SidebarSectorId, boolean>;
export type SidebarExpandedRow = string | null;

export function ScenarioSidebar({
  data,
  scenario,
  selectedPeriod,
  periodPreset,
  customStart,
  customEnd,
  collapsed,
  openSectors,
  expandedRow,
  actionBar = null,
  onCollapsedChange,
  onOpenSectorsChange,
  onExpandedRowChange,
  onPreset,
  onStart,
  onEnd,
  onHistoricalLoadChange,
  onLoadYearChange,
  onE100PkwChange,
  onE100PkwMillionKmChange,
  onE100HeizChange,
  onE100HeizTargetHeatTWhChange,
  onE100LkwChange,
  onE100LkwTargetChange,
  onE100BahnChange,
  onE100BahnTargetChange,
  onE100SchiffChange,
  onE100SchiffTargetChange,
  onE100FlugChange,
  onE100FlugTargetChange,
  onE100GhdChange,
  onE100GhdTargetChange,
  onE100IndustrieWaermeChange,
  onE100IndustrieWaermeTargetChange,
  onE100StahlChange,
  onE100StahlTargetChange,
  onE100ChemieChange,
  onE100ChemieTargetChange,
  onH2ImportTWhChange,
  onGenerationChange,
  onStorageChange,
  supplyPreset,
  onSupplyPresetChange,
}: ScenarioSidebarProps) {
  const [changelogOpen, setChangelogOpen] = useState(false);
  useEffect(() => {
    if (collapsed || typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1023px)');
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mql.matches) onCollapsedChange(true);
    };
    const previousOverflow = document.body.style.overflow;
    const applyLock = () => {
      document.body.style.overflow = mql.matches ? 'hidden' : previousOverflow;
    };
    applyLock();
    mql.addEventListener('change', applyLock);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      mql.removeEventListener('change', applyLock);
      window.removeEventListener('keydown', onKey);
    };
  }, [collapsed, onCollapsedChange]);

  if (collapsed) return null;

  return <aside
    role="dialog"
    aria-modal="true"
    aria-label="Szenario-Sidebar"
    className={cx(
      'fixed inset-0 z-50 w-screen max-w-none overflow-hidden bg-zinc-50 lg:inset-auto lg:bottom-3 lg:left-3 lg:top-3 lg:z-20 lg:bg-transparent',
      sidebarWidthClass,
    )}
  >
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden border-zinc-200/80 bg-zinc-50 p-3 shadow-[0_18px_45px_rgba(24,24,27,.06)] [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] lg:rounded-xl lg:border lg:bg-zinc-50/80">
      <div className="mb-3 flex items-start gap-2 pl-3 pr-1 pt-3 sm:pl-4 lg:pl-3 lg:pt-0">
        <button
          type="button"
          aria-label="Sidebar einklappen"
          aria-expanded={true}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-950"
          onClick={() => onCollapsedChange(true)}
        >
          <PanelLeftClose className="h-4 w-4" aria-hidden="true"/>
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="min-w-0 text-2xl font-semibold leading-8 text-zinc-950">netzprobe.de</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href="https://github.com/chriopter/netzprobe"
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
            >
              <GithubMark className="h-3 w-3"/>
              Repo
            </a>
            <button
              type="button"
              onClick={() => setChangelogOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
            >
              <History className="h-3 w-3"/>
              Changelog
            </button>
            <a
              href={dataWikiHomeUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
            >
              <BookOpen className="h-3 w-3"/>
              Wiki
            </a>
          </div>
        </div>
      </div>
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)}/>

      <div className="grid gap-3">
        {actionBar}

        <PeriodControl
          preset={periodPreset}
          start={selectedPeriod.start}
          end={selectedPeriod.end}
          customStart={customStart}
          customEnd={customEnd}
          loadYear={scenario.loadYear}
          onPreset={onPreset}
          onStart={onStart}
          onEnd={onEnd}
        />

        <LoadConfiguration
          data={data}
          scenario={scenario}
          onSupplyPresetChange={onSupplyPresetChange}
          onHistoricalLoadChange={onHistoricalLoadChange}
          onLoadYearChange={onLoadYearChange}
          onE100PkwChange={onE100PkwChange}
          onE100PkwMillionKmChange={onE100PkwMillionKmChange}
          onE100HeizChange={onE100HeizChange}
          onE100HeizTargetHeatTWhChange={onE100HeizTargetHeatTWhChange}
          onE100LkwChange={onE100LkwChange}
          onE100LkwTargetChange={onE100LkwTargetChange}
          onE100BahnChange={onE100BahnChange}
          onE100BahnTargetChange={onE100BahnTargetChange}
          onE100SchiffChange={onE100SchiffChange}
          onE100SchiffTargetChange={onE100SchiffTargetChange}
          onE100FlugChange={onE100FlugChange}
          onE100FlugTargetChange={onE100FlugTargetChange}
          onE100GhdChange={onE100GhdChange}
          onE100GhdTargetChange={onE100GhdTargetChange}
          onE100IndustrieWaermeChange={onE100IndustrieWaermeChange}
          onE100IndustrieWaermeTargetChange={onE100IndustrieWaermeTargetChange}
          onE100StahlChange={onE100StahlChange}
          onE100StahlTargetChange={onE100StahlTargetChange}
          onE100ChemieChange={onE100ChemieChange}
          onE100ChemieTargetChange={onE100ChemieTargetChange}
          onH2ImportTWhChange={onH2ImportTWhChange}
          openSectors={openSectors}
          expandedRow={expandedRow}
          onOpenSectorsChange={onOpenSectorsChange}
          onExpandedRowChange={onExpandedRowChange}
        />

        <ErzeugungSection
          data={data}
          scenario={scenario}
          supplyPreset={supplyPreset}
          onSupplyPresetChange={onSupplyPresetChange}
          onGenerationChange={onGenerationChange}
          onStorageChange={onStorageChange}
        />

        <ReadonlyCard
          title="Modell"
          icon={<SlidersHorizontal className="h-4 w-4"/>}
          label="Kernmodell"
          meta="Stündlicher Dispatch von Last, Erzeugung, Speicher und Handel"
          docId={datasetIds.coreModel}
        />
      </div>
    </div>
  </aside>;
}

type GenerationFieldKey = keyof Scenario['generation'];

type GenerationFieldSpec = {
  key: GenerationFieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  baseline?: number;
};

type GenerationGroup = {
  id: 'erneuerbar' | 'kernkraft' | 'konventionell' | 'handel';
  title: string;
  fields: GenerationFieldSpec[];
  summary: (scenario: Scenario) => string;
};

function generationGroups(erz: DataSet['erzeugungs-modell']): GenerationGroup[] {
  return [
    { id: 'erneuerbar', title: 'Erneuerbar', fields: [
      { key: 'pvInstalledGW',         label: 'PV',            unit: 'GW',  min: erz.sources.pv.minInstalledGW,         max: erz.sources.pv.maxInstalledGW,         step: erz.sources.pv.stepGW,         baseline: erz.sources.pv.installed2025GW },
      { key: 'windOnInstalledGW',     label: 'Wind Onshore',  unit: 'GW',  min: erz.sources.windOn.minInstalledGW,     max: erz.sources.windOn.maxInstalledGW,     step: erz.sources.windOn.stepGW,     baseline: erz.sources.windOn.installed2025GW },
      { key: 'windOffInstalledGW',    label: 'Wind Offshore', unit: 'GW',  min: erz.sources.windOff.minInstalledGW,    max: erz.sources.windOff.maxInstalledGW,    step: erz.sources.windOff.stepGW,    baseline: erz.sources.windOff.installed2025GW },
      { key: 'biomasseInstalledGW',   label: 'Biomasse',      unit: 'GW',  min: erz.sources.biomasse.minInstalledGW,   max: erz.sources.biomasse.maxInstalledGW,   step: erz.sources.biomasse.stepGW,   baseline: erz.sources.biomasse.installed2025GW },
      { key: 'laufwasserInstalledGW', label: 'Laufwasser',    unit: 'GW',  min: erz.sources.laufwasser.minInstalledGW, max: erz.sources.laufwasser.maxInstalledGW, step: erz.sources.laufwasser.stepGW, baseline: erz.sources.laufwasser.installed2025GW },
    ], summary: (s) => `${fmt0.format(s.generation.pvInstalledGW + s.generation.windOnInstalledGW + s.generation.windOffInstalledGW + s.generation.biomasseInstalledGW + s.generation.laufwasserInstalledGW)} GW` },
    { id: 'kernkraft', title: 'Kernkraft', fields: [
      { key: 'kernkraftInstalledGW', label: 'Kernkraft', unit: 'GW', min: erz.sources.kernkraft.minInstalledGW, max: erz.sources.kernkraft.maxInstalledGW, step: erz.sources.kernkraft.stepGW },
    ], summary: (s) => `${fmt0.format(s.generation.kernkraftInstalledGW)} GW` },
    { id: 'konventionell', title: 'Konventionell', fields: [
      { key: 'gasInstalledGW',   label: 'Gas',   unit: 'GW', min: erz.sources.gas.minInstalledGW,   max: erz.sources.gas.maxInstalledGW,   step: erz.sources.gas.stepGW,   baseline: erz.sources.gas.installed2025GW },
      { key: 'kohleInstalledGW', label: 'Kohle', unit: 'GW', min: erz.sources.kohle.minInstalledGW, max: erz.sources.kohle.maxInstalledGW, step: erz.sources.kohle.stepGW, baseline: erz.sources.kohle.installed2025GW },
    ], summary: (s) => `${fmt0.format(s.generation.gasInstalledGW + s.generation.kohleInstalledGW)} GW` },
    { id: 'handel', title: 'Handel', fields: [
      { key: 'importMaxGW', label: 'Import-Limit', unit: 'GW', min: erz.import.minGW, max: erz.import.maxGW, step: erz.import.stepGW, baseline: erz.import.default2025GW },
      { key: 'exportMaxGW', label: 'Export-Limit', unit: 'GW', min: erz.export.minGW, max: erz.export.maxGW, step: erz.export.stepGW, baseline: erz.export.default2025GW },
    ], summary: (s) => `${fmt0.format(s.generation.importMaxGW)} / ${fmt0.format(s.generation.exportMaxGW)} GW` },
  ];
}

type StorageFieldKey = keyof Scenario['storage'];
type StorageFieldSpec = { key: StorageFieldKey; label: string; unit: string; min: number; max: number; step: number; baseline?: number };

type StorageGroup = {
  id: 'batterie' | 'pumpspeicher' | 'h2';
  title: string;
  fields: StorageFieldSpec[];
  summary: (scenario: Scenario) => string;
};

function storageGroups(sp: DataSet['speicher-modell']): StorageGroup[] {
  return [
    { id: 'batterie', title: 'Batterie · kurzfristig', fields: [
      { key: 'batteriePowerGW',   label: 'Leistung', unit: 'GW',  min: sp.storages.batterie.minPowerGW,   max: sp.storages.batterie.maxPowerGW,   step: sp.storages.batterie.stepPowerGW,   baseline: sp.storages.batterie.power2025GW },
      { key: 'batterieEnergyGWh', label: 'Energie',  unit: 'GWh', min: sp.storages.batterie.minEnergyGWh, max: sp.storages.batterie.maxEnergyGWh, step: sp.storages.batterie.stepEnergyGWh, baseline: sp.storages.batterie.energy2025GWh },
    ], summary: (s) => `${fmt0.format(s.storage.batteriePowerGW)} GW · ${fmt0.format(s.storage.batterieEnergyGWh)} GWh` },
    { id: 'pumpspeicher', title: 'Pumpspeicher · mittelfristig', fields: [
      { key: 'pumpspeicherPowerGW',   label: 'Leistung', unit: 'GW',  min: sp.storages.pumpspeicher.minPowerGW,   max: sp.storages.pumpspeicher.maxPowerGW,   step: sp.storages.pumpspeicher.stepPowerGW,   baseline: sp.storages.pumpspeicher.power2025GW },
      { key: 'pumpspeicherEnergyGWh', label: 'Energie',  unit: 'GWh', min: sp.storages.pumpspeicher.minEnergyGWh, max: sp.storages.pumpspeicher.maxEnergyGWh, step: sp.storages.pumpspeicher.stepEnergyGWh, baseline: sp.storages.pumpspeicher.energy2025GWh },
    ], summary: (s) => `${s.storage.pumpspeicherPowerGW.toLocaleString('de-DE')} GW · ${fmt0.format(s.storage.pumpspeicherEnergyGWh)} GWh` },
    { id: 'h2', title: 'Wasserstoff · saisonal', fields: [
      { key: 'h2ChargePowerGW',    label: 'Elektrolyse',    unit: 'GW',  min: sp.storages.h2.minChargePowerGW,    max: sp.storages.h2.maxChargePowerGW,    step: sp.storages.h2.stepChargePowerGW,    baseline: sp.storages.h2.chargePower2025GW },
      { key: 'h2DischargePowerGW', label: 'Rückverstromung',unit: 'GW',  min: sp.storages.h2.minDischargePowerGW, max: sp.storages.h2.maxDischargePowerGW, step: sp.storages.h2.stepDischargePowerGW, baseline: sp.storages.h2.dischargePower2025GW },
      { key: 'h2EnergyGWh',        label: 'Energie',        unit: 'GWh', min: sp.storages.h2.minEnergyGWh,        max: sp.storages.h2.maxEnergyGWh,        step: sp.storages.h2.stepEnergyGWh,        baseline: sp.storages.h2.energy2025GWh },
    ], summary: (s) => `${fmt0.format(s.storage.h2ChargePowerGW)} / ${fmt0.format(s.storage.h2DischargePowerGW)} GW · ${fmt0.format(s.storage.h2EnergyGWh)} GWh` },
  ];
}

function PresetPillRow<TId extends string>({
  presets, activeId, onSelect,
}: {
  presets: ReadonlyArray<{ id: TId; label: string; description?: string }>;
  activeId: TId | null;
  onSelect: (id: TId) => void;
}) {
  return <div className="flex flex-wrap gap-1.5">
    {presets.map(p => <button
      key={p.id}
      type="button"
      title={p.description}
      onClick={() => onSelect(p.id)}
      className={cx(
        'rounded-full px-3 py-1 text-xs font-medium transition',
        p.id === activeId ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
      )}
    >{p.label}</button>)}
  </div>;
}

function PillCategory({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">{children}</div>;
}

function ErzeugungSection({
  data,
  scenario,
  supplyPreset,
  onSupplyPresetChange,
  onGenerationChange,
  onStorageChange,
}: {
  data: DataSet | null;
  scenario: Scenario;
  supplyPreset: Scenario['supplyPreset'];
  onSupplyPresetChange: (preset: Scenario['supplyPreset']) => void;
  onGenerationChange: (field: GenerationFieldKey, value: number) => void;
  onStorageChange: (field: StorageFieldKey, value: number) => void;
}) {
  if (!data) return null;

  const pillPresets = supplyPillIds.map(id => ({
    id,
    label: supplyPillLabels[id],
    description: supplyPillDescriptions[id],
  }));
  const activeId: SupplyPillId = supplyPreset;
  const activeWikiId = supplyPillWikiIds[activeId];
  const fixIds = new Set(['historical-2025', 'historical-2017', 'custom']);
  const fixPills = pillPresets.filter(p => fixIds.has(p.id));
  const lastfolgendPills = pillPresets.filter(p => !fixIds.has(p.id));

  return <SidebarCard title="Erzeugung" icon={<Zap className="h-4 w-4"/>} docId={activeWikiId}>
    <div className="grid gap-2">
      <div>
        <PillCategory>Fix · Werte bleiben wie eingestellt</PillCategory>
        <PresetPillRow presets={fixPills} activeId={activeId} onSelect={onSupplyPresetChange}/>
      </div>
      <div>
        <PillCategory>Lastfolgend · Werte passen sich der Last an</PillCategory>
        <PresetPillRow presets={lastfolgendPills} activeId={activeId} onSelect={onSupplyPresetChange}/>
      </div>
    </div>

    <div className="mt-3 grid gap-2">
      <SupplyGroupAccordions
        data={data}
        scenario={scenario}
        onGenerationChange={onGenerationChange}
        onStorageChange={onStorageChange}
      />
    </div>
  </SidebarCard>;
}

type SupplyGroupId = 'erneuerbar' | 'kernkraft' | 'konventionell' | 'handel' | 'batterie' | 'pumpspeicher' | 'h2';

function SupplyGroupAccordions({
  data,
  scenario,
  onGenerationChange,
  onStorageChange,
}: {
  data: DataSet;
  scenario: Scenario;
  onGenerationChange: (field: GenerationFieldKey, value: number) => void;
  onStorageChange: (field: StorageFieldKey, value: number) => void;
}) {
  const [open, setOpen] = useState<Record<SupplyGroupId, boolean>>({
    erneuerbar: true, kernkraft: false, konventionell: false, handel: false,
    batterie: false, pumpspeicher: false, h2: false,
  });
  const toggle = (id: SupplyGroupId) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  // Snapshot der zuletzt aktiven Werte je Gruppe, um beim Wiedereinschalten zu
  // restaurieren statt auf 2025-Baseline zurückzufallen.
  const [savedGen, setSavedGen] = useState<Partial<Record<SupplyGroupId, Record<string, number>>>>({});
  const [savedSto, setSavedSto] = useState<Partial<Record<SupplyGroupId, Record<string, number>>>>({});

  const genGroups = generationGroups(data['erzeugungs-modell']);
  const stoGroups = storageGroups(data['speicher-modell']);

  const isGenEnabled = (group: GenerationGroup) => group.fields.some(f => scenario.generation[f.key] > 0);
  const setGenEnabled = (group: GenerationGroup, checked: boolean) => {
    if (checked) {
      const saved = savedGen[group.id];
      for (const f of group.fields) {
        const value = saved?.[f.key] ?? f.baseline ?? f.max;
        onGenerationChange(f.key, value);
      }
    } else {
      const snapshot: Record<string, number> = {};
      for (const f of group.fields) {
        snapshot[f.key] = scenario.generation[f.key];
        onGenerationChange(f.key, 0);
      }
      setSavedGen(prev => ({ ...prev, [group.id]: snapshot }));
    }
  };

  const isStoEnabled = (group: StorageGroup) => group.fields.some(f => scenario.storage[f.key] > 0);
  const setStoEnabled = (group: StorageGroup, checked: boolean) => {
    if (checked) {
      const saved = savedSto[group.id];
      for (const f of group.fields) {
        const value = saved?.[f.key] ?? f.baseline ?? f.max;
        onStorageChange(f.key, value);
      }
    } else {
      const snapshot: Record<string, number> = {};
      for (const f of group.fields) {
        snapshot[f.key] = scenario.storage[f.key];
        onStorageChange(f.key, 0);
      }
      setSavedSto(prev => ({ ...prev, [group.id]: snapshot }));
    }
  };

  return <div className="grid gap-1.5">
    {genGroups.map(group => <GroupAccordion
      key={group.id}
      title={group.title}
      summary={group.summary(scenario)}
      icon={<Zap className="h-3.5 w-3.5"/>}
      open={open[group.id]}
      onToggle={() => toggle(group.id)}
      checked={isGenEnabled(group)}
      onChecked={(c) => setGenEnabled(group, c)}
    >
      {group.fields.map(field => <CapacitySliderRow
        key={field.key}
        label={field.label}
        unit={field.unit}
        value={scenario.generation[field.key]}
        min={field.min}
        max={field.max}
        step={field.step}
        baseline={field.baseline}
        onValue={value => onGenerationChange(field.key, value)}
      />)}
    </GroupAccordion>)}
    {stoGroups.map(group => <GroupAccordion
      key={group.id}
      title={group.title}
      summary={group.summary(scenario)}
      icon={<BatteryCharging className="h-3.5 w-3.5"/>}
      open={open[group.id]}
      onToggle={() => toggle(group.id)}
      checked={isStoEnabled(group)}
      onChecked={(c) => setStoEnabled(group, c)}
    >
      {group.fields.map(field => <CapacitySliderRow
        key={field.key}
        label={field.label}
        unit={field.unit}
        value={scenario.storage[field.key]}
        min={field.min}
        max={field.max}
        step={field.step}
        baseline={field.baseline}
        onValue={value => onStorageChange(field.key, value)}
      />)}
    </GroupAccordion>)}
  </div>;
}

function GroupAccordion({
  title,
  summary,
  icon,
  open,
  onToggle,
  checked,
  onChecked,
  children,
}: {
  title: string;
  summary: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  checked?: boolean;
  onChecked?: (checked: boolean) => void;
  children: ReactNode;
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  const hasCheckbox = onChecked !== undefined;
  return <section className={cx(
    'overflow-hidden rounded-lg border bg-white transition',
    open ? 'border-zinc-300' : 'border-zinc-200/80 hover:border-zinc-300',
  )}>
    <div className={cx(
      'grid w-full items-center gap-1.5 px-2.5 py-2',
      hasCheckbox ? 'grid-cols-[18px_24px_minmax(72px,1fr)_auto_16px]' : 'grid-cols-[24px_minmax(72px,1fr)_auto_16px]',
    )}>
      {hasCheckbox && <input
        className="h-4 w-4 accent-zinc-950"
        type="checkbox"
        checked={!!checked}
        onChange={event => onChecked!(event.target.checked)}
        aria-label={`${title} aktivieren`}
      />}
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-50 text-zinc-600">{icon}</span>
      <button
        type="button"
        className="text-left text-sm font-semibold text-zinc-950"
        aria-expanded={open}
        aria-label={open ? `${title} einklappen` : `${title} ausklappen`}
        onClick={onToggle}
      >{title}</button>
      <button
        type="button"
        className="whitespace-nowrap text-right text-xs font-medium tabular-nums text-zinc-500"
        onClick={onToggle}
      >{summary}</button>
      <button
        type="button"
        aria-label={open ? `${title} einklappen` : `${title} ausklappen`}
        onClick={onToggle}
      >
        <Chevron aria-hidden="true" className="h-4 w-4 text-zinc-400"/>
      </button>
    </div>
    {open && <div className="border-t border-zinc-100 px-2 py-1">{children}</div>}
  </section>;
}

function formatMultiplier(value: number, baseline: number | undefined): string | null {
  if (!baseline || baseline <= 0) return null;
  const ratio = value / baseline;
  if (!Number.isFinite(ratio)) return null;
  if (ratio < 0.05) return '0× 2025';
  if (ratio < 0.995) return `${ratio.toFixed(2)}× 2025`;
  if (ratio < 9.95) return `${ratio.toFixed(1)}× 2025`;
  return `${Math.round(ratio)}× 2025`;
}

function CapacitySliderRow({ label, unit, value, min, max, step, baseline, onValue }: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  baseline?: number;
  onValue: (value: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const multiplier = formatMultiplier(value, baseline);
  return <div className="grid gap-1 px-1 py-1.5">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium text-zinc-950">{label}</span>
      <span className="flex items-baseline gap-1 whitespace-nowrap text-xs tabular-nums text-zinc-500">
        <EditableNumber value={value} min={min} max={max} step={step} onChange={onValue} title={`${label} direkt eingeben (${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')} ${unit})`}/>
        <span>{unit}</span>
        {multiplier && <span className="ml-1 text-zinc-400">({multiplier})</span>}
      </span>
    </div>
    <input
      aria-label={label}
      className="w-full"
      style={{ ['--range-pct' as string]: `${pct}%` }}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={event => onValue(Number(event.target.value))}
    />
  </div>;
}

function EditableNumber({ value, min, max, step, onChange, title }: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  title?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const parsed = Number(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      const snapped = step > 0 ? Math.round((clamped - min) / step) * step + min : clamped;
      onChange(snapped);
    }
    setEditing(false);
  };

  if (editing) {
    return <input
      ref={inputRef}
      type="number"
      className="w-16 rounded border border-zinc-300 bg-white px-1 text-right tabular-nums focus:border-zinc-500 focus:outline-none"
      value={draft}
      min={min}
      max={max}
      step={step}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') commit();
        else if (e.key === 'Escape') setEditing(false);
      }}
    />;
  }

  return <button
    type="button"
    title={title ?? 'Klicken zum Bearbeiten'}
    className="cursor-text rounded-sm px-0.5 tabular-nums hover:bg-zinc-100 hover:text-zinc-950"
    onClick={() => { setDraft(String(value)); setEditing(true); }}
  >
    {value.toLocaleString('de-DE')}
  </button>;
}

type LoadConfigurationProps = {
  data: DataSet | null;
  scenario: Scenario;
  onSupplyPresetChange: (preset: Scenario['supplyPreset']) => void;
  onHistoricalLoadChange: (checked: boolean) => void;
  onLoadYearChange: (year: 2025 | 2017) => void;
  onE100PkwChange: (checked: boolean) => void;
  onE100PkwMillionKmChange: (millionKm: number) => void;
  onE100HeizChange: (checked: boolean) => void;
  onE100HeizTargetHeatTWhChange: (heatTWh: number) => void;
  onE100LkwChange: (checked: boolean) => void;
  onE100LkwTargetChange: (n: number) => void;
  onE100BahnChange: (checked: boolean) => void;
  onE100BahnTargetChange: (n: number) => void;
  onE100SchiffChange: (checked: boolean) => void;
  onE100SchiffTargetChange: (n: number) => void;
  onE100FlugChange: (checked: boolean) => void;
  onE100FlugTargetChange: (n: number) => void;
  onE100GhdChange: (checked: boolean) => void;
  onE100GhdTargetChange: (n: number) => void;
  onE100IndustrieWaermeChange: (checked: boolean) => void;
  onE100IndustrieWaermeTargetChange: (n: number) => void;
  onE100StahlChange: (checked: boolean) => void;
  onE100StahlTargetChange: (n: number) => void;
  onE100ChemieChange: (checked: boolean) => void;
  onE100ChemieTargetChange: (n: number) => void;
  onH2ImportTWhChange: (twh: number) => void;
  openSectors: SidebarOpenSectors;
  expandedRow: SidebarExpandedRow;
  onOpenSectorsChange: (openSectors: SidebarOpenSectors) => void;
  onExpandedRowChange: (row: SidebarExpandedRow) => void;
};

function LoadConfiguration(props: LoadConfigurationProps) {
  const { data, scenario, onHistoricalLoadChange, onLoadYearChange, openSectors, expandedRow, onOpenSectorsChange, onExpandedRowChange } = props;
  const is2017 = scenario.loadYear === 2017;
  const loadSumTWh = is2017 ? data?.loadSum2017TWh : data?.loadSumTWh;
  const sectorFlags: Array<keyof Scenario['demand']> = [
    'e100-pkw', 'e100-heiz', 'e100-lkw', 'e100-bahn', 'e100-schiff', 'e100-flug',
    'e100-ghd', 'e100-industrie-waerme', 'e100-stahl', 'e100-chemie',
  ];
  const electrificationSelected = sectorFlags.some(key => scenario.demand[key]);

  const setAllSectors = (enabled: boolean) => {
    props.onE100PkwChange(enabled);
    props.onE100HeizChange(enabled);
    props.onE100LkwChange(enabled);
    props.onE100BahnChange(enabled);
    props.onE100SchiffChange(enabled);
    props.onE100FlugChange(enabled);
    props.onE100GhdChange(enabled);
    props.onE100IndustrieWaermeChange(enabled);
    props.onE100StahlChange(enabled);
    props.onE100ChemieChange(enabled);
  };
  const setTransport = (enabled: boolean) => {
    props.onE100PkwChange(enabled);
    props.onE100LkwChange(enabled);
    props.onE100BahnChange(enabled);
    props.onE100SchiffChange(enabled);
    props.onE100FlugChange(enabled);
  };
  const setHeat = (enabled: boolean) => {
    props.onE100HeizChange(enabled);
    props.onE100GhdChange(enabled);
  };
  const setIndustry = (enabled: boolean) => {
    props.onE100IndustrieWaermeChange(enabled);
    props.onE100StahlChange(enabled);
    props.onE100ChemieChange(enabled);
  };
  const toggleSector = (id: SidebarSectorId) => onOpenSectorsChange({ ...openSectors, [id]: !openSectors[id] });
  const toggleRow = (id: string) => onExpandedRowChange(expandedRow === id ? null : id);

  const transportTotal = data ? sumEnabled([
    [scenario.demand['e100-pkw'], e100PkwAdditionalTWh(scenario.demand['e100-pkw-million-km'], data['e100-pkw'])],
    [scenario.demand['e100-lkw'], e100LkwAdditionalTWh(scenario.demand['e100-lkw-target-bn-km'], data['e100-lkw'])],
    [scenario.demand['e100-bahn'], e100BahnAdditionalTWh(scenario.demand['e100-bahn-target-twh'], data['e100-bahn'])],
    [scenario.demand['e100-schiff'], e100SchiffAdditionalTWh(scenario.demand['e100-schiff-target-twh'], data['e100-schiff'])],
    [scenario.demand['e100-flug'], e100FlugAdditionalTWh(scenario.demand['e100-flug-target-twh'], data['e100-flug'])],
  ]) : 0;
  const heatTotal = data ? sumEnabled([
    [scenario.demand['e100-heiz'], e100HeizAdditionalElectricityTWh(scenario.demand['e100-heiz-target-heat-twh'], data['e100-heiz'])],
    [scenario.demand['e100-ghd'], e100GhdAdditionalElectricityTWh(scenario.demand['e100-ghd-target-heat-twh'], data['e100-ghd'])],
  ]) : 0;
  const industryTotal = data ? sumEnabled([
    [scenario.demand['e100-industrie-waerme'], e100IndustrieAdditionalElectricityTWh(scenario.demand['e100-industrie-waerme-target-heat-twh'], data['e100-industrie-waerme'])],
    [scenario.demand['e100-stahl'], e100StahlAdditionalTWh(scenario.demand['e100-stahl-target-mio-ton'], data['e100-stahl'])],
    [scenario.demand['e100-chemie'], e100ChemieAdditionalTWh(scenario.demand['e100-chemie-target-twh'], data['e100-chemie'])],
  ]) : 0;
  const transportEnabled = scenario.demand['e100-pkw'] || scenario.demand['e100-lkw'] || scenario.demand['e100-bahn'] || scenario.demand['e100-schiff'] || scenario.demand['e100-flug'];
  const heatEnabled = scenario.demand['e100-heiz'] || scenario.demand['e100-ghd'];
  const industryEnabled = scenario.demand['e100-industrie-waerme'] || scenario.demand['e100-stahl'] || scenario.demand['e100-chemie'];
  const basisTotal = scenario.demand['last-2025'] && loadSumTWh ? loadSumTWh : 0;
  const electrificationTotal = basisTotal + transportTotal + heatTotal + industryTotal;
  const electrificationPotentialTotal = data ? (
    (loadSumTWh ?? 0)
    + e100PkwAdditionalTWh(scenario.demand['e100-pkw-million-km'], data['e100-pkw'])
    + e100LkwAdditionalTWh(scenario.demand['e100-lkw-target-bn-km'], data['e100-lkw'])
    + e100BahnAdditionalTWh(scenario.demand['e100-bahn-target-twh'], data['e100-bahn'])
    + e100SchiffAdditionalTWh(scenario.demand['e100-schiff-target-twh'], data['e100-schiff'])
    + e100FlugAdditionalTWh(scenario.demand['e100-flug-target-twh'], data['e100-flug'])
    + e100HeizAdditionalElectricityTWh(scenario.demand['e100-heiz-target-heat-twh'], data['e100-heiz'])
    + e100GhdAdditionalElectricityTWh(scenario.demand['e100-ghd-target-heat-twh'], data['e100-ghd'])
    + e100IndustrieAdditionalElectricityTWh(scenario.demand['e100-industrie-waerme-target-heat-twh'], data['e100-industrie-waerme'])
    + e100StahlAdditionalTWh(scenario.demand['e100-stahl-target-mio-ton'], data['e100-stahl'])
    + e100ChemieAdditionalTWh(scenario.demand['e100-chemie-target-twh'], data['e100-chemie'])
  ) : 0;
  const selectHistorical = () => {
    onHistoricalLoadChange(true);
    setAllSectors(false);
    onLoadYearChange(2025);
  };
  const selectHistorical2017 = () => {
    onHistoricalLoadChange(true);
    setAllSectors(false);
    onLoadYearChange(2017);
  };
  const selectElectrification = () => {
    onHistoricalLoadChange(true);
    setAllSectors(true);
    onOpenSectorsChange({ verkehr: true, waerme: false, industrie: false });
    onExpandedRowChange('e100-pkw');
    onLoadYearChange(2025);
  };

  // Pill state: nur-2025/nur-2017 (alle e100-* off, last-2025 on, je nach loadYear), e100 (alle e100-* on, last-2025 on, loadYear=2025), oder custom.
  const allE100Off = !electrificationSelected;
  const allE100On = sectorFlags.every(key => scenario.demand[key]);
  type LoadPillId = 'nur-2025' | 'nur-2017' | 'e100';
  const loadPillId: LoadPillId | null = scenario.demand['last-2025'] && allE100Off && is2017
    ? 'nur-2017'
    : scenario.demand['last-2025'] && allE100Off && !is2017
      ? 'nur-2025'
      : scenario.demand['last-2025'] && allE100On && !is2017
        ? 'e100'
        : null;
  const loadPills: ReadonlyArray<{ id: LoadPillId; label: string; description: string }> = [
    { id: 'nur-2025', label: 'Nur 2025', description: 'Historische Last 2025 (~466 TWh) ohne zusätzliche Elektrifizierung' },
    { id: 'nur-2017', label: 'Nur 2017', description: 'Historische Last 2017 (~507 TWh); unabhängig von Erzeugungspreset' },
    { id: 'e100', label: 'Vollelektrifizierung', description: 'Last 2025 plus alle e100-Bausteine aktiv' },
  ];
  const selectLoadPill = (id: LoadPillId) => {
    if (id === 'nur-2025') selectHistorical();
    else if (id === 'nur-2017') selectHistorical2017();
    else selectElectrification();
  };

  return <SidebarCard title="Last" icon={<Activity className="h-4 w-4"/>} docId={datasetIds.loadHistorical2025}>
      <PresetPillRow presets={loadPills} activeId={loadPillId} onSelect={selectLoadPill}/>

      <div className="mt-1 grid gap-2">
        <section className="overflow-hidden rounded-lg bg-zinc-50/60">
          <div className="border-zinc-100 bg-zinc-50/35 py-2 pl-3 pr-1.5">
            <div className="grid gap-2 border-l border-zinc-300/80 pl-2.5">
              <BasisSubSection
                checked={scenario.demand['last-2025']}
                meta={data?.loadSumTWh ? `Basis · ${twh0(data.loadSumTWh)}` : 'Basislast'}
                docId={datasetIds.loadHistorical2025}
                onChange={onHistoricalLoadChange}
              />
              <div className="flex items-center gap-1.5 px-1 pt-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Elektrifizierungsbausteine
                <InfoLink id={datasetIds.fullElectrification} label="100 % Elektrifizierung im Wiki öffnen"/>
                {data && <span className="ml-auto text-[11px] tabular-nums text-zinc-500 normal-case tracking-normal">{twh0(electrificationTotal)} / {twh0(electrificationPotentialTotal)}</span>}
              </div>

              {data && <AccordionSection
                title="Verkehr"
                value={twh0(transportTotal)}
                icon={<Car className="h-4 w-4"/>}
                checked={transportEnabled}
                docId={datasetIds.e100Pkw}
                open={openSectors.verkehr}
                onChecked={setTransport}
                onToggle={() => toggleSector('verkehr')}
              >
                <div className="divide-y divide-zinc-100">
                  <E100PkwControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-pkw'}
                    onChecked={props.onE100PkwChange}
                    onMillionKm={props.onE100PkwMillionKmChange}
                    onToggleExpand={() => toggleRow('e100-pkw')}
                  />
                  <E100LkwControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-lkw'}
                    onChecked={props.onE100LkwChange}
                    onValue={props.onE100LkwTargetChange}
                    onToggleExpand={() => toggleRow('e100-lkw')}
                  />
                  <E100BahnControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-bahn'}
                    onChecked={props.onE100BahnChange}
                    onValue={props.onE100BahnTargetChange}
                    onToggleExpand={() => toggleRow('e100-bahn')}
                  />
                  <E100SchiffControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-schiff'}
                    onChecked={props.onE100SchiffChange}
                    onValue={props.onE100SchiffTargetChange}
                    onToggleExpand={() => toggleRow('e100-schiff')}
                  />
                  <E100FlugControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-flug'}
                    onChecked={props.onE100FlugChange}
                    onValue={props.onE100FlugTargetChange}
                    onToggleExpand={() => toggleRow('e100-flug')}
                  />
                </div>
              </AccordionSection>}

              {data && <AccordionSection
                title="Wärme"
                value={twh0(heatTotal)}
                icon={<Flame className="h-4 w-4"/>}
                checked={heatEnabled}
                docId={datasetIds.e100Heiz}
                open={openSectors.waerme}
                onChecked={setHeat}
                onToggle={() => toggleSector('waerme')}
              >
                <div className="divide-y divide-zinc-100">
                  <E100HeizControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-heiz'}
                    onChecked={props.onE100HeizChange}
                    onTargetHeat={props.onE100HeizTargetHeatTWhChange}
                    onToggleExpand={() => toggleRow('e100-heiz')}
                  />
                  <E100GhdControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-ghd'}
                    onChecked={props.onE100GhdChange}
                    onValue={props.onE100GhdTargetChange}
                    onToggleExpand={() => toggleRow('e100-ghd')}
                  />
                </div>
              </AccordionSection>}

              {data && <AccordionSection
                title="Industrie"
                value={twh0(industryTotal)}
                icon={<Factory className="h-4 w-4"/>}
                checked={industryEnabled}
                docId={datasetIds.e100IndustrieWaerme}
                open={openSectors.industrie}
                onChecked={setIndustry}
                onToggle={() => toggleSector('industrie')}
              >
                <div className="divide-y divide-zinc-100">
                  <E100IndustrieWaermeControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-industrie-waerme'}
                    onChecked={props.onE100IndustrieWaermeChange}
                    onValue={props.onE100IndustrieWaermeTargetChange}
                    onToggleExpand={() => toggleRow('e100-industrie-waerme')}
                  />
                  <E100StahlControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-stahl'}
                    onChecked={props.onE100StahlChange}
                    onValue={props.onE100StahlTargetChange}
                    onToggleExpand={() => toggleRow('e100-stahl')}
                  />
                  <E100ChemieControl
                    data={data}
                    scenario={scenario}
                    expanded={expandedRow === 'e100-chemie'}
                    onChecked={props.onE100ChemieChange}
                    onValue={props.onE100ChemieTargetChange}
                    onToggleExpand={() => toggleRow('e100-chemie')}
                  />
                </div>
              </AccordionSection>}

              {data && <H2ImportRow
                value={scenario.demand['h2-import-twh']}
                onValue={props.onH2ImportTWhChange}
              />}
            </div>
          </div>
        </section>
      </div>
    </SidebarCard>;
}

function PeriodControl({
  preset,
  start,
  end,
  customStart,
  customEnd,
  loadYear,
  onPreset,
  onStart,
  onEnd,
}: {
  preset: PeriodPreset;
  start: string;
  end: string;
  customStart: string;
  customEnd: string;
  loadYear: 2025 | 2017;
  onPreset: (preset: PeriodPreset) => void;
  onStart: (date: string) => void;
  onEnd: (date: string) => void;
}) {
  const yearMin = `${loadYear}-01-01`;
  const yearMax = `${loadYear}-12-31`;
  return <SidebarCard title="Zeitraum" icon={<CalendarDays className="h-4 w-4"/>}>
    <select
      className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400"
      value={preset}
      onChange={event => onPreset(event.target.value as PeriodPreset)}
    >
      <option value="21d">21 Tage</option>
      <option value="90d">90 Tage</option>
      <option value="year">Jahr</option>
      <option value="custom">Benutzerdefiniert</option>
    </select>
    <span className="text-xs text-zinc-500">{formatDate(start)} bis {formatDate(end)}</span>
    {preset === 'custom' && <div className="grid grid-cols-2 gap-2">
      <input aria-label="Startdatum" className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400" type="date" min={yearMin} max={yearMax} value={customStart} onChange={event => onStart(event.target.value)}/>
      <input aria-label="Enddatum" className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400" type="date" min={yearMin} max={yearMax} value={customEnd} onChange={event => onEnd(event.target.value)}/>
    </div>}
  </SidebarCard>;
}

function ReadonlyCard({ title, icon, label, meta, docId, children }: { title: string; icon: ReactNode; label: string; meta: string; docId: string; children?: ReactNode }) {
  return <SidebarCard title={title} icon={icon} docId={docId}>
    <ReadonlyItem label={label} meta={meta} docId={docId}/>
    {children}
  </SidebarCard>;
}

function ReadonlyItem({ label, meta, docId }: { label: string; meta: string; docId: string }) {
  return <div className="group flex items-start gap-3 rounded-lg px-2.5 py-2">
    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-950">
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-950"/>
    </span>
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-sm font-medium text-zinc-950">{label}</span>
        <InfoLink id={docId} label={`${label} im Wiki öffnen`}/>
      </span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </div>;
}

function SidebarCard({ title, icon, docId, children }: { title: string; icon: ReactNode; docId?: string; children: ReactNode }) {
  return <section className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-[0_10px_26px_rgba(24,24,27,.04)]">
    <SectionHeader title={title} icon={icon} docId={docId}/>
    <div className="mt-3 grid gap-2.5">{children}</div>
  </section>;
}

function SectionHeader({ title, icon, docId }: { title: string; icon: ReactNode; docId?: string }) {
  return <div className="group flex items-center gap-2">
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">{icon}</span>
    <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
    {docId && <InfoLink id={docId} label={`${title} im Wiki öffnen`}/>}
  </div>;
}

function BasisSubSection({ checked, meta, docId, onChange }: { checked: boolean; meta: string; docId: string; onChange: (checked: boolean) => void }) {
  return <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
    <label className="group grid cursor-pointer grid-cols-[18px_28px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5">
      <input
        className="h-4 w-4 accent-zinc-950"
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        aria-label="Basis aktivieren"
      />
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-50 text-zinc-600"><Database className="h-4 w-4"/></span>
      <span className="grid min-w-0 gap-0.5">
        <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-zinc-950">
          <span className="truncate">Basis</span>
          <InfoLink id={docId} label="Basis im Wiki öffnen"/>
        </span>
        <span className="truncate text-xs font-normal text-zinc-500">{meta}</span>
      </span>
    </label>
  </section>;
}

function AccordionSection({
  title,
  value,
  icon,
  checked,
  docId,
  open,
  onChecked,
  onToggle,
  children,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  checked: boolean;
  docId: string;
  open: boolean;
  onChecked: (checked: boolean) => void;
  onToggle: () => void;
  children: ReactNode;
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  return <section className={cx(
    'overflow-hidden rounded-lg border bg-white transition',
    open ? 'border-zinc-300' : 'border-zinc-200/80 hover:border-zinc-300',
  )}>
    <div className="grid grid-cols-[18px_24px_minmax(72px,1fr)_auto_16px] items-center gap-1.5 px-2.5 py-2.5">
      <input
        className="h-4 w-4 accent-zinc-950"
        type="checkbox"
        checked={checked}
        onChange={event => onChecked(event.target.checked)}
        aria-label={`${title} aktivieren`}
      />
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-50 text-zinc-600">{icon}</span>
      <button
        type="button"
        className="group flex min-w-0 items-center gap-1 text-left"
        aria-expanded={open}
        aria-label={open ? `${title} einklappen` : `${title} ausklappen`}
        onClick={onToggle}
      >
        <span className="text-sm font-semibold text-zinc-950">{title}</span>
        <InfoLink id={docId} label={`${title} im Wiki öffnen`}/>
      </button>
      <span className="whitespace-nowrap text-right text-sm font-semibold tabular-nums text-zinc-950">{value}</span>
      <Chevron aria-hidden="true" className="h-4 w-4 text-zinc-400"/>
    </div>
    {open && <div className="border-t border-zinc-100 px-2 py-1">{children}</div>}
  </section>;
}

function InfoLink({ id, label }: { id: string; label: string }) {
  return <a
    href={dataWikiUrl(id)}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-400 opacity-0 transition hover:bg-zinc-100 hover:text-zinc-950 group-hover:opacity-100 focus:opacity-100"
    onClick={event => event.stopPropagation()}
  >
    <Info className="h-3 w-3"/>
  </a>;
}

function ScenarioRadioItem({ name, label, meta, checked, onSelect }: { name: string; label: string; meta: string; checked: boolean; onSelect: () => void }) {
  return <label className={cx(
    'flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 transition',
    checked ? 'bg-zinc-50' : 'hover:bg-zinc-50/80',
  )}>
    <input
      className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-950"
      type="radio"
      name={name}
      checked={checked}
      onChange={onSelect}
    />
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="truncate text-sm font-medium text-zinc-950">{label}</span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </label>;
}

function E100PkwControl({ data, scenario, expanded, onChecked, onMillionKm, onToggleExpand }: { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (checked: boolean) => void; onMillionKm: (millionKm: number) => void; onToggleExpand: () => void }) {
  const model = data['e100-pkw'];
  const millionKm = scenario.demand['e100-pkw-million-km'];
  return <SectorRow
    label="PKW Elektrifizierung"
    enabled={scenario.demand['e100-pkw']}
    value={millionKm}
    min={model.alreadyElectricMillionKm}
    max={model.maxTargetMillionKm}
    step={model.stepMillionKm}
    valueLabel="Pkw-km"
    valueUnit="Mio. km"
    electricTWh={e100PkwAdditionalTWh(millionKm, model)}
    detail={`${millionKm.toLocaleString('de-DE')} Mio. km · ${formatPercent(millionKm / model.referenceMillionKm * 100)} · ${model.summary}`}
    docId={datasetIds.e100Pkw}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onMillionKm}
    onToggleExpand={onToggleExpand}
  />;
}

function E100HeizControl({ data, scenario, expanded, onChecked, onTargetHeat, onToggleExpand }: { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (checked: boolean) => void; onTargetHeat: (heatTWh: number) => void; onToggleExpand: () => void }) {
  const model = data['e100-heiz'];
  const heatTWh = scenario.demand['e100-heiz-target-heat-twh'];
  return <SectorRow
    label="Haushalte Elektrifizierung"
    enabled={scenario.demand['e100-heiz']}
    value={heatTWh}
    min={model.alreadyElectricHeatTWh}
    max={model.maxTargetHeatTWh}
    step={model.stepHeatTWh}
    valueLabel="Raumwärme"
    valueUnit="TWh Wärme"
    electricTWh={e100HeizAdditionalElectricityTWh(heatTWh, model)}
    detail={`${heatTWh.toLocaleString('de-DE')} TWh Wärme · ${formatPercent(heatTWh / model.referenceHeatDemandTWh * 100)} · ${model.summary}`}
    docId={datasetIds.e100Heiz}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onTargetHeat}
    onToggleExpand={onToggleExpand}
  />;
}

type SectorRowProps = {
  label: string;
  enabled: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  valueUnit?: string;
  electricTWh: number;
  detail: string;
  docId: string;
  expanded: boolean;
  onChecked: (checked: boolean) => void;
  onValue: (value: number) => void;
  onToggleExpand: () => void;
};

function H2ImportRow({ value, onValue }: { value: number; onValue: (v: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const min = 0;
  const max = 500;
  const step = 5;
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return <div className={cx('group transition', expanded ? 'bg-zinc-50/80' : 'bg-white hover:bg-zinc-50/60')}>
    <div className="grid grid-cols-[18px_minmax(0,1fr)_64px_16px] items-center gap-1.5 px-2 py-2.5">
      <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-700">H₂</span>
      <button
        type="button"
        className="text-left text-xs font-medium leading-4 text-zinc-950"
        aria-expanded={expanded}
        onClick={() => setExpanded(e => !e)}
        title="H₂-Importmenge in TWh H₂/Jahr. Wird priority-basiert auf Sektoren mit niedrigstem η verteilt (Flug→Schiff→Chemie→Stahl) und reduziert deren Elektrolyse-Strom-Aufwand."
      >H₂-Import</button>
      <span className={cx('whitespace-nowrap text-right text-xs tabular-nums', value > 0 ? 'font-semibold text-zinc-950' : 'text-zinc-400')}>{value} TWh</span>
      <Chevron aria-hidden="true" className="h-3.5 w-3.5 text-zinc-400"/>
    </div>
    {expanded && <div className="grid gap-1.5 px-2 pb-3 pl-7">
      <input
        aria-label="H2-Import"
        className="w-full"
        style={{ ['--range-pct' as string]: `${pct}%` }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onValue(Number(event.target.value))}
      />
      <div className="flex items-baseline gap-1 text-[10px] leading-4 text-zinc-500">
        <EditableNumber value={value} min={min} max={max} step={step} onChange={onValue} title="H₂-Import in TWh H₂/Jahr"/>
        <span>TWh H₂/a</span>
      </div>
      <p className="text-[10px] leading-4 text-zinc-500">
        Importierter H₂ ersetzt heimischen Elektrolyse-Strom. Allokation priorisiert
        Sektoren mit niedrigem System-η: Flug (PtL η=0.38) → Schiff (e-MeOH 0.50) →
        Chemie (NH₃/MeOH 0.55) → Stahl-DRI (0.62). System-Wirkungsgrade nach
        DEA Technology Catalogue 2024, Fraunhofer ISE PtX-Atlas, Agora H2-Hochlauf.
        Importrate-Annahmen: BMWK H₂-Importstrategie 2024 sieht 50-70 % bis 2030,
        Ariadne/Agora 60-250 TWh in 2045-Szenarien.
        Überschüssiger Import (über den max-Bedarf hinaus) wird nicht weiter angerechnet.
      </p>
    </div>}
  </div>;
}

function SectorRow({ label, enabled, value, min, max, step, valueLabel, valueUnit, electricTWh, detail, docId, expanded, onChecked, onValue, onToggleExpand }: SectorRowProps) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return <div className={cx('group transition', expanded && enabled ? 'bg-zinc-50/80' : 'bg-white hover:bg-zinc-50/60')}>
    <div className="grid grid-cols-[18px_minmax(0,1fr)_64px_16px] items-center gap-1.5 px-2 py-2.5">
      <input
        className="h-4 w-4 accent-zinc-950"
        type="checkbox"
        checked={enabled}
        onChange={event => onChecked(event.target.checked)}
        aria-label={`${label} aktivieren`}
      />
      <button
        type="button"
        className="flex min-w-0 items-center gap-1 text-left text-xs font-medium leading-4 text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400"
        aria-expanded={expanded && enabled}
        aria-label={expanded && enabled ? `${label} einklappen` : `${label} ausklappen`}
        disabled={!enabled}
        onClick={onToggleExpand}
      >
        <span className="min-w-0 truncate">{label}</span>
        <InfoLink id={docId} label={`${label} im Wiki öffnen`}/>
      </button>
      <span className={cx('whitespace-nowrap text-right text-xs tabular-nums', enabled ? 'font-semibold text-zinc-950' : 'text-zinc-400')}>{twh(electricTWh)}</span>
      <Chevron aria-hidden="true" className={cx('h-3.5 w-3.5', enabled ? 'text-zinc-400' : 'text-zinc-300')}/>
    </div>
    {expanded && enabled && <div className="grid gap-1.5 px-2 pb-3 pl-7">
      <input
        aria-label={`${label}: ${valueLabel}`}
        className="w-full"
        style={{ ['--range-pct' as string]: `${pct}%` }}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onValue(Number(event.target.value))}
      />
      {valueUnit && <div className="flex items-baseline gap-1 text-[10px] leading-4 text-zinc-500">
        <EditableNumber value={value} min={min} max={max} step={step} onChange={onValue} title={`${valueLabel}: direkt eingeben (${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')} ${valueUnit})`}/>
        <span>{valueUnit}</span>
      </div>}
      <p className="text-[10px] leading-4 text-zinc-500">{detail}</p>
    </div>}
  </div>;
}

type SectorWrapperProps = { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (b: boolean) => void; onValue: (n: number) => void; onToggleExpand: () => void };

function E100LkwControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-lkw'];
  const target = scenario.demand['e100-lkw-target-bn-km'];
  return <SectorRow
    label="Lkw + Bus Elektrifizierung"
    enabled={scenario.demand['e100-lkw']}
    value={target}
    min={model.alreadyElectricBnKm}
    max={model.maxTargetBnKm}
    step={model.stepBnKm}
    valueLabel="Fahrleistung"
    valueUnit="Mrd. km"
    electricTWh={e100LkwAdditionalTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} Mrd. km · ${formatPercent(target / model.referenceBnKm * 100)} · ${model.summary}`}
    docId={datasetIds.e100Lkw}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100BahnControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-bahn'];
  const target = scenario.demand['e100-bahn-target-twh'];
  return <SectorRow
    label="Bahn Elektrifizierung"
    enabled={scenario.demand['e100-bahn']}
    value={target}
    min={0}
    max={model.maxTargetTWh}
    step={model.stepTWh}
    valueLabel="Zusatz-Bahnstrom"
    valueUnit="TWh"
    electricTWh={e100BahnAdditionalTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} TWh · historische 11 TWh · ${model.summary}`}
    docId={datasetIds.e100Bahn}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100SchiffControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-schiff'];
  const target = scenario.demand['e100-schiff-target-twh'];
  return <SectorRow
    label="Schiff Elektrifizierung"
    enabled={scenario.demand['e100-schiff']}
    value={target}
    min={model.alreadyElectricTWh}
    max={model.maxTargetTWh}
    step={model.stepTWh}
    valueLabel="Ziel-Strom"
    valueUnit="TWh"
    electricTWh={e100SchiffAdditionalTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} TWh · Binnen + Hochsee · ${model.summary}`}
    docId={datasetIds.e100Schiff}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100FlugControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-flug'];
  const target = scenario.demand['e100-flug-target-twh'];
  return <SectorRow
    label="Flug Elektrifizierung"
    enabled={scenario.demand['e100-flug']}
    value={target}
    min={0}
    max={model.maxTargetTWh}
    step={model.stepTWh}
    valueLabel="PtL-Strom"
    valueUnit="TWh"
    electricTWh={e100FlugAdditionalTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} TWh · e-Kerosin · ${model.summary}`}
    docId={datasetIds.e100Flug}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100GhdControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-ghd'];
  const target = scenario.demand['e100-ghd-target-heat-twh'];
  return <SectorRow
    label="GHD Elektrifizierung"
    enabled={scenario.demand['e100-ghd']}
    value={target}
    min={model.alreadyElectricHeatTWh}
    max={model.maxTargetHeatTWh}
    step={model.stepHeatTWh}
    valueLabel="GHD-Wärme"
    valueUnit="TWh Wärme"
    electricTWh={e100GhdAdditionalElectricityTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} TWh Wärme · ${formatPercent(target / model.referenceHeatDemandTWh * 100)} · ${model.summary}`}
    docId={datasetIds.e100Ghd}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100IndustrieWaermeControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-industrie-waerme'];
  const target = scenario.demand['e100-industrie-waerme-target-heat-twh'];
  return <SectorRow
    label="Prozesswärme Elektrifizierung"
    enabled={scenario.demand['e100-industrie-waerme']}
    value={target}
    min={model.alreadyElectricHeatTWh}
    max={model.maxTargetHeatTWh}
    step={model.stepHeatTWh}
    valueLabel="Prozesswärme"
    valueUnit="TWh Wärme"
    electricTWh={e100IndustrieAdditionalElectricityTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} TWh Wärme · ohne Stahl/Chemie · ${model.summary}`}
    docId={datasetIds.e100IndustrieWaerme}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100StahlControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-stahl'];
  const target = scenario.demand['e100-stahl-target-mio-ton'];
  return <SectorRow
    label="Stahl Elektrifizierung"
    enabled={scenario.demand['e100-stahl']}
    value={target}
    min={0}
    max={model.maxTargetMioTon}
    step={model.stepMioTon}
    valueLabel="Primärstahl"
    valueUnit="Mio. t"
    electricTWh={e100StahlAdditionalTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} Mio. t · ${formatPercent(target / model.primarySteelMioTon * 100)} · ${model.summary}`}
    docId={datasetIds.e100Stahl}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function E100ChemieControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-chemie'];
  const target = scenario.demand['e100-chemie-target-twh'];
  return <SectorRow
    label="Chemie Elektrifizierung"
    enabled={scenario.demand['e100-chemie']}
    value={target}
    min={model.alreadyElectricTWh}
    max={model.maxTargetTotalTWh}
    step={model.stepTWh}
    valueLabel="Zielstrom"
    valueUnit="TWh"
    electricTWh={e100ChemieAdditionalTWh(target, model)}
    detail={`${target.toLocaleString('de-DE')} TWh Gesamt · Status quo 55 TWh · ${model.summary}`}
    docId={datasetIds.e100Chemie}
    expanded={expanded}
    onChecked={onChecked}
    onValue={onValue}
    onToggleExpand={onToggleExpand}
  />;
}

function sumEnabled(entries: Array<[boolean, number]>) {
  return entries.reduce((sum, [enabled, value]) => sum + (enabled ? value : 0), 0);
}

function generationMeta(data: DataSet | null) {
  if (!data?.generationSumTWh) return '—';
  const generation = twh0(data.generationSumTWh);
  if (!data.importSumTWh) return generation;
  return `${generation} · +${fmt0.format(data.importSumTWh)} Import`;
}

function formatPercent(value: number) {
  return `${value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
