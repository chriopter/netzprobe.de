export const shell = 'min-h-screen overflow-x-clip bg-white px-0 py-0 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-100 sm:px-4 sm:py-3 lg:px-6';
export const panel = 'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';
export const sectionBox = 'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900';
export const panelHeader = 'border-b border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/90';
export const field = 'h-9 w-full rounded-lg border border-zinc-200/80 bg-white px-3 text-sm text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-zinc-400 dark:focus:ring-zinc-100/10';
export const iconButton = 'inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:ring-zinc-50/25';
export const rowHover = 'hover:bg-zinc-50 dark:hover:bg-zinc-800/70';
export const rowActive = 'bg-zinc-50 ring-1 ring-inset ring-zinc-200 dark:bg-zinc-800/70 dark:ring-zinc-700';
export const iconTile = 'inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
export const sidebarInset = 'px-5 sm:px-6';
export const muted = 'text-zinc-500 dark:text-zinc-400';

export const sidebarWidthClass = 'lg:w-[400px] xl:w-[425px]';
export const sidebarOffsetClass = 'lg:pl-[400px] xl:pl-[425px]';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
