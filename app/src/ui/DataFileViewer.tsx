import { useEffect, useState } from 'react';
import { dataFileUrl } from './dataPackages';
import { JsonTree } from './JsonTree';
import { panel } from './ui';

const isJsonPath = (path: string) => path.endsWith('.json');

export function DataFileViewer({ path }: { path: string }) {
  const url = dataFileUrl(path);
  const root = path.startsWith('templates/') ? 'data' : 'model';
  const rawUrl = url;
  const json = isJsonPath(path);
  const [data, setData] = useState<unknown | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setText(null);
    setError(null);
    fetch(url)
      .then(r => r.ok ? (json ? r.json() : r.text()) : Promise.reject(new Error(`${r.status} ${r.statusText}`)))
      .then(value => {
        if (cancelled) return;
        if (json) setData(value as unknown);
        else setText(value as string);
      })
      .catch(e => {
        if (!cancelled) setError(String(e));
      });
    document.title = `${root}/${path} – Netzprobe`;
    return () => {
      cancelled = true;
    };
  }, [url, path, json]);

  return <main className="min-h-screen bg-white px-3 py-3 text-zinc-950 sm:px-4 lg:px-6">
    <div className={`${panel} mx-auto w-full max-w-4xl p-4 sm:p-5`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-zinc-200 pb-3">
        <div>
          <a href={import.meta.env.BASE_URL} className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">netzprobe.de</a>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]"><code>{root}/{path}</code></h1>
        </div>
        <a href={rawUrl} target="_blank" rel="noreferrer" className="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-950">raw</a>
      </div>
      <div className="mt-4 font-mono text-xs">
        {error ? <p className="text-red-600">Konnte nicht laden: {error}</p>
          : json
            ? (data === null ? <p className="text-zinc-500">Lade …</p> : <JsonTree value={data} defaultOpen depth={0}/>)
            : (text === null ? <p className="text-zinc-500">Lade …</p>
              : <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-950 p-4 text-[11px] leading-5 text-zinc-100"><code>{text}</code></pre>)}
      </div>
    </div>
  </main>;
}
