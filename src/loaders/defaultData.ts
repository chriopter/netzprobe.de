import type { DataSet } from '../types/data';

export async function loadDefaultData(): Promise<DataSet> {
  const response = await fetch('/data/deutschland-strommix-last-wetter-2025-stuendlich.json');
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${response.status}`);
  return response.json() as Promise<DataSet>;
}
