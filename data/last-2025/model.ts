import data from './data.json';
import type { LoadHour, SplitDataFile } from '../../src/types/data';

export const last2025Data = data as SplitDataFile<LoadHour>;

export default last2025Data;
