export function JsonTree({ value, label, defaultOpen = false, depth }: { value: unknown; label?: string; defaultOpen?: boolean; depth: number }) {
  if (value === null) return <Leaf label={label} text="null" className="text-zinc-400"/>;
  if (typeof value === 'string') return <Leaf label={label} text={JSON.stringify(value)} className="text-emerald-700 break-all"/>;
  if (typeof value === 'number' || typeof value === 'boolean') return <Leaf label={label} text={String(value)} className="text-sky-700"/>;
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
      {label !== undefined && <span className="text-zinc-700">{label}: </span>}
      <span className="text-zinc-400">{summary}{previewKeys && ` { ${previewKeys} }`}</span>
    </summary>
    <div className="ml-4 border-l border-zinc-200 pl-3">
      {entries.map(([k, v]) => <JsonTree key={k} label={k} value={v} depth={depth + 1}/>)}
    </div>
  </details>;
}

function Leaf({ label, text, className = '' }: { label?: string; text: string; className?: string }) {
  return <div className="pl-4">
    {label !== undefined && <span className="text-zinc-700">{label}: </span>}
    <span className={className || 'text-zinc-950'}>{text}</span>
  </div>;
}
