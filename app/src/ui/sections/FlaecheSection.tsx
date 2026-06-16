import { Fragment, useMemo, useState, type ReactNode } from 'react';
import * as echarts from 'echarts/core';
import { ChevronRight } from 'lucide-react';
import type { Scenario } from '../../types/scenario';
import { useMainThreadChart } from '../chartHooks';
import type { ChartTheme, ChartViewport } from '../chartOptions';
import germanyGeoJson from '../germanyGeoJson.json';
import { defaultScenario, normalizeScenario } from '../scenarioPresets';
import { uiManifest } from '../uiManifest';
import { cx } from '../ui';
import { HelpDot, HelpPanel, ScreenshotButton, SectionHeading, StatCard, ViewPill, type SectionView } from '../sectionUi';

const scenarioBase = normalizeScenario(defaultScenario);

export type FlaecheRow = {
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

export function flaecheRows(scenario: Scenario): FlaecheRow[] {
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
      layoutCenter: ['57%', '50%'],
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
        label: {
          show: totalKm2 > 0,
          position: totalSymbolSize >= 76 ? 'inside' : 'bottom',
          formatter: totalSymbolSize >= 76
            ? `${(totalKm2 / DEUTSCHLAND_KM2 * 100).toLocaleString('de-DE', { maximumFractionDigits: 1 })} %\n${fmtKm2(totalKm2)} km²`
            : `${fmtKm2(totalKm2)} km²`,
          color: totalSymbolSize >= 76 ? '#ffffff' : (dark ? '#86efac' : '#15803d'),
          fontSize: totalSymbolSize >= 76 ? 13 : 11,
          fontWeight: 600,
          lineHeight: 17,
        },
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
          formatter: `Offshore\n${fmtKm2(offshoreWirkungKm2)} km²`,
          position: 'left',
          color: dark ? '#7dd3fc' : '#0369a1',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 14,
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
        label: {
          show: true,
          formatter: `Vorfläche\n${fmtKm2(vorFlaecheKm2)} km²`,
          position: 'bottom',
          color: dark ? '#fcd34d' : '#b45309',
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 14,
        },
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

function FlaechePanel({ scenario, theme, view }: { scenario: Scenario; theme: ChartTheme; view: SectionView }) {
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

  // Stat-Karten wandern in die rechte Spalte der Zwei-Spalten-Komposition
  // (links Karte/Tabelle, rechts die Daten).
  // Eine Karte statt zwei: Summe, Vielfaches gegenüber 2025 und der Anteil an
  // der Landesfläche mit explizitem Bezug. Die frühere „Saarlands"-Zeile war
  // ein Duplikat der Saarland-Vergleich-Karte darunter.
  const stats = <div className="grid gap-3">
    <StatCard title="Flächenbedarf" stats={[
      { label: 'Summe', value: `${fmtKm2(sumGesamt)} km²` },
      { label: 'zu 2025', value: sum2025 > 0 ? `${(sumGesamt / sum2025).toLocaleString('de-DE', { maximumFractionDigits: 1 })}×` : '–' },
      { label: 'Anteil DE', value: `${(sumGesamt / DEUTSCHLAND_KM2 * 100).toLocaleString('de-DE', { maximumFractionDigits: sumGesamt / DEUTSCHLAND_KM2 < 0.01 ? 2 : 1 })} %`},
    ]}/>
  </div>;

  // Kein gerahmter Panel-Wrapper um die Komposition: Die Sektion steht wie
  // Ressourcen direkt auf der Seite (Abbildung rahmenlos, Daten-Karten gerahmt).
  return <FlaecheMap anlageKm2={sumAnlage} wirkungKm2={sumWirkungInland} offshoreWirkungKm2={offshoreWirkung} vorFlaecheKm2={sumVor} rows={rows} fmtKm2={fmtKm2} theme={theme} view={view} stats={stats}/>;
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
  return <div className="min-w-0 overflow-x-auto bg-white dark:bg-zinc-950">
    <table className="w-full min-w-[360px] text-sm">
      <thead className="text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="w-7 py-3"/>
          <th className="py-3 font-semibold">Technologie</th>
          <th className="py-3 text-right font-semibold">Bestand</th>
          <th className="py-3 text-right font-semibold">Summe</th>
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

function FlaecheMap({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, rows, fmtKm2, theme, view, stats }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; rows: FlaecheRow[]; fmtKm2: (value: number) => string; theme: ChartTheme; view: SectionView; stats: ReactNode }) {
  // Spalten-Verhältnis wie die Ressourcen-Sektion: Karte/Tabelle links 2/3,
  // Daten-Karten rechts 1/3.
  return <section className="grid">
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-6">
      <div className="min-w-0">
        {view === 'grafisch'
          ? <FlaecheMapCard anlageKm2={anlageKm2} wirkungKm2={wirkungKm2} offshoreWirkungKm2={offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} fmtKm2={fmtKm2} theme={theme}/>
          : <FlaecheTechnologyTable rows={rows} fmtKm2={fmtKm2}/>}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        {stats}
        <SaarlandComparison anlageKm2={anlageKm2} wirkungKm2={wirkungKm2} offshoreWirkungKm2={offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} fmtKm2={fmtKm2} theme={theme}/>
        <FlaechenTypenPanel anlageKm2={anlageKm2} wirkungKm2={wirkungKm2} offshoreWirkungKm2={offshoreWirkungKm2} vorFlaecheKm2={vorFlaecheKm2} rows={rows} fmtKm2={fmtKm2} forceOpen={view === 'details'}/>
      </div>
    </div>
  </section>;
}

function FlaecheMapCard({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2, theme }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; fmtKm2: (value: number) => string; theme: ChartTheme }) {
  useFlaecheMapChart('flaeche-map', anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, fmtKm2, theme);
  const sumKm2 = anlageKm2 + wirkungKm2 + offshoreWirkungKm2 + vorFlaecheKm2;
  const sumPct = sumKm2 / DEUTSCHLAND_KM2 * 100;
  const legend: Array<{ color: string; label: string; km2: number }> = [
    { color: '#dc2626', label: 'Anlagenfläche', km2: anlageKm2 },
    { color: '#16a34a', label: 'Wirkfläche', km2: wirkungKm2 },
    ...(offshoreWirkungKm2 > 0 ? [{ color: '#0284c7', label: 'Wirkfläche Offshore', km2: offshoreWirkungKm2 }] : []),
    ...(vorFlaecheKm2 > 0 ? [{ color: '#f59e0b', label: 'Vorfläche', km2: vorFlaecheKm2 }] : []),
  ];
  // Rahmenlose Abbildung (analog Periodensystem): kompakte Typen-Legende in der
  // sonst leeren Karten-Ecke, Details stehen in den Karten rechts daneben.
  return <div className="relative min-w-0">
    <div id="flaeche-map" className="h-[540px] w-full"/>
    <div className="pointer-events-none absolute left-1 top-4 space-y-1.5 text-[11px] leading-4">
      {legend.map(item => <div key={item.label} className="flex items-baseline gap-1.5">
        <span aria-hidden className="h-2 w-2 shrink-0 self-center rounded-full" style={{ background: item.color }}/>
        <span className="text-zinc-500 dark:text-zinc-400">{item.label}</span>
        <span className="font-medium tabular-nums text-zinc-700 dark:text-zinc-300">{fmtKm2(item.km2)} km²</span>
      </div>)}
      <div className="pt-0.5 text-zinc-400 dark:text-zinc-500">
        Σ {fmtKm2(sumKm2)} km² · {sumPct.toLocaleString('de-DE', { maximumFractionDigits: sumPct < 1 ? 2 : 1 })} % von DE
      </div>
    </div>
  </div>;
}

// Flächentypen-Panel rechts neben der Karte: Kennzahl + Kurzerklärung je Typ,
// Farben identisch zu den Karten-Kreisen. Beantwortet „Was bedeuten die
// Flächentypen?" direkt am Wert statt in einem versteckten Disclosure.
function FlaechenTypenPanel({ anlageKm2, wirkungKm2, offshoreWirkungKm2, vorFlaecheKm2, rows, fmtKm2, forceOpen }: { anlageKm2: number; wirkungKm2: number; offshoreWirkungKm2: number; vorFlaecheKm2: number; rows: FlaecheRow[]; fmtKm2: (value: number) => string; forceOpen?: boolean }) {
  const pct = (km2: number) => `${(km2 / DEUTSCHLAND_KM2 * 100).toLocaleString('de-DE', { maximumFractionDigits: km2 / DEUTSCHLAND_KM2 * 100 < 1 ? 2 : 1 })} %`;
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
  const typen: Array<{ color: string; label: string; desc: string; km2: number; meta: string; show: boolean }> = [
    { color: '#dc2626', label: 'Anlagenfläche', desc: 'Direkt versiegelte Fläche der Anlagen — Fundamente, Module, Gebäude.', km2: anlageKm2, meta: 'DE', show: true },
    { color: '#16a34a', label: 'Wirkfläche', desc: 'Vom Park beanspruchtes Land — Rotorabstände, Sperrzonen, Stauraum; dazwischen meist weiter nutzbar.', km2: wirkungKm2, meta: 'DE', show: true },
    { color: '#0284c7', label: 'Wirkfläche Offshore', desc: 'Beanspruchte Meeresfläche der Offshore-Parks, liegt außerhalb der Landesfläche.', km2: offshoreWirkungKm2, meta: 'Nordsee/Ostsee', show: offshoreWirkungKm2 > 0 },
    { color: '#f59e0b', label: 'Vorfläche', desc: 'Vorgelagerte Brennstoff- und Anbaufläche im Inland — Energiepflanzen-Acker, Braunkohle-Tagebau.', km2: vorFlaecheKm2, meta: vorLandLabel || 'Brennstoff/Anbau', show: vorFlaecheKm2 > 0 },
  ];
  return <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Flächentypen</h4>
    <div className="mt-2 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
      {typen.filter(t => t.show).map(t => <details key={t.label} open={forceOpen} className="group/typ py-2 first:pt-0 last:pb-0">
        <summary className="flex cursor-pointer list-none items-center gap-2.5 [&::-webkit-details-marker]:hidden">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }}/>
          <span className="flex min-w-0 flex-1 items-center gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            <ChevronRight className="h-3 w-3 shrink-0 text-zinc-400 transition-transform group-open/typ:rotate-90 dark:text-zinc-500"/>
            <span className="truncate">{t.label}</span>
          </span>
          <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{pct(t.km2)}</span>
        </summary>
        <p className="mt-1 pl-9 text-[11px] leading-4 text-zinc-400 dark:text-zinc-500">{t.desc} <span className="whitespace-nowrap">Bezug: {t.meta}.</span></p>
      </details>)}
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
  // Gleiche Kachel-Geometrie wie die Ressourcen-Karten (SlotRow): 6 Spalten,
  // mindestens eine volle Zeile, damit Headroom sichtbar ist.
  const visibleTileCount = Math.max(6, Math.ceil(saarlands));
  const saarlandTiles = Array.from({ length: visibleTileCount }, (_, index) => index);
  return <div className="group relative rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
    <div className="flex items-baseline justify-between gap-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Saarland-Vergleich</h4>
      <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {saarlands.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
        <span className="ml-1 text-[11px] font-normal text-zinc-400 dark:text-zinc-500">Saarlands</span>
      </span>
    </div>
    <div
      className="mt-3 grid grid-cols-6 gap-1.5"
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
    <div className="pointer-events-none absolute left-3 top-full z-30 mt-1 w-[min(320px,calc(100vw-3rem))] rounded-md border border-zinc-200 bg-white p-3 text-xs opacity-0 shadow-lg ring-1 ring-zinc-950/5 transition group-hover:opacity-100 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-zinc-50/10">
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
  const [helpOpen, setHelpOpen] = useState(false);
  // Linke Spalte: Deutschlandkarte (Grafisch) oder Technologie-Tabelle (Details).
  const [view, setView] = useState<SectionView>('grafisch');
  return <section id="section-flaeche" className="flex flex-col gap-3 scroll-mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
    <div className="flex items-center gap-2">
      <SectionHeading id="flaeche"/>
      <HelpDot open={helpOpen} onToggle={() => setHelpOpen(open => !open)} label="Wie wird der Flächenbedarf berechnet?"/>
      <ScreenshotButton targetId="section-flaeche" filename="netzprobe-flaeche.png" label="Fläche als Bild speichern"/>
      <div className="ml-auto"><ViewPill view={view} onChange={setView}/></div>
    </div>
    {helpOpen && <HelpPanel>
      <p>Der Flächenbedarf summiert je Technologie Anlagen-, Wirk- und Vorfläche aus den Paket-Kennwerten (km²/GW bzw. km²/GWh) × Slider-Wert.</p>
      <ul>
        <li><strong>PV-Wirkfläche</strong> — Flottenmix-Wert 6 km²/GW: der Aufdach-Anteil (~55–60 % der DE-PV) verbraucht kein Land, nur der Freiflächen-Anteil (~9 km²/GW real) zählt anteilig.</li>
        <li><strong>Offshore-Wind</strong> — wird blau außerhalb der Karte gezeigt und zählt nicht zur Landesfläche.</li>
        <li><strong>Vorfläche</strong> — nur DE-Inland (Energiepflanzen-Acker, Braunkohle-Tagebau). Auslands-Brennstoffketten (Uran KZ/CA, Gas NO/US/QA, PV-Modulfertigung China) sind methodisch konsistent ausgeklammert.</li>
      </ul>
    </HelpPanel>}
    <FlaechePanel scenario={scenario} theme={theme} view={view}/>
  </section>;
}
