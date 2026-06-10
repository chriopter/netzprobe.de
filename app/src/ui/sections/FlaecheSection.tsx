import { Fragment, useMemo, useState } from 'react';
import * as echarts from 'echarts/core';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import { useMainThreadChart } from '../chartHooks';
import type { ChartTheme, ChartViewport } from '../chartOptions';
import germanyGeoJson from '../germanyGeoJson.json';
import { defaultScenario, normalizeScenario } from '../scenarioPresets';
import { uiManifest } from '../uiManifest';
import { cx } from '../ui';
import { SectionHeading, StatCard } from '../sectionUi';

const scenarioBase = normalizeScenario(defaultScenario);

type FlaecheRow = {
  id: string;
  label: string;
  gw: number;
  anlageKm2: number;
  wirkungKm2: number;
  spezifischKm2PerGW: number;
  spezifischKm2PerGWh?: number;
  spezifischKm2PerTWh?: number;
  twhPerGWa?: number;
  vorFlaecheKm2?: number;
  vorFlaecheAuslandKm2?: number;
  vorFlaecheLand?: string;
  vorFlaecheTyp?: string;
  kategorie?: string;
};

function flaecheRows(scenario: Scenario): FlaecheRow[] {
  // Holt jeweils anlagenFlaeche + vorFlaeche + referenceYield aus dem Paket und
  // multipliziert mit dem aktuellen Slider-Wert. Speicher kombinieren GW/GWh-Term.
  const getF = (id: string) => (uiManifest.generation as Record<string, any>)[id]?.anlagenFlaeche ?? {};
  const getV = (id: string) => (uiManifest.generation as Record<string, any>)[id]?.vorFlaeche;
  const getY = (id: string) => (uiManifest.generation as Record<string, any>)[id]?.referenceYield;
  const getS = (id: string) => (uiManifest.storage as Record<string, any>)[id]?.anlagenFlaeche ?? {};

  const erz: Array<[string, string, number, string]> = [
    ['pv', 'PV', scenario.generation.pvInstalledGW, 'pv'],
    ['windon', 'Wind Onshore', scenario.generation.windOnInstalledGW, 'windon'],
    ['windoff', 'Wind Offshore', scenario.generation.windOffInstalledGW, 'windoff'],
    ['biomasse', 'Biomasse', scenario.generation.biomasseInstalledGW, 'biomasse'],
    ['laufwasser', 'Laufwasser', scenario.generation.laufwasserInstalledGW, 'laufwasser'],
    ['kernkraft', 'Kernkraft', scenario.generation.kernkraftInstalledGW, 'kernkraft'],
    ['gas', 'Gas', scenario.generation.gasInstalledGW, 'gas'],
    ['kohle', 'Kohle', scenario.generation.kohleInstalledGW, 'kohle'],
  ];

  const erzRows: FlaecheRow[] = erz.map(([id, label, gw, key]) => {
    const f = getF(key);
    const v = getV(key);
    const y = getY(key);
    const twhPerGWa = y?.twhPerGWa;
    const km2PerGW = (f.anlageKm2PerGW ?? 0) + (f.wirkungKm2PerGW ?? 0);
    // Nur DE-Inland-Vorfläche zählt für Bilanz und km²/TWh (methodische Konsistenz:
    // PV-Modulherstellung China zählt auch nicht). Auslands-Vorfläche bleibt im
    // Detail sichtbar, aber nicht in Summe.
    const vorKm2PerGW = v?.km2PerGW ?? 0;
    const isInland = v?.land === 'DE';
    const inlandVorKm2PerGW = isInland ? vorKm2PerGW : 0;
    const km2PerTWh = twhPerGWa && twhPerGWa > 0 ? (km2PerGW + inlandVorKm2PerGW) / twhPerGWa : undefined;
    return {
      id, label, gw,
      anlageKm2: gw * (f.anlageKm2PerGW ?? 0),
      wirkungKm2: gw * (f.wirkungKm2PerGW ?? 0),
      spezifischKm2PerGW: km2PerGW,
      spezifischKm2PerTWh: km2PerTWh,
      twhPerGWa,
      vorFlaecheKm2: v && isInland ? gw * vorKm2PerGW : undefined,
      vorFlaecheLand: v?.land,
      vorFlaecheTyp: v?.typ,
      vorFlaecheAuslandKm2: v && !isInland ? gw * vorKm2PerGW : undefined,
      kategorie: f.kategorie,
    };
  });

  const speicher: Array<[string, string, number, number]> = [
    ['batterie', 'Batterie', scenario.storage.batteriePowerGW, scenario.storage.batterieEnergyGWh],
    ['pumpspeicher', 'Pumpspeicher', scenario.storage.pumpspeicherPowerGW, scenario.storage.pumpspeicherEnergyGWh],
    ['h2', 'Wasserstoff', Math.max(scenario.storage.h2ChargePowerGW, scenario.storage.h2DischargePowerGW), scenario.storage.h2EnergyGWh],
  ];

  const speRows: FlaecheRow[] = speicher.map(([id, label, gw, gwh]) => {
    const f = getS(id);
    const anlage = gw * (f.anlageKm2PerGW ?? 0) + gwh * (f.anlageKm2PerGWh ?? 0);
    const wirkung = gw * (f.wirkungKm2PerGW ?? 0) + gwh * (f.wirkungKm2PerGWh ?? 0);
    return {
      id, label, gw,
      anlageKm2: anlage,
      wirkungKm2: wirkung,
      spezifischKm2PerGW: (f.anlageKm2PerGW ?? 0) + (f.wirkungKm2PerGW ?? 0),
      spezifischKm2PerGWh: (f.anlageKm2PerGWh ?? 0) + (f.wirkungKm2PerGWh ?? 0),
      kategorie: f.kategorie,
    };
  });

  return [...erzRows, ...speRows];
}

