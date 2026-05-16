import type { CoreModel, CoreModelInput } from '../../src/simulation/coreModel';
import { demandGW } from '../../src/simulation/demand';
import type { DemandScenarioContext } from '../../src/simulation/demandModule';
import type { SimHour, SimulationResult } from '../../src/simulation/types';
import type {
  ErzeugungsModellBaseloadSource,
  ErzeugungsModellDispatchableSource,
  ErzeugungsModellSourceId,
  ErzeugungsModellVariableReSource,
  ErzeugungsPool,
  HourlyInput,
  SpeicherPool,
} from '../../src/types/data';
import type { Scenario } from '../../src/types/scenario';

const EPS = 1e-9;

type StorageId = 'batterie' | 'pumpspeicher' | 'h2';

type StorageState = Record<StorageId, number>;

type StorageSlot = {
  id: StorageId;
  chargePowerGW: number;
  dischargePowerGW: number;
  energyGWh: number;
  eta: number;
  priority: number;
};

function initialStorageState(speicher: SpeicherPool, scenario: Scenario): StorageState {
  return {
    batterie: scenario.storage.batterieEnergyGWh * speicher.storages.batterie.initialStateOfChargeFraction,
    pumpspeicher: scenario.storage.pumpspeicherEnergyGWh * speicher.storages.pumpspeicher.initialStateOfChargeFraction,
    h2: scenario.storage.h2EnergyGWh * speicher.storages.h2.initialStateOfChargeFraction,
  };
}

function storageSlots(speicher: SpeicherPool, scenario: Scenario): StorageSlot[] {
  const slots: StorageSlot[] = [
    {
      id: 'batterie',
      chargePowerGW: scenario.storage.batteriePowerGW,
      dischargePowerGW: scenario.storage.batteriePowerGW,
      energyGWh: scenario.storage.batterieEnergyGWh,
      eta: speicher.storages.batterie.roundtripEfficiency,
      priority: speicher.storages.batterie.dispatchPriority,
    },
    {
      id: 'pumpspeicher',
      chargePowerGW: scenario.storage.pumpspeicherPowerGW,
      dischargePowerGW: scenario.storage.pumpspeicherPowerGW,
      energyGWh: scenario.storage.pumpspeicherEnergyGWh,
      eta: speicher.storages.pumpspeicher.roundtripEfficiency,
      priority: speicher.storages.pumpspeicher.dispatchPriority,
    },
    {
      id: 'h2',
      chargePowerGW: scenario.storage.h2ChargePowerGW,
      dischargePowerGW: scenario.storage.h2DischargePowerGW,
      energyGWh: scenario.storage.h2EnergyGWh,
      eta: speicher.storages.h2.roundtripEfficiency,
      priority: speicher.storages.h2.dispatchPriority,
    },
  ];
  return slots.sort((a, b) => a.priority - b.priority);
}

type VariableReBuild = {
  pvAvailableGW: number;
  windOnAvailableGW: number;
  windOffAvailableGW: number;
  kernkraftAvailableGW: number;
  biomasseGW: number;
  laufwasserGW: number;
  gasMinGW: number;
  kohleMinGW: number;
  gasMaxGW: number;
  kohleMaxGW: number;
};

