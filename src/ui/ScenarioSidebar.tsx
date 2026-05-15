import { useState, type ReactNode } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { dataWikiHomeUrl, dataWikiUrl, datasetIds } from './dataCatalog';
import { twh } from './format';
import { cx, field, sectionBox } from './ui';
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

export function ScenarioSidebar({
  data,
  scenario,
  selectedPeriod,
  periodPreset,
  customStart,
  customEnd,
  onPreset,
  onStart,
  onEnd,
  onFaqOpen,
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
}: {
  data: DataSet | null;
  scenario: Scenario;
  selectedPeriod: { start: string; end: string };
  periodPreset: PeriodPreset;
  customStart: string;
  customEnd: string;
  onPreset: (preset: PeriodPreset) => void;
  onStart: (date: string) => void;
  onEnd: (date: string) => void;
  onFaqOpen: () => void;
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
}) {
  return <aside className="lg:order-1 lg:sticky lg:top-3 lg:max-h-[calc(100vh-1.5rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:border-r lg:border-zinc-200/80 lg:pr-4">
    <div className="border-b border-zinc-200/80 px-1 py-3 lg:px-0">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-[-0.04em] text-zinc-950">Netzprobe</h1>
        <div className="flex items-center gap-1.5">
          <a
            href={dataWikiHomeUrl()}
            target="_blank"
            rel="noreferrer"
            aria-label="Datenhandbuch öffnen"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-950"
          >
            <BookOpen className="h-3 w-3"/>
            <span>Wiki</span>
          </a>
          <button
            type="button"
            aria-label="Daten-FAQ öffnen"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-950"
            onClick={onFaqOpen}
          >
            <Info className="h-3.5 w-3.5"/>
          </button>
        </div>
      </div>
    </div>

    <div>
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

      <LastSection
        data={data}
        scenario={scenario}
        onHistoricalLoadChange={onHistoricalLoadChange}
        onE100PkwChange={onE100PkwChange} onE100PkwMillionKmChange={onE100PkwMillionKmChange}
        onE100HeizChange={onE100HeizChange} onE100HeizTargetHeatTWhChange={onE100HeizTargetHeatTWhChange}
        onE100LkwChange={onE100LkwChange} onE100LkwTargetChange={onE100LkwTargetChange}
        onE100BahnChange={onE100BahnChange} onE100BahnTargetChange={onE100BahnTargetChange}
        onE100SchiffChange={onE100SchiffChange} onE100SchiffTargetChange={onE100SchiffTargetChange}
        onE100FlugChange={onE100FlugChange} onE100FlugTargetChange={onE100FlugTargetChange}
        onE100GhdChange={onE100GhdChange} onE100GhdTargetChange={onE100GhdTargetChange}
        onE100IndustrieWaermeChange={onE100IndustrieWaermeChange} onE100IndustrieWaermeTargetChange={onE100IndustrieWaermeTargetChange}
        onE100StahlChange={onE100StahlChange} onE100StahlTargetChange={onE100StahlTargetChange}
        onE100ChemieChange={onE100ChemieChange} onE100ChemieTargetChange={onE100ChemieTargetChange}
      />

      <ScenarioChoiceSection
        title="Erzeugung"
        label="Historisch 2025"
        meta={`Energy-Charts · ${generationMeta(data)}`}
        docId={datasetIds.generationHistorical2025}
      />

      <ScenarioChoiceSection
        title="Modell"
        label="Kernmodell"
        meta="Stündliche Bilanzrechnung"
        docId={datasetIds.coreModel}
      >
        <ScenarioRadioItem
          label="Einspeisefaktoren 2025"
          meta="PV/Wind aus beobachteter Einspeisung abgeleitet"
          docId={datasetIds.feedInFactors2025}
        />
      </ScenarioChoiceSection>
    </div>
  </aside>;
}

type LastSectionProps = {
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
};

