import type { DataSet } from './types';

export async function loadDefaultData(): Promise<DataSet> {
  const response = await fetch('/data/de-2025-hourly.json');
  if (!response.ok) throw new Error(`Daten konnten nicht geladen werden: ${response.status}`);
  return response.json() as Promise<DataSet>;
}
