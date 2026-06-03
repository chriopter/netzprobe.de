import { cx } from './ui';

type MainTab = 'simulation' | 'wiki';

export function MainTabs({ active }: { active: MainTab }) {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const tabs = [
    { id: 'simulation', label: 'Sim', href: `${import.meta.env.BASE_URL}${search}` },
    { id: 'wiki', label: 'Wiki', href: `${import.meta.env.BASE_URL}wiki/${search}` },
  ] as const;

  return <nav aria-label="Hauptbereiche" className="inline-flex shrink-0 rounded-full border border-zinc-200 bg-white p-0.5 text-[13px] font-medium leading-none dark:border-zinc-700 dark:bg-zinc-900">
    {tabs.map(tab => <a
      key={tab.id}
      href={tab.href}
      aria-current={active === tab.id ? 'page' : undefined}
      className={cx(
        'rounded-full px-3 py-1.5 transition',
        active === tab.id ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50',
      )}
    >{tab.label}</a>)}
  </nav>;
}
