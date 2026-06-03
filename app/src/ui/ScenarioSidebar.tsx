import { memo, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowRightLeft,
  BatteryCharging,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Database,
  Edit3,
  Factory,
  Flame,
  Info,
  Menu,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';

import { supplyPillIds, supplyPillLabels, supplyPillDescriptions, supplyPillWikiIds, type SupplyPillId } from './supplyPresets';
import { ApiStatusDot } from './ApiStatusDot';
import { dataWikiUrl, datasetIds } from './dataLinks';
import { getPackage } from './dataCatalog';

const summaryFor = (id: string) => getPackage(id)?.method.summary ?? '';
import { fmt, fmt0, twh, twh0 } from './format';
import { MainTabs } from './MainTabs';
import { defaultScenario } from './scenarioPresets';
import { uiManifest } from './uiManifest';
import { cx, field, iconButton, iconTile, panelHeader, rowActive, rowHover, sidebarInset, sidebarWidthClass } from './ui';
import type { DataSet, ReferenceScale } from '../types/data';
import type { Scenario } from '../types/scenario';

export type PeriodPreset = '21d' | '90d' | 'year' | 'custom';
type LoadPresetState = Pick<Scenario, 'demand' | 'loadYear'>;
type LoadPillId = 'nur-2025' | 'nur-2017' | 'e100' | 'custom';

const e100DemandFlags = Object.entries(defaultScenario.demand)
  .filter(([key, value]) => key.startsWith('e100-') && typeof value === 'boolean')
  .map(([key]) => key as keyof Scenario['demand']);

const demandWithE100Flags = (enabled: boolean): Scenario['demand'] => ({
  ...defaultScenario.demand,
  'last-2025': true,
  ...Object.fromEntries(e100DemandFlags.map(key => [key, enabled])),
});

const historicalLoadPreset = (loadYear: 2025 | 2017): LoadPresetState => ({
  loadYear,
  demand: demandWithE100Flags(false),
});

const loadPresetStates: Record<Exclude<LoadPillId, 'custom'>, LoadPresetState> = {
  'nur-2025': historicalLoadPreset(2025),
  'nur-2017': historicalLoadPreset(2017),
  e100: {
    loadYear: 2025,
    demand: demandWithE100Flags(true),
  },
};

function sameRecord<T extends Record<string, unknown>>(a: T, b: T) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!Object.is(a[key], b[key])) return false;
  }
  return true;
}

function matchingLoadPreset(scenario: Scenario): LoadPillId {
  for (const [id, preset] of Object.entries(loadPresetStates) as Array<[Exclude<LoadPillId, 'custom'>, LoadPresetState]>) {
    if (scenario.loadYear === preset.loadYear && sameRecord(scenario.demand, preset.demand)) return id;
  }
  return 'custom';
}

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
  onRange: (start: string, end: string) => void;
  onHistoricalLoadChange: (checked: boolean) => void;
  onLoadPresetChange: (preset: LoadPresetState) => void;
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
  onGenerationChange: (field: keyof Scenario['generation'], value: number) => void;
  onStorageChange: (field: keyof Scenario['storage'], value: number) => void;
  onImportChange: (field: keyof Scenario['import'], value: number) => void;
  onExportChange: (field: keyof Scenario['export'], value: number) => void;
  supplyPreset: Scenario['supplyPreset'];
  onSupplyPresetChange: (preset: Scenario['supplyPreset']) => void;
};

export type SidebarSectorId = 'verkehr' | 'waerme' | 'industrie';
export type SidebarOpenSectors = Record<SidebarSectorId, boolean>;
export type SidebarExpandedRow = string | null;

const e100PkwAdditionalTWh = (targetMillionKm: number, model: DataSet['e100-pkw']) =>
  Math.max(0, targetMillionKm - model.alreadyElectricMillionKm) * model.kwhPer100Km / 100_000;
const e100LkwAdditionalTWh = (targetBnKm: number, model: DataSet['e100-lkw']) =>
  Math.max(0, targetBnKm - model.alreadyElectricBnKm) * model.kwhPerKm;
const e100BahnAdditionalTWh = (targetTWh: number, _model: DataSet['e100-bahn']) => Math.max(0, targetTWh);
const e100SchiffAdditionalTWh = (targetTWh: number, model: DataSet['e100-schiff']) =>
  Math.max(0, targetTWh - model.alreadyElectricTWh);
const e100FlugAdditionalTWh = (targetTWh: number, model: DataSet['e100-flug']) =>
  Math.max(0, targetTWh - model.alreadyElectricTWh);
const e100HeizAdditionalElectricityTWh = (targetHeatTWh: number, model: DataSet['e100-heiz']) =>
  Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh) / model.seasonalCop;
const e100GhdAdditionalElectricityTWh = (targetHeatTWh: number, model: DataSet['e100-ghd']) =>
  Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh) / model.seasonalCop;
const e100IndustrieAdditionalElectricityTWh = (targetHeatTWh: number, model: DataSet['e100-industrie-waerme']) =>
  Math.max(0, targetHeatTWh - model.alreadyElectricHeatTWh) * model.electricityPerHeat;
const e100StahlAdditionalTWh = (targetMioTon: number, model: DataSet['e100-stahl']) =>
  Math.max(0, Math.max(0, targetMioTon) * model.mwhPerTon - (model.alreadyElectricTWh ?? 0));
const e100ChemieAdditionalTWh = (targetTotalTWh: number, model: DataSet['e100-chemie']) =>
  Math.max(0, targetTotalTWh - model.alreadyElectricTWh);

export const ScenarioSidebar = memo(function ScenarioSidebar({
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
  onRange,
  onHistoricalLoadChange,
  onLoadPresetChange,
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
  onGenerationChange,
  onStorageChange,
  onImportChange,
  onExportChange,
  supplyPreset,
  onSupplyPresetChange,
}: ScenarioSidebarProps) {
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
      'fixed inset-0 z-50 w-screen max-w-none overflow-hidden bg-white dark:bg-zinc-950 lg:bottom-0 lg:left-0 lg:top-0 lg:z-20 lg:bg-transparent',
      sidebarWidthClass,
    )}
  >
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden bg-zinc-100/40 [scrollbar-color:#d4d4d8_transparent] [scrollbar-width:thin] dark:bg-zinc-950 dark:[scrollbar-color:#3f3f46_transparent] lg:border-r lg:border-zinc-200 lg:dark:border-zinc-800">
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
              <h1 className="min-w-0 text-2xl font-semibold leading-none text-zinc-950 dark:text-zinc-50">netzprobe.de</h1>
              <ApiStatusDot/>
            </div>
          </div>
          <MainTabs active="simulation"/>
        </div>
        <div className="mt-[7px] border-t border-zinc-200 px-1.5 pt-[7px] dark:border-zinc-800">
          {actionBar}
        </div>
      </section>
      <div className={cx('grid gap-6 py-5', sidebarInset)}>

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
          onRange={onRange}
        />

        <LoadConfiguration
          data={data}
          scenario={scenario}
          onSupplyPresetChange={onSupplyPresetChange}
          onHistoricalLoadChange={onHistoricalLoadChange}
          onLoadPresetChange={onLoadPresetChange}
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

        <AussenhandelSection
          data={data}
          scenario={scenario}
          onImportChange={onImportChange}
          onExportChange={onExportChange}
        />

        <ModelSection/>
      </div>
    </div>
  </aside>;
});

