import { useState } from 'react';
import { useApiStatus } from './apiStatus';
import { cx, iconButton, muted } from './ui';

// Schiebt sich bei Versions-Abweichung (neues Backend, altes Frontend) von oben ein.
// Nicht-blockierend: der äußere Layer ist pointer-events-none, nur die Karte selbst
// fängt Klicks, sodass weitergearbeitet werden kann.
export function UpdateBanner() {
  const { status } = useApiStatus();
  const [dismissed, setDismissed] = useState(false);
  const show = status === 'mismatch' && !dismissed;

  return <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center px-3 pt-3">
    <div
      role="status"
      aria-hidden={!show}
      className={cx(
        'pointer-events-auto flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-[13px] shadow-lg transition-all duration-300 ease-out dark:border-zinc-800 dark:bg-zinc-950',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-[150%] opacity-0',
      )}
    >
      <span className="font-medium">Netzprobe wurde aktualisiert.</span>
      <span className={cx('hidden sm:inline', muted)}>Seite neu laden für die neue Version.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-md bg-zinc-950 px-2.5 py-1 text-[12px] font-medium text-white transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-50/25"
      >Seite neu laden</button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hinweis schließen"
        className={iconButton}
      >×</button>
    </div>
  </div>;
}