// Flächen-Vervielfachung des Szenarios gegenüber 2025 (Anlage + Wirkung + Vorfläche).
// Gleiche Summe wie die „gegen 2025"-KPI im Fläche-Panel. null, wenn 2025-Basis 0.
export function flaecheFactorVs2025(scenario: Scenario): number | null {
  const sumOf = (rows: FlaecheRow[]) => rows.reduce((s, r) => s + r.anlageKm2 + r.wirkungKm2 + (r.vorFlaecheKm2 ?? 0), 0);
  const sum2025 = sumOf(flaecheRows(scenarioBase));
  return sum2025 > 0 ? sumOf(flaecheRows(scenario)) / sum2025 : null;
}

const DEUTSCHLAND_KM2 = 357580;
const SAARLAND_KM2 = 2570;

type GeoRing = number[][];
type GeoPolygon = GeoRing[];
type GeoMultiPolygon = GeoPolygon[];

const mapAspectScale = 0.75;
const mapLayoutFrac = 0.92;

function ringArea(ring: GeoRing): number {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function projectedPolygonArea(polygon: GeoPolygon): number {
  const [outer, ...holes] = polygon;
  return Math.abs(ringArea(outer)) - holes.reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0);
}

function projectedGermanyMetrics() {
  const features = (germanyGeoJson as { features: Array<{ geometry: { type: string; coordinates: unknown } }> }).features;
  const points: Array<[number, number]> = [];
  let area = 0;
  for (const feature of features) {
    const geometry = feature.geometry;
    const polygons: GeoMultiPolygon = geometry.type === 'Polygon'
      ? [geometry.coordinates as GeoPolygon]
      : geometry.coordinates as GeoMultiPolygon;
    for (const polygon of polygons) {
      const projected = polygon.map(ring => ring.map(([lon, lat]) => [lon, lat * mapAspectScale]));
      area += projectedPolygonArea(projected);
      for (const ring of projected) points.push(...ring as Array<[number, number]>);
    }
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    bboxWidth: Math.max(...xs) - Math.min(...xs),
    bboxHeight: Math.max(...ys) - Math.min(...ys),
    fillRatio: area / ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))),
  };
}

