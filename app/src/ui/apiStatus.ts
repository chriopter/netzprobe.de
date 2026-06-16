import { useEffect, useState } from 'react';

export type ApiStatus = 'checking' | 'connected' | 'mismatch' | 'offline';

type ApiStatusResponse = {
  ok: boolean;
  version?: {
    commit?: string;
  };
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

export type ApiStatusState = {
  status: ApiStatus;
  details: string;
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

const sameCommit = (apiCommit?: string) => {
  if (!apiCommit || apiCommit === 'unknown' || __BUILD_COMMIT__ === 'unknown') return true;
  return apiCommit === __BUILD_COMMIT__ || apiCommit.startsWith(__BUILD_COMMIT__) || __BUILD_COMMIT__.startsWith(apiCommit);
};

const POLL_MS = 45_000;

let state: ApiStatusState = { status: 'checking', details: 'API wird geprüft' };
const listeners = new Set<(s: ApiStatusState) => void>();
let timer: ReturnType<typeof setInterval> | undefined;

const emit = (next: ApiStatusState) => {
  state = next;
  for (const listener of listeners) listener(state);
};

const poll = () => {
  fetch('/api/status')
    .then(response => {
      if (!response.ok) throw new Error(`API ${response.status}`);
      return response.json() as Promise<ApiStatusResponse>;
    })
    .then(data => {
      const versionMismatch = data.ok && !sameCommit(data.version?.commit);
      emit({
        status: data.ok ? (versionMismatch ? 'mismatch' : 'connected') : 'offline',
        details: data.ok
          ? `API ${versionMismatch ? 'Version abweichend' : 'verbunden'} · Load ${data.load_average.one_minute.toLocaleString('de-DE', { maximumFractionDigits: 2 })} / ${formatCpu(data.cpu)} · ${formatMemory(data.memory)} · Uptime ${formatUptime(data.uptime_seconds)}`
          : 'API offline',
      });
    })
    .catch(() => {
      emit({ status: 'offline', details: 'API offline' });
    });
};

const subscribe = (listener: (s: ApiStatusState) => void): (() => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    poll();
    timer = setInterval(poll, POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
};

// Ein einziger Poller versorgt alle Abonnenten (Status-Punkt[e] + Update-Banner),
// damit /api/status nicht mehrfach parallel abgefragt wird.
export function useApiStatus(): ApiStatusState {
  const [snapshot, setSnapshot] = useState<ApiStatusState>(state);
  useEffect(() => subscribe(setSnapshot), []);
  return snapshot;
}