type GenerationFieldKey = keyof Scenario['generation'];

type GenerationFieldSpec = {
  key: GenerationFieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  baseline?: number;
  co2eGperKWh?: number;
  referenceScale?: ReferenceScale;
};

type GenerationGroup = {
  id: 'erneuerbar' | 'kernkraft' | 'konventionell';
  title: string;
  fields: GenerationFieldSpec[];
  summary: (scenario: Scenario) => string;
};

function formatCapacitySummary(value: number, baseline: number): string {
  const multiplier = formatSummaryMultiplier(value, baseline);
  return multiplier ? `${fmt0.format(value)} GW · ${multiplier}` : `${fmt0.format(value)} GW`;
}

function formatSummaryMultiplier(value: number, baseline: number | undefined): string | null {
  if (!baseline || baseline <= 0) return null;
  const ratio = value / baseline;
  if (!Number.isFinite(ratio) || Math.abs(ratio - 1) < 0.005) return null;
  if (ratio < 0.05) return '0×';
  if (ratio < 0.995) return `${ratio.toFixed(2)}×`;
  if (ratio < 9.95) return `${ratio.toFixed(1)}×`;
  return `${Math.round(ratio)}×`;
}

function generationGroups(erz: DataSet['erzeugungs-modell']): GenerationGroup[] {
  const h = uiManifest.historisch2025;
  const renewableBaseline = h.pvInstalledGW + h.windOnInstalledGW + h.windOffInstalledGW + h.biomasseInstalledGW + h.laufwasserInstalledGW;
  const conventionalBaseline = h.gasInstalledGW + h.kohleInstalledGW;
  return [
    { id: 'erneuerbar', title: 'Erneuerbar', fields: [
      { key: 'pvInstalledGW',         label: 'PV',            unit: 'GW',  min: erz.sources.pv.installedGW.min,         max: erz.sources.pv.installedGW.max,         step: erz.sources.pv.installedGW.step,         baseline: h.pvInstalledGW,         co2eGperKWh: erz.sources.pv.emissions.co2eGperKWh,         referenceScale: erz.sources.pv.referenceScales?.power,  },
      { key: 'windOnInstalledGW',     label: 'Wind Onshore',  unit: 'GW',  min: erz.sources.windOn.installedGW.min,     max: erz.sources.windOn.installedGW.max,     step: erz.sources.windOn.installedGW.step,     baseline: h.windOnInstalledGW,     co2eGperKWh: erz.sources.windOn.emissions.co2eGperKWh,     referenceScale: erz.sources.windOn.referenceScales?.power,  },
      { key: 'windOffInstalledGW',    label: 'Wind Offshore', unit: 'GW',  min: erz.sources.windOff.installedGW.min,    max: erz.sources.windOff.installedGW.max,    step: erz.sources.windOff.installedGW.step,    baseline: h.windOffInstalledGW,    co2eGperKWh: erz.sources.windOff.emissions.co2eGperKWh,    referenceScale: erz.sources.windOff.referenceScales?.power,  },
      { key: 'biomasseInstalledGW',   label: 'Biomasse',      unit: 'GW',  min: erz.sources.biomasse.installedGW.min,   max: erz.sources.biomasse.installedGW.max,   step: erz.sources.biomasse.installedGW.step,   baseline: h.biomasseInstalledGW,   co2eGperKWh: erz.sources.biomasse.emissions.co2eGperKWh,   referenceScale: erz.sources.biomasse.referenceScales?.power,  },
      { key: 'laufwasserInstalledGW', label: 'Laufwasser',    unit: 'GW',  min: erz.sources.laufwasser.installedGW.min, max: erz.sources.laufwasser.installedGW.max, step: erz.sources.laufwasser.installedGW.step, baseline: h.laufwasserInstalledGW, co2eGperKWh: erz.sources.laufwasser.emissions.co2eGperKWh, referenceScale: erz.sources.laufwasser.referenceScales?.power,  },
    ], summary: (s) => formatCapacitySummary(s.generation.pvInstalledGW + s.generation.windOnInstalledGW + s.generation.windOffInstalledGW + s.generation.biomasseInstalledGW + s.generation.laufwasserInstalledGW, renewableBaseline) },
    { id: 'kernkraft', title: 'Kernkraft', fields: [
      { key: 'kernkraftInstalledGW', label: 'Kernkraft', unit: 'GW', min: erz.sources.kernkraft.installedGW.min, max: erz.sources.kernkraft.installedGW.max, step: erz.sources.kernkraft.installedGW.step, baseline: h.kernkraftInstalledGW, co2eGperKWh: erz.sources.kernkraft.emissions.co2eGperKWh, referenceScale: erz.sources.kernkraft.referenceScales?.power,  },
    ], summary: (s) => formatCapacitySummary(s.generation.kernkraftInstalledGW, h.kernkraftInstalledGW) },
    { id: 'konventionell', title: 'Konventionell', fields: [
      { key: 'gasInstalledGW',   label: 'Gas',   unit: 'GW', min: erz.sources.gas.installedGW.min,   max: erz.sources.gas.installedGW.max,   step: erz.sources.gas.installedGW.step,   baseline: h.gasInstalledGW,   co2eGperKWh: erz.sources.gas.emissions.co2eGperKWh,   referenceScale: erz.sources.gas.referenceScales?.power,  },
      { key: 'kohleInstalledGW', label: 'Kohle', unit: 'GW', min: erz.sources.kohle.installedGW.min, max: erz.sources.kohle.installedGW.max, step: erz.sources.kohle.installedGW.step, baseline: h.kohleInstalledGW, co2eGperKWh: erz.sources.kohle.emissions.co2eGperKWh, referenceScale: erz.sources.kohle.referenceScales?.power,  },
    ], summary: (s) => formatCapacitySummary(s.generation.gasInstalledGW + s.generation.kohleInstalledGW, conventionalBaseline) },
  ];
}

type ImportFieldKey = keyof Scenario['import'];
type ExportFieldKey = keyof Scenario['export'];

type AussenhandelGroup = {
  id: 'aussenhandel-strom' | 'aussenhandel-h2';
  title: string;
  docId: string;
  summary: (scenario: Scenario) => string;
  importFields: Array<{ key: ImportFieldKey; label: string; unit: string; min: number; max: number; step: number; baseline?: number; referenceScale?: ReferenceScale }>;
  exportFields: Array<{ key: ExportFieldKey; label: string; unit: string; min: number; max: number; step: number; baseline?: number; referenceScale?: ReferenceScale }>;
};

