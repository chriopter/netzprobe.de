import type { HourlyInput } from '../types/data';
import type { Scenario } from '../types/scenario';
import { BATTERY_ETA, EMISSIONS, H2_ETA } from './constants';

export type SimHour = {
  time: string; loadGW: number; solarGW: number; windOnGW: number; windOffGW: number; biomassGW: number; hydroGW: number; wasteGW: number; oilGW: number; geothermalGW: number; otherGW: number; coalGW: number; gasGW: number; nuclearGW: number; importGW: number; exportGW: number; storageChargeGW: number; storageDischargeGW: number; curtailmentGW: number; loadSheddingGW: number; batteryGWh: number; h2GWh: number; supplyGW: number; balanceGW: number; co2Tonnes: number;
};
export type SimulationResult = { hours: SimHour[]; summary: { totalDemandTWh: number; renewableSharePct: number; co2IntensityGPerKWh: number; curtailmentTWh: number; importTWh: number; exportTWh: number; loadSheddingTWh: number; securityStatus: 'stabil'|'angespannt'|'kritisch' } };

const TEST_100_TWH_LOAD_GW = 100_000 / 8760;

export function runSimulation(input: HourlyInput[], scenario: Scenario): SimulationResult {
  let battery = scenario.storage.batteryEnergyGWh * 0.5;
  let h2 = scenario.storage.h2EnergyGWh * 0.5;
  const out: SimHour[] = [];
  let co2 = 0;
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    const historicalLoadGW = scenario.demand.historicalLoad ? row.loadMW / 1000 : 0;
    const test100TWhLoadGW = scenario.demand.test100TWh ? TEST_100_TWH_LOAD_GW : 0;
    const loadGW = historicalLoadGW + test100TWhLoadGW;
    const solarGW = row.observed.pvMW / 1000;
    const won = row.observed.windOnMW / 1000;
    const woff = row.observed.windOffMW / 1000;
    const coalGW = row.observed.coalMW / 1000;
    const gasGW = row.observed.gasMW / 1000;
    const nuclearGW = 0;
    const biomassGW = (row.observed.biomassMW ?? 0) / 1000;
    const hydroGW = (row.observed.hydroMW ?? 0) / 1000;
    const wasteGW = (row.observed.wasteMW ?? 0) / 1000;
    const oilGW = (row.observed.oilMW ?? 0) / 1000;
    const geothermalGW = (row.observed.geothermalMW ?? 0) / 1000;
    const otherGW = (row.observed.otherMW ?? 0) / 1000;
    let fixedSupply = solarGW + won + woff + biomassGW + hydroGW + wasteGW + oilGW + geothermalGW + otherGW + nuclearGW + coalGW + gasGW;
    let importGW = 0, exportGW = 0, charge = 0, discharge = 0, curtail = 0, shed = 0;
    let mismatch = fixedSupply - loadGW;
    if (mismatch > 0) {
      const battRoom = Math.max(0, (scenario.storage.batteryEnergyGWh - battery) / BATTERY_ETA);
      const battCharge = Math.min(mismatch, scenario.storage.batteryPowerGW, battRoom); charge += battCharge; battery += battCharge * BATTERY_ETA; mismatch -= battCharge;
      const h2Room = Math.max(0, (scenario.storage.h2EnergyGWh - h2) / H2_ETA);
      const h2Charge = Math.min(mismatch, scenario.storage.h2PowerGW, h2Room); charge += h2Charge; h2 += h2Charge * H2_ETA; mismatch -= h2Charge;
      exportGW = Math.min(mismatch, scenario.storage.importLimitGW); mismatch -= exportGW;
      curtail = Math.max(0, mismatch); mismatch = 0;
    } else if (mismatch < 0) {
      let deficit = -mismatch;
      const battDischarge = Math.min(deficit, scenario.storage.batteryPowerGW, battery); discharge += battDischarge; battery -= battDischarge; deficit -= battDischarge;
      const h2Discharge = Math.min(deficit, scenario.storage.h2PowerGW, h2); discharge += h2Discharge; h2 -= h2Discharge; deficit -= h2Discharge;
      importGW = Math.min(deficit, scenario.storage.importLimitGW); deficit -= importGW;
      shed = Math.max(0, deficit); mismatch = 0;
    }
    const supplyGW = solarGW + won + woff + biomassGW + hydroGW + wasteGW + oilGW + geothermalGW + otherGW + nuclearGW + coalGW + gasGW;
    const hourCo2 = solarGW*EMISSIONS.solar + (won+woff)*EMISSIONS.wind + biomassGW*EMISSIONS.biomass + hydroGW*EMISSIONS.hydro + wasteGW*EMISSIONS.waste + oilGW*EMISSIONS.oil + geothermalGW*EMISSIONS.geothermal + otherGW*EMISSIONS.other + coalGW*EMISSIONS.coal + gasGW*EMISSIONS.gas + nuclearGW*EMISSIONS.nuclear;
    co2 += hourCo2;
    out.push({ time: row.time, loadGW, solarGW, windOnGW: won, windOffGW: woff, biomassGW, hydroGW, wasteGW, oilGW, geothermalGW, otherGW, coalGW, gasGW, nuclearGW, importGW, exportGW, storageChargeGW: charge, storageDischargeGW: discharge, curtailmentGW: curtail, loadSheddingGW: shed, batteryGWh: battery, h2GWh: h2, supplyGW, balanceGW: supplyGW + importGW + discharge + shed - loadGW - exportGW - charge - curtail, co2Tonnes: hourCo2 * 1000 });
  }
  const sum = (fn: (h: SimHour) => number) => out.reduce((s, h) => s + fn(h), 0) / 1000;
  const demandTWh = sum(h => h.loadGW);
  const renewableTWh = sum(h => h.solarGW + h.windOnGW + h.windOffGW + h.biomassGW + h.hydroGW + h.geothermalGW);
  const loadSheddingTWh = sum(h => h.loadSheddingGW);
  const co2Intensity = demandTWh > 0 ? co2 / out.reduce((s,h)=>s+h.loadGW,0) : 0;
  const renewableSharePct = demandTWh > 0 ? 100 * renewableTWh / demandTWh : 0;
  return { hours: out, summary: { totalDemandTWh: demandTWh, renewableSharePct, co2IntensityGPerKWh: co2Intensity, curtailmentTWh: sum(h => h.curtailmentGW), importTWh: sum(h => h.importGW), exportTWh: sum(h => h.exportGW), loadSheddingTWh, securityStatus: loadSheddingTWh > 1 ? 'kritisch' : loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil' } };
}
