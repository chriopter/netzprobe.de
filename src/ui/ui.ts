export const shell = 'min-h-screen overflow-x-hidden bg-white px-0 py-0 text-zinc-950 sm:px-4 sm:py-3 lg:px-6';
export const panel = 'rounded-lg border border-zinc-200 bg-white';
export const sectionBox = 'rounded-lg border border-zinc-200 bg-white';
export const panelHeader = 'border-b border-zinc-200 bg-zinc-50/60';
export const field = 'h-9 w-full rounded-lg border border-zinc-200/80 bg-white px-3 text-sm text-zinc-950 outline-none transition hover:border-zinc-300 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-950/10';
export const iconButton = 'inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950/25';
export const rowHover = 'hover:bg-zinc-50';
export const rowActive = 'bg-zinc-50 ring-1 ring-inset ring-zinc-200';
export const iconTile = 'inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600';
export const sidebarInset = 'px-5 sm:px-6';
export const muted = 'text-zinc-500';

export const sidebarWidthClass = 'lg:w-[400px] xl:w-[425px]';
export const sidebarOffsetClass = 'lg:pl-[400px] xl:pl-[425px]';

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}
