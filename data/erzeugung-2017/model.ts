import data from './data.json';
import type { GenerationHour, SplitDataFile } from '../../src/types/data';

export const erzeugung2017Data = data as SplitDataFile<GenerationHour>;

export default erzeugung2017Data;