function aussenhandelGroups(ah: DataSet['aussenhandel-modell']): AussenhandelGroup[] {
  return [
    {
      id: 'aussenhandel-strom',
      title: 'Strom · Import & Export',
      docId: datasetIds.aussenhandelStrom,
      summary: (s) => `${fmt0.format(s.import.stromGW)} / ${fmt0.format(s.export.stromGW)} GW`,
      importFields: [
        { key: 'stromGW', label: 'Import-Cap', unit: 'GW', min: ah.strom.import.stromGW.min, max: ah.strom.import.stromGW.max, step: ah.strom.import.stromGW.step, baseline: uiManifest.historisch2025.importStromGW, referenceScale: ah.strom.referenceScales?.power },
      ],
      exportFields: [
        { key: 'stromGW', label: 'Export-Cap', unit: 'GW', min: ah.strom.export.stromGW.min, max: ah.strom.export.stromGW.max, step: ah.strom.export.stromGW.step, baseline: uiManifest.historisch2025.exportStromGW, referenceScale: ah.strom.referenceScales?.power },
      ],
    },
    {
      id: 'aussenhandel-h2',
      title: 'H₂ · Import',
      docId: datasetIds.aussenhandelH2,
      summary: (s) => `${fmt0.format(s.import.h2TWh)} TWh/a`,
      importFields: [
        { key: 'h2TWh', label: 'H₂-Import', unit: 'TWh/a', min: ah.h2.import.h2TWh.min, max: ah.h2.import.h2TWh.max, step: ah.h2.import.h2TWh.step, baseline: uiManifest.historisch2025.importH2TWh, referenceScale: ah.h2.referenceScales?.activity },
      ],
      exportFields: [],
    },
  ];
}

type StorageFieldKey = keyof Scenario['storage'];
type StorageFieldSpec = { key: StorageFieldKey; label: string; unit: string; min: number; max: number; step: number; baseline?: number; referenceScale?: ReferenceScale };

type StorageGroup = {
  id: 'batterie' | 'pumpspeicher' | 'h2';
  title: string;
  subtitle: string;
  fields: StorageFieldSpec[];
  summary: (scenario: Scenario) => string;
};

function storageGroups(sp: DataSet['speicher-modell']): StorageGroup[] {
  return [
    { id: 'batterie', title: 'Batterie', subtitle: 'kurzfristig', fields: [
      { key: 'batteriePowerGW',   label: 'Leistung', unit: 'GW',  min: sp.storages.batterie.powerGW.min,   max: sp.storages.batterie.powerGW.max,   step: sp.storages.batterie.powerGW.step,   baseline: uiManifest.historisch2025.batteriePowerGW,   referenceScale: sp.storages.batterie.referenceScales?.power },
      { key: 'batterieEnergyGWh', label: 'Energie',  unit: 'GWh', min: sp.storages.batterie.energyGWh.min, max: sp.storages.batterie.energyGWh.max, step: sp.storages.batterie.energyGWh.step, baseline: uiManifest.historisch2025.batterieEnergyGWh, referenceScale: sp.storages.batterie.referenceScales?.energy },
    ], summary: (s) => `${fmt0.format(s.storage.batteriePowerGW)} GW · ${fmt0.format(s.storage.batterieEnergyGWh)} GWh` },
    { id: 'pumpspeicher', title: 'Pumpspeicher', subtitle: 'mittelfristig', fields: [
      { key: 'pumpspeicherPowerGW',   label: 'Leistung', unit: 'GW',  min: sp.storages.pumpspeicher.powerGW.min,   max: sp.storages.pumpspeicher.powerGW.max,   step: sp.storages.pumpspeicher.powerGW.step,   baseline: uiManifest.historisch2025.pumpspeicherPowerGW,   referenceScale: sp.storages.pumpspeicher.referenceScales?.power },
      { key: 'pumpspeicherEnergyGWh', label: 'Energie',  unit: 'GWh', min: sp.storages.pumpspeicher.energyGWh.min, max: sp.storages.pumpspeicher.energyGWh.max, step: sp.storages.pumpspeicher.energyGWh.step, baseline: uiManifest.historisch2025.pumpspeicherEnergyGWh, referenceScale: sp.storages.pumpspeicher.referenceScales?.energy },
    ], summary: (s) => `${s.storage.pumpspeicherPowerGW.toLocaleString('de-DE')} GW · ${fmt0.format(s.storage.pumpspeicherEnergyGWh)} GWh` },
    { id: 'h2', title: 'Wasserstoff', subtitle: 'saisonal', fields: [
      { key: 'h2ChargePowerGW',    label: 'Elektrolyse',    unit: 'GW',  min: sp.storages.h2.chargePowerGW.min,    max: sp.storages.h2.chargePowerGW.max,    step: sp.storages.h2.chargePowerGW.step,    baseline: uiManifest.historisch2025.h2ChargePowerGW,    referenceScale: sp.storages.h2.referenceScales?.power },
      { key: 'h2DischargePowerGW', label: 'Rückverstromung',unit: 'GW',  min: sp.storages.h2.dischargePowerGW.min, max: sp.storages.h2.dischargePowerGW.max, step: sp.storages.h2.dischargePowerGW.step, baseline: uiManifest.historisch2025.h2DischargePowerGW, referenceScale: sp.storages.h2.referenceScales?.power },
      { key: 'h2EnergyGWh',        label: 'Energie',        unit: 'GWh', min: sp.storages.h2.energyGWh.min,        max: sp.storages.h2.energyGWh.max,        step: sp.storages.h2.energyGWh.step,        baseline: uiManifest.historisch2025.h2EnergyGWh,        referenceScale: sp.storages.h2.referenceScales?.energy },
    ], summary: (s) => `${fmt0.format(s.storage.h2ChargePowerGW)} / ${fmt0.format(s.storage.h2DischargePowerGW)} GW · ${fmt0.format(s.storage.h2EnergyGWh)} GWh` },
  ];
}

function PresetPillRow<TId extends string>({
  presets, activeId, onSelect,
}: {
  presets: ReadonlyArray<PresetOption<TId>>;
  activeId: TId | null;
  onSelect: (id: TId) => void;
}) {
  return <>
    {presets.map(p => <span key={p.id} className="group relative inline-flex items-center">
      <button
        type="button"
        title={p.description}
        onClick={() => onSelect(p.id)}
        className={cx(
          'rounded-full px-3 py-1 text-xs font-medium transition',
          p.id === activeId ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50',
        )}
      >{p.label}</button>
      {p.docId && <span className="absolute -right-4 top-1/2 -translate-y-1/2"><InfoLink id={p.docId} label={`${p.label} im Wiki öffnen`}/></span>}
    </span>)}
  </>;
}

type PresetOption<TId extends string> = { id: TId; label: string; description?: string; docId?: string };
type PresetOptionGroup<TId extends string> = { title: string; presets: ReadonlyArray<PresetOption<TId>> };

