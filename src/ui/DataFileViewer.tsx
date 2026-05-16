import { useEffect, useState } from 'react';
import { dataFileUrl } from './dataPackages';
import { JsonTree } from './JsonTree';
import { panel } from './ui';

export function DataFileViewer({ path }: { path: string }) {
  const url = dataFileUrl(path);
  const rawUrl = url;
  const [data, setData] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(url).then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status} ${r.statusText}`)))
      .then(setData).catch(e => setError(String(e)));
    document.title = `data/${path} – Netzprobe`;
  }, [url, path]);

  return <main className="min-h-screen bg-white px-3 py-3 text-zinc-950 sm:px-4 lg:px-6">
    <div className={`${panel} mx-auto w-full max-w-4xl p-4 sm:p-5`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-3">
        <div>
          <a href={import.meta.env.BASE_URL} className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">netzprobe.de</a>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]"><code>data/{path}</code></h1>
        </div>
        <a href={rawUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">raw</a>
      </div>
      <div className="mt-4 font-mono text-xs">
        {error ? <p className="text-red-600">Konnte nicht laden: {error}</p>
          : data === null ? <p className="text-zinc-500">Lade …</p>
          : <JsonTree value={data} defaultOpen depth={0}/>}
      </div>
    </div>
  </main>;
}
