const REPO_URL = 'https://github.com/chriopter/netzprobe';

export function DisclaimerFooter({ className = '' }: { className?: string }) {
  const buildTime = new Date(__BUILD_TIME__).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  return <footer className={className}>
    Vibecoded und schnell iteriert. Alle Eingangsgrößen sind dokumentierte Annahmen basierend auf öffentlichen Quellen, keine empirisch belastbaren Werte; Ergebnisse als grobe Orientierung lesen, nicht als Prognose. Code auf <a className="text-zinc-800 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-950" href={REPO_URL} target="_blank" rel="noreferrer">GitHub</a>. by <a className="text-zinc-800 underline decoration-zinc-400 underline-offset-4 hover:text-zinc-950" href="https://chriopter.de/imprint" target="_blank" rel="noreferrer" title="Impressum chriopter.de">chriopter.de</a>.
    <div className="mt-1 text-zinc-400">
      Build{' '}
      <a
        href={`${REPO_URL}/commits/main/`}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-zinc-500 underline decoration-zinc-300 underline-offset-4 hover:text-zinc-700 hover:decoration-zinc-500"
      >{__BUILD_COMMIT__}</a>
      {' · '}{buildTime}
    </div>
  </footer>;
}
