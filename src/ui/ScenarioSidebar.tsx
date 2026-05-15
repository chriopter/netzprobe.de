import { useEffect, type ReactNode } from 'react';
import {
  Activity,
  BookOpen,
  CalendarDays,
  Car,
  ChevronDown,
  ChevronUp,
  Database,
  Factory,
  Flame,
  Info,
  PanelLeftClose,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { dataWikiHomeUrl, dataWikiUrl, datasetIds } from './dataCatalog';
import { fmt0, twh, twh0 } from './format';
import { cx, sidebarWidthClass } from './ui';
import { additionalTWh as e100PkwAdditionalTWh } from '../../data/e100-pkw/model';
import { additionalElectricityTWh as e100HeizAdditionalElectricityTWh } from '../../data/e100-heiz/model';
import { additionalTWh as e100LkwAdditionalTWh } from '../../data/e100-lkw/model';
import { additionalTWh as e100BahnAdditionalTWh } from '../../data/e100-bahn/model';
import { additionalTWh as e100SchiffAdditionalTWh } from '../../data/e100-schiff/model';
import { additionalTWh as e100FlugAdditionalTWh } from '../../data/e100-flug/model';
import { additionalElectricityTWh as e100GhdAdditionalElectricityTWh } from '../../data/e100-ghd/model';
import { additionalElectricityTWh as e100IndustrieAdditionalElectricityTWh } from '../../data/e100-industrie-waerme/model';
import { additionalTWh as e100StahlAdditionalTWh } from '../../data/e100-stahl/model';
import { additionalTWh as e100ChemieAdditionalTWh } from '../../data/e100-chemie/model';
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
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h1
            className="min-w-0 text-2xl font-semibold leading-8 text-zinc-950"
            title={`Build ${__BUILD_COMMIT__} · ${new Date(__BUILD_TIME__).toLocaleString('de-DE')}`}
          >
            netzprobe.de
          </h1>
          <a
            href={dataWikiHomeUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 hover:decoration-zinc-950"
          >
            <BookOpen className="h-3 w-3"/>
            Datenhandbuch
          </a>
        </div>
      </div>

      <div className="grid gap-3">
        {actionBar}

        <PeriodControl
          preset={periodPreset}
          start={selectedPeriod.start}
          end={selectedPeriod.end}
          customStart={customStart}
          customEnd={customEnd}
          onPreset={onPreset}
          onStart={onStart}
          onEnd={onEnd}
        />

        <LoadConfiguration
          data={data}
          scenario={scenario}
          onHistoricalLoadChange={onHistoricalLoadChange}
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

        <ReadonlyCard
          title="Erzeugung"
          icon={<Zap className="h-4 w-4"/>}
          label="Historisch 2025"
          meta={`Energy-Charts · ${generationMeta(data)}`}
          docId={datasetIds.generationHistorical2025}
        />

        <ReadonlyCard
          title="Modell"
          icon={<SlidersHorizontal className="h-4 w-4"/>}
          label="Kernmodell"
          meta="Stündliche Bilanzrechnung"
          docId={datasetIds.coreModel}
        >
          <ReadonlyItem
            label="Einspeisefaktoren 2025"
            meta="PV/Wind aus beobachteter Einspeisung abgeleitet"
            docId={datasetIds.feedInFactors2025}
          />
        </ReadonlyCard>
      </div>
    </div>
  </aside>;
}

type LoadConfigurationProps = {
  data: DataSet | null;
  scenario: Scenario;
  onHistoricalLoadChange: (checked: boolean) => void;
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
  const { data, scenario, onHistoricalLoadChange, openSectors, expandedRow, onOpenSectorsChange, onExpandedRowChange } = props;
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
  const basisTotal = scenario.demand['last-2025'] && data?.loadSumTWh ? data.loadSumTWh : 0;
  const electrificationTotal = basisTotal + transportTotal + heatTotal + industryTotal;
  const electrificationPotentialTotal = data ? (
    (data.loadSumTWh ?? 0)
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
  };
  const selectElectrification = () => {
    onHistoricalLoadChange(true);
    setAllSectors(true);
    onOpenSectorsChange({ verkehr: true, waerme: false, industrie: false });
    onExpandedRowChange('e100-pkw');
  };

  return <SidebarCard title="Last" icon={<Activity className="h-4 w-4"/>} docId={datasetIds.loadHistorical2025}>
      <div className="grid gap-2">
        <ScenarioRadioItem
          name="last-mode"
          label="Historisch 2025"
          meta={`Energy-Charts${data?.loadSumTWh ? ` · ${twh0(data.loadSumTWh)}` : ''}`}
          checked={!electrificationSelected}
          onSelect={selectHistorical}
        />

        <section className={cx(
          'overflow-hidden rounded-lg transition',
          electrificationSelected ? 'bg-zinc-50/60' : 'bg-white hover:bg-zinc-50/60',
        )}>
          <label className="flex cursor-pointer items-start gap-3 px-2.5 py-2.5">
            <input
              className="mt-0.5 h-4 w-4 shrink-0 accent-zinc-950"
              type="radio"
              name="last-mode"
              checked={electrificationSelected}
              onChange={selectElectrification}
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex min-w-0 items-center gap-1">
                <span className="truncate text-sm font-semibold text-zinc-950">100 % Elektrifizierung</span>
                <InfoLink id={datasetIds.fullElectrification} label="100 % Elektrifizierung im Wiki öffnen"/>
              </span>
              <span className="truncate text-xs text-zinc-500">Elektrifizierung aller Sektoren{data ? ` · ${twh0(electrificationSelected ? electrificationTotal : electrificationPotentialTotal)}` : ''}</span>
            </span>
          </label>

          {electrificationSelected && <div className="border-t border-zinc-100 bg-zinc-50/35 py-2 pl-3 pr-1.5">
            <div className="grid gap-2 border-l border-zinc-300/80 pl-2.5">
              <BasisSubSection
                checked={scenario.demand['last-2025']}
                meta={data?.loadSumTWh ? `Basis · ${twh0(data.loadSumTWh)}` : 'Basislast'}
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
            </div>
          </div>}
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
  onPreset,
  onStart,
  onEnd,
}: {
  preset: PeriodPreset;
  start: string;
  end: string;
  customStart: string;
  customEnd: string;
  onPreset: (preset: PeriodPreset) => void;
  onStart: (date: string) => void;
  onEnd: (date: string) => void;
}) {
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
      <input aria-label="Startdatum" className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400" type="date" min="2025-01-01" max="2025-12-31" value={customStart} onChange={event => onStart(event.target.value)}/>
      <input aria-label="Enddatum" className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-2 text-xs text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400" type="date" min="2025-01-01" max="2025-12-31" value={customEnd} onChange={event => onEnd(event.target.value)}/>
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
  electricTWh: number;
  detail: string;
  docId: string;
  expanded: boolean;
  onChecked: (checked: boolean) => void;
  onValue: (value: number) => void;
  onToggleExpand: () => void;
};

function SectorRow({ label, enabled, value, min, max, step, valueLabel, electricTWh, detail, docId, expanded, onChecked, onValue, onToggleExpand }: SectorRowProps) {
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