function PresetDropdownPill<TId extends string>({
  label, presets = [], groups, activeId, active, docId, onSelect,
}: {
  label: string;
  presets?: ReadonlyArray<PresetOption<TId>>;
  groups?: ReadonlyArray<PresetOptionGroup<TId>>;
  activeId: TId | null;
  active?: boolean;
  docId?: string;
  onSelect: (id: TId) => void;
}) {
  const optionGroups = groups ?? [{ title: '', presets }];
  const allPresets = optionGroups.flatMap(group => group.presets);
  const activeState = active ?? allPresets.some(p => p.id === activeId);
  return <span className="group relative inline-flex items-center">
    <details className="relative inline-block">
      <summary className={cx(
        'flex h-[26px] w-fit cursor-pointer list-none items-center rounded-full border px-3 text-xs font-medium transition marker:hidden [&::-webkit-details-marker]:hidden',
        activeState ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950' : 'border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-50',
      )}>
        <span>{label}</span>
        <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true"/>
      </summary>
      <div className="absolute left-0 z-40 mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        {optionGroups.map(group => <div key={group.title || 'options'}>
          {group.title && <div className="px-2 pb-0.5 pt-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 first:pt-0.5">{group.title}</div>}
          {group.presets.map(p => <div key={p.id} className={cx('rounded-md', p.id === activeId && 'bg-zinc-50 dark:bg-zinc-800')}>
            <button
              type="button"
              title={p.description}
              className={cx(
                'w-full min-w-0 rounded-md px-2 py-1.5 text-left text-xs font-medium transition',
                p.id === activeId ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50',
              )}
              onClick={event => {
                onSelect(p.id);
                event.currentTarget.closest('details')?.removeAttribute('open');
              }}
            >{p.label}</button>
          </div>)}
        </div>)}
      </div>
    </details>
    {docId && <span className="absolute -right-4 top-1/2 -translate-y-1/2"><InfoLink id={docId} label={`${label} im Wiki öffnen`}/></span>}
  </span>;
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
    docId: supplyPillWikiIds[id],
  }));
  const activeId: SupplyPillId = supplyPreset;
  const activeWikiId = supplyPillWikiIds[activeId];
  const visibleSupplyOrder: SupplyPillId[] = ['historical-2025', '100ee-noimport', '100ee-import', '100kern-lastfolgend', 'custom'];
  const visibleSupplyPillIds = new Set<SupplyPillId>(visibleSupplyOrder);
  const visibleSupplyPills = visibleSupplyOrder
    .map(id => pillPresets.find(p => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);
  const supplyDropdownGroups: ReadonlyArray<PresetOptionGroup<SupplyPillId>> = [
    { title: 'Fix', presets: pillPresets.filter(p => p.id === 'historical-2025' || p.id === 'historical-2017' || p.id === 'custom') },
    { title: 'Lastfolgend', presets: pillPresets.filter(p => p.id === '100ee-noimport' || p.id === '100ee-import' || p.id === '100kern-lastfolgend' || p.id === '2025-skaliert') },
  ];

  const generationTotalGW = scenario.generation.pvInstalledGW
    + scenario.generation.windOnInstalledGW
    + scenario.generation.windOffInstalledGW
    + scenario.generation.biomasseInstalledGW
    + scenario.generation.laufwasserInstalledGW
    + scenario.generation.kernkraftInstalledGW
    + scenario.generation.gasInstalledGW
    + scenario.generation.kohleInstalledGW;
  return <SidebarCard
    title="Erzeugung"
    icon={<Zap className="h-4 w-4"/>}
    docId={activeWikiId}
    meta={`${fmt0.format(generationTotalGW)} GW`}
    collapsible
    defaultOpen
  >
    <div className="flex flex-wrap gap-1.5">
      <PresetPillRow presets={visibleSupplyPills} activeId={activeId} onSelect={onSupplyPresetChange}/>
      <PresetDropdownPill label="Mehr" groups={supplyDropdownGroups} activeId={activeId} active={!visibleSupplyPillIds.has(activeId)} onSelect={onSupplyPresetChange}/>
    </div>

    <div className="mt-2 grid gap-2">
      <SupplyGroupAccordions
        data={data}
        scenario={scenario}
        onGenerationChange={onGenerationChange}
        onStorageChange={onStorageChange}
      />
    </div>
  </SidebarCard>;
}

function AussenhandelSection({
  data,
  scenario,
  onImportChange,
  onExportChange,
}: {
  data: DataSet | null;
  scenario: Scenario;
  onImportChange: (field: ImportFieldKey, value: number) => void;
  onExportChange: (field: ExportFieldKey, value: number) => void;
}) {
  if (!data) return null;
  const groups = aussenhandelGroups(data['aussenhandel-modell']);
  const [open, setOpen] = useState<Record<string, boolean>>({
    'aussenhandel-strom': false,
    'aussenhandel-h2': false,
  });
  const toggle = (id: string) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  const [saved, setSaved] = useState<Partial<Record<AussenhandelGroup['id'], { import: Partial<Record<ImportFieldKey, number>>; export: Partial<Record<ExportFieldKey, number>> }>>>({});
  const isEnabled = (group: AussenhandelGroup) => group.importFields.some(field => scenario.import[field.key] > 0)
    || group.exportFields.some(field => scenario.export[field.key] > 0);
  const setEnabled = (group: AussenhandelGroup, checked: boolean) => {
    if (checked) {
      const snapshot = saved[group.id];
      for (const field of group.importFields) {
        const fallback = field.baseline && field.baseline > field.min ? field.baseline : field.max;
        onImportChange(field.key, snapshot?.import[field.key] ?? fallback);
      }
      for (const field of group.exportFields) {
        const fallback = field.baseline && field.baseline > field.min ? field.baseline : field.max;
        onExportChange(field.key, snapshot?.export[field.key] ?? fallback);
      }
    } else {
      const snapshot: { import: Partial<Record<ImportFieldKey, number>>; export: Partial<Record<ExportFieldKey, number>> } = { import: {}, export: {} };
      for (const field of group.importFields) {
        snapshot.import[field.key] = scenario.import[field.key];
        onImportChange(field.key, 0);
      }
      for (const field of group.exportFields) {
        snapshot.export[field.key] = scenario.export[field.key];
        onExportChange(field.key, 0);
      }
      setSaved(prev => ({ ...prev, [group.id]: snapshot }));
    }
  };

  return <SidebarCard
    title="Außenhandel"
    icon={<ArrowRightLeft className="h-4 w-4"/>}
    docId={datasetIds.aussenhandelStrom}
    meta={`${fmt0.format(scenario.import.stromGW)}/${fmt0.format(scenario.export.stromGW)} GW · ${fmt0.format(scenario.import.h2TWh)} TWh H₂`}
    collapsible
  >
    <div className="grid gap-1.5">
      {groups.map(group => <GroupAccordion
        key={group.id}
        title={group.title}
        summary={group.summary(scenario)}
        icon={<ArrowRightLeft className="h-3.5 w-3.5"/>}
        open={open[group.id] ?? false}
        onToggle={() => toggle(group.id)}
        docId={group.docId}
        checked={isEnabled(group)}
        onChecked={checked => setEnabled(group, checked)}
      >
        {group.importFields.map(field => <CapacitySliderRow
          key={`imp-${field.key}`}
          label={field.label}
          unit={field.unit}
          value={scenario.import[field.key]}
          min={field.min}
          max={field.max}
          step={field.step}
          baseline={field.baseline}
          referenceScale={field.referenceScale}
          onValue={value => onImportChange(field.key, value)}
        />)}
        {group.exportFields.map(field => <CapacitySliderRow
          key={`exp-${field.key}`}
          label={field.label}
          unit={field.unit}
          value={scenario.export[field.key]}
          min={field.min}
          max={field.max}
          step={field.step}
          baseline={field.baseline}
          referenceScale={field.referenceScale}
          onValue={value => onExportChange(field.key, value)}
        />)}
      </GroupAccordion>)}
    </div>
  </SidebarCard>;
}

