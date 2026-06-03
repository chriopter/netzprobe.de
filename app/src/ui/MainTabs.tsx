import { cx } from './ui';

type MainTab = 'simulation' | 'wiki';

export function MainTabs({ active }: { active: MainTab }) {
  const search = typeof window === 'undefined' ? '' : window.location.search;
  const tabs = [
    { id: 'simulation', label: 'Sim', href: `${import.meta.env.BASE_URL}${search}` },
    { id: 'wiki', label: 'Wiki', href: `${import.meta.env.BASE_URL}wiki/${search}` },
  ] as const;
  const activeIndex = tabs.findIndex(tab => tab.id === active);

  return <nav aria-label="Hauptbereiche" className="relative grid grid-cols-2 overflow-hidden rounded-full border border-zinc-200 bg-white p-0.5 text-[13px] font-medium leading-none dark:border-zinc-700 dark:bg-zinc-900">
    <span
      aria-hidden="true"
      className="absolute bottom-0.5 left-0.5 top-0.5 w-[calc((100%_-_4px)/2)] rounded-full bg-zinc-950 transition-transform duration-200 ease-out dark:bg-zinc-50"
      style={{ transform: `translateX(${Math.max(0, activeIndex) * 100}%)` }}
    />
    {tabs.map(tab => <a
      key={tab.id}
      href={tab.href}
      aria-current={active === tab.id ? 'page' : undefined}
      className={cx(
        'relative z-10 rounded-full px-3 py-1.5 text-center transition-colors duration-200',
        active === tab.id ? 'text-white dark:text-zinc-950' : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50',
      )}
    >{tab.label}</a>)}
  </nav>;
}