function buildSupply(row: HourlyInput, scenario: Scenario, erz: ErzeugungsPool): VariableReBuild {
  const sources = erz.sources;
  const pv = sources.pv as ErzeugungsModellVariableReSource;
  const windOn = sources.windOn as ErzeugungsModellVariableReSource;
  const windOff = sources.windOff as ErzeugungsModellVariableReSource;
  const kernkraft = sources.kernkraft as ErzeugungsModellBaseloadSource;
  const biomasse = sources.biomasse as ErzeugungsModellBaseloadSource;
  const laufwasser = sources.laufwasser as ErzeugungsModellBaseloadSource;
  const gas = sources.gas as ErzeugungsModellDispatchableSource;
  const kohle = sources.kohle as ErzeugungsModellDispatchableSource;

  const solarFactor = row.solarIrradiance[0] ?? 0;
  const windFactor = row.wind100m[0] ?? 0;

  // Capacity-Factor-Multiplier auf solarFactor / windFactor — bildet
  // technologischen Fortschritt zwischen heutiger Flotte (einspeisefaktoren-2025
  // ist der Energy-Charts-Realwert 2025: PV ~702 kWh/kWp/a, Wind onshore+offshore
  // gemischt ~1745 VLH) und einer Neubau-Flotte ab.
  //
  // - PV: Default 1.0 (Bestand mit Aufdach-Anlagen aller Bauart). 1.5 ≈ moderne
  //   bifaziale Module + Süd-Tracker (~1100 kWh/kWp/a, BSW Solar / Fraunhofer ISE).
  // - Wind onshore: Default 1.0 (Bestandsflotte, viele 1.5-3 MW Altanlagen). 1.4 ≈
  //   Neubau 4-6 MW Klasse mit ~2400 VLH (BWE Neubau-Statistik 2024).
  // - Wind offshore: Default 1.8 — kompensiert dass `windFactor` in
  //   `einspeisefaktoren-2025` aus dem GEMITTELTEN 73-GW-Wind-Bestand stammt
  //   (62 GW onshore + 9 GW offshore), wodurch der Offshore-Vorteil sonst
  //   verschluckt würde. 1.8 hebt den Faktor auf reale Offshore-VLH (~4000 für
  //   15 MW-Klasse / Nordsee, BSH/Fraunhofer IWES). Wer rein historisch
  //   simulieren will, setzt 1.0.
  //
  // `Math.min(1, …)` cap'd den Stunden-Faktor bei 100% Nennleistung — keine
  // Anlage liefert über Nameplate. Auf Jahressumme verliert das einzelne
  // Spitzenstunden, der durchschnittliche Multiplier-Effekt bleibt korrekt.
  const pvMult = scenario.generation.pvCapacityFactorMultiplier;
  const windOnMult = scenario.generation.windOnCapacityFactorMultiplier;
  const windOffMult = scenario.generation.windOffCapacityFactorMultiplier;
  const pvAvailableGW = scenario.generation.pvInstalledGW * Math.min(1, solarFactor * pvMult);
  const windOnAvailableGW = scenario.generation.windOnInstalledGW * Math.min(1, windFactor * windOnMult);
  const windOffAvailableGW = scenario.generation.windOffInstalledGW * Math.min(1, windFactor * windOffMult);
  const kernkraftAvailableGW = scenario.generation.kernkraftInstalledGW * kernkraft.availability;
  const biomasseGW = scenario.generation.biomasseInstalledGW * biomasse.availability;
  const laufwasserGW = scenario.generation.laufwasserInstalledGW * laufwasser.availability;
  const gasMinGW = scenario.generation.gasInstalledGW * gas.availability * gas.minLoadFraction;
  const kohleMinGW = scenario.generation.kohleInstalledGW * kohle.availability * kohle.minLoadFraction;
  const gasMaxGW = scenario.generation.gasInstalledGW * gas.availability;
  const kohleMaxGW = scenario.generation.kohleInstalledGW * kohle.availability;

  return {
    pvAvailableGW, windOnAvailableGW, windOffAvailableGW, kernkraftAvailableGW,
    biomasseGW, laufwasserGW, gasMinGW, kohleMinGW, gasMaxGW, kohleMaxGW,
  };
}

type ChargeResult = { chargedGW: number; newSocGWh: number };
type DischargeResult = { dischargedGW: number; newSocGWh: number };

function chargeStorage(remainingGW: number, powerGW: number, eta: number, socGWh: number, energyGWh: number): ChargeResult {
  if (remainingGW <= 0 || powerGW <= 0 || energyGWh <= 0 || socGWh >= energyGWh - EPS) {
    return { chargedGW: 0, newSocGWh: socGWh };
  }
  const freeEnergyGWh = energyGWh - socGWh;
  const maxAcceptGW = Math.min(powerGW, freeEnergyGWh / Math.max(eta, EPS));
  const chargedGW = Math.min(remainingGW, maxAcceptGW);
  return { chargedGW, newSocGWh: socGWh + chargedGW * eta };
}

function dischargeStorage(neededGW: number, powerGW: number, socGWh: number): DischargeResult {
  if (neededGW <= 0 || powerGW <= 0 || socGWh <= EPS) {
    return { dischargedGW: 0, newSocGWh: socGWh };
  }
  const dischargedGW = Math.min(neededGW, powerGW, socGWh);
  return { dischargedGW, newSocGWh: socGWh - dischargedGW };
}

