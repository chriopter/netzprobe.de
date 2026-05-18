import { useEffect, useState } from 'react';

type ApiStatus = 'checking' | 'connected' | 'offline';
type ApiStatusResponse = {
  ok: boolean;
  uptime_seconds: number;
  load_average: {
    one_minute: number;
    five_minutes: number;
    fifteen_minutes: number;
  };
  memory: {
    used_mb: number;
    total_mb?: number | null;
    available_mb?: number | null;
    source: 'cgroup' | 'proc';
  };
  cpu: {
    cores: number;
    source: 'cgroup' | 'proc';
  };
};

const formatUptime = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours} h ${restMinutes} min`;
};

const formatMemory = (memory: ApiStatusResponse['memory']) => {
  if (memory.total_mb) {
    return `RAM ${memory.used_mb.toLocaleString('de-DE')}/${memory.total_mb.toLocaleString('de-DE')} MB`;
  }
  return `RAM ${memory.used_mb.toLocaleString('de-DE')} MB`;
};

const formatCpu = (cpu: ApiStatusResponse['cpu']) =>
  `${cpu.cores.toLocaleString('de-DE', { maximumFractionDigits: 1 })} CPU`;

export function ApiStatusDot() {
  const [status, setStatus] = useState<ApiStatus>('checking');
  const [details, setDetails] = useState<string>('API wird geprüft');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/status')
      .then(response => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json() as Promise<ApiStatusResponse>;
      })
      .then(data => {
        if (cancelled) return;
        setStatus(data.ok ? 'connected' : 'offline');
        setDetails(data.ok
          ? `API verbunden · Load ${data.load_average.one_minute.toLocaleString('de-DE', { maximumFractionDigits: 2 })} / ${formatCpu(data.cpu)} · ${formatMemory(data.memory)} · Uptime ${formatUptime(data.uptime_seconds)}`
          : 'API offline');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('offline');
          setDetails('API offline');
        }
      });
    return () => { cancelled = true; };
  }, []);

  const className = status === 'connected'
    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
    : status === 'offline'
      ? 'bg-zinc-300'
      : 'animate-pulse bg-zinc-300';
  const label = status === 'checking' ? 'API wird geprüft' : details;

  return <span
    aria-label={label}
    title={label}
    className={`inline-block h-2.5 w-2.5 shrink-0 translate-y-px rounded-full ${className}`}
  />;
}