const germanyMetrics = projectedGermanyMetrics();

// Fläche der gerenderten Deutschland-Kontur in Pixel². Die Karten-Bounding-Box
// folgt ECharts' `layoutSize: '92%'`; der Füllgrad kommt aus der echten
// GeoJSON-Geometrie statt aus einer optischen Schätzung.
function germanyAreaPx(viewport: ChartViewport): number {
  const w = viewport.width || 0;
  const h = viewport.height || 0;
  if (w <= 0 || h <= 0) return 0;
  const bboxAspect = germanyMetrics.bboxWidth / germanyMetrics.bboxHeight;
  const viewRect = Math.min(w, h) * mapLayoutFrac;
  const bboxWidth = bboxAspect >= 1 ? viewRect : viewRect * bboxAspect;
  const bboxHeight = bboxAspect >= 1 ? viewRect / bboxAspect : viewRect;
  return bboxWidth * bboxHeight * germanyMetrics.fillRatio;
}

function buildFlaecheMapOption(anlageKm2: number, wirkungKm2: number, offshoreWirkungKm2: number, vorFlaecheKm2: number, fmtKm2: (value: number) => string, viewport: ChartViewport, theme: ChartTheme): echarts.EChartsCoreOption {
  const dark = theme === 'dark';
  const totalKm2 = anlageKm2 + wirkungKm2;
  const mapTotalKm2 = totalKm2 + offshoreWirkungKm2 + vorFlaecheKm2;
  // Symbol-Durchmesser so wählen, dass Kreisfläche in Pixel² proportional zur
  // km²-Fläche ist (relativ zur gerenderten DE-Fläche): area_px = km²/DE_km² ×
  // DE_px, diameter = 2 × √(area_px/π).
  const germanyPx = germanyAreaPx(viewport);
  const symbolSizeOf = (km2: number) => {
    if (km2 <= 0 || germanyPx <= 0) return 0;
    const circleAreaPx = (km2 / DEUTSCHLAND_KM2) * germanyPx;
    return 2 * Math.sqrt(circleAreaPx / Math.PI);
  };
  const totalSymbolSize = symbolSizeOf(totalKm2);
  const offshoreSymbolSize = symbolSizeOf(offshoreWirkungKm2);
  const vorSymbolSize = symbolSizeOf(vorFlaecheKm2);
  const wirkungShare = totalKm2 > 0 ? wirkungKm2 / totalKm2 : 0;
  const hoverFill = {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 0,
    y2: 1,
    colorStops: [
      { offset: 0, color: '#16a34a' },
      { offset: wirkungShare, color: '#16a34a' },
      { offset: wirkungShare, color: '#dc2626' },
      { offset: 1, color: '#dc2626' },
    ],
  };
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: dark ? 'rgba(24,24,27,.97)' : 'rgba(255,255,255,.96)',
      borderColor: dark ? '#3f3f46' : '#e5e7eb',
      textStyle: { color: dark ? '#f4f4f5' : '#111827', fontSize: 12 },
      formatter: () => {
        const totalPct = mapTotalKm2 / DEUTSCHLAND_KM2 * 100;
        return [
          `Flächenbedarf`,
          `Anlagenfläche: ${fmtKm2(anlageKm2)} km²`,
          `Wirkfläche: ${fmtKm2(wirkungKm2)} km²`,
          `Wirkfläche Offshore: ${fmtKm2(offshoreWirkungKm2)} km²`,
          `Vorfläche: ${fmtKm2(vorFlaecheKm2)} km²`,
          `Summe: ${fmtKm2(mapTotalKm2)} km²`,
          `${totalPct.toLocaleString('de-DE', { maximumFractionDigits: totalPct < 1 ? 2 : 1 })} % von Deutschland`,
        ].join('<br/>');
      },
    },
    geo: {
      map: 'deutschland',
      roam: false,
      aspectScale: 0.75,
      layoutCenter: ['50%', '50%'],
      layoutSize: '92%',
      itemStyle: {
        areaColor: dark ? '#27272a' : '#f4f4f5',
        borderColor: dark ? '#52525b' : '#d4d4d8',
        borderWidth: 1.2,
      },
      emphasis: {
        disabled: true,
      },
    },
    series: [
      {
        type: 'map',
        map: 'deutschland',
        geoIndex: 0,
        silent: true,
        data: [{ name: 'Deutschland', value: DEUTSCHLAND_KM2 }],
      },
      {
        name: 'Flächenbedarf',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: totalSymbolSize,
        data: [{ name: 'Flächenbedarf', value: [10.45, 51.15, totalKm2] }],
        itemStyle: {
          color: '#16a34a',
          opacity: 0.76,
          borderColor: dark ? '#18181b' : '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: hoverFill,
            opacity: 0.9,
            borderColor: dark ? '#18181b' : '#ffffff',
            borderWidth: 2,
          },
        },
      },
      ...(offshoreWirkungKm2 > 0 ? [{
        name: 'Wirkfläche Offshore',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: offshoreSymbolSize,
        clip: false,
        data: [{ name: 'Wirkfläche Offshore', value: [7.6, 54.15, offshoreWirkungKm2] }],
        label: {
          show: true,
          formatter: 'Offshore',
          position: 'top',
          color: dark ? '#7dd3fc' : '#0369a1',
          fontSize: 11,
          fontWeight: 600,
        },
        itemStyle: {
          color: '#0284c7',
          opacity: 0.78,
          borderColor: dark ? '#18181b' : '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: '#0284c7',
            opacity: 0.92,
            borderColor: dark ? '#18181b' : '#ffffff',
            borderWidth: 2,
          },
        },
      }] : []),
      ...(vorFlaecheKm2 > 0 ? [{
        name: 'Vorfläche',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: vorSymbolSize,
        clip: false,
        data: [{ name: 'Vorfläche', value: [12.15, 51.15, vorFlaecheKm2] }],
        itemStyle: {
          color: '#f59e0b',
          opacity: 0.78,
          borderColor: dark ? '#18181b' : '#ffffff',
          borderWidth: 2,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            color: '#f59e0b',
            opacity: 0.92,
            borderColor: dark ? '#18181b' : '#ffffff',
            borderWidth: 2,
          },
        },
      }] : []),
    ],
  };
}