type CurtailResult = {
  pvCurtailedGW: number;
  windOnCurtailedGW: number;
  windOffCurtailedGW: number;
  kernkraftCurtailedGW: number;
  remainingGW: number;
};

function curtailVariableSources(excessGW: number, build: VariableReBuild, order: ErzeugungsModellSourceId[]): CurtailResult {
  let remaining = excessGW;
  let pvCurtailedGW = 0;
  let windOnCurtailedGW = 0;
  let windOffCurtailedGW = 0;
  let kernkraftCurtailedGW = 0;
  for (const id of order) {
    if (remaining <= EPS) break;
    if (id === 'pv') {
      const take = Math.min(remaining, build.pvAvailableGW - pvCurtailedGW);
      pvCurtailedGW += take;
      remaining -= take;
    } else if (id === 'windOn') {
      const take = Math.min(remaining, build.windOnAvailableGW - windOnCurtailedGW);
      windOnCurtailedGW += take;
      remaining -= take;
    } else if (id === 'windOff') {
      const take = Math.min(remaining, build.windOffAvailableGW - windOffCurtailedGW);
      windOffCurtailedGW += take;
      remaining -= take;
    } else if (id === 'kernkraft') {
      const take = Math.min(remaining, build.kernkraftAvailableGW - kernkraftCurtailedGW);
      kernkraftCurtailedGW += take;
      remaining -= take;
    }
  }
  return { pvCurtailedGW, windOnCurtailedGW, windOffCurtailedGW, kernkraftCurtailedGW, remainingGW: Math.max(0, remaining) };
}

type RampResult = { gasRampGW: number; kohleRampGW: number; remainingGW: number };

function rampDispatchables(deficitGW: number, gasHeadroomGW: number, kohleHeadroomGW: number, gasRatio: number, kohleRatio: number): RampResult {
  if (deficitGW <= EPS) return { gasRampGW: 0, kohleRampGW: 0, remainingGW: 0 };
  const totalRatio = Math.max(gasRatio + kohleRatio, EPS);
  let gasShare = deficitGW * (gasRatio / totalRatio);
  let kohleShare = deficitGW * (kohleRatio / totalRatio);
  let gasRampGW = Math.min(gasShare, Math.max(0, gasHeadroomGW));
  let kohleRampGW = Math.min(kohleShare, Math.max(0, kohleHeadroomGW));
  let remaining = deficitGW - gasRampGW - kohleRampGW;
  if (remaining > EPS) {
    const gasSlack = Math.max(0, gasHeadroomGW - gasRampGW);
    const kohleSlack = Math.max(0, kohleHeadroomGW - kohleRampGW);
    const extraGas = Math.min(remaining, gasSlack);
    gasRampGW += extraGas;
    remaining -= extraGas;
    const extraKohle = Math.min(remaining, kohleSlack);
    kohleRampGW += extraKohle;
    remaining -= extraKohle;
  }
  return { gasRampGW, kohleRampGW, remainingGW: Math.max(0, remaining) };
}

type EmissionFactors = {
  pv: number; windOn: number; windOff: number;
  kern: number; biomasse: number; laufwasser: number;
  gas: number; kohle: number; importGperKWh: number;
};