type SupplyGroupId = 'erneuerbar' | 'kernkraft' | 'konventionell' | 'batterie' | 'pumpspeicher' | 'h2';

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
    erneuerbar: false, kernkraft: false, konventionell: false,
    batterie: false, pumpspeicher: false, h2: false,
  });
  const toggle = (id: SupplyGroupId) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  // Snapshot der zuletzt aktiven Werte je Gruppe, um beim Wiedereinschalten zu
  // restaurieren statt auf 2025-Baseline zurückzufallen.
  const [savedGen, setSavedGen] = useState<Partial<Record<SupplyGroupId, Record<string, number>>>>({});
  const [savedSto, setSavedSto] = useState<Partial<Record<SupplyGroupId, Record<string, number>>>>({});

  const genGroups = generationGroups(data['erzeugungs-modell']);
  const stoGroups = storageGroups(data['speicher-modell']);

  // Aktivierungs-Default fuer einen Slider, wenn ein vorheriger User-Wert
  // gespeichert ist nutzen wir den; sonst die historische Baseline; sonst
  // 2% des Max-Bereichs (snapped) als sichtbarer Start — sonst bleibt der
  // Slider bei 0 stehen (z. B. Kernkraft Baseline 0 GW) und der Checkbox
  // -Klick erzeugt keinen sichtbaren Effekt.
  const activationDefault = (saved: number | undefined, baseline: number | undefined, max: number, step: number): number => {
    if (typeof saved === 'number' && saved > 0) return saved;
    if (typeof baseline === 'number' && baseline > 0) return baseline;
    const target = max * 0.02;
    const snapped = Math.round(target / step) * step;
    return Math.max(step, snapped);
  };

  const isGenEnabled = (group: GenerationGroup) => group.fields.some(f => scenario.generation[f.key] > 0);
  const setGenEnabled = (group: GenerationGroup, checked: boolean) => {
    if (checked) {
      const saved = savedGen[group.id];
      for (const f of group.fields) {
        onGenerationChange(f.key, activationDefault(saved?.[f.key], f.baseline, f.max, f.step));
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
        onStorageChange(f.key, activationDefault(saved?.[f.key], f.baseline, f.max, f.step));
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
        co2eGperKWh={field.co2eGperKWh}
        referenceScale={field.referenceScale}
        onValue={value => onGenerationChange(field.key, value)}
      />)}
    </GroupAccordion>)}
    {stoGroups.map(group => <GroupAccordion
      key={group.id}
      title={group.title}
      subtitle={group.subtitle}
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
        referenceScale={field.referenceScale}
        onValue={value => onStorageChange(field.key, value)}
      />)}
    </GroupAccordion>)}
  </div>;
}

