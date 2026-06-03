export function JsonTree({ value, label, defaultOpen = false, depth }: { value: unknown; label?: string; defaultOpen?: boolean; depth: number }) {
  if (value === null) return <Leaf label={label} text="null" className="text-zinc-400"/>;
  if (typeof value === 'string') return <Leaf label={label} text={JSON.stringify(value)} className="break-all text-emerald-700 dark:text-emerald-400"/>;
  if (typeof value === 'number' || typeof value === 'boolean') return <Leaf label={label} text={String(value)} className="text-sky-700 dark:text-sky-400"/>;
  if (typeof value !== 'object') return <Leaf label={label} text={String(value)}/>;
  const isArray = Array.isArray(value);
  const entries: Array<[string, unknown]> = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const summary = isArray ? `Array[${entries.length}]` : `Object{${entries.length}}`;
  const previewKeys = !isArray && entries.length <= 4 ? entries.map(([k]) => k).join(', ') : '';
  return <details open={defaultOpen && depth < 1} className="group">
    <summary className="cursor-pointer list-none">
      <span className="mr-1 inline-block w-3 text-zinc-400 transition group-open:rotate-90">▸</span>
      {label !== undefined && <span className="text-zinc-700 dark:text-zinc-300">{label}: </span>}
      <span className="text-zinc-400 dark:text-zinc-500">{summary}{previewKeys && ` { ${previewKeys} }`}</span>
    </summary>
    <div className="ml-4 border-l border-zinc-200 pl-3 dark:border-zinc-800">
      {entries.map(([k, v]) => <JsonTree key={k} label={k} value={v} depth={depth + 1}/>)}
    </div>
  </details>;
}

function Leaf({ label, text, className = '' }: { label?: string; text: string; className?: string }) {
  return <div className="pl-4">
    {label !== undefined && <span className="text-zinc-700 dark:text-zinc-300">{label}: </span>}
    <span className={className || 'text-zinc-950 dark:text-zinc-50'}>{text}</span>
  </div>;
}
