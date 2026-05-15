export const shell = 'min-h-screen overflow-x-hidden px-3 py-3 text-zinc-950 sm:px-4 lg:px-6';
export const panel = 'rounded-xl border border-zinc-200/80 bg-white';
export const sectionBox = 'rounded-xl border border-zinc-200/80 bg-white';
export const field = 'h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-400';
export const muted = 'text-zinc-500';

export const sidebarWidthClass = 'lg:w-[400px] xl:w-[425px]';
export const sidebarOffsetClass = 'lg:pl-[412px] xl:pl-[437px]';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