function LastSection(props: LastSectionProps) {
  const { data, scenario, onHistoricalLoadChange } = props;
  const sectorFlags: Array<keyof Scenario['demand']> = [
    'e100-pkw', 'e100-heiz', 'e100-lkw', 'e100-bahn', 'e100-schiff', 'e100-flug',
    'e100-ghd', 'e100-industrie-waerme', 'e100-stahl', 'e100-chemie',
  ];
  const elektrifizierung = sectorFlags.some(key => scenario.demand[key]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const setAllSectors = (on: boolean) => {
    props.onE100PkwChange(on); props.onE100HeizChange(on);
    props.onE100LkwChange(on); props.onE100BahnChange(on); props.onE100SchiffChange(on); props.onE100FlugChange(on);
    props.onE100GhdChange(on); props.onE100IndustrieWaermeChange(on); props.onE100StahlChange(on); props.onE100ChemieChange(on);
  };
  return <section className="border-t border-zinc-200/80 px-4 py-4">
    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Last</span>
    <div className="mt-3 grid gap-2.5">
      <ScenarioRadioItem
        label="Historisch 2025"
        meta={`Energy-Charts${data?.loadSumTWh ? ` · ${twh(data.loadSumTWh)}` : ''}`}
        docId={datasetIds.loadHistorical2025}
        checked={!elektrifizierung}
        onSelect={() => { onHistoricalLoadChange(true); setAllSectors(false); }}
      />
      <ScenarioRadioItem
        label="100% Elektrifizierung"
        meta="Verkehr, Wärme und Industrie additiv"
        docId={datasetIds.fullElectrification}
        checked={elektrifizierung}
        onSelect={() => { onHistoricalLoadChange(true); setAllSectors(true); }}
      />
      {data && elektrifizierung && <div className="ml-2 mt-1 grid gap-3 border-l border-zinc-200/80 pl-3">
        <SectorGroup title="Basis">
          <ScenarioCheckboxItem
            label="Historisch 2025"
            meta={data?.loadSumTWh ? `Basis · ${twh(data.loadSumTWh)}` : 'Basislast'}
            docId={datasetIds.loadHistorical2025}
            checked={scenario.demand['last-2025']}
            onChange={onHistoricalLoadChange}
          />
        </SectorGroup>
        <SectorGroup title="Verkehr">
          <E100PkwControl data={data} scenario={scenario} expanded={!!expanded['e100-pkw']} onChecked={props.onE100PkwChange} onMillionKm={props.onE100PkwMillionKmChange} onToggleExpand={() => toggleExpand('e100-pkw')}/>
          <E100LkwControl data={data} scenario={scenario} expanded={!!expanded['e100-lkw']} onChecked={props.onE100LkwChange} onValue={props.onE100LkwTargetChange} onToggleExpand={() => toggleExpand('e100-lkw')}/>
          <E100BahnControl data={data} scenario={scenario} expanded={!!expanded['e100-bahn']} onChecked={props.onE100BahnChange} onValue={props.onE100BahnTargetChange} onToggleExpand={() => toggleExpand('e100-bahn')}/>
          <E100SchiffControl data={data} scenario={scenario} expanded={!!expanded['e100-schiff']} onChecked={props.onE100SchiffChange} onValue={props.onE100SchiffTargetChange} onToggleExpand={() => toggleExpand('e100-schiff')}/>
          <E100FlugControl data={data} scenario={scenario} expanded={!!expanded['e100-flug']} onChecked={props.onE100FlugChange} onValue={props.onE100FlugTargetChange} onToggleExpand={() => toggleExpand('e100-flug')}/>
        </SectorGroup>
        <SectorGroup title="Wärme">
          <E100HeizControl data={data} scenario={scenario} expanded={!!expanded['e100-heiz']} onChecked={props.onE100HeizChange} onTargetHeat={props.onE100HeizTargetHeatTWhChange} onToggleExpand={() => toggleExpand('e100-heiz')}/>
          <E100GhdControl data={data} scenario={scenario} expanded={!!expanded['e100-ghd']} onChecked={props.onE100GhdChange} onValue={props.onE100GhdTargetChange} onToggleExpand={() => toggleExpand('e100-ghd')}/>
        </SectorGroup>
        <SectorGroup title="Industrie">
          <E100IndustrieWaermeControl data={data} scenario={scenario} expanded={!!expanded['e100-industrie-waerme']} onChecked={props.onE100IndustrieWaermeChange} onValue={props.onE100IndustrieWaermeTargetChange} onToggleExpand={() => toggleExpand('e100-industrie-waerme')}/>
          <E100StahlControl data={data} scenario={scenario} expanded={!!expanded['e100-stahl']} onChecked={props.onE100StahlChange} onValue={props.onE100StahlTargetChange} onToggleExpand={() => toggleExpand('e100-stahl')}/>
          <E100ChemieControl data={data} scenario={scenario} expanded={!!expanded['e100-chemie']} onChecked={props.onE100ChemieChange} onValue={props.onE100ChemieTargetChange} onToggleExpand={() => toggleExpand('e100-chemie')}/>
        </SectorGroup>
      </div>}
    </div>
  </section>;
}

function ScenarioChoiceSection({ title, label, meta, docId, children }: { title: string; label: string; meta: string; docId: string; children?: ReactNode }) {
  return <section className="border-t border-zinc-200/80 px-4 py-4">
    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{title}</span>
    <div className="mt-3 grid gap-2.5">
      <ScenarioRadioItem label={label} meta={meta} docId={docId}/>
      {children}
    </div>
  </section>;
}

function SectorGroup({ title, children }: { title: string; children: ReactNode }) {
  return <div className="grid gap-2.5">
    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-400">{title}</span>
    <div className="grid gap-2.5">{children}</div>
  </div>;
}

function ScenarioRadioItem({ label, meta, docId, checked = true, onSelect }: { label: string; meta: string; docId: string; checked?: boolean; onSelect?: () => void }) {
  return <label className="group flex items-start gap-2 text-sm text-zinc-950">
    <input
      className="mt-0.5 accent-zinc-700"
      type="radio"
      checked={checked}
      onChange={() => onSelect?.()}
      readOnly={!onSelect}
    />
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DataInfoLink id={docId} label={`${label} erklären`}/>
        </span>
      </span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </label>;
}

function ScenarioCheckboxItem({ label, meta, docId, checked, onChange, disabled = false }: { label: string; meta: string; docId: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  return <label className="group flex items-start gap-2 text-sm text-zinc-950">
    <input
      className="mt-0.5 accent-zinc-700"
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={event => onChange(event.target.checked)}
    />
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate">{label}</span>
        <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DataInfoLink id={docId} label={`${label} erklären`}/>
        </span>
      </span>
      <span className="truncate text-xs text-zinc-500">{meta}</span>
    </span>
  </label>;
}

function E100PkwControl({ data, scenario, expanded, onChecked, onMillionKm, onToggleExpand }: { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (checked: boolean) => void; onMillionKm: (millionKm: number) => void; onToggleExpand: () => void }) {
  const model = data['e100-pkw'];
  const millionKm = scenario.demand['e100-pkw-million-km'];
  return <SectorRow
    label="Pkw"
    docId={datasetIds.e100Pkw}
    enabled={scenario.demand['e100-pkw']}
    value={millionKm} min={model.alreadyElectricMillionKm} max={model.maxTargetMillionKm} step={model.stepMillionKm}
    valueUnit="Mio. km" valueLabel="Pkw-km"
    electricTWh={e100PkwAdditionalTWh(millionKm, model)}
    meta={model.summary}
    note={`${(millionKm / model.referenceMillionKm * 100).toFixed(0)} % der Flotte`}
    expanded={expanded}
    onChecked={onChecked} onValue={onMillionKm} onToggleExpand={onToggleExpand}
  />;
}

function E100HeizControl({ data, scenario, expanded, onChecked, onTargetHeat, onToggleExpand }: { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (checked: boolean) => void; onTargetHeat: (heatTWh: number) => void; onToggleExpand: () => void }) {
  const model = data['e100-heiz'];
  const heatTWh = scenario.demand['e100-heiz-target-heat-twh'];
  return <SectorRow
    label="Haushalte"
    docId={datasetIds.e100Heiz}
    enabled={scenario.demand['e100-heiz']}
    value={heatTWh} min={model.alreadyElectricHeatTWh} max={model.maxTargetHeatTWh} step={model.stepHeatTWh}
    valueUnit="TWh Wärme" valueLabel="Raumwärme"
    electricTWh={e100HeizAdditionalElectricityTWh(heatTWh, model)}
    meta={model.summary}
    note={`${(heatTWh / model.referenceHeatDemandTWh * 100).toFixed(0)} % via WP`}
    expanded={expanded}
    onChecked={onChecked} onValue={onTargetHeat} onToggleExpand={onToggleExpand}
  />;
}

function SectorRow({ label, docId, enabled, value, min, max, step, valueUnit, valueLabel, electricTWh, meta, note, expanded, onChecked, onValue, onToggleExpand }: {
  label: string;
  docId: string;
  enabled: boolean;
  value: number;
  min: number;
  max: number;
  step: number;
  valueUnit: string;
  valueLabel: string;
  electricTWh: number;
  meta: string;
  note: string;
  expanded: boolean;
  onChecked: (checked: boolean) => void;
  onValue: (value: number) => void;
  onToggleExpand: () => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return <div className="group grid gap-1">
    <div className="flex items-center gap-1.5 text-sm text-zinc-950">
      <button
        type="button"
        aria-label={expanded ? 'Einklappen' : 'Ausklappen'}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-400 transition hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!enabled}
        onClick={onToggleExpand}
      >
        <Chevron className="h-3.5 w-3.5"/>
      </button>
      <input
        className="shrink-0 accent-zinc-700"
        type="checkbox"
        checked={enabled}
        onChange={event => onChecked(event.target.checked)}
        aria-label={`${label} aktivieren`}
      />
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
        onClick={() => { if (enabled) onToggleExpand(); }}
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className={cx('shrink-0 text-sm tabular-nums', enabled ? 'font-medium text-zinc-950' : 'text-zinc-400')}>{twh(electricTWh)}</span>
      </button>
      <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <DataInfoLink id={docId} label={`${label} erklären`}/>
      </span>
    </div>
    {expanded && enabled && <div className="ml-7 grid gap-1.5 pb-1">
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
      <p className="truncate text-[11px] text-zinc-500">{value.toLocaleString('de-DE')} {valueUnit} · {note} · {meta}</p>
    </div>}
  </div>;
}

type SectorWrapperProps = { data: DataSet; scenario: Scenario; expanded: boolean; onChecked: (b: boolean) => void; onValue: (n: number) => void; onToggleExpand: () => void };

function E100LkwControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-lkw'];
  const target = scenario.demand['e100-lkw-target-bn-km'];
  return <SectorRow
    label="Lkw + Bus" docId={datasetIds.e100Lkw}
    enabled={scenario.demand['e100-lkw']}
    value={target} min={model.alreadyElectricBnKm} max={model.maxTargetBnKm} step={model.stepBnKm}
    valueUnit="Mrd. km" valueLabel="Fahrleistung"
    electricTWh={e100LkwAdditionalTWh(target, model)}
    meta={model.summary}
    note={`${(target / model.referenceBnKm * 100).toFixed(0)} % der Flotte`}
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100BahnControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-bahn'];
  const target = scenario.demand['e100-bahn-target-twh'];
  return <SectorRow
    label="Bahn" docId={datasetIds.e100Bahn}
    enabled={scenario.demand['e100-bahn']}
    value={target} min={0} max={model.maxTargetTWh} step={model.stepTWh}
    valueUnit="TWh" valueLabel="Zusatz-Bahnstrom"
    electricTWh={e100BahnAdditionalTWh(target, model)}
    meta={model.summary}
    note="+ historische 11 TWh"
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100SchiffControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-schiff'];
  const target = scenario.demand['e100-schiff-target-twh'];
  return <SectorRow
    label="Schiff" docId={datasetIds.e100Schiff}
    enabled={scenario.demand['e100-schiff']}
    value={target} min={model.alreadyElectricTWh} max={model.maxTargetTWh} step={model.stepTWh}
    valueUnit="TWh" valueLabel="Ziel-Strom"
    electricTWh={e100SchiffAdditionalTWh(target, model)}
    meta={model.summary}
    note="Binnen + Hochsee"
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100FlugControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-flug'];
  const target = scenario.demand['e100-flug-target-twh'];
  return <SectorRow
    label="Flug" docId={datasetIds.e100Flug}
    enabled={scenario.demand['e100-flug']}
    value={target} min={0} max={model.maxTargetTWh} step={model.stepTWh}
    valueUnit="TWh" valueLabel="PtL-Strom"
    electricTWh={e100FlugAdditionalTWh(target, model)}
    meta={model.summary}
    note="e-Kerosin"
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100GhdControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-ghd'];
  const target = scenario.demand['e100-ghd-target-heat-twh'];
  return <SectorRow
    label="GHD" docId={datasetIds.e100Ghd}
    enabled={scenario.demand['e100-ghd']}
    value={target} min={model.alreadyElectricHeatTWh} max={model.maxTargetHeatTWh} step={model.stepHeatTWh}
    valueUnit="TWh Wärme" valueLabel="GHD-Wärme"
    electricTWh={e100GhdAdditionalElectricityTWh(target, model)}
    meta={model.summary}
    note={`${(target / model.referenceHeatDemandTWh * 100).toFixed(0)} % via WP`}
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100IndustrieWaermeControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-industrie-waerme'];
  const target = scenario.demand['e100-industrie-waerme-target-heat-twh'];
  return <SectorRow
    label="Prozesswärme" docId={datasetIds.e100IndustrieWaerme}
    enabled={scenario.demand['e100-industrie-waerme']}
    value={target} min={model.alreadyElectricHeatTWh} max={model.maxTargetHeatTWh} step={model.stepHeatTWh}
    valueUnit="TWh Wärme" valueLabel="Prozesswärme"
    electricTWh={e100IndustrieAdditionalElectricityTWh(target, model)}
    meta={model.summary}
    note="ohne Stahl/Chemie"
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100StahlControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-stahl'];
  const target = scenario.demand['e100-stahl-target-mio-ton'];
  return <SectorRow
    label="Stahl" docId={datasetIds.e100Stahl}
    enabled={scenario.demand['e100-stahl']}
    value={target} min={0} max={model.maxTargetMioTon} step={model.stepMioTon}
    valueUnit="Mio. t" valueLabel="Primärstahl"
    electricTWh={e100StahlAdditionalTWh(target, model)}
    meta={model.summary}
    note={`${(target / model.primarySteelMioTon * 100).toFixed(0)} % via DRI-H2`}
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function E100ChemieControl({ data, scenario, expanded, onChecked, onValue, onToggleExpand }: SectorWrapperProps) {
  const model = data['e100-chemie'];
  const target = scenario.demand['e100-chemie-target-twh'];
  return <SectorRow
    label="Chemie" docId={datasetIds.e100Chemie}
    enabled={scenario.demand['e100-chemie']}
    value={target} min={model.alreadyElectricTWh} max={model.maxTargetTotalTWh} step={model.stepTWh}
    valueUnit="TWh Gesamt" valueLabel="Zielstrom"
    electricTWh={e100ChemieAdditionalTWh(target, model)}
    meta={model.summary}
    note={`+ Status quo 55 TWh`}
    expanded={expanded} onChecked={onChecked} onValue={onValue} onToggleExpand={onToggleExpand}
  />;
}

function PeriodControl({ preset, start, end, customStart, customEnd, onPreset, onStart, onEnd }: { preset: PeriodPreset; start: string; end: string; customStart: string; customEnd: string; onPreset: (preset: PeriodPreset) => void; onStart: (date: string) => void; onEnd: (date: string) => void }) {
  return <section className="grid gap-2 px-4 py-3">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Zeitraum</h2>
      <span className="whitespace-nowrap text-[10px] text-zinc-500">{formatDate(start)}–{formatDate(end)}</span>
    </div>
    <select className={cx(field, 'h-7 px-2 text-xs')} value={preset} onChange={event => onPreset(event.target.value as PeriodPreset)}>
      <option value="21d">21 Tage</option>
      <option value="90d">90 Tage</option>
      <option value="year">Jahr</option>
      <option value="custom">Custom</option>
    </select>
    {preset === 'custom' && <div className="grid grid-cols-2 gap-1.5">
      <input aria-label="Startdatum" className={cx(field, 'h-7 px-1.5 text-[11px]')} type="date" min="2025-01-01" max="2025-12-31" value={customStart} onChange={event => onStart(event.target.value)}/>
      <input aria-label="Enddatum" className={cx(field, 'h-7 px-1.5 text-[11px]')} type="date" min="2025-01-01" max="2025-12-31" value={customEnd} onChange={event => onEnd(event.target.value)}/>
    </div>}
  </section>;
}

function DataInfoLink({ id, label = 'Daten erklären' }: { id: string; label?: string }) {
  return <a
    href={dataWikiUrl(id)}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition hover:border-zinc-300 hover:text-zinc-950"
    onClick={event => event.stopPropagation()}
  >
    <Info className="h-3 w-3"/>
  </a>;
}

function generationMeta(data: DataSet | null) {
  const generation = data?.generationSumTWh ? twh(data.generationSumTWh) : '—';
  const imported = data?.importSumTWh ? twh(data.importSumTWh) : '—';
  return `${generation} Erzeugung · ${imported} Import`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
