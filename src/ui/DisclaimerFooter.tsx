export function DisclaimerFooter({ className = '' }: { className?: string }) {
  return <footer className={className}>
    Vibecoded und schnell iteriert. Ergebnisse mit Vorsicht behandeln. Code auf <a className="text-zinc-800 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-950" href="https://github.com/chriopter/netzprobe" target="_blank" rel="noreferrer">GitHub</a>.
  </footer>;
}