function GroupAccordion({
  title,
  subtitle,
  summary,
  icon,
  open,
  onToggle,
  checked,
  onChecked,
  docId,
  children,
}: {
  title: string;
  subtitle?: string;
  summary: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  checked?: boolean;
  onChecked?: (checked: boolean) => void;
  docId?: string;
  children: ReactNode;
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  const hasCheckbox = onChecked !== undefined;
  return <section className={cx(
    'overflow-hidden rounded-md transition',
    open ? 'border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70' : 'border border-zinc-200/70 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/70',
  )}>
    <div
      className={cx(
      'grid w-full cursor-pointer items-center gap-1.5 px-2.5 py-2',
      hasCheckbox ? 'grid-cols-[18px_24px_minmax(72px,1fr)_auto_16px]' : 'grid-cols-[24px_minmax(72px,1fr)_auto_16px]',
      )}
      onClick={onToggle}
    >
      {hasCheckbox && <input
        className="h-4 w-4 accent-zinc-950 dark:accent-zinc-50"
        type="checkbox"
        checked={!!checked}
        onClick={event => event.stopPropagation()}
        onChange={event => onChecked!(event.target.checked)}
        aria-label={`${title} aktivieren`}
      />}
      <span className={cx(iconTile, 'h-6 w-6 rounded-md bg-transparent')}>{icon}</span>
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          className="text-left text-sm font-semibold text-zinc-950 dark:text-zinc-50"
          aria-expanded={open}
          aria-label={open ? `${title} einklappen` : `${title} ausklappen`}
        >{title}</button>
        {docId && <InfoLink id={docId} label={`${title} im Wiki öffnen`}/>}
      </div>
      <button
        type="button"
        className="whitespace-nowrap text-right text-xs font-medium tabular-nums text-zinc-500"
      >{summary}</button>
      <button
        type="button"
        aria-label={open ? `${title} einklappen` : `${title} ausklappen`}
      >
        <Chevron aria-hidden="true" className="h-4 w-4 text-zinc-400"/>
      </button>
    </div>
    {open && <div className="border-t border-zinc-100 px-2 py-1 dark:border-zinc-700">
      {subtitle && <div className="px-1 pb-1 pt-0.5 text-[11px] leading-4 text-zinc-400">{subtitle}</div>}
      {children}
    </div>}
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

function formatReferenceScale(value: number, referenceScale: ReferenceScale | undefined): string | null {
  if (!referenceScale || value <= 0 || referenceScale.value <= 0) return null;
  return `≈ ${fmt.format(value / referenceScale.value)} ${referenceScale.label}`;
}

function formatEmissionFactor(co2eGperKWh: number | undefined): string | null {
  if (co2eGperKWh === undefined) return null;
  return `CO₂e: ${fmt0.format(co2eGperKWh)} g/kWh`;
}

function CapacitySliderRow({ label, unit, value, min, max, step, baseline, co2eGperKWh, referenceScale, onValue }: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  baseline?: number;
  co2eGperKWh?: number;
  referenceScale?: ReferenceScale;
  onValue: (value: number) => void;
}) {
  // Lokaler Drag-State: waehrend Pointer-Drag wird nur der lokale Wert
  // aktualisiert, der teure onValue-Callback (Simulation) feuert erst beim
  // Loslassen. Keyboard-Eingaben (Pfeiltasten) commiten direkt, weil dort kein
  // Drag-Vorgang stattfindet.
  const [dragValue, setDragValue] = useState<number | null>(null);
  const display = dragValue ?? value;
  const pct = max > min ? ((display - min) / (max - min)) * 100 : 0;
  const multiplier = formatMultiplier(display, baseline);
  const emissionText = formatEmissionFactor(co2eGperKWh);
  const referenceText = formatReferenceScale(display, referenceScale);
  const detailText = [emissionText, referenceText].filter(Boolean).join(' · ');
  const commit = (raw: number) => {
    setDragValue(null);
    onValue(raw);
  };
  return <div className="grid gap-1 px-1 py-1.5">
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs font-medium text-zinc-950 dark:text-zinc-50">{label}</span>
      <span className="flex items-baseline gap-1 whitespace-nowrap text-xs tabular-nums text-zinc-500">
        <EditableNumber value={display} min={min} max={max} step={step} onChange={onValue} title={`${label} direkt eingeben (${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')} ${unit})`}/>
        <span>{unit}</span>
        {multiplier && <span className="ml-1 text-zinc-400">({multiplier})</span>}
      </span>
    </div>
    {detailText && <div className="px-0.5 text-xs leading-5 text-zinc-500">{detailText}</div>}
    <input
      aria-label={label}
      className="w-full"
      style={{ ['--range-pct' as string]: `${pct}%` }}
      type="range"
      min={min}
      max={max}
      step={step}
      value={display}
      onChange={event => {
        const raw = Number(event.target.value);
        if (dragValue !== null) setDragValue(raw);
        else onValue(raw);
      }}
      onPointerDown={() => setDragValue(value)}
      onPointerUp={event => commit(Number(event.currentTarget.value))}
      onPointerCancel={() => setDragValue(null)}
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
      className="w-16 rounded border border-zinc-300 bg-white px-1 text-right tabular-nums focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-50/10"
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
    title={title ?? 'Wert direkt eingeben'}
    aria-label={title ?? 'Wert direkt eingeben'}
    className="group/number inline-flex cursor-text items-center gap-0.5 rounded-sm px-0.5 tabular-nums text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:bg-zinc-900 dark:focus-visible:ring-zinc-50/10"
    onClick={() => { setDraft(String(value)); setEditing(true); }}
  >
    <span>{value.toLocaleString('de-DE')}</span>
    <Edit3 aria-hidden="true" className="h-2.5 w-2.5 text-zinc-300 transition group-hover/number:text-zinc-500"/>
  </button>;
}

type LoadConfigurationProps = {
  data: DataSet | null;
  scenario: Scenario;
  onSupplyPresetChange: (preset: Scenario['supplyPreset']) => void;
  onHistoricalLoadChange: (checked: boolean) => void;
  onLoadPresetChange: (preset: LoadPresetState) => void;
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
  openSectors: SidebarOpenSectors;
  expandedRow: SidebarExpandedRow;
  onOpenSectorsChange: (openSectors: SidebarOpenSectors) => void;
  onExpandedRowChange: (row: SidebarExpandedRow) => void;
};

function LoadConfiguration(props: LoadConfigurationProps) {
  const { data, scenario, onHistoricalLoadChange, onLoadPresetChange, openSectors, expandedRow, onOpenSectorsChange, onExpandedRowChange } = props;
  const is2017 = scenario.loadYear === 2017;
  const loadSumTWh = is2017 ? data?.loadSum2017TWh : data?.loadSumTWh;
  const electrificationSelected = e100DemandFlags.some(key => scenario.demand[key]);

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
    onLoadPresetChange(loadPresetStates['nur-2025']);
  };
  const selectHistorical2017 = () => {
    onLoadPresetChange(loadPresetStates['nur-2017']);
  };
  const selectElectrification = () => {
    onLoadPresetChange(loadPresetStates.e100);
    onOpenSectorsChange({ verkehr: false, waerme: false, industrie: false });
    onExpandedRowChange(null);
  };

  const loadPillId = matchingLoadPreset(scenario);
  const loadPills: ReadonlyArray<{ id: LoadPillId; label: string; description: string }> = [
    { id: 'nur-2025', label: '2025', description: 'Historische Last 2025 (~466 TWh) ohne zusätzliche Elektrifizierung' },
    { id: 'e100', label: '100% Elektrifizierung', description: 'Last 2025 plus alle e100-Bausteine aktiv' },
    { id: 'custom', label: 'Manuell', description: 'Lastbausteine frei konfiguriert' },
  ];
  const loadDropdownPills: ReadonlyArray<PresetOption<LoadPillId>> = [
    { id: 'nur-2017', label: '2017', description: 'Historische Last 2017 (~507 TWh); unabhängig von Erzeugungspreset', docId: datasetIds.loadHistorical2017 },
  ];
  const selectLoadPill = (id: LoadPillId) => {
    if (id === 'nur-2025') selectHistorical();
    else if (id === 'nur-2017') selectHistorical2017();
    else if (id === 'e100') selectElectrification();
  };
  return <SidebarCard
    title="Last"
    icon={<Activity className="h-4 w-4"/>}
    docId={datasetIds.loadHistorical2025}
    meta={data ? `${fmt0.format(electrificationTotal)}/${fmt0.format(electrificationPotentialTotal)} TWh` : undefined}
    collapsible
    defaultOpen
  >
      <div className="flex flex-wrap gap-1.5">
        <PresetPillRow presets={loadPills} activeId={loadPillId} onSelect={selectLoadPill}/>
        <PresetDropdownPill label="Mehr" presets={loadDropdownPills} activeId={loadPillId} active={loadPillId === 'nur-2017'} docId={datasetIds.loadHistorical2017} onSelect={selectLoadPill}/>
      </div>

    <div className="mt-2 grid gap-2">
        <BasisSubSection
          checked={scenario.demand['last-2025']}
          meta={data?.loadSumTWh ? twh0(data.loadSumTWh) : 'Basislast'}
          docId={datasetIds.loadHistorical2025}
          onChange={onHistoricalLoadChange}
        />
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
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
  onRange,
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
  onRange: (start: string, end: string) => void;
}) {
  const yearMin = `${loadYear}-01-01`;
  const yearMax = `${loadYear}-12-31`;
  const [open, setOpen] = useState(false);
  const selectedMonthId = preset === 'custom' ? monthIdFromRange(customStart, customEnd, loadYear) : null;
  const activePeriodPillId = selectedMonthId ? null : preset;
  const activePeriodLabel = selectedMonthId
    ? periodMonthPills.find(month => month.id === selectedMonthId)?.label ?? 'Mehr'
    : periodPills.find(pill => pill.id === preset)?.label ?? 'Manuell';
  const selectMonth = (monthId: PeriodMonthId) => {
    const range = monthRange(loadYear, monthId);
    onRange(range.start, range.end);
  };
  const periodMeta = preset === 'year' ? String(loadYear) : `${formatDate(start)} bis ${formatDate(end)}`;
  return <SidebarCard title="Zeitraum" icon={<CalendarDays className="h-4 w-4"/>} badge={activePeriodLabel} meta={periodMeta} collapsible>
      <div className="grid gap-2">
        <div className="flex flex-wrap gap-1.5">
          <PresetPillRow
            presets={periodPills}
            activeId={activePeriodPillId}
            onSelect={onPreset}
          />
          <PresetDropdownPill label="Mehr" presets={periodMonthPills} activeId={selectedMonthId} onSelect={selectMonth}/>
        </div>
      </div>
      {preset === 'custom' && <div className="grid grid-cols-2 gap-2">
        <input aria-label="Startdatum" className={cx(field, 'px-2 text-xs')} type="date" min={yearMin} max={yearMax} value={customStart} onChange={event => onStart(event.target.value)}/>
        <input aria-label="Enddatum" className={cx(field, 'px-2 text-xs')} type="date" min={yearMin} max={yearMax} value={customEnd} onChange={event => onEnd(event.target.value)}/>
      </div>}
  </SidebarCard>;
}

