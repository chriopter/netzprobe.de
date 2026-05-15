import data from './data.json';
import type { LoadHour, SplitDataFile } from '../../src/types/data';

export const last2017Data = data as SplitDataFile<LoadHour>;

export default last2017Data;
