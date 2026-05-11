import type { HourlyInput } from '../data/types';
import type { Scenario } from '../scenarios/types';
import { BASE_BEV, BASE_HEATPUMP, BATTERY_ETA, BIOMASS_GW, COAL_MIN_REL, EMISSIONS, FOSSIL_AVAILABILITY, GAS_MIN_REL, H2_ETA, LOAD_100_BEV_GW, LOAD_100_HEATPUMP_WINTER_GW, RUN_OF_RIVER_GW, SOLAR_FRACTIONS, WIND_OFF_FRACTIONS, WIND_ON_FRACTIONS } from './constants';

export type SimHour = {
  time: string; loadGW: number; solarGW: number; windOnGW: number; windOffGW: number; biomassGW: number; hydroGW: number; coalGW: number; gasGW: number; nuclearGW: number; importGW: number; exportGW: number; storageChargeGW: number; storageDischargeGW: number; curtailmentGW: number; loadSheddingGW: number; batteryGWh: number; h2GWh: number; supplyGW: number; balanceGW: number; co2Tonnes: number;
};
export type SimulationResult = { hours: SimHour[]; summary: { totalDemandTWh: number; renewableSharePct: number; co2IntensityGPerKWh: number; curtailmentTWh: number; importTWh: number; exportTWh: number; loadSheddingTWh: number; securityStatus: 'stabil'|'angespannt'|'kritisch' } };

const solarFactor = (irradiance: number[], pvGW: number) => irradiance.reduce((s, i, idx) => s + pvGW * SOLAR_FRACTIONS[idx] * Math.max(0, i) / 1000 * 0.82, 0);
const windCurve = (v: number, off = false) => { const v1 = off ? 4 : 3; const v2 = off ? 13 : 11.5; const v3 = off ? 22 : 21; if (v < v1 || v > v3) return 0; return v < v2 ? Math.pow(v / v2, 3) : 1; };
const windOn = (wind: number[], gw: number) => WIND_ON_FRACTIONS.reduce((s, f, i) => s + gw * f * windCurve((wind[i] ?? 0) * 1.05) * 0.905, 0);
const windOff = (wind: number[], gw: number) => WIND_OFF_FRACTIONS.reduce((s, f, i) => s + gw * f * windCurve((wind[i+4] ?? 0) * 1.03, true) * 0.78, 0);
const heatPumpSeason = (index: number) => 0.5 * (1 + Math.cos((2 * Math.PI * (index % 8760)) / 8760 - Math.PI / 6));

export function runSimulation(input: HourlyInput[], scenario: Scenario): SimulationResult {
  let battery = scenario.storage.batteryEnergyGWh * 0.5;
  let h2 = scenario.storage.h2EnergyGWh * 0.5;
  const out: SimHour[] = [];
  let co2 = 0;
  for (let i = 0; i < input.length; i++) {
    const row = input[i];
    const loadGW = (row.loadMW / 1000) * (scenario.demand.basePct / 100) + (scenario.demand.bevPct/100 - BASE_BEV) * LOAD_100_BEV_GW + (scenario.demand.heatPumpPct/100 - BASE_HEATPUMP) * LOAD_100_HEATPUMP_WINTER_GW * heatPumpSeason(i);
    const solarGW = solarFactor(row.solarIrradiance, scenario.renewables.pvGW);
    const won = windOn(row.wind100m, scenario.renewables.windOnGW);
    const woff = windOff(row.wind100m, scenario.renewables.windOffGW);
    const coalMin = scenario.fossil.coalGW * COAL_MIN_REL * FOSSIL_AVAILABILITY;
    const gasMin = scenario.fossil.gasGW * GAS_MIN_REL * FOSSIL_AVAILABILITY;
    const coalMax = scenario.fossil.coalGW * FOSSIL_AVAILABILITY;
    const gasMax = scenario.fossil.gasGW * FOSSIL_AVAILABILITY;
    let coalGW = coalMin, gasGW = gasMin, nuclearGW = (scenario.fossil.nuclearGW ?? 0) * 0.9;
    let fixedSupply = solarGW + won + woff + BIOMASS_GW + RUN_OF_RIVER_GW + nuclearGW + coalGW + gasGW;
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
      const gasAdd = Math.min(deficit, Math.max(0, gasMax - gasGW)); gasGW += gasAdd; deficit -= gasAdd;
      const coalAdd = Math.min(deficit, Math.max(0, coalMax - coalGW)); coalGW += coalAdd; deficit -= coalAdd;
      importGW = Math.min(deficit, scenario.storage.importLimitGW); deficit -= importGW;
      shed = Math.max(0, deficit); mismatch = 0;
    }
    const supplyGW = solarGW + won + woff + BIOMASS_GW + RUN_OF_RIVER_GW + nuclearGW + coalGW + gasGW;
    const hourCo2 = solarGW*EMISSIONS.solar + (won+woff)*EMISSIONS.wind + BIOMASS_GW*EMISSIONS.biomass + RUN_OF_RIVER_GW*EMISSIONS.hydro + coalGW*EMISSIONS.coal + gasGW*EMISSIONS.gas + nuclearGW*EMISSIONS.nuclear;
    co2 += hourCo2;
    out.push({ time: row.time, loadGW, solarGW, windOnGW: won, windOffGW: woff, biomassGW: BIOMASS_GW, hydroGW: RUN_OF_RIVER_GW, coalGW, gasGW, nuclearGW, importGW, exportGW, storageChargeGW: charge, storageDischargeGW: discharge, curtailmentGW: curtail, loadSheddingGW: shed, batteryGWh: battery, h2GWh: h2, supplyGW, balanceGW: supplyGW + importGW + discharge + shed - loadGW - exportGW - charge - curtail, co2Tonnes: hourCo2 * 1000 });
  }
  const sum = (fn: (h: SimHour) => number) => out.reduce((s, h) => s + fn(h), 0) / 1000;
  const demandTWh = sum(h => h.loadGW);
  const renewableTWh = sum(h => h.solarGW + h.windOnGW + h.windOffGW + h.biomassGW + h.hydroGW);
  const loadSheddingTWh = sum(h => h.loadSheddingGW);
  const co2Intensity = co2 / Math.max(1e-9, out.reduce((s,h)=>s+h.loadGW,0));
  return { hours: out, summary: { totalDemandTWh: demandTWh, renewableSharePct: 100 * renewableTWh / Math.max(1e-9, demandTWh), co2IntensityGPerKWh: co2Intensity, curtailmentTWh: sum(h => h.curtailmentGW), importTWh: sum(h => h.importGW), exportTWh: sum(h => h.exportGW), loadSheddingTWh, securityStatus: loadSheddingTWh > 1 ? 'kritisch' : loadSheddingTWh > 0.01 ? 'angespannt' : 'stabil' } };
}