function useFlaecheMapChart(containerId: string, anlageKm2: number, wirkungKm2: number, offshoreWirkungKm2: number, vorFlaecheKm2: number, fmtKm2: (value: number) => string, theme: ChartTheme): boolean {
  const data = useMemo(() => ({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2, theme }), [anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2, theme]);
  return useMainThreadChart(containerId, data, (d, viewport) => buildFlaecheMapOption(d.anlageKm2, d.wirkungKm2, d.offshoreWirkungKm2, d.vorFlaecheKm2, d.fmtKm2, viewport, d.theme));
}

function FlaechePanel({ scenario, theme }: { scenario: Scenario; theme: ChartTheme }) {
  const rows = flaecheRows(scenario);
  const rows2025 = flaecheRows(scenarioBase);
  const offshoreWirkung = rows.find(r => r.id === 'windoff')?.wirkungKm2 ?? 0;
  const sumAnlage = rows.reduce((s, r) => s + r.anlageKm2, 0);
  const sumWirkung = rows.reduce((s, r) => s + r.wirkungKm2, 0);
  const sumWirkungInland = Math.max(0, sumWirkung - offshoreWirkung);
  const sumVor = rows.reduce((s, r) => s + (r.vorFlaecheKm2 ?? 0), 0);
  const sumGesamt = sumAnlage + sumWirkung + sumVor;
  const sum2025 = rows2025.reduce((s, r) => s + r.anlageKm2 + r.wirkungKm2 + (r.vorFlaecheKm2 ?? 0), 0);

  const fmtKm2 = (v: number) => v < 1 ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 }) : v < 100 ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : Math.round(v).toLocaleString('de-DE');

  return <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 dark:border-transparent dark:bg-zinc-950 sm:px-5 sm:py-5 lg:px-6">
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <StatCard title="Flächenbedarf" stats={[
        { label: 'Summe', value: `${fmtKm2(sumGesamt)} km²` },
        { label: 'gegen 2025', value: sum2025 > 0 ? `${(sumGesamt / sum2025).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` : '–' },
      ]}/>
      <StatCard title="Vergleich" stats={[
        { label: 'DE-Anteil', value: `${(sumGesamt / DEUTSCHLAND_KM2 * 100).toLocaleString('de-DE', { maximumFractionDigits: sumGesamt / DEUTSCHLAND_KM2 < 0.01 ? 2 : 1 })} %` },
        { label: 'Saarlands', value: `${(sumGesamt / SAARLAND_KM2).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` },
      ]}/>
    </div>

    <FlaecheMap anlageKm2={sumAnlage} wirkungKm2={sumWirkungInland} offshoreWirkungKm2={offshoreWirkung} vorFlaecheKm2={sumVor} rows={rows} fmtKm2={fmtKm2} theme={theme}/>
  </div>;
}

