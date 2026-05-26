import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as echarts from 'echarts/core';
import type { ChartViewport } from './chartOptions';

export type ChartRoamState = { scale: number; x: number; y: number };

export function useMainThreadChart<TData>(
  containerId: string,
  data: TData | null,
  buildOption: (data: TData, viewport: ChartViewport) => echarts.EChartsCoreOption,
  roam: boolean = false,
): boolean {
  const chartRef = useRef<echarts.ECharts | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const roamCleanupRef = useRef<(() => void) | null>(null);
  const roamStateRef = useRef<ChartRoamState>({ scale: 1, x: 0, y: 0 });
  const [viewport, setViewport] = useState<ChartViewport>({ width: 0, height: 0 });
  const [pending, setPending] = useState(false);

  // Lazy-Init beim ersten Render mit Daten. Pending-Flag wird per double-RAF
  // wieder freigegeben (statt ECharts' 'finished'-Event, das mit
  // animation:false unzuverlässig feuert).
  useEffect(() => {
    if (!data) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    // Falls der Chart-Container zwischenzeitlich unmounted/remounted wurde
    // (z. B. Tab-Wechsel), zeigt chartRef noch auf die alte ECharts-Instanz
    // mit verlorenem DOM-Bezug. Dann dispose und neu init.
    if (chartRef.current && chartRef.current.getDom() !== el) {
      roamCleanupRef.current?.();
      roamCleanupRef.current = null;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chartRef.current.dispose();
      chartRef.current = null;
    }
    if (!chartRef.current) {
      const chart = echarts.init(el);
      chartRef.current = chart;
      setViewport({ width: el.clientWidth, height: el.clientHeight });
      const ro = new ResizeObserver(([entry]) => {
        const width = Math.round(entry.contentRect.width);
        const height = Math.round(entry.contentRect.height);
        setViewport(prev => prev.width === width && prev.height === height ? prev : { width, height });
        chart.resize();
      });
      ro.observe(el);
      resizeObserverRef.current = ro;
    }
    if (roam) {
      roamCleanupRef.current?.();
      roamCleanupRef.current = attachChartRoam(el, chartRef.current, roamStateRef);
    } else {
      roamCleanupRef.current?.();
      roamCleanupRef.current = null;
      roamStateRef.current = { scale: 1, x: 0, y: 0 };
      resetChartRoam(chartRef.current);
    }
    setPending(true);
    // notMerge: alte Option komplett verwerfen statt mergen. Sonst überleben
    // Polar-Achsen/Series-Coords den Wechsel auf Linien-Modus und der Chart
    // sieht unverändert aus.
    chartRef.current.setOption(buildOption(data, viewport), { notMerge: true });
    // Zwei RAFs: erste fired wenn Browser layoutet, zweite wenn der Frame
    // wirklich gemalt ist. Danach kann der Spinner aus.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPending(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, data, viewport, roam]);

  useEffect(() => () => {
    roamCleanupRef.current?.();
    roamCleanupRef.current = null;
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    chartRef.current?.dispose();
    chartRef.current = null;
  }, []);

  return pending;
}

export function chartViewportRoot(chart: echarts.ECharts): HTMLElement | null {
  const zr = chart.getZr() as unknown as { painter?: { getViewportRoot?: () => HTMLElement } };
  return zr.painter?.getViewportRoot?.() ?? null;
}

export function applyChartRoam(chart: echarts.ECharts, state: ChartRoamState) {
  const root = chartViewportRoot(chart);
  if (!root) return;
  root.style.transformOrigin = '0 0';
  root.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  root.style.willChange = 'transform';
}

export function resetChartRoam(chart: echarts.ECharts | null) {
  if (!chart) return;
  const root = chartViewportRoot(chart);
  if (!root) return;
  root.style.transform = '';
  root.style.transformOrigin = '';
  root.style.willChange = '';
}

export function attachChartRoam(el: HTMLElement, chart: echarts.ECharts, stateRef: MutableRefObject<ChartRoamState>) {
  const pointers = new Map<number, { x: number; y: number }>();
  let lastPinchDistance = 0;
  let lastTap = 0;
  // Wheel-Zoom erst nach Klick in den Chart aktivieren, sonst frisst der
  // Chart das Page-Scroll. Beim Verlassen mit dem Cursor wieder freigeben.
  let wheelActive = false;
  const clampScale = (scale: number) => Math.min(4, Math.max(1, scale));
  const setState = (next: ChartRoamState) => {
    stateRef.current = { ...next, scale: clampScale(next.scale) };
    if (stateRef.current.scale === 1) stateRef.current = { scale: 1, x: 0, y: 0 };
    applyChartRoam(chart, stateRef.current);
  };
  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const rect = el.getBoundingClientRect();
    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;
    const prev = stateRef.current;
    const scale = clampScale(prev.scale * factor);
    const ratio = scale / prev.scale;
    setState({
      scale,
      x: pointX - (pointX - prev.x) * ratio,
      y: pointY - (pointY - prev.y) * ratio,
    });
  };
  const onWheel = (event: WheelEvent) => {
    if (!wheelActive) return;
    event.preventDefault();
    zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.0015));
  };
  const onPointerDown = (event: PointerEvent) => {
    el.setPointerCapture(event.pointerId);
    wheelActive = true;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      lastPinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onPointerLeave = () => {
    wheelActive = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    const prevPoint = pointers.get(event.pointerId);
    if (!prevPoint) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1 && stateRef.current.scale > 1) {
      event.preventDefault();
      setState({
        ...stateRef.current,
        x: stateRef.current.x + event.clientX - prevPoint.x,
        y: stateRef.current.y + event.clientY - prevPoint.y,
      });
      return;
    }
    if (pointers.size === 2) {
      event.preventDefault();
      const [a, b] = [...pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (lastPinchDistance > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, distance / lastPinchDistance);
      lastPinchDistance = distance;
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    lastPinchDistance = 0;
    const now = Date.now();
    if (now - lastTap < 280) setState({ scale: 1, x: 0, y: 0 });
    lastTap = now;
  };
  el.style.touchAction = 'pan-y';
  el.addEventListener('wheel', onWheel, { passive: false });
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointermove', onPointerMove);
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('pointerleave', onPointerLeave);
  applyChartRoam(chart, stateRef.current);
  return () => {
    el.style.touchAction = '';
    el.removeEventListener('wheel', onWheel);
    el.removeEventListener('pointerdown', onPointerDown);
    el.removeEventListener('pointermove', onPointerMove);
    el.removeEventListener('pointerup', onPointerUp);
    el.removeEventListener('pointercancel', onPointerUp);
    el.removeEventListener('pointerleave', onPointerLeave);
  };
}