function buildHistoricalHour(
  row: HourlyInput,
  loadGW: number,
  emissions: EmissionFactors,
): SimHour {
  const pvGW = row.observed.pvMW / 1000;
  const windOnGW = row.observed.windOnMW / 1000;
  const windOffGW = row.observed.windOffMW / 1000;
  const biomasseGW = (row.observed.biomassMW ?? 0) / 1000;
  const laufwasserGW = (row.observed.hydroMW ?? 0) / 1000;
  const gasGW = row.observed.gasMW / 1000;
  const kohleGW = row.observed.coalMW / 1000;
  const kernkraftGW = (row.observed.nuclearMW ?? 0) / 1000;
  const geothermalGW = (row.observed.geothermalMW ?? 0) / 1000;
  const wasteGW = (row.observed.wasteMW ?? 0) / 1000;
  const oilGW = (row.observed.oilMW ?? 0) / 1000;
  const otherGW = (row.observed.otherMW ?? 0) / 1000;

  const observedImportGW = Math.max(0, row.observed.importExportMW) / 1000;
  const observedExportGW = Math.max(0, -row.observed.importExportMW) / 1000;
  const historicalLoadGW = row.loadMW / 1000;

  const supplyTotal = pvGW + windOnGW + windOffGW + biomasseGW + laufwasserGW + gasGW + kohleGW + geothermalGW + wasteGW + oilGW + otherGW;
  const dataBoundaryResidualGW = historicalLoadGW + observedExportGW - supplyTotal - observedImportGW;

  const extraLoadGW = Math.max(0, loadGW - historicalLoadGW);
  // Historischer Pass-Through nutzt einen physikalisch motivierten NTC-Cap (~25 GW reales DE-Grid-Limit
  // laut ENTSO-E 2025), nicht den User-Slider. So fängt zB e100-pkw (~138 TWh extra) noch in den NTC,
  // während Vollelektrifizierung (2000+ TWh extra) das Cap deutlich übersteigt → Fehlend wird sichtbar.
  const HISTORICAL_NTC_CAP_GW = 35;
  const importCapHeadroomGW = Math.max(0, HISTORICAL_NTC_CAP_GW - observedImportGW);
  const automaticImportGW = Math.min(extraLoadGW, importCapHeadroomGW);
  const loadSheddingGW = Math.max(0, extraLoadGW - automaticImportGW);
  const importGW = observedImportGW + automaticImportGW;
  const exportGW = observedExportGW;

  const co2Tph =
    pvGW * emissions.pv + windOnGW * emissions.windOn + windOffGW * emissions.windOff
    + biomasseGW * emissions.biomasse + laufwasserGW * emissions.laufwasser
    + gasGW * emissions.gas + kohleGW * emissions.kohle
    + importGW * emissions.importGperKWh;

  const supplyGW = supplyTotal;
  const balanceGW = supplyGW + importGW + loadSheddingGW + dataBoundaryResidualGW - loadGW - exportGW;

  return {
    time: row.time,
    loadGW,
    pvGW, windOnGW, windOffGW,
    kernkraftGW, biomasseGW, laufwasserGW,
    gasGW, kohleGW,
    pvCurtailedGW: 0, windOnCurtailedGW: 0, windOffCurtailedGW: 0, kernkraftCurtailedGW: 0,
    importGW, exportGW,
    storageChargeGW: 0, storageDischargeGW: 0,
    batterieChargeGW: 0, batterieDischargeGW: 0,
    pumpspeicherChargeGW: 0, pumpspeicherDischargeGW: 0,
    h2ChargeGW: 0, h2DischargeGW: 0,
    batterieSocGWh: 0, pumpspeicherSocGWh: 0, h2SocGWh: 0,
    curtailmentGW: 0, loadSheddingGW,
    supplyGW, balanceGW,
    co2Tph,
    solarGW: pvGW,
    biomassGW: biomasseGW,
    hydroGW: laufwasserGW,
    geothermalGW, wasteGW, oilGW, otherGW,
    coalGW: kohleGW,
    nuclearGW: kernkraftGW,
    historicalImportGW: observedImportGW,
    historicalExportGW: observedExportGW,
    dataBoundaryResidualGW,
    batteryGWh: 0,
    h2GWh: 0,
  };
}