function FlaecheTechnologyTable({ rows, fmtKm2 }: { rows: FlaecheRow[]; fmtKm2: (value: number) => string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const sumGesamt = rows.reduce((s, r) => s + r.anlageKm2 + r.wirkungKm2 + (r.vorFlaecheKm2 ?? 0), 0);
  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  return <div className="mt-2 min-w-0 overflow-x-auto bg-white dark:bg-zinc-950">
    <table className="w-full min-w-[360px] text-sm">
      <thead className="text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="w-7 py-3 font-medium"/>
          <th className="py-3 font-medium">Technologie</th>
          <th className="py-3 text-right font-medium">Bestand</th>
          <th className="py-3 text-right font-medium">Summe</th>
        </tr>
      </thead>
      <tbody className="text-zinc-700 dark:text-zinc-300">
        {rows.map(row => {
          const summe = row.anlageKm2 + row.wirkungKm2 + (row.vorFlaecheKm2 ?? 0);
          const dim = row.gw === 0;
          const specGwhFmt = row.spezifischKm2PerGWh && row.spezifischKm2PerGWh > 0
            ? ` + ${row.spezifischKm2PerGWh.toLocaleString('de-DE', { maximumFractionDigits: 4 })} /GWh`
            : '';
          const km2PerTWhFmt = row.spezifischKm2PerTWh && row.twhPerGWa
            ? ` · ${row.spezifischKm2PerTWh.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km²/TWh (Yield ${row.twhPerGWa.toLocaleString('de-DE', { maximumFractionDigits: 1 })} TWh/GW·a)`
            : '';
          const isOpen = expanded.has(row.id);
          return <Fragment key={row.id}>
            <tr
              className={cx('cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/70', dim && 'text-zinc-300 dark:text-zinc-600')}
              aria-expanded={isOpen}
              onClick={() => toggle(row.id)}
            >
              <td className="py-2.5 align-middle">
                <ChevronRight className={cx('h-3.5 w-3.5 text-zinc-400 transition-transform', isOpen && 'rotate-90')}/>
              </td>
              <td className="py-2.5 pr-3">{row.label}</td>
              <td className="py-2.5 text-right tabular-nums">{row.gw.toLocaleString('de-DE', { maximumFractionDigits: 1 })} GW</td>
              <td className="py-2.5 text-right font-medium tabular-nums">{fmtKm2(summe)} km²</td>
            </tr>
            {isOpen && <tr className={cx('border-b border-zinc-100 bg-zinc-50/60 text-xs dark:border-zinc-800 dark:bg-zinc-950/40', dim && 'text-zinc-300 dark:text-zinc-600')}>
              <td className="py-3"/>
              <td colSpan={3} className="py-3">
                <dl className="grid gap-2">
                  <FlaecheDetailTerm label="Spezifisch" value={`${row.spezifischKm2PerGW.toLocaleString('de-DE', { maximumFractionDigits: 2 })} km²/GW${specGwhFmt}${km2PerTWhFmt}`}/>
                  <FlaecheDetailTerm label="Anlagenfläche" value={`${fmtKm2(row.anlageKm2)} km²`}/>
                  <FlaecheDetailTerm label="Wirkfläche" value={`${fmtKm2(row.wirkungKm2)} km²`}/>
                  {row.vorFlaecheKm2 !== undefined && row.vorFlaecheKm2 > 0 && <FlaecheDetailTerm label="Vorfläche" value={`${fmtKm2(row.vorFlaecheKm2)} km² (DE)${row.vorFlaecheTyp ? ` · ${row.vorFlaecheTyp}` : ''}`}/>}
                  {row.vorFlaecheAuslandKm2 !== undefined && row.vorFlaecheAuslandKm2 > 0 && <FlaecheDetailTerm label="Vorfläche Ausland" value={`${fmtKm2(row.vorFlaecheAuslandKm2)} km² (${row.vorFlaecheLand ?? 'extern'})${row.vorFlaecheTyp ? ` · ${row.vorFlaecheTyp}` : ''} — nicht in Summe (methodische Konsistenz: PV-Modulfertigung China zählt auch nicht)`}/>}
                  <FlaecheDetailTerm label="Kategorie" value={row.kategorie ?? '–'}/>
                </dl>
              </td>
            </tr>}
          </Fragment>;
        })}
      </tbody>
      <tfoot className="font-semibold text-zinc-950 dark:text-zinc-50">
        <tr>
          <td className="py-3"/>
          <td className="py-3">Summe</td>
          <td className="py-3"/>
          <td className="py-3 text-right tabular-nums">{fmtKm2(sumGesamt)} km²</td>
        </tr>
      </tfoot>
    </table>
  </div>;
}

function FlaecheDetailTerm({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[92px_1fr] gap-3">
    <dt className="text-zinc-400">{label}</dt>
    <dd className="break-words font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{value}</dd>
  </div>;
}

function FlaecheMap({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, rows, fmtKm2, theme }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; rows: FlaecheRow[]; fmtKm2: (value: number) => string; theme: ChartTheme }) {
  return <section className="mt-8 grid">
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.95fr)_minmax(420px,1.05fr)]">
      <div className="min-w-0">
        <FlaecheMapCard anlageKm2={anlageKm2} wirkungKm2={wirkungKm2} offshoreWirkungKm2={offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} rows={rows} fmtKm2={fmtKm2} theme={theme}/>
      </div>
      <div className="flex min-w-0 flex-col gap-4">
        <SaarlandComparison anlageKm2={anlageKm2} wirkungKm2={wirkungKm2} offshoreWirkungKm2={offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} fmtKm2={fmtKm2} theme={theme}/>
        <details className="group/det">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open/det:rotate-90"/>
            Details je Technologie
          </summary>
          <FlaecheTechnologyTable rows={rows} fmtKm2={fmtKm2}/>
        </details>
      </div>
    </div>
  </section>;
}

