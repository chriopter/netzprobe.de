import type {
  AussenhandelH2Data,
  AussenhandelStromData,
  DataSet,
  ErzPackageBaseload,
  ErzPackageDispatchable,
  ErzPackageVariableRe,
  GenerationHour,
  LoadHour,
  ModelFactorHour,
  SpeicherBatterieData,
  SpeicherH2Data,
  SpeicherPumpspeicherData,
  SplitDataFile,
} from '../../app/src/types/data';
import e100PkwPackage from '../../model/last/e100-pkw/package.json';
import e100HeizPackage from '../../model/last/e100-heiz/package.json';
import e100LkwPackage from '../../model/last/e100-lkw/package.json';
import e100BahnPackage from '../../model/last/e100-bahn/package.json';
import e100SchiffPackage from '../../model/last/e100-schiff/package.json';
import e100FlugPackage from '../../model/last/e100-flug/package.json';
import e100GhdPackage from '../../model/last/e100-ghd/package.json';
import e100IndustrieWaermePackage from '../../model/last/e100-industrie-waerme/package.json';
import e100StahlPackage from '../../model/last/e100-stahl/package.json';
import e100ChemiePackage from '../../model/last/e100-chemie/package.json';
import load2025Package from '../../model/last/2025/package.json';
import load2025Hours from '../../model/last/2025/hours.json';
import generation2025Package from '../../model/erzeugung/2025/package.json';
import generation2025Hours from '../../model/erzeugung/2025/hours.json';
import factor2025Package from '../../model/erzeugung/einspeisefaktoren-2025/package.json';
import erzPvPackage from '../../model/erzeugung/pv/package.json';
import erzWindOnPackage from '../../model/erzeugung/windon/package.json';
import erzWindOffPackage from '../../model/erzeugung/windoff/package.json';
import erzKernkraftPackage from '../../model/erzeugung/kernkraft/package.json';
import erzBiomassePackage from '../../model/erzeugung/biomasse/package.json';
import erzLaufwasserPackage from '../../model/erzeugung/laufwasser/package.json';
import erzGasPackage from '../../model/erzeugung/gas/package.json';
import erzKohlePackage from '../../model/erzeugung/kohle/package.json';
import aussenhandelStromPackage from '../../model/aussenhandel/strom-handel/package.json';
import aussenhandelH2Package from '../../model/aussenhandel/h2-handel/package.json';
import speicherBatteriePackage from '../../model/speicher/batterie/package.json';
import speicherPumpspeicherPackage from '../../model/speicher/pumpspeicher/package.json';
import speicherH2Package from '../../model/speicher/h2/package.json';
import kernConfigPackage from '../../model/kern/kern/package.json';

// Engine-Inputs liegen seit dem method/parameters-Refactor im parameters-Subtree.
type PackageJson = { parameters: unknown };
const packageData = <T>(pkg: unknown) => (pkg as PackageJson).parameters as T;

export const e100Pkw = packageData<DataSet['e100-pkw']>(e100PkwPackage);
export const e100Heiz = packageData<DataSet['e100-heiz']>(e100HeizPackage);
export const e100Lkw = packageData<DataSet['e100-lkw']>(e100LkwPackage);
export const e100Bahn = packageData<DataSet['e100-bahn']>(e100BahnPackage);
export const e100Schiff = packageData<DataSet['e100-schiff']>(e100SchiffPackage);
export const e100Flug = packageData<DataSet['e100-flug']>(e100FlugPackage);
export const e100Ghd = packageData<DataSet['e100-ghd']>(e100GhdPackage);
export const e100IndustrieWaerme = packageData<DataSet['e100-industrie-waerme']>(e100IndustrieWaermePackage);
export const e100Stahl = packageData<DataSet['e100-stahl']>(e100StahlPackage);
export const e100Chemie = packageData<DataSet['e100-chemie']>(e100ChemiePackage);

export const loadData: SplitDataFile<LoadHour> = { ...packageData<Omit<SplitDataFile<LoadHour>, 'hours'>>(load2025Package), hours: load2025Hours as LoadHour[] };
export const generationData: SplitDataFile<GenerationHour> = { ...packageData<Omit<SplitDataFile<GenerationHour>, 'hours'>>(generation2025Package), hours: generation2025Hours as GenerationHour[] };
export const factorData = packageData<SplitDataFile<ModelFactorHour>>(factor2025Package);

export const erzPv = packageData<ErzPackageVariableRe>(erzPvPackage);
export const erzWindOn = packageData<ErzPackageVariableRe>(erzWindOnPackage);
export const erzWindOff = packageData<ErzPackageVariableRe>(erzWindOffPackage);
export const erzKernkraft = packageData<ErzPackageBaseload>(erzKernkraftPackage);
export const erzBiomasse = packageData<ErzPackageBaseload>(erzBiomassePackage);
export const erzLaufwasser = packageData<ErzPackageBaseload>(erzLaufwasserPackage);
export const erzGas = packageData<ErzPackageDispatchable>(erzGasPackage);
export const erzKohle = packageData<ErzPackageDispatchable>(erzKohlePackage);
export const aussenhandelStrom = packageData<AussenhandelStromData>(aussenhandelStromPackage);
export const aussenhandelH2 = packageData<AussenhandelH2Data>(aussenhandelH2Package);
export const speicherBatterie = packageData<SpeicherBatterieData>(speicherBatteriePackage);
export const speicherPumpspeicher = packageData<SpeicherPumpspeicherData>(speicherPumpspeicherPackage);
export const speicherH2 = packageData<SpeicherH2Data>(speicherH2Package);
export const kernConfigData = packageData(kernConfigPackage);