export function runKernmodell(input: CoreModelInput): SimulationResult {
  const scenario = input.scenario;
  const erz = input['erzeugungs-modell'];
  const speicher = input['speicher-modell'];
  const slots = storageSlots(speicher, scenario);
  const demandContext: DemandScenarioContext = {
    'e100-pkw': input['e100-pkw'],
    'e100-heiz': input['e100-heiz'],
    'e100-lkw': input['e100-lkw'],
    'e100-bahn': input['e100-bahn'],
    'e100-schiff': input['e100-schiff'],
    'e100-flug': input['e100-flug'],
    'e100-ghd': input['e100-ghd'],
    'e100-industrie-waerme': input['e100-industrie-waerme'],
    'e100-stahl': input['e100-stahl'],
    'e100-chemie': input['e100-chemie'],
  };

  const importLimitGW = scenario.generation.importMaxGW;
  const exportLimitGW = scenario.generation.exportMaxGW;
  const importEmissionGperKWh = scenario.generation.importEmissionGperKWh;
  const emPv = (erz.sources.pv as ErzeugungsModellVariableReSource).emissionGperKWh;
  const emWindOn = (erz.sources.windOn as ErzeugungsModellVariableReSource).emissionGperKWh;
  const emWindOff = (erz.sources.windOff as ErzeugungsModellVariableReSource).emissionGperKWh;
  const emKern = (erz.sources.kernkraft as ErzeugungsModellBaseloadSource).emissionGperKWh;
  const emBiomasse = (erz.sources.biomasse as ErzeugungsModellBaseloadSource).emissionGperKWh;
  const emLaufwasser = (erz.sources.laufwasser as ErzeugungsModellBaseloadSource).emissionGperKWh;
  const emGas = (erz.sources.gas as ErzeugungsModellDispatchableSource).emissionGperKWh;
  const emKohle = (erz.sources.kohle as ErzeugungsModellDispatchableSource).emissionGperKWh;
  const curtailOrder = erz.dispatchOrder.curtailmentPriority;
  const gasRatio = erz.dispatchOrder.rampUpRatio.gas ?? 1;
  const kohleRatio = erz.dispatchOrder.rampUpRatio.kohle ?? 1;

  const isHistorical = scenario.supplyPreset === 'historical-2025' || scenario.supplyPreset === 'historical-2017';
  const emissions: EmissionFactors = {
    pv: emPv, windOn: emWindOn, windOff: emWindOff,
    kern: emKern, biomasse: emBiomasse, laufwasser: emLaufwasser,
    gas: emGas, kohle: emKohle, importGperKWh: importEmissionGperKWh,
  };

  const runLoop = (initialStorage: StorageState): { hours: SimHour[]; finalStorage: StorageState } => {
    const storage: StorageState = { ...initialStorage };
    const hours: SimHour[] = [];

    for (const row of input.hours) {
      const loadGW = demandGW(row, scenario, demandContext);

      if (isHistorical) {
        hours.push(buildHistoricalHour(row, loadGW, emissions));
        continue;
      }

    const build = buildSupply(row, scenario, erz);

    let pvGW = build.pvAvailableGW;
    let windOnGW = build.windOnAvailableGW;
    let windOffGW = build.windOffAvailableGW;
    let kernkraftGW = build.kernkraftAvailableGW;
    let biomasseGW = build.biomasseGW;
    let laufwasserGW = build.laufwasserGW;
    let gasGW = build.gasMinGW;
    let kohleGW = build.kohleMinGW;

    let pvCurtailedGW = 0;
    let windOnCurtailedGW = 0;
    let windOffCurtailedGW = 0;
    let kernkraftCurtailedGW = 0;

    let batterieChargeGW = 0;
    let batterieDischargeGW = 0;
    let pumpspeicherChargeGW = 0;
    let pumpspeicherDischargeGW = 0;
    let h2ChargeGW = 0;
    let h2DischargeGW = 0;

    let importGW = 0;
    let exportGW = 0;
    let loadSheddingGW = 0;

    const baselineSupply = pvGW + windOnGW + windOffGW + kernkraftGW + biomasseGW + laufwasserGW + gasGW + kohleGW;
    let mismatch = baselineSupply - loadGW;

    if (mismatch > EPS) {
      // dispatch order: storage slots by dispatchPriority ascending, then export, then curtail windOff > windOn > pv > kernkraft
      const chargeBy: Record<StorageId, number> = { batterie: 0, pumpspeicher: 0, h2: 0 };
      for (const slot of slots) {
        const res = chargeStorage(mismatch, slot.chargePowerGW, slot.eta, storage[slot.id], slot.energyGWh);
        chargeBy[slot.id] = res.chargedGW;
        storage[slot.id] = res.newSocGWh;
        mismatch -= res.chargedGW;
      }
      batterieChargeGW = chargeBy.batterie;
      pumpspeicherChargeGW = chargeBy.pumpspeicher;
      h2ChargeGW = chargeBy.h2;

      const exportPossible = Math.min(mismatch, exportLimitGW);
      exportGW = Math.max(0, exportPossible);
      mismatch -= exportGW;

      if (mismatch > EPS) {
        const curtail = curtailVariableSources(mismatch, build, curtailOrder);
        pvCurtailedGW = curtail.pvCurtailedGW;
        windOnCurtailedGW = curtail.windOnCurtailedGW;
        windOffCurtailedGW = curtail.windOffCurtailedGW;
        kernkraftCurtailedGW = curtail.kernkraftCurtailedGW;
        pvGW -= pvCurtailedGW;
        windOnGW -= windOnCurtailedGW;
        windOffGW -= windOffCurtailedGW;
        kernkraftGW -= kernkraftCurtailedGW;
        mismatch = curtail.remainingGW;
      }
      if (mismatch > EPS) {
        const reduceGas = Math.min(mismatch, gasGW);
        gasGW -= reduceGas;
        mismatch -= reduceGas;
      }
      if (mismatch > EPS) {
        const reduceKohle = Math.min(mismatch, kohleGW);
        kohleGW -= reduceKohle;
        mismatch -= reduceKohle;
      }
      if (mismatch > EPS) {
        const reduceBio = Math.min(mismatch, biomasseGW);
        biomasseGW -= reduceBio;
        mismatch -= reduceBio;
      }
      if (mismatch > EPS) {
        const reduceLauf = Math.min(mismatch, laufwasserGW);
        laufwasserGW -= reduceLauf;
        mismatch -= reduceLauf;
      }
    } else if (mismatch < -EPS) {
      let deficit = -mismatch;
      const dischargeBy: Record<StorageId, number> = { batterie: 0, pumpspeicher: 0, h2: 0 };
      for (const slot of slots) {
        const res = dischargeStorage(deficit, slot.dischargePowerGW, storage[slot.id]);
        dischargeBy[slot.id] = res.dischargedGW;
        storage[slot.id] = res.newSocGWh;
        deficit -= res.dischargedGW;
      }
      batterieDischargeGW = dischargeBy.batterie;
      pumpspeicherDischargeGW = dischargeBy.pumpspeicher;
      h2DischargeGW = dischargeBy.h2;

      const imp = Math.min(deficit, importLimitGW);
      importGW = Math.max(0, imp);
      deficit -= importGW;

      if (deficit > EPS) {
        const gasHeadroom = build.gasMaxGW - gasGW;
        const kohleHeadroom = build.kohleMaxGW - kohleGW;
        const ramp = rampDispatchables(deficit, gasHeadroom, kohleHeadroom, gasRatio, kohleRatio);
        gasGW += ramp.gasRampGW;
        kohleGW += ramp.kohleRampGW;
        deficit = ramp.remainingGW;
      }
      if (deficit > EPS) {
        loadSheddingGW = deficit;
      }
    }

    const supplyGW = pvGW + windOnGW + windOffGW + kernkraftGW + biomasseGW + laufwasserGW + gasGW + kohleGW;
    const storageChargeGW = batterieChargeGW + pumpspeicherChargeGW + h2ChargeGW;
    const storageDischargeGW = batterieDischargeGW + pumpspeicherDischargeGW + h2DischargeGW;
    const curtailmentGW = pvCurtailedGW + windOnCurtailedGW + windOffCurtailedGW + kernkraftCurtailedGW;
    const balanceGW = supplyGW + importGW + storageDischargeGW + loadSheddingGW
      - loadGW - exportGW - storageChargeGW;

    const co2Tph =
      pvGW * emPv + windOnGW * emWindOn + windOffGW * emWindOff
      + kernkraftGW * emKern + biomasseGW * emBiomasse + laufwasserGW * emLaufwasser
      + gasGW * emGas + kohleGW * emKohle + importGW * importEmissionGperKWh;

    hours.push({
      time: row.time,
      loadGW,
      pvGW, windOnGW, windOffGW,
      kernkraftGW, biomasseGW, laufwasserGW,
      gasGW, kohleGW,
      pvCurtailedGW, windOnCurtailedGW, windOffCurtailedGW, kernkraftCurtailedGW,
      importGW, exportGW,
      storageChargeGW, storageDischargeGW,
      batterieChargeGW, batterieDischargeGW,
      pumpspeicherChargeGW, pumpspeicherDischargeGW,
      h2ChargeGW, h2DischargeGW,
      batterieSocGWh: storage.batterie,
      pumpspeicherSocGWh: storage.pumpspeicher,
      h2SocGWh: storage.h2,
      curtailmentGW, loadSheddingGW,
      supplyGW, balanceGW,
      co2Tph,
      solarGW: pvGW,
      biomassGW: biomasseGW,
      hydroGW: laufwasserGW,
      geothermalGW: 0,
      wasteGW: 0,
      oilGW: 0,
      otherGW: 0,
      coalGW: kohleGW,
      nuclearGW: kernkraftGW,
      historicalImportGW: importGW,
      historicalExportGW: exportGW,
      dataBoundaryResidualGW: 0,
      batteryGWh: storage.batterie,
      h2GWh: storage.h2,
    });
    }

    return { hours, finalStorage: storage };
  };

  // Warm-up-Pass: kalibriert Initial-SoC auf Steady-State, sodass am Jahresende
  // ≈ derselbe SoC herauskommt wie am Anfang. Verhindert "Phantasie-Energie"
  // wenn der konfigurierte Initial-Anteil × Kapazität durch das Szenario gar
  // nicht erzielbar wäre. Historische Pässe brauchen das nicht (kein Storage-Dispatch).
  // Skippt den Warm-up wenn die initiale Phantasie-Energie klein ist (< 1 TWh);
  // bei reinen Batterie/PSP-Szenarien ist Initial-SoC sowieso nahe Steady-State.
  let seedStorage = initialStorageState(speicher, scenario);
  const PHANTOM_ENERGY_THRESHOLD_GWH = 1000;
  const initialSocTotalGWh = seedStorage.batterie + seedStorage.pumpspeicher + seedStorage.h2;
  if (!isHistorical && initialSocTotalGWh > PHANTOM_ENERGY_THRESHOLD_GWH) {
    seedStorage = runLoop(seedStorage).finalStorage;
  }

  const { hours } = runLoop(seedStorage);

  const sum = (fn: (h: SimHour) => number) => hours.reduce((total, hour) => total + fn(hour), 0) / 1000;
  const demandTWh = sum(hour => hour.loadGW);
  const renewableTWh = sum(hour => hour.pvGW + hour.windOnGW + hour.windOffGW + hour.biomasseGW + hour.laufwasserGW);
  const loadSheddingTWh = sum(hour => hour.loadSheddingGW);
  const renewableSharePct = demandTWh > 0 ? 100 * renewableTWh / demandTWh : 0;
  const totalCo2T = hours.reduce((acc, hour) => acc + hour.co2Tph, 0);
  const co2MtPerYear = totalCo2T / 1_000_000;
  const demandKWh = demandTWh * 1e9;
  const co2GperKWh = demandKWh > 0 ? (totalCo2T * 1_000_000) / demandKWh : 0;
  const peakLoadGW = hours.reduce((max, hour) => Math.max(max, hour.loadGW), 0);
  const hoursWithLoadShedding = hours.filter(hour => hour.loadSheddingGW > EPS).length;
  const hoursWithCurtailmentOver50pct = hours.filter(hour => {
    const re = hour.pvGW + hour.windOnGW + hour.windOffGW + hour.pvCurtailedGW + hour.windOnCurtailedGW + hour.windOffCurtailedGW;
    return re > EPS && hour.curtailmentGW > 0.5 * re;
  }).length;
  const monthlySupplyTWh: number[] = new Array(12).fill(0);
  for (const hour of hours) {
    const month = Number(hour.time.slice(5, 7)) - 1;
    if (month >= 0 && month < 12) monthlySupplyTWh[month] += (hour.supplyGW + hour.importGW + hour.storageDischargeGW) / 1000;
  }

  return {
    hours,
    summary: {
      totalDemandTWh: demandTWh,
      renewableSharePct,
      renewableTWh,
      curtailmentTWh: sum(hour => hour.curtailmentGW),
      importTWh: sum(hour => hour.importGW),
      exportTWh: sum(hour => hour.exportGW),
      loadSheddingTWh,
      hoursWithLoadShedding,
      hoursWithCurtailmentOver50pct,
      co2MtPerYear,
      co2GperKWh,
      peakLoadGW,
      monthlySupplyTWh,
      securityStatus: loadSheddingTWh > 1 ? 'kritisch' : loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil',
    },
  };
}

export const kernmodellCoreModel: CoreModel = {
  id: 'kernmodell',
  run: runKernmodell,
};