const periodPills: ReadonlyArray<{ id: PeriodPreset; label: string; description: string }> = [
  { id: 'year', label: 'Jahr', description: 'Ganzes Datenjahr' },
  { id: '21d', label: '21T', description: 'Letzte 21 Tage des Datenjahres' },
  { id: '90d', label: '90T', description: 'Letzte 90 Tage des Datenjahres' },
  { id: 'custom', label: 'Manuell', description: 'Start und Ende direkt wählen' },
];

type PeriodMonthId = '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12';

const periodMonthPills: ReadonlyArray<PresetOption<PeriodMonthId>> = [
  { id: '01', label: 'Januar', description: '01.01. bis 31.01.' },
  { id: '02', label: 'Februar', description: '01.02. bis 28.02.' },
  { id: '03', label: 'März', description: '01.03. bis 31.03.' },
  { id: '04', label: 'April', description: '01.04. bis 30.04.' },
  { id: '05', label: 'Mai', description: '01.05. bis 31.05.' },
  { id: '06', label: 'Juni', description: '01.06. bis 30.06.' },
  { id: '07', label: 'Juli', description: '01.07. bis 31.07.' },
  { id: '08', label: 'August', description: '01.08. bis 31.08.' },
  { id: '09', label: 'September', description: '01.09. bis 30.09.' },
  { id: '10', label: 'Oktober', description: '01.10. bis 31.10.' },
  { id: '11', label: 'November', description: '01.11. bis 30.11.' },
  { id: '12', label: 'Dezember', description: '01.12. bis 31.12.' },
];

const monthDays: Record<PeriodMonthId, number> = {
  '01': 31, '02': 28, '03': 31, '04': 30, '05': 31, '06': 30,
  '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31,
};

function monthRange(year: 2025 | 2017, monthId: PeriodMonthId) {
  return {
    start: `${year}-${monthId}-01`,
    end: `${year}-${monthId}-${String(monthDays[monthId]).padStart(2, '0')}`,
  };
}

function monthIdFromRange(start: string, end: string, year: 2025 | 2017): PeriodMonthId | null {
  return periodMonthPills.find(month => {
    const range = monthRange(year, month.id);
    return range.start === start && range.end === end;
  })?.id ?? null;
}

function ModelSection() {
  return <SidebarCard title="Modell" icon={<SlidersHorizontal className="h-4 w-4"/>} docId={datasetIds.coreModel} meta="Kernmodell" collapsible>
      <ReadonlyItem
        label="Kernmodell"
        meta="Stündlicher Dispatch von Last, Erzeugung, Speicher und Handel"
        docId={datasetIds.coreModel}
      />
  </SidebarCard>;
}

function ReadonlyItem({ label, meta, docId }: { label: string; meta: string; docId: string }) {
  return <div className="group flex items-start gap-3 rounded-lg px-2.5 py-2">
    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-zinc-950 dark:border-zinc-50">
      <span className="h-2.5 w-2.5 rounded-full bg-zinc-950 dark:bg-zinc-50"/>
    </span>
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{label}</span>
        <InfoLink id={docId} label={`${label} im Wiki öffnen`}/>
      </span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </div>;
}

function SidebarCard({ title, icon, docId, badge, meta, collapsible = false, defaultOpen = false, children }: { title: string; icon: ReactNode; docId?: string; badge?: string; meta?: string; collapsible?: boolean; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(collapsible ? defaultOpen : true);
  const toggle = () => setOpen(value => !value);
  const onHeaderKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle();
  };
  return <section className="rounded-lg border border-zinc-200 bg-white p-3 last:mb-0 dark:border-zinc-800 dark:bg-zinc-900">
    {collapsible
      ? <div
          role="button"
          tabIndex={0}
          className="group flex w-full cursor-pointer items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/10 dark:focus-visible:ring-zinc-50/10"
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={onHeaderKeyDown}
        >
          <span className={cx(iconTile, 'h-7 w-7')}>{icon}</span>
          <h2 className="text-[15px] font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
          {docId && <InfoLink id={docId} label={`${title} im Wiki öffnen`}/>}
          {badge && <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{badge}</span>}
          {meta && <span className={cx('shrink-0 text-xs tabular-nums text-zinc-500', !badge && 'ml-auto')}>{meta}</span>}
          <ChevronDown aria-hidden="true" className={cx('h-4 w-4 shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')}/>
        </div>
      : <SectionHeader title={title} icon={icon} docId={docId} badge={badge} meta={meta}/>
    }
    {open && <div className="mt-3 grid gap-2.5">{children}</div>}
  </section>;
}

