import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, PolarComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { buildMixChartOption, buildStorageChartOption, type ChartMode, type MixVisibility } from './chartOptions';
import type { SimHour } from '../simulation/engine';

echarts.use([LineChart, GridComponent, LegendComponent, PolarComponent, TooltipComponent, CanvasRenderer]);

type InitMessage = {
  type: 'init';
  id: 'mix' | 'storage';
  canvas: OffscreenCanvas;
  width: number;
  height: number;
  dpr: number;
};
type MixDataMessage = {
  type: 'mix-data';
  hours: SimHour[];
  visibility: MixVisibility;
  mode: ChartMode;
};
type StorageDataMessage = {
  type: 'storage-data';
  hours: SimHour[];
};
type ResizeMessage = {
  type: 'resize';
  id: 'mix' | 'storage';
  width: number;
  height: number;
};
type DisposeMessage = {
  type: 'dispose';
  id: 'mix' | 'storage';
};
type ChartWorkerMessage = InitMessage | MixDataMessage | StorageDataMessage | ResizeMessage | DisposeMessage;

const charts = new Map<'mix' | 'storage', echarts.ECharts>();

function announceRendered(id: 'mix' | 'storage') {
  // Erst nach dem nächsten Frame melden, damit der Pixel-Inhalt wirklich
  // im OffscreenCanvas committed ist — der Main-Thread schaltet erst
  // dann den Loading-Indicator aus, wenn der User auch wirklich was sieht.
  requestAnimationFrame(() => {
    (self as unknown as { postMessage: (data: unknown) => void }).postMessage({ type: 'rendered', id });
  });
}

self.addEventListener('message', (event: MessageEvent<ChartWorkerMessage>) => {
  const msg = event.data;
  if (msg.type === 'init') {
    const existing = charts.get(msg.id);
    if (existing) existing.dispose();
    const chart = echarts.init(msg.canvas as unknown as HTMLCanvasElement, null, {
      width: msg.width,
      height: msg.height,
      devicePixelRatio: msg.dpr,
    });
    charts.set(msg.id, chart);
    return;
  }
  if (msg.type === 'mix-data') {
    const chart = charts.get('mix');
    if (!chart) return;
    const option = buildMixChartOption(msg.hours, msg.visibility, msg.mode);
    chart.setOption(option, { notMerge: true, lazyUpdate: false });
    announceRendered('mix');
    return;
  }
  if (msg.type === 'storage-data') {
    const chart = charts.get('storage');
    if (!chart) return;
    const option = buildStorageChartOption(msg.hours);
    chart.setOption(option, { notMerge: true, lazyUpdate: false });
    announceRendered('storage');
    return;
  }
  if (msg.type === 'resize') {
    const chart = charts.get(msg.id);
    if (!chart) return;
    chart.resize({ width: msg.width, height: msg.height });
    return;
  }
  if (msg.type === 'dispose') {
    const chart = charts.get(msg.id);
    if (!chart) return;
    chart.dispose();
    charts.delete(msg.id);
  }
});