function FlaecheMapCard({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, rows, fmtKm2, theme }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; rows: FlaecheRow[]; fmtKm2: (value: number) => string; theme: ChartTheme }) {
  useFlaecheMapChart('flaeche-map', anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2, theme);
  const anlagePct = anlageKm2 / DEUTSCHLAND_KM2 * 100;
  const wirkungPct = wirkungKm2 / DEUTSCHLAND_KM2 * 100;
  const offshorePct = offshoreWirkungKm2 / DEUTSCHLAND_KM2 * 100;
  const vorPct = vorFlaecheKm2 / DEUTSCHLAND_KM2 * 100;
  // vorFlaeche-Länder gruppieren für Label-Anzeige
  const vorByLand: Record<string, number> = {};
  for (const r of rows) {
    if (r.vorFlaecheKm2 && r.vorFlaecheKm2 > 0) {
      const land = r.vorFlaecheLand ?? '–';
      vorByLand[land] = (vorByLand[land] ?? 0) + r.vorFlaecheKm2;
    }
  }
  const vorLandLabel = Object.entries(vorByLand)
    .sort((a, b) => b[1] - a[1])
    .map(([land, km2]) => `${land} ${fmtKm2(km2)}`)
    .join(' · ');
  return <div>
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Flächenbedarf in Deutschland</h2>
      <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-zinc-500">{fmtKm2(anlageKm2 + wirkungKm2 + offshoreWirkungKm2 + vorFlaecheKm2)} km² gesamt</span>
    </div>
    <div className="mt-4 bg-white dark:bg-zinc-950">
      <div id="flaeche-map" className="h-[360px] w-full"/>
      <div className="grid gap-2.5 border-t border-zinc-100 pb-2 pt-4 text-xs dark:border-zinc-800">
        <LegendMetric color="#dc2626" label="Anlagenfläche" value={`${anlagePct.toLocaleString('de-DE', { maximumFractionDigits: anlagePct < 1 ? 2 : 1 })} %`} meta="DE"/>
        <LegendMetric color="#16a34a" label="Wirkfläche" value={`${wirkungPct.toLocaleString('de-DE', { maximumFractionDigits: wirkungPct < 1 ? 2 : 1 })} %`} meta="DE"/>
        {offshoreWirkungKm2 > 0 && <LegendMetric color="#0284c7" label="Wirkfläche Offshore" value={`${offshorePct.toLocaleString('de-DE', { maximumFractionDigits: offshorePct < 1 ? 2 : 1 })} %`} meta="Nordsee/Ostsee"/>}
        {vorFlaecheKm2 > 0 && <LegendMetric color="#f59e0b" label="Vorfläche" value={`${vorPct.toLocaleString('de-DE', { maximumFractionDigits: vorPct < 1 ? 2 : 1 })} %`} meta={vorLandLabel || 'Brennstoff/Anbau'}/>}
      </div>
      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90"/>
          Was bedeuten die Flächentypen?
        </summary>
        <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Anlagenfläche = direkt versiegelt. Wirkfläche = Park/Sperrzone/Stauraum. Bei PV ist die Wirkfläche ein Flottenmix-Wert (6 km²/GW): der Aufdach-Anteil (~55–60 % der DE-PV) verbraucht kein Land, nur der Freiflächen-Anteil (~9 km²/GW real) zählt anteilig. Offshore-Wind wird blau außerhalb der Karte gezeigt. Vorfläche = DE-Inland-Brennstoff-/Anbaufläche (Biomasse-Acker, Braunkohle-Tagebau). Auslands-Brennstoffketten (Uran KZ/CA, Gas NO/US/QA, PV-Modulfertigung China) sind ausgeklammert — methodisch konsistent.
        </p>
      </details>
    </div>
  </div>;
}

