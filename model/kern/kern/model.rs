mod data;
mod dispatch;
mod result;

use crate::simulation::SimulationError;
use data::{
    berlin_date_and_hour, data_error, gen_number, number, number_or, package_data, parse_json,
    path_number, s_bool, s_number, snap_gen, snap_storage, snap_trade, storage_number,
    trade_number, value_field,
};
use dispatch::{charge_storage, discharge_storage, ramp_dispatchables, storage_get, storage_set};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;

const EPS: f64 = 1e-9;
const H2_LHV_KWH_PER_KG: f64 = 33.33;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoadHour {
    time: String,
    #[serde(rename = "loadMW")]
    load_mw: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FactorHour {
    time: String,
    solar_irradiance: Vec<f64>,
    wind100m: Vec<f64>,
}

#[derive(Debug, Deserialize)]
struct HeatingDay {
    date: String,
    weight: f64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HeatingProfile {
    days: Vec<HeatingDay>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HourlyProfile {
    multipliers: Vec<f64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
enum DemandId {
    Pkw,
    Lkw,
    Bahn,
    Schiff,
    Flug,
    Heiz,
    Ghd,
    IndustrieWaerme,
    Stahl,
    Chemie,
}

#[derive(Debug, Clone)]
struct DemandPackage {
    data: Value,
    multipliers: Vec<f64>,
}

#[derive(Debug, Clone)]
struct GenerationPackage {
    availability: f64,
    min_load_fraction: f64,
    co2: f64,
}

#[derive(Debug, Clone)]
struct StoragePackage {
    roundtrip_efficiency: f64,
    initial_state_of_charge_fraction: f64,
    dispatch_priority: u32,
}

#[derive(Debug, Clone)]
struct HourInput {
    time: String,
    load_mw: f64,
    solar_factor: f64,
    wind_factor: f64,
    heating_degree_day_weight: f64,
    hour_of_day_berlin: usize,
}

#[derive(Debug, Clone)]
pub(crate) struct StaticModel {
    hours: Vec<HourInput>,
    demand: HashMap<DemandId, DemandPackage>,
    generation: HashMap<&'static str, GenerationPackage>,
    storage: HashMap<&'static str, StoragePackage>,
    curtailment_order: Vec<String>,
    gas_ratio: f64,
    kohle_ratio: f64,
}

#[derive(Debug, Clone, Copy)]
struct StorageState {
    batterie: f64,
    pumpspeicher: f64,
    h2: f64,
}

#[derive(Debug, Clone)]
struct StorageSlot {
    id: &'static str,
    charge_power_gw: f64,
    discharge_power_gw: f64,
    energy_gwh: f64,
    eta: f64,
    priority: u32,
}

#[derive(Debug, Clone, Copy, Default)]
struct SupplyBuild {
    pv_available_gw: f64,
    wind_on_available_gw: f64,
    wind_off_available_gw: f64,
    kernkraft_available_gw: f64,
    biomasse_gw: f64,
    laufwasser_gw: f64,
    gas_min_gw: f64,
    kohle_min_gw: f64,
    gas_max_gw: f64,
    kohle_max_gw: f64,
}

#[derive(Debug, Clone, Default)]
struct SimHour {
    time: String,
    load_gw: f64,
    pv_gw: f64,
    wind_on_gw: f64,
    wind_off_gw: f64,
    kernkraft_gw: f64,
    biomasse_gw: f64,
    laufwasser_gw: f64,
    gas_gw: f64,
    kohle_gw: f64,
    pv_curtailed_gw: f64,
    wind_on_curtailed_gw: f64,
    wind_off_curtailed_gw: f64,
    kernkraft_curtailed_gw: f64,
    import_gw: f64,
    export_gw: f64,
    storage_charge_gw: f64,
    storage_discharge_gw: f64,
    batterie_charge_gw: f64,
    batterie_discharge_gw: f64,
    pumpspeicher_charge_gw: f64,
    pumpspeicher_discharge_gw: f64,
    h2_charge_gw: f64,
    h2_discharge_gw: f64,
    batterie_soc_gwh: f64,
    pumpspeicher_soc_gwh: f64,
    h2_soc_gwh: f64,
    curtailment_gw: f64,
    load_shedding_gw: f64,
    supply_gw: f64,
    balance_gw: f64,
    co2_tph: f64,
}

#[derive(Debug, Clone)]
pub(crate) struct SimulationResult {
    hours: Vec<SimHour>,
}

impl StaticModel {
    pub(crate) fn load() -> Result<Self, SimulationError> {
        let loads: Vec<LoadHour> = parse_json(include_str!("../../last/2025/hours.json"))?;
        let factors_raw = value_field(
            include_str!("../../erzeugung/einspeisefaktoren-2025/data.json"),
            "hours",
        )?;
        let factors: Vec<FactorHour> = parse_json(&factors_raw)?;
        let e100_heiz = package_data(include_str!("../../last/e100-heiz/package.json"))?;
        let heating_profile: HeatingProfile = serde_json::from_value(
            e100_heiz
                .get("degreeDayProfile")
                .cloned()
                .ok_or_else(|| data_error("e100-heiz.degreeDayProfile fehlt"))?,
        )
        .map_err(|err| data_error(err.to_string()))?;

        let factors_by_time: HashMap<_, _> = factors
            .into_iter()
            .map(|hour| (hour.time.clone(), hour))
            .collect();
        let heating_by_date: HashMap<_, _> = heating_profile
            .days
            .into_iter()
            .map(|day| (day.date.clone(), day.weight))
            .collect();

        let mut hours = Vec::with_capacity(loads.len());
        for load in loads {
            let factor = factors_by_time
                .get(&load.time)
                .ok_or_else(|| data_error(format!("missing factors for {}", load.time)))?;
            let (date, hour) = berlin_date_and_hour(&load.time)?;
            let heating_weight = *heating_by_date
                .get(&date)
                .ok_or_else(|| data_error(format!("missing heating day for {}", date)))?;
            hours.push(HourInput {
                time: load.time,
                load_mw: load.load_mw,
                solar_factor: factor.solar_irradiance.first().copied().unwrap_or(0.0),
                wind_factor: factor.wind100m.first().copied().unwrap_or(0.0),
                heating_degree_day_weight: heating_weight,
                hour_of_day_berlin: hour,
            });
        }

        let mut demand = HashMap::new();
        for (id, raw) in [
            (
                DemandId::Pkw,
                include_str!("../../last/e100-pkw/package.json"),
            ),
            (
                DemandId::Lkw,
                include_str!("../../last/e100-lkw/package.json"),
            ),
            (
                DemandId::Bahn,
                include_str!("../../last/e100-bahn/package.json"),
            ),
            (
                DemandId::Schiff,
                include_str!("../../last/e100-schiff/package.json"),
            ),
            (
                DemandId::Flug,
                include_str!("../../last/e100-flug/package.json"),
            ),
            (
                DemandId::Heiz,
                include_str!("../../last/e100-heiz/package.json"),
            ),
            (
                DemandId::Ghd,
                include_str!("../../last/e100-ghd/package.json"),
            ),
            (
                DemandId::IndustrieWaerme,
                include_str!("../../last/e100-industrie-waerme/package.json"),
            ),
            (
                DemandId::Stahl,
                include_str!("../../last/e100-stahl/package.json"),
            ),
            (
                DemandId::Chemie,
                include_str!("../../last/e100-chemie/package.json"),
            ),
        ] {
            let data = package_data(raw)?;
            let profile: HourlyProfile = serde_json::from_value(
                data.get("hourlyProfile")
                    .cloned()
                    .ok_or_else(|| data_error("hourlyProfile fehlt"))?,
            )
            .map_err(|err| data_error(err.to_string()))?;
            demand.insert(
                id,
                DemandPackage {
                    data,
                    multipliers: profile.multipliers,
                },
            );
        }

        let mut generation = HashMap::new();
        for (id, raw) in [
            ("pv", include_str!("../../erzeugung/pv/package.json")),
            (
                "windOn",
                include_str!("../../erzeugung/windon/package.json"),
            ),
            (
                "windOff",
                include_str!("../../erzeugung/windoff/package.json"),
            ),
            (
                "kernkraft",
                include_str!("../../erzeugung/kernkraft/package.json"),
            ),
            (
                "biomasse",
                include_str!("../../erzeugung/biomasse/package.json"),
            ),
            (
                "laufwasser",
                include_str!("../../erzeugung/laufwasser/package.json"),
            ),
            ("gas", include_str!("../../erzeugung/gas/package.json")),
            ("kohle", include_str!("../../erzeugung/kohle/package.json")),
        ] {
            let data = package_data(raw)?;
            generation.insert(
                id,
                GenerationPackage {
                    availability: number_or(&data, "availability", 1.0),
                    min_load_fraction: number_or(&data, "minLoadFraction", 0.0),
                    co2: path_number(&data, &["emissions", "co2eGperKWh"])?,
                },
            );
        }

        let mut storage = HashMap::new();
        for (id, raw) in [
            (
                "batterie",
                include_str!("../../speicher/batterie/package.json"),
            ),
            (
                "pumpspeicher",
                include_str!("../../speicher/pumpspeicher/package.json"),
            ),
            ("h2", include_str!("../../speicher/h2/package.json")),
        ] {
            let data = package_data(raw)?;
            storage.insert(
                id,
                StoragePackage {
                    roundtrip_efficiency: number(&data, "roundtripEfficiency")?,
                    initial_state_of_charge_fraction: number(
                        &data,
                        "initialStateOfChargeFraction",
                    )?,
                    dispatch_priority: number(&data, "dispatchPriority")? as u32,
                },
            );
        }

        let kern = package_data(include_str!("../../kern/kern/package.json"))?;
        let dispatch = kern
            .get("dispatchOrder")
            .ok_or_else(|| data_error("kern.dispatchOrder fehlt"))?;
        let curtailment_order = dispatch
            .get("curtailmentPriority")
            .and_then(Value::as_array)
            .ok_or_else(|| data_error("kern.curtailmentPriority fehlt"))?
            .iter()
            .filter_map(|v| v.as_str().map(str::to_string))
            .collect();
        let gas_ratio = path_number(dispatch, &["rampUpRatio", "gas"])?;
        let kohle_ratio = path_number(dispatch, &["rampUpRatio", "kohle"])?;

        Ok(Self {
            hours,
            demand,
            generation,
            storage,
            curtailment_order,
            gas_ratio,
            kohle_ratio,
        })
    }

    pub(crate) fn run(&self, scenario: &Value) -> Result<SimulationResult, SimulationError> {
        let scenario = self.resolve_supply_preset(scenario)?;

        if scenario
            .get("supplyPreset")
            .and_then(Value::as_str)
            .unwrap_or("custom")
            != "custom"
        {
            return Err(SimulationError::Unsupported {
                message: "Rust-Parity-Harness unterstützt aktuell nur supplyPreset=custom"
                    .to_string(),
            });
        }

        let mut seed_storage = self.initial_storage_state(&scenario)?;
        if s_number(&scenario, &["storage", "h2EnergyGWh"])? > 100.0 {
            seed_storage = self.run_loop(&scenario, seed_storage)?.1;
        }
        let (hours, _) = self.run_loop(&scenario, seed_storage)?;
        Ok(SimulationResult { hours })
    }

    pub(crate) fn resolve_supply_preset(&self, scenario: &Value) -> Result<Value, SimulationError> {
        let preset = scenario
            .get("supplyPreset")
            .and_then(Value::as_str)
            .unwrap_or("custom");
        if preset == "custom" {
            return Ok(scenario.clone());
        }

        let demand_twh = self.hours.iter().try_fold(0.0, |sum, row| {
            self.demand_gw(row, scenario, 0.0).map(|v| sum + v)
        })? / 1000.0;
        let mut next = scenario.clone();
        let obj = next
            .as_object_mut()
            .ok_or_else(|| data_error("scenario must be an object"))?;
        let override_values = self.supply_override(preset, demand_twh)?;
        obj.insert("supplyPreset".to_string(), json!("custom"));
        obj.insert("generation".to_string(), override_values.0);
        obj.insert("storage".to_string(), override_values.1);
        obj.insert("import".to_string(), override_values.2);
        obj.insert("export".to_string(), override_values.3);
        Ok(next)
    }

    fn supply_override(
        &self,
        preset: &str,
        demand_twh: f64,
    ) -> Result<(Value, Value, Value, Value), SimulationError> {
        match preset {
            "historical-2025" => self.preset_historical_2025(),
            "historical-2017" => self.preset_historical_2017(),
            "100ee-noimport" => self.preset_100ee_noimport(demand_twh),
            "50ee-50import" => self.preset_50ee_50import(demand_twh),
            "2025-skaliert" => self.preset_2025_scaled(demand_twh),
            _ => Err(SimulationError::Unsupported {
                message: format!("Unbekanntes supplyPreset: {preset}"),
            }),
        }
    }

    fn preset_historical_2025(&self) -> Result<(Value, Value, Value, Value), SimulationError> {
        Ok((
            json!({
                "pvInstalledGW": gen_number("pv", "defaultInstalledGW")?,
                "windOnInstalledGW": gen_number("windon", "defaultInstalledGW")?,
                "windOffInstalledGW": gen_number("windoff", "defaultInstalledGW")?,
                "kernkraftInstalledGW": gen_number("kernkraft", "defaultInstalledGW")?,
                "biomasseInstalledGW": gen_number("biomasse", "defaultInstalledGW")?,
                "laufwasserInstalledGW": gen_number("laufwasser", "defaultInstalledGW")?,
                "gasInstalledGW": gen_number("gas", "defaultInstalledGW")?,
                "kohleInstalledGW": gen_number("kohle", "defaultInstalledGW")?,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.8,
            }),
            json!({
                "batteriePowerGW": storage_number("batterie", "defaultPowerGW")?,
                "batterieEnergyGWh": storage_number("batterie", "defaultEnergyGWh")?,
                "pumpspeicherPowerGW": storage_number("pumpspeicher", "defaultPowerGW")?,
                "pumpspeicherEnergyGWh": storage_number("pumpspeicher", "defaultEnergyGWh")?,
                "h2ChargePowerGW": storage_number("h2", "defaultChargePowerGW")?,
                "h2DischargePowerGW": storage_number("h2", "defaultDischargePowerGW")?,
                "h2EnergyGWh": storage_number("h2", "defaultEnergyGWh")?,
            }),
            json!({
                "stromGW": trade_number("strom-handel", &["import", "defaultMaxGW"])?,
                "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
                "h2TWh": trade_number("h2-handel", &["import", "defaultTWh"])?,
            }),
            json!({
                "stromGW": trade_number("strom-handel", &["export", "defaultMaxGW"])?,
            }),
        ))
    }

    fn preset_historical_2017(&self) -> Result<(Value, Value, Value, Value), SimulationError> {
        Ok((
            json!({
                "pvInstalledGW": 42.4,
                "windOnInstalledGW": 50.2,
                "windOffInstalledGW": 5.4,
                "kernkraftInstalledGW": 10.8,
                "biomasseInstalledGW": 7.6,
                "laufwasserInstalledGW": 4.8,
                "gasInstalledGW": 30.0,
                "kohleInstalledGW": 46.0,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.8,
            }),
            json!({
                "batteriePowerGW": 0.0,
                "batterieEnergyGWh": 0.0,
                "pumpspeicherPowerGW": 9.4,
                "pumpspeicherEnergyGWh": 40.0,
                "h2ChargePowerGW": 0.0,
                "h2DischargePowerGW": 0.0,
                "h2EnergyGWh": 0.0,
            }),
            json!({
                "stromGW": 14.0,
                "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
                "h2TWh": 0.0,
            }),
            json!({ "stromGW": 30.0 }),
        ))
    }

    fn preset_100ee_noimport(
        &self,
        demand_twh: f64,
    ) -> Result<(Value, Value, Value, Value), SimulationError> {
        self.preset_100ee_with_demand(
            demand_twh,
            0.0,
            trade_number("strom-handel", &["export", "defaultMaxGW"])?,
        )
    }

    fn preset_50ee_50import(
        &self,
        demand_twh: f64,
    ) -> Result<(Value, Value, Value, Value), SimulationError> {
        let (generation, storage, _import, _export) = self.preset_100ee_with_demand(
            demand_twh / 3.0,
            0.0,
            trade_number("strom-handel", &["export", "defaultMaxGW"])?,
        )?;
        Ok((
            generation,
            storage,
            json!({
                "stromGW": trade_number("strom-handel", &["import", "maxGW"])?,
                "stromEmissionGperKWh": 100.0,
                "h2TWh": 0.0,
            }),
            json!({
                "stromGW": trade_number("strom-handel", &["export", "defaultMaxGW"])?,
            }),
        ))
    }

    fn preset_100ee_with_demand(
        &self,
        demand_twh: f64,
        import_gw: f64,
        export_gw: f64,
    ) -> Result<(Value, Value, Value, Value), SimulationError> {
        let yield_pv = self.annual_yield_twh_per_gw("solar").max(0.1);
        let yield_wind = self.annual_yield_twh_per_gw("wind").max(0.1);
        let baseline_bio_twh = gen_number("biomasse", "defaultInstalledGW")? * 8.76;
        let baseline_hydro_twh = gen_number("laufwasser", "defaultInstalledGW")? * 8.76;
        let target = (demand_twh * 1.4 - baseline_bio_twh - baseline_hydro_twh).max(0.0);
        let total_share = 0.30 + 0.45 + 0.15;
        let pv_gw = (target * 0.30 / total_share) / yield_pv;
        let wind_on_gw = (target * 0.45 / total_share) / yield_wind;
        let wind_off_gw = (target * 0.15 / total_share) / yield_wind;
        Ok((
            json!({
                "pvInstalledGW": snap_gen("pv", pv_gw)?,
                "windOnInstalledGW": snap_gen("windon", wind_on_gw)?,
                "windOffInstalledGW": snap_gen("windoff", wind_off_gw)?,
                "kernkraftInstalledGW": 0.0,
                "biomasseInstalledGW": gen_number("biomasse", "defaultInstalledGW")?,
                "laufwasserInstalledGW": gen_number("laufwasser", "defaultInstalledGW")?,
                "gasInstalledGW": 0.0,
                "kohleInstalledGW": 0.0,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.8,
            }),
            json!({
                "batteriePowerGW": snap_storage("batterie", "PowerGW", demand_twh * 0.1)?,
                "batterieEnergyGWh": snap_storage("batterie", "EnergyGWh", demand_twh * 0.5)?,
                "pumpspeicherPowerGW": storage_number("pumpspeicher", "defaultPowerGW")?,
                "pumpspeicherEnergyGWh": storage_number("pumpspeicher", "defaultEnergyGWh")?,
                "h2ChargePowerGW": snap_storage("h2", "ChargePowerGW", demand_twh * 0.06)?,
                "h2DischargePowerGW": snap_storage("h2", "DischargePowerGW", demand_twh * 0.12)?,
                "h2EnergyGWh": snap_storage("h2", "EnergyGWh", demand_twh * 0.15 * 1000.0)?,
            }),
            json!({
                "stromGW": import_gw,
                "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
                "h2TWh": 0.0,
            }),
            json!({ "stromGW": export_gw }),
        ))
    }

    fn preset_2025_scaled(
        &self,
        demand_twh: f64,
    ) -> Result<(Value, Value, Value, Value), SimulationError> {
        let factor = demand_twh / 466.0;
        Ok((
            json!({
                "pvInstalledGW": snap_gen("pv", gen_number("pv", "defaultInstalledGW")? * factor)?,
                "windOnInstalledGW": snap_gen("windon", gen_number("windon", "defaultInstalledGW")? * factor)?,
                "windOffInstalledGW": snap_gen("windoff", gen_number("windoff", "defaultInstalledGW")? * factor)?,
                "kernkraftInstalledGW": snap_gen("kernkraft", gen_number("kernkraft", "defaultInstalledGW")? * factor)?,
                "biomasseInstalledGW": snap_gen("biomasse", gen_number("biomasse", "defaultInstalledGW")? * factor)?,
                "laufwasserInstalledGW": snap_gen("laufwasser", gen_number("laufwasser", "defaultInstalledGW")? * factor)?,
                "gasInstalledGW": snap_gen("gas", gen_number("gas", "defaultInstalledGW")? * factor)?,
                "kohleInstalledGW": snap_gen("kohle", gen_number("kohle", "defaultInstalledGW")? * factor)?,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.8,
            }),
            json!({
                "batteriePowerGW": snap_storage("batterie", "PowerGW", storage_number("batterie", "defaultPowerGW")? * factor)?,
                "batterieEnergyGWh": snap_storage("batterie", "EnergyGWh", storage_number("batterie", "defaultEnergyGWh")? * factor)?,
                "pumpspeicherPowerGW": snap_storage("pumpspeicher", "PowerGW", storage_number("pumpspeicher", "defaultPowerGW")? * factor)?,
                "pumpspeicherEnergyGWh": snap_storage("pumpspeicher", "EnergyGWh", storage_number("pumpspeicher", "defaultEnergyGWh")? * factor)?,
                "h2ChargePowerGW": snap_storage("h2", "ChargePowerGW", storage_number("h2", "defaultChargePowerGW")? * factor)?,
                "h2DischargePowerGW": snap_storage("h2", "DischargePowerGW", storage_number("h2", "defaultDischargePowerGW")? * factor)?,
                "h2EnergyGWh": snap_storage("h2", "EnergyGWh", storage_number("h2", "defaultEnergyGWh")? * factor)?,
            }),
            json!({
                "stromGW": snap_trade("strom-handel", &["import"], trade_number("strom-handel", &["import", "defaultMaxGW"])? * factor)?,
                "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
                "h2TWh": trade_number("h2-handel", &["import", "defaultTWh"])?,
            }),
            json!({
                "stromGW": snap_trade("strom-handel", &["export"], trade_number("strom-handel", &["export", "defaultMaxGW"])? * factor)?,
            }),
        ))
    }

    fn annual_yield_twh_per_gw(&self, field: &str) -> f64 {
        self.hours
            .iter()
            .map(|hour| {
                if field == "solar" {
                    hour.solar_factor
                } else {
                    hour.wind_factor
                }
            })
            .sum::<f64>()
            / 1000.0
    }

    fn initial_storage_state(&self, scenario: &Value) -> Result<StorageState, SimulationError> {
        Ok(StorageState {
            batterie: s_number(scenario, &["storage", "batterieEnergyGWh"])?
                * self.storage["batterie"].initial_state_of_charge_fraction,
            pumpspeicher: s_number(scenario, &["storage", "pumpspeicherEnergyGWh"])?
                * self.storage["pumpspeicher"].initial_state_of_charge_fraction,
            h2: s_number(scenario, &["storage", "h2EnergyGWh"])?
                * self.storage["h2"].initial_state_of_charge_fraction,
        })
    }

    fn storage_slots(&self, scenario: &Value) -> Result<Vec<StorageSlot>, SimulationError> {
        let mut slots = vec![
            StorageSlot {
                id: "batterie",
                charge_power_gw: s_number(scenario, &["storage", "batteriePowerGW"])?,
                discharge_power_gw: s_number(scenario, &["storage", "batteriePowerGW"])?,
                energy_gwh: s_number(scenario, &["storage", "batterieEnergyGWh"])?,
                eta: self.storage["batterie"].roundtrip_efficiency,
                priority: self.storage["batterie"].dispatch_priority,
            },
            StorageSlot {
                id: "pumpspeicher",
                charge_power_gw: s_number(scenario, &["storage", "pumpspeicherPowerGW"])?,
                discharge_power_gw: s_number(scenario, &["storage", "pumpspeicherPowerGW"])?,
                energy_gwh: s_number(scenario, &["storage", "pumpspeicherEnergyGWh"])?,
                eta: self.storage["pumpspeicher"].roundtrip_efficiency,
                priority: self.storage["pumpspeicher"].dispatch_priority,
            },
            StorageSlot {
                id: "h2",
                charge_power_gw: s_number(scenario, &["storage", "h2ChargePowerGW"])?,
                discharge_power_gw: s_number(scenario, &["storage", "h2DischargePowerGW"])?,
                energy_gwh: s_number(scenario, &["storage", "h2EnergyGWh"])?,
                eta: self.storage["h2"].roundtrip_efficiency,
                priority: self.storage["h2"].dispatch_priority,
            },
        ];
        slots.sort_by_key(|slot| slot.priority);
        Ok(slots)
    }

    fn run_loop(
        &self,
        scenario: &Value,
        mut storage: StorageState,
    ) -> Result<(Vec<SimHour>, StorageState), SimulationError> {
        let slots = self.storage_slots(scenario)?;
        let import_limit_gw = s_number(scenario, &["import", "stromGW"])?;
        let export_limit_gw = s_number(scenario, &["export", "stromGW"])?;
        let import_emission = s_number(scenario, &["import", "stromEmissionGperKWh"])?;
        let sector_h2_demand_gw = self.total_sector_h2_demand_gw(scenario)?;
        let h2_import_inflow_gw = s_number(scenario, &["import", "h2TWh"])? * 1000.0 / 8760.0;
        let h2_energy_cap = s_number(scenario, &["storage", "h2EnergyGWh"])?;
        let mut hours = Vec::with_capacity(self.hours.len());

        for row in &self.hours {
            let h2_available_gw = storage.h2 + h2_import_inflow_gw;
            let pool_cover_h2_gw = if sector_h2_demand_gw > 0.0 {
                sector_h2_demand_gw.min(h2_available_gw)
            } else {
                0.0
            };
            storage.h2 = h2_energy_cap.min(h2_available_gw - pool_cover_h2_gw);
            let load_gw = self.demand_gw(row, scenario, pool_cover_h2_gw)?;
            let build = self.build_supply(row, scenario)?;

            let mut pv_gw = build.pv_available_gw;
            let mut wind_on_gw = build.wind_on_available_gw;
            let mut wind_off_gw = build.wind_off_available_gw;
            let mut kernkraft_gw = build.kernkraft_available_gw;
            let mut biomasse_gw = build.biomasse_gw;
            let mut laufwasser_gw = build.laufwasser_gw;
            let mut gas_gw = build.gas_min_gw;
            let mut kohle_gw = build.kohle_min_gw;
            let mut pv_curtailed_gw = 0.0;
            let mut wind_on_curtailed_gw = 0.0;
            let mut wind_off_curtailed_gw = 0.0;
            let mut kernkraft_curtailed_gw = 0.0;
            let mut batterie_charge_gw = 0.0;
            let mut batterie_discharge_gw = 0.0;
            let mut pumpspeicher_charge_gw = 0.0;
            let mut pumpspeicher_discharge_gw = 0.0;
            let mut h2_charge_gw = 0.0;
            let mut h2_discharge_gw = 0.0;
            let mut import_gw = 0.0;
            let mut export_gw = 0.0;
            let mut load_shedding_gw = 0.0;

            let baseline_supply = pv_gw
                + wind_on_gw
                + wind_off_gw
                + kernkraft_gw
                + biomasse_gw
                + laufwasser_gw
                + gas_gw
                + kohle_gw;
            let mut mismatch = baseline_supply - load_gw;

            if mismatch > EPS {
                for slot in &slots {
                    let (charged, new_soc) = charge_storage(
                        mismatch,
                        slot.charge_power_gw,
                        slot.eta,
                        storage_get(storage, slot.id),
                        slot.energy_gwh,
                    );
                    storage_set(&mut storage, slot.id, new_soc);
                    match slot.id {
                        "batterie" => batterie_charge_gw = charged,
                        "pumpspeicher" => pumpspeicher_charge_gw = charged,
                        "h2" => h2_charge_gw = charged,
                        _ => {}
                    }
                    mismatch -= charged;
                }
                export_gw = mismatch.min(export_limit_gw).max(0.0);
                mismatch -= export_gw;

                if mismatch > EPS {
                    let curtail = self.curtail_variable_sources(mismatch, build);
                    pv_curtailed_gw = curtail.0;
                    wind_on_curtailed_gw = curtail.1;
                    wind_off_curtailed_gw = curtail.2;
                    kernkraft_curtailed_gw = curtail.3;
                    pv_gw -= pv_curtailed_gw;
                    wind_on_gw -= wind_on_curtailed_gw;
                    wind_off_gw -= wind_off_curtailed_gw;
                    kernkraft_gw -= kernkraft_curtailed_gw;
                    mismatch = curtail.4;
                }
                if mismatch > EPS {
                    let reduce = mismatch.min(gas_gw);
                    gas_gw -= reduce;
                    mismatch -= reduce;
                }
                if mismatch > EPS {
                    let reduce = mismatch.min(kohle_gw);
                    kohle_gw -= reduce;
                    mismatch -= reduce;
                }
                if mismatch > EPS {
                    let reduce = mismatch.min(biomasse_gw);
                    biomasse_gw -= reduce;
                    mismatch -= reduce;
                }
                if mismatch > EPS {
                    let reduce = mismatch.min(laufwasser_gw);
                    laufwasser_gw -= reduce;
                }
            } else if mismatch < -EPS {
                let mut deficit = -mismatch;
                for slot in &slots {
                    let (discharged, new_soc) = discharge_storage(
                        deficit,
                        slot.discharge_power_gw,
                        storage_get(storage, slot.id),
                    );
                    storage_set(&mut storage, slot.id, new_soc);
                    match slot.id {
                        "batterie" => batterie_discharge_gw = discharged,
                        "pumpspeicher" => pumpspeicher_discharge_gw = discharged,
                        "h2" => h2_discharge_gw = discharged,
                        _ => {}
                    }
                    deficit -= discharged;
                }
                import_gw = deficit.min(import_limit_gw).max(0.0);
                deficit -= import_gw;
                if deficit > EPS {
                    let gas_headroom = build.gas_max_gw - gas_gw;
                    let kohle_headroom = build.kohle_max_gw - kohle_gw;
                    let ramp = ramp_dispatchables(
                        deficit,
                        gas_headroom,
                        kohle_headroom,
                        self.gas_ratio,
                        self.kohle_ratio,
                    );
                    gas_gw += ramp.0;
                    kohle_gw += ramp.1;
                    deficit = ramp.2;
                }
                if deficit > EPS {
                    load_shedding_gw = deficit;
                }
            }

            let supply_gw = pv_gw
                + wind_on_gw
                + wind_off_gw
                + kernkraft_gw
                + biomasse_gw
                + laufwasser_gw
                + gas_gw
                + kohle_gw;
            let storage_charge_gw = batterie_charge_gw + pumpspeicher_charge_gw + h2_charge_gw;
            let storage_discharge_gw =
                batterie_discharge_gw + pumpspeicher_discharge_gw + h2_discharge_gw;
            let curtailment_gw = pv_curtailed_gw
                + wind_on_curtailed_gw
                + wind_off_curtailed_gw
                + kernkraft_curtailed_gw;
            let balance_gw = supply_gw + import_gw + storage_discharge_gw + load_shedding_gw
                - load_gw
                - export_gw
                - storage_charge_gw;
            let co2_tph = pv_gw * self.generation["pv"].co2
                + wind_on_gw * self.generation["windOn"].co2
                + wind_off_gw * self.generation["windOff"].co2
                + kernkraft_gw * self.generation["kernkraft"].co2
                + biomasse_gw * self.generation["biomasse"].co2
                + laufwasser_gw * self.generation["laufwasser"].co2
                + gas_gw * self.generation["gas"].co2
                + kohle_gw * self.generation["kohle"].co2
                + import_gw * import_emission;

            hours.push(SimHour {
                time: row.time.clone(),
                load_gw,
                pv_gw,
                wind_on_gw,
                wind_off_gw,
                kernkraft_gw,
                biomasse_gw,
                laufwasser_gw,
                gas_gw,
                kohle_gw,
                pv_curtailed_gw,
                wind_on_curtailed_gw,
                wind_off_curtailed_gw,
                kernkraft_curtailed_gw,
                import_gw,
                export_gw,
                storage_charge_gw,
                storage_discharge_gw,
                batterie_charge_gw,
                batterie_discharge_gw,
                pumpspeicher_charge_gw,
                pumpspeicher_discharge_gw,
                h2_charge_gw,
                h2_discharge_gw,
                batterie_soc_gwh: storage.batterie,
                pumpspeicher_soc_gwh: storage.pumpspeicher,
                h2_soc_gwh: storage.h2,
                curtailment_gw,
                load_shedding_gw,
                supply_gw,
                balance_gw,
                co2_tph,
            });
        }

        Ok((hours, storage))
    }

    fn build_supply(
        &self,
        row: &HourInput,
        scenario: &Value,
    ) -> Result<SupplyBuild, SimulationError> {
        let pv_factor = (row.solar_factor
            * s_number(scenario, &["generation", "pvCapacityFactorMultiplier"])?)
        .min(1.0);
        let wind_on_factor = (row.wind_factor
            * s_number(scenario, &["generation", "windOnCapacityFactorMultiplier"])?)
        .min(1.0);
        let wind_off_factor = (row.wind_factor
            * s_number(scenario, &["generation", "windOffCapacityFactorMultiplier"])?)
        .min(1.0);
        Ok(SupplyBuild {
            pv_available_gw: s_number(scenario, &["generation", "pvInstalledGW"])? * pv_factor,
            wind_on_available_gw: s_number(scenario, &["generation", "windOnInstalledGW"])?
                * wind_on_factor,
            wind_off_available_gw: s_number(scenario, &["generation", "windOffInstalledGW"])?
                * wind_off_factor,
            kernkraft_available_gw: s_number(scenario, &["generation", "kernkraftInstalledGW"])?
                * self.generation["kernkraft"].availability,
            biomasse_gw: s_number(scenario, &["generation", "biomasseInstalledGW"])?
                * self.generation["biomasse"].availability,
            laufwasser_gw: s_number(scenario, &["generation", "laufwasserInstalledGW"])?
                * self.generation["laufwasser"].availability,
            gas_min_gw: s_number(scenario, &["generation", "gasInstalledGW"])?
                * self.generation["gas"].availability
                * self.generation["gas"].min_load_fraction,
            kohle_min_gw: s_number(scenario, &["generation", "kohleInstalledGW"])?
                * self.generation["kohle"].availability
                * self.generation["kohle"].min_load_fraction,
            gas_max_gw: s_number(scenario, &["generation", "gasInstalledGW"])?
                * self.generation["gas"].availability,
            kohle_max_gw: s_number(scenario, &["generation", "kohleInstalledGW"])?
                * self.generation["kohle"].availability,
        })
    }

    fn curtail_variable_sources(
        &self,
        excess_gw: f64,
        build: SupplyBuild,
    ) -> (f64, f64, f64, f64, f64) {
        let mut remaining = excess_gw;
        let mut pv = 0.0;
        let mut wind_on = 0.0;
        let mut wind_off = 0.0;
        let mut kern = 0.0;
        for id in &self.curtailment_order {
            if remaining <= EPS {
                break;
            }
            match id.as_str() {
                "pv" => {
                    let take = remaining.min(build.pv_available_gw - pv);
                    pv += take;
                    remaining -= take;
                }
                "windOn" => {
                    let take = remaining.min(build.wind_on_available_gw - wind_on);
                    wind_on += take;
                    remaining -= take;
                }
                "windOff" => {
                    let take = remaining.min(build.wind_off_available_gw - wind_off);
                    wind_off += take;
                    remaining -= take;
                }
                "kernkraft" => {
                    let take = remaining.min(build.kernkraft_available_gw - kern);
                    kern += take;
                    remaining -= take;
                }
                _ => {}
            }
        }
        (pv, wind_on, wind_off, kern, remaining.max(0.0))
    }

    fn demand_gw(
        &self,
        row: &HourInput,
        scenario: &Value,
        pool_cover_h2_gw: f64,
    ) -> Result<f64, SimulationError> {
        let mut load = if s_bool(scenario, &["demand", "last-2025"])? {
            row.load_mw / 1000.0
        } else {
            0.0
        };
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Pkw,
            "e100-pkw",
            "e100-pkw-million-km",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Lkw,
            "e100-lkw",
            "e100-lkw-target-bn-km",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Bahn,
            "e100-bahn",
            "e100-bahn-target-twh",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Schiff,
            "e100-schiff",
            "e100-schiff-target-twh",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Flug,
            "e100-flug",
            "e100-flug-target-twh",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Heiz,
            "e100-heiz",
            "e100-heiz-target-heat-twh",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Ghd,
            "e100-ghd",
            "e100-ghd-target-heat-twh",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::IndustrieWaerme,
            "e100-industrie-waerme",
            "e100-industrie-waerme-target-heat-twh",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Stahl,
            "e100-stahl",
            "e100-stahl-target-mio-ton",
        )?;
        load += self.hourly_e100(
            row,
            scenario,
            DemandId::Chemie,
            "e100-chemie",
            "e100-chemie-target-twh",
        )?;
        Ok((load - self.h2_pool_strom_reduction_gw(pool_cover_h2_gw, scenario)?).max(0.0))
    }

    fn hourly_e100(
        &self,
        row: &HourInput,
        scenario: &Value,
        id: DemandId,
        enabled_key: &str,
        target_key: &str,
    ) -> Result<f64, SimulationError> {
        if !s_bool(scenario, &["demand", enabled_key])? {
            return Ok(0.0);
        }
        let package = &self.demand[&id];
        let target = s_number(scenario, &["demand", target_key])?;
        let annual_twh = match id {
            DemandId::Pkw => {
                (target - number(&package.data, "alreadyElectricMillionKm")?).max(0.0)
                    * number(&package.data, "kwhPer100Km")?
                    / 100_000.0
            }
            DemandId::Lkw => {
                (target - number(&package.data, "alreadyElectricBnKm")?).max(0.0)
                    * number(&package.data, "kwhPerKm")?
            }
            DemandId::Bahn => target.max(0.0),
            DemandId::Schiff | DemandId::Flug | DemandId::Chemie => {
                (target - number(&package.data, "alreadyElectricTWh")?).max(0.0)
            }
            DemandId::Heiz | DemandId::Ghd => {
                (target - number(&package.data, "alreadyElectricHeatTWh")?).max(0.0)
                    / number(&package.data, "seasonalCop")?
            }
            DemandId::IndustrieWaerme => {
                (target - number(&package.data, "alreadyElectricHeatTWh")?).max(0.0)
                    * number(&package.data, "electricityPerHeat")?
            }
            DemandId::Stahl => (target.max(0.0) * number(&package.data, "mwhPerTon")?
                - number_or(&package.data, "alreadyElectricTWh", 0.0))
            .max(0.0),
        };
        let multiplier = package
            .multipliers
            .get(row.hour_of_day_berlin)
            .copied()
            .unwrap_or(0.0);
        if matches!(id, DemandId::Heiz | DemandId::Ghd) {
            Ok(annual_twh * 1000.0 * row.heating_degree_day_weight * multiplier / 24.0)
        } else {
            Ok(annual_twh * 1000.0 * multiplier / 8760.0)
        }
    }

    fn total_sector_h2_demand_gw(&self, scenario: &Value) -> Result<f64, SimulationError> {
        let d = self.sector_h2_demand_twh(scenario)?;
        Ok((d.stahl + d.chemie + d.schiff + d.flug) * 1000.0 / 8760.0)
    }

    fn h2_pool_strom_reduction_gw(
        &self,
        pool_cover_h2_gw: f64,
        scenario: &Value,
    ) -> Result<f64, SimulationError> {
        if pool_cover_h2_gw <= 0.0 {
            return Ok(0.0);
        }
        let demand = self.sector_h2_demand_twh(scenario)?;
        if demand.stahl + demand.chemie + demand.schiff + demand.flug <= 0.0 {
            return Ok(0.0);
        }
        let ratio = self.sector_strom_per_h2()?;
        let mut sectors = vec![
            ("stahl", demand.stahl, ratio.stahl),
            ("chemie", demand.chemie, ratio.chemie),
            ("schiff", demand.schiff, ratio.schiff),
            ("flug", demand.flug, ratio.flug),
        ];
        sectors.retain(|(_, demand_twh, _)| *demand_twh > 0.0);
        sectors.sort_by(|a, b| b.2.partial_cmp(&a.2).unwrap());
        let mut remaining = pool_cover_h2_gw;
        let mut reduction = 0.0;
        for (_, demand_twh, ratio) in sectors {
            if remaining <= 0.0 {
                break;
            }
            let sector_max_gw = demand_twh * 1000.0 / 8760.0;
            let used = remaining.min(sector_max_gw);
            reduction += used * ratio;
            remaining -= used;
        }
        Ok(reduction)
    }

    fn sector_h2_demand_twh(&self, scenario: &Value) -> Result<SectorH2, SimulationError> {
        let strom = self.sector_h2_strom_twh(scenario)?;
        let ratio = self.sector_strom_per_h2()?;
        Ok(SectorH2 {
            stahl: if ratio.stahl > 0.0 {
                strom.stahl / ratio.stahl
            } else {
                0.0
            },
            chemie: if ratio.chemie > 0.0 {
                strom.chemie / ratio.chemie
            } else {
                0.0
            },
            schiff: if ratio.schiff > 0.0 {
                strom.schiff / ratio.schiff
            } else {
                0.0
            },
            flug: if ratio.flug > 0.0 {
                strom.flug / ratio.flug
            } else {
                0.0
            },
        })
    }

    fn sector_h2_strom_twh(&self, scenario: &Value) -> Result<SectorH2, SimulationError> {
        let mut out = SectorH2::default();
        if s_bool(scenario, &["demand", "e100-stahl"])? {
            let m = &self.demand[&DemandId::Stahl].data;
            out.stahl = s_number(scenario, &["demand", "e100-stahl-target-mio-ton"])?.max(0.0)
                * number(m, "electrolyzerKwhPerKgH2")?
                * number(m, "hydrogenKgPerTonSteel")?
                / 1000.0;
        }
        if s_bool(scenario, &["demand", "e100-chemie"])? {
            let m = &self.demand[&DemandId::Chemie].data;
            out.chemie = number(m, "hydrogenAmmoniaTWh")?
                + number(m, "hydrogenMethanolTWh")?
                + number(m, "eOlefinsViaH2TWh")?;
        }
        if s_bool(scenario, &["demand", "e100-schiff"])? {
            out.schiff = number(&self.demand[&DemandId::Schiff].data, "eFuelSynthesisTWh")?;
        }
        if s_bool(scenario, &["demand", "e100-flug"])? {
            let m = &self.demand[&DemandId::Flug].data;
            out.flug = (s_number(scenario, &["demand", "e100-flug-target-twh"])?
                - number(m, "alreadyElectricTWh")?)
            .max(0.0);
        }
        Ok(out)
    }

    fn sector_strom_per_h2(&self) -> Result<SectorH2, SimulationError> {
        Ok(SectorH2 {
            stahl: number(
                &self.demand[&DemandId::Stahl].data,
                "electrolyzerKwhPerKgH2",
            )? / H2_LHV_KWH_PER_KG,
            chemie: 1.0 / number(&self.demand[&DemandId::Chemie].data, "h2SystemEfficiency")?,
            schiff: 1.0
                / number(
                    &self.demand[&DemandId::Schiff].data,
                    "eFuelSystemEfficiency",
                )?,
            flug: 1.0 / number(&self.demand[&DemandId::Flug].data, "ptlEfficiency")?,
        })
    }
}

#[derive(Debug, Clone, Copy, Default)]
struct SectorH2 {
    stahl: f64,
    chemie: f64,
    schiff: f64,
    flug: f64,
}