function SectionHeader({ title, icon, docId, badge, meta }: { title: string; icon: ReactNode; docId?: string; badge?: string; meta?: string }) {
  return <div className="group flex items-center gap-2">
    <span className={cx(iconTile, 'h-7 w-7')}>{icon}</span>
    <h2 className="text-[15px] font-bold text-zinc-950 dark:text-zinc-50">{title}</h2>
    {docId && <InfoLink id={docId} label={`${title} im Wiki öffnen`}/>}
    {badge && <span className="ml-auto shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{badge}</span>}
    {meta && <span className={cx('shrink-0 text-xs tabular-nums text-zinc-500', !badge && 'ml-auto')}>{meta}</span>}
  </div>;
}

function BasisSubSection({ checked, meta, docId, onChange }: { checked: boolean; meta: string; docId: string; onChange: (checked: boolean) => void }) {
  return <section className="overflow-hidden rounded-md border border-zinc-200/70 bg-zinc-50/70 transition hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/70">
    <label className="group grid cursor-pointer grid-cols-[18px_24px_minmax(72px,1fr)_auto_16px] items-center gap-1.5 px-2.5 py-2.5">
      <input
        className="h-4 w-4 accent-zinc-950 dark:accent-zinc-50"
        type="checkbox"
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        aria-label="Basis aktivieren"
      />
      <span className={cx(iconTile, 'h-6 w-6 rounded-md bg-transparent')}><Database className="h-4 w-4"/></span>
      <span className="flex min-w-0 items-center gap-1 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        <span className={cx('truncate', checked ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400')}>Basis</span>
        <InfoLink id={docId} label="Basis im Wiki öffnen"/>
      </span>
      <span className={cx('whitespace-nowrap text-right text-sm font-semibold tabular-nums', checked ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500')}>{meta}</span>
      <span aria-hidden="true" className="h-4 w-4"/>
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
    'overflow-hidden rounded-md transition',
    open ? 'border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70' : 'border border-zinc-200/70 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/70',
  )}>
    <div className="grid cursor-pointer grid-cols-[18px_24px_minmax(72px,1fr)_auto_16px] items-center gap-1.5 px-2.5 py-2.5" onClick={onToggle}>
      <input
        className="h-4 w-4 accent-zinc-950 dark:accent-zinc-50"
        type="checkbox"
        checked={checked}
        onClick={event => event.stopPropagation()}
        onChange={event => onChecked(event.target.checked)}
        aria-label={`${title} aktivieren`}
      />
      <span className={cx(iconTile, 'h-6 w-6 rounded-md bg-transparent')}>{icon}</span>
      <button
        type="button"
        className="group flex min-w-0 items-center gap-1 text-left"
        aria-expanded={open}
        aria-label={open ? `${title} einklappen` : `${title} ausklappen`}
      >
        <span className={cx('text-sm font-semibold', checked ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400')}>{title}</span>
        <InfoLink id={docId} label={`${title} im Wiki öffnen`}/>
      </button>
      <span className={cx('whitespace-nowrap text-right text-sm font-semibold tabular-nums', checked ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500')}>{value}</span>
      <Chevron aria-hidden="true" className="h-4 w-4 text-zinc-400"/>
    </div>
    {open && <div className="border-t border-zinc-100 px-2 py-1 dark:border-zinc-700">{children}</div>}
  </section>;
}

function InfoLink({ id, label, alwaysVisible = false }: { id: string; label: string; alwaysVisible?: boolean }) {
  return <a
    href={dataWikiUrl(id)}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    className={cx(
      'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-950 focus:opacity-100 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-50',
      alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
    )}
    onClick={event => event.stopPropagation()}
  >
    <Info className="h-3 w-3"/>
  </a>;
}

function ScenarioRadioItem({ name, label, meta, checked, onSelect }: { name: string; label: string; meta: string; checked: boolean; onSelect: () => void }) {
  return <label className={cx(
    'flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2 transition',
    checked ? rowActive : rowHover,
  )}>
    <input
      className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-950 dark:accent-zinc-50"
      type="radio"
      name={name}
      checked={checked}
      onChange={onSelect}
    />
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{label}</span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </label>;
}

function E100PkwControl({ data, scenario, expanded, onChecked, onMillionKm, onToggleExpand }: { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (checked: boolean) => void; onMillionKm: (millionKm: number) => void; onToggleExpand: () => void }) {
  const model = data['e100-pkw'];
  const millionKm = scenario.demand['e100-pkw-million-km'];
  const referenceText = formatReferenceScale(millionKm, model.referenceScales?.activity);
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
    detail={`${millionKm.toLocaleString('de-DE')} Mio. km · ${formatPercent(millionKm / model.referenceMillionKm * 100)}${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Pkw)}`}
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
  const referenceText = formatReferenceScale(heatTWh, model.referenceScales?.activity);
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
    detail={`${heatTWh.toLocaleString('de-DE')} TWh Wärme · ${formatPercent(heatTWh / model.referenceHeatDemandTWh * 100)}${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Heiz)}`}
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

function SectorRow({ label, enabled, value, min, max, step, valueLabel, valueUnit, electricTWh, detail, docId, expanded, onChecked, onValue, onToggleExpand }: SectorRowProps) {
  const [dragValue, setDragValue] = useState<number | null>(null);
  const display = dragValue ?? value;
  const pct = max > min ? ((display - min) / (max - min)) * 100 : 0;
  const Chevron = expanded ? ChevronUp : ChevronDown;
  const commit = (raw: number) => {
    setDragValue(null);
    onValue(raw);
  };
  return <div className={cx(
    'group transition',
    expanded && enabled ? 'border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/70' : 'border border-zinc-200/70 bg-zinc-50/70 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-800/70',
  )}>
    <div className={cx('grid grid-cols-[18px_minmax(0,1fr)_64px_16px] items-center gap-1.5 px-2 py-2.5', enabled && 'cursor-pointer')} onClick={() => { if (enabled) onToggleExpand(); }}>
      <input
        className="h-4 w-4 accent-zinc-950 dark:accent-zinc-50"
        type="checkbox"
        checked={enabled}
        onClick={event => event.stopPropagation()}
        onChange={event => onChecked(event.target.checked)}
        aria-label={`${label} aktivieren`}
      />
      <button
        type="button"
        className="flex min-w-0 items-center gap-1 text-left text-xs font-medium leading-4 text-zinc-950 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-50 dark:disabled:text-zinc-500"
        aria-expanded={expanded && enabled}
        aria-label={expanded && enabled ? `${label} einklappen` : `${label} ausklappen`}
        disabled={!enabled}
      >
        <span className="min-w-0 truncate">{label}</span>
        <InfoLink id={docId} label={`${label} im Wiki öffnen`}/>
      </button>
      <span className={cx('whitespace-nowrap text-right text-xs tabular-nums', enabled ? 'font-semibold text-zinc-950 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500')}>{twh(electricTWh)}</span>
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
        value={display}
        onChange={event => {
          const raw = Number(event.target.value);
          if (dragValue !== null) setDragValue(raw);
          else onValue(raw);
        }}
        onPointerDown={() => setDragValue(value)}
        onPointerUp={event => commit(Number(event.currentTarget.value))}
        onPointerCancel={() => setDragValue(null)}
      />
      {valueUnit && <div className="flex items-baseline gap-1 text-xs leading-5 text-zinc-500">
        <EditableNumber value={display} min={min} max={max} step={step} onChange={onValue} title={`${valueLabel}: direkt eingeben (${min.toLocaleString('de-DE')}–${max.toLocaleString('de-DE')} ${valueUnit})`}/>
        <span>{valueUnit}</span>
        <span className="text-zinc-400">· davon Zusatz: {twh(electricTWh)}</span>
      </div>}
      <p className="text-xs leading-5 text-zinc-500">{detail}</p>
    </div>}
  </div>;
}

type SectorWrapperProps = { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (b: boolean) => void; onValue: (n: number) => void; onToggleExpand: () => void };

function E100LkwControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-lkw'];
  const target = scenario.demand['e100-lkw-target-bn-km'];
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} Mrd. km · ${formatPercent(target / model.referenceBnKm * 100)}${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Lkw)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} TWh${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Bahn)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} TWh${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Schiff)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} TWh${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Flug)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} TWh Wärme · ${formatPercent(target / model.referenceHeatDemandTWh * 100)}${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Ghd)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} TWh Wärme${referenceText ? ` · ${referenceText}` : ''} · ohne Stahl/Chemie · ${summaryFor(datasetIds.e100IndustrieWaerme)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} Mio. t · ${formatPercent(target / model.primarySteelMioTon * 100)}${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Stahl)}`}
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
  const referenceText = formatReferenceScale(target, model.referenceScales?.activity);
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
    detail={`${target.toLocaleString('de-DE')} TWh Gesamt${referenceText ? ` · ${referenceText}` : ''} · ${summaryFor(datasetIds.e100Chemie)}`}
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