function LegendMetric({ color, label, value, meta }: { color: string; label: string; value: string; meta: string }) {
  return <div className="flex items-baseline gap-2">
    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }}/>
    <span className="text-zinc-600 dark:text-zinc-300">{label}</span>
    <span className="ml-auto font-medium tabular-nums text-zinc-950 dark:text-zinc-50">{value}</span>
    <span className="tabular-nums text-zinc-400">{meta}</span>
  </div>;
}

function SaarlandComparison({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2, theme }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; fmtKm2: (value: number) => string; theme: ChartTheme }) {
  const totalKm2 = anlageKm2 + wirkungKm2 + offshoreWirkungKm2 + vorFlaecheKm2;
  const saarlands = totalKm2 / SAARLAND_KM2;
  const anlageTiles = anlageKm2 / SAARLAND_KM2;
  const wirkungTiles = wirkungKm2 / SAARLAND_KM2;
  const offshoreTiles = offshoreWirkungKm2 / SAARLAND_KM2;
  const vorTiles = vorFlaecheKm2 / SAARLAND_KM2;
  const visibleTileCount = Math.max(1, Math.ceil(saarlands));
  const saarlandTiles = Array.from({ length: visibleTileCount }, (_, index) => index);
  return <div className="group relative border-b border-zinc-100 bg-white pb-4 dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex items-baseline justify-between gap-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Saarland-Vergleich</h4>
      <span className="text-xs tabular-nums text-zinc-500">{saarlands.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Saarlands</span>
    </div>
    <div
      className="mt-4 grid grid-cols-12 gap-1.5"
      aria-label={`Entspricht ${saarlands.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Saarlands`}
    >
      {saarlandTiles.map(index => {
        const totalFill = Math.max(0, Math.min(1, saarlands - index));
        const anlageFill = Math.max(0, Math.min(totalFill, anlageTiles - index));
        const remainingAfterAnlage = totalFill - anlageFill;
        const wirkungFill = Math.max(0, Math.min(remainingAfterAnlage, wirkungTiles - Math.max(0, index - anlageTiles)));
        const remainingAfterWirkung = remainingAfterAnlage - wirkungFill;
        const offshoreFill = Math.max(0, Math.min(remainingAfterWirkung, offshoreTiles - Math.max(0, index - anlageTiles - wirkungTiles)));
        const redPct = anlageFill > 0 ? Math.max(8, Math.round(anlageFill * 100)) : 0;
        const greenEnd = redPct + (wirkungFill > 0 ? Math.max(8, Math.round(wirkungFill * 100)) : 0);
        const blueEnd = greenEnd + (offshoreFill > 0 ? Math.max(8, Math.round(offshoreFill * 100)) : 0);
        const totalPct = Math.round(totalFill * 100);
        return <span
          key={index}
          className="h-3.5 rounded-[3px] border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
          style={totalPct > 0 ? { background: `linear-gradient(90deg, #dc2626 0 ${redPct}%, #16a34a ${redPct}% ${greenEnd}%, #0284c7 ${greenEnd}% ${blueEnd}%, #f59e0b ${blueEnd}% ${totalPct}%, ${theme === 'dark' ? '#27272a' : '#f4f4f5'} ${totalPct}% 100%)` } : undefined}
        />;
      })}
    </div>
    <div className="pointer-events-none absolute left-4 top-full z-30 mt-2 w-[min(320px,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white p-3 text-xs opacity-0 shadow-lg ring-1 ring-zinc-950/5 transition group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-50/10">
      <div className="grid gap-2">
        <LegendMetric color="#dc2626" label="Anlagenfläche" value={anlageTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>
        <LegendMetric color="#16a34a" label="Wirkfläche" value={wirkungTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>
        {offshoreWirkungKm2 > 0 && <LegendMetric color="#0284c7" label="Wirkfläche Offshore" value={offshoreTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>}
        {vorFlaecheKm2 > 0 && <LegendMetric color="#f59e0b" label="Vorfläche" value={vorTiles.toLocaleString('de-DE', { maximumFractionDigits: 1 })} meta="Saarlands"/>}
      </div>
      <div className="mt-3 border-t border-zinc-100 pt-2 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{fmtKm2(totalKm2)} km²</span> gesamt. Eine Kachel entspricht <span className="font-medium tabular-nums text-zinc-900 dark:text-zinc-100">2.570 km²</span>.
      </div>
    </div>
  </div>;
}

export default function FlaecheSection({ scenario, theme }: { scenario: Scenario; theme: ChartTheme }) {
  return <section id="section-flaeche" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <SectionHeading id="flaeche"/>
    <FlaechePanel scenario={scenario} theme={theme}/>
  </section>;
}
