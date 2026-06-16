import { useApiStatus } from './apiStatus';

export function ApiStatusDot() {
  const { status, details } = useApiStatus();

  const className = status === 'connected'
    ? 'bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
    : status === 'mismatch'
      ? 'bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]'
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
