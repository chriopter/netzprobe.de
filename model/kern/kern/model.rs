pub mod api;
mod data;
mod dispatch;
pub mod error;
pub mod fingerprint;
mod result;

// Preset-Konstanten als Source-of-Truth aus den Erzeugung-Modulen.
// Der Kern ist Dispatch-Engine — die Szenario-Parameter leben in den Presets.
#[path = "../../erzeugung/100ee-noimport/model.rs"]
mod preset_100ee_lokal;
#[path = "../../erzeugung/100ee-import/model.rs"]
mod preset_100ee_import;
#[path = "../../erzeugung/100kern-lastfolgend/model.rs"]
mod preset_100kern;
#[path = "../../erzeugung/100h2-import/model.rs"]
mod preset_100h2_import;
#[path = "../../erzeugung/ee-moderat-kern/model.rs"]
mod preset_ee_moderat_kern;

pub use api::ApiView;
pub use error::ModelError;
pub use fingerprint::{
    GOLDEN_HOUR_SAMPLES, HourFingerprint, ResultFingerprint, SecurityStatus, SummaryFingerprint,
};
use data::{
    berlin_date_and_hour, comp_number, data_error, number, number_or, package_data, parse_json,
    path_number, s_bool, s_number, snap_gen, snap_storage, snap_trade, trade_number, value_field,
};
use dispatch::{charge_storage, discharge_storage, ramp_dispatchables, storage_get, storage_set};
use serde::Deserialize;
use serde_json::{json, Value};
use std::borrow::Cow;
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
    #[serde(rename = "windOn100m")]
    wind_on_100m: Vec<f64>,
    #[serde(rename = "windOff100m")]
    wind_off_100m: Vec<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoricalGenerationHour {
    #[serde(rename = "time")]
    _time: String,
    #[serde(rename = "pvMW")]
    pv_mw: f64,
    #[serde(rename = "windOnMW")]
    wind_on_mw: f64,
    #[serde(rename = "windOffMW")]
    wind_off_mw: f64,
    #[serde(rename = "nuclearMW", default)]
    nuclear_mw: f64,
    #[serde(rename = "gasMW")]
    gas_mw: f64,
    #[serde(rename = "coalMW")]
    coal_mw: f64,
    #[serde(rename = "hydroMW")]
    hydro_mw: f64,
    #[serde(rename = "biomassMW")]
    biomass_mw: f64,
    #[serde(rename = "wasteMW")]
    waste_mw: f64,
    #[serde(rename = "oilMW")]
    oil_mw: f64,
    #[serde(rename = "geothermalMW")]
    geothermal_mw: f64,
    #[serde(rename = "otherMW")]
    other_mw: f64,
    #[serde(rename = "importExportMW")]
    import_export_mw: f64,
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
    // Optionales 12-Monats-Verfügbarkeitsprofil (Revisionsplanung mit Sommer-
    // Wartungsfenstern). Fehlt es, gilt availability flach. Der Parser liest es
    // für jedes Erzeugungspaket, ANGEWANDT wird es im Supply-Build derzeit nur
    // für kernkraft — ein Profil in anderen Paketen wäre ein stiller No-Op.
    availability_monthly: Option<Vec<f64>>,
    min_load_fraction: f64,
    co2: f64,
}

impl GenerationPackage {
    fn availability_for_month(&self, month_index: usize) -> f64 {
        self.availability_monthly
            .as_ref()
            .and_then(|monthly| monthly.get(month_index).copied())
            .unwrap_or(self.availability)
    }
}

#[derive(Debug, Clone)]
struct StoragePackage {
    // Lade-Wirkungsgrad (Strom → SoC) und Entlade-Wirkungsgrad (SoC → Strom).
    // Batterie/Pumpspeicher: charge = roundtripEfficiency, discharge = 1,0 —
    // SoC in Strom-Äquivalent, Verluste vollständig beim Laden (wie bisher).
    // H₂: charge = Elektrolyse+Verdichtung (0,62), discharge = Rückverstromung
    // (0,55) — SoC in H₂-LHV-Einheiten, dadurch einheitenkonsistent mit
    // H₂-Import und Sektor-H₂-Bedarf im Pool.
    charge_efficiency: f64,
    discharge_efficiency: f64,
    initial_state_of_charge_fraction: f64,
    dispatch_priority: u32,
}

#[derive(Debug, Clone)]
struct HourInput {
    index: usize,
    time: String,
    load_mw: f64,
    solar_factor: f64,
    wind_on_factor: f64,
    wind_off_factor: f64,
    month_index: usize,
    heating_degree_day_weight: f64,
    hour_of_day_berlin: usize,
}

#[derive(Debug, Clone)]
pub struct StaticModel {
    hours: Vec<HourInput>,
    // Basislast 2017 (MW, index-aligned zum 2025-Stundenraster): loadYear 2017
    // ersetzt nur die Lastwerte; Einspeisefaktoren, Heizgradtage und Zeitstempel
    // bleiben im 2025-Raster. Für den historisch-2017-Replay paart das die
    // 2017er-Erzeugung index-korrekt mit der 2017er-Last.
    loads_2017: Vec<f64>,
    historical_2025: Vec<HistoricalGenerationHour>,
    historical_2017: Vec<HistoricalGenerationHour>,
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
    charge_eta: f64,
    discharge_eta: f64,
    priority: u32,
}

#[derive(Debug, Clone, Copy, Default)]
struct SupplyBuild {
    fixed_generation: bool,
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
    geothermal_gw: f64,
    waste_gw: f64,
    oil_gw: f64,
    other_gw: f64,
    fixed_import_gw: f64,
    fixed_export_gw: f64,
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
    geothermal_gw: f64,
    waste_gw: f64,
    oil_gw: f64,
    other_gw: f64,
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
    // Vom H₂-Pool substituierte Sektor-Stromlast (strom-äquivalent): die Last,
    // die ohne Pool-Deckung des Sektor-H₂-Bedarfs zusätzlich anfiele. Geht in
    // die Kosten-Umlage ein (Kosten je gedeckter Nachfrage inkl. H₂-Substitution).
    h2_pool_reduction_gw: f64,
}

#[derive(Debug, Clone)]
pub struct SimulationResult {
    hours: Vec<SimHour>,
}

impl StaticModel {
    pub fn load() -> Result<Self, ModelError> {
        let loads: Vec<LoadHour> = parse_json(include_str!("../../last/2025/hours.json"))?;
        let loads_2017_rows: Vec<LoadHour> = parse_json(include_str!("../../last/2017/hours.json"))?;
        if loads_2017_rows.len() != loads.len() {
            return Err(data_error(format!(
                "load series length mismatch: 2025 has {}, 2017 has {} hours",
                loads.len(),
                loads_2017_rows.len()
            )));
        }
        let loads_2017: Vec<f64> = loads_2017_rows.into_iter().map(|row| row.load_mw).collect();
        let historical_2025: Vec<HistoricalGenerationHour> =
            parse_json(include_str!("../../erzeugung/2025/hours.json"))?;
        let historical_2017: Vec<HistoricalGenerationHour> =
            parse_json(include_str!("../../erzeugung/2017/hours.json"))?;
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
        for (index, load) in loads.into_iter().enumerate() {
            let factor = factors_by_time
                .get(&load.time)
                .ok_or_else(|| data_error(format!("missing factors for {}", load.time)))?;
            let (date, hour) = berlin_date_and_hour(&load.time)?;
            let heating_weight = *heating_by_date
                .get(&date)
                .ok_or_else(|| data_error(format!("missing heating day for {}", date)))?;
            // Monat aus dem Berlin-Datum (konsistent mit Heiztagen/Tagesstunde,
            // nicht UTC — sonst rutschen 1-2 h je Monatsgrenze in den Nachbarmonat).
            let month_index = date
                .get(5..7)
                .and_then(|m| m.parse::<usize>().ok())
                .filter(|m| (1..=12).contains(m))
                .map(|m| m - 1)
                .ok_or_else(|| data_error(format!("invalid month in {date}")))?;
            hours.push(HourInput {
                index,
                time: load.time,
                load_mw: load.load_mw,
                solar_factor: factor.solar_irradiance.first().copied().unwrap_or(0.0),
                wind_on_factor: factor.wind_on_100m.first().copied().unwrap_or(0.0),
                wind_off_factor: factor.wind_off_100m.first().copied().unwrap_or(0.0),
                month_index,
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
                    // Vorhandenes, aber ungültiges Profil ist ein Datenfehler —
                    // kein stiller Fallback auf die flache availability.
                    availability_monthly: match data.get("availabilityMonthly") {
                        None => None,
                        Some(raw) => {
                            let values: Vec<f64> = raw
                                .as_array()
                                .map(|a| a.iter().filter_map(Value::as_f64).collect())
                                .unwrap_or_default();
                            if values.len() != 12
                                || values.iter().any(|v| !(0.0..=1.0).contains(v))
                            {
                                return Err(data_error(format!(
                                    "{id}: availabilityMonthly must be 12 values in 0..=1"
                                )));
                            }
                            Some(values)
                        }
                    },
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
            let roundtrip = number(&data, "roundtripEfficiency")?;
            storage.insert(
                id,
                StoragePackage {
                    charge_efficiency: number_or(&data, "chargeEfficiency", roundtrip),
                    discharge_efficiency: number_or(&data, "dischargeEfficiency", 1.0),
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
            loads_2017,
            historical_2025,
            historical_2017,
            demand,
            generation,
            storage,
            curtailment_order,
            gas_ratio,
            kohle_ratio,
        })
    }

    pub fn run(&self, scenario: &Value) -> Result<SimulationResult, ModelError> {
        let scenario = self.resolve_supply_preset(scenario)?;

        if scenario
            .get("supplyPreset")
            .and_then(Value::as_str)
            .unwrap_or("custom")
            != "custom"
            && fixed_generation_year(&scenario).is_none()
        {
            return Err(ModelError::Unsupported {
                message: "Rust-Parity-Harness unterstützt aktuell nur supplyPreset=custom"
                    .to_string(),
            });
        }

        let frame = self.hours_for(&scenario)?;
        let mut seed_storage = self.initial_storage_state(&scenario)?;
        if s_number(&scenario, &["storage", "h2EnergyGWh"])? > 100.0 {
            seed_storage = self.run_loop(&scenario, &frame, seed_storage)?.1;
        }
        let (hours, _) = self.run_loop(&scenario, &frame, seed_storage)?;
        Ok(SimulationResult { hours })
    }

    // Stundenraster für das gewählte loadYear: 2025 ist das Basisraster; 2017
    // ersetzt index-aligned nur die Basislast-Werte (Wetter-/Faktorraster und
    // Zeitstempel bleiben 2025, dokumentiert am Struct-Feld loads_2017).
    fn hours_for(&self, scenario: &Value) -> Result<Cow<'_, [HourInput]>, ModelError> {
        let load_year = scenario
            .get("loadYear")
            .and_then(Value::as_u64)
            .unwrap_or(2025);
        match load_year {
            2025 => Ok(Cow::Borrowed(&self.hours)),
            2017 => {
                let mut hours = self.hours.clone();
                for (hour, load_mw) in hours.iter_mut().zip(&self.loads_2017) {
                    hour.load_mw = *load_mw;
                }
                Ok(Cow::Owned(hours))
            }
            other => Err(data_error(format!("unsupported loadYear {other}"))),
        }
    }

    pub fn resolve_supply_preset(&self, scenario: &Value) -> Result<Value, ModelError> {
        let preset = scenario
            .get("supplyPreset")
            .and_then(Value::as_str)
            .unwrap_or("custom");
        if preset == "custom" {
            return Ok(scenario.clone());
        }

        let demand_twh = self.hours_for(scenario)?.iter().try_fold(0.0, |sum, row| {
            self.demand_gw(row, scenario, 0.0).map(|v| sum + v)
        })? / 1000.0;
        let mut next = scenario.clone();
        let obj = next
            .as_object_mut()
            .ok_or_else(|| data_error("scenario must be an object"))?;
        let override_values = self.supply_override(preset, demand_twh, scenario)?;
        if preset == "historical-2025" {
            obj.insert("supplyPreset".to_string(), json!("historical-2025"));
            obj.insert("_fixedGenerationYear".to_string(), json!(2025));
        } else if preset == "historical-2017" {
            obj.insert("supplyPreset".to_string(), json!("historical-2017"));
            obj.insert("_fixedGenerationYear".to_string(), json!(2017));
        } else {
            obj.insert("supplyPreset".to_string(), json!("custom"));
            obj.remove("_fixedGenerationYear");
        }
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
        scenario: &Value,
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        match preset {
            "historical-2025" => self.preset_historical_2025(),
            "historical-2017" => self.preset_historical_2017(),
            "100ee-noimport" => self.preset_100ee_noimport(demand_twh, scenario),
            "100ee-import" => self.preset_100ee_import(demand_twh, scenario),
            "100kern-lastfolgend" => preset_100kern::apply(self, demand_twh),
            "ee-moderat-kern" => preset_ee_moderat_kern::apply(self, demand_twh),
            "100h2-import" => self.preset_100h2_import(demand_twh, scenario),
            "2025-skaliert" => self.preset_2025_scaled(demand_twh),
            _ => Err(ModelError::Unsupported {
                message: format!("Unbekanntes supplyPreset: {preset}"),
            }),
        }
    }

    fn preset_historical_2025(&self) -> Result<(Value, Value, Value, Value), ModelError> {
        self.composition_supply("historisch-2025")
    }

    fn preset_historical_2017(&self) -> Result<(Value, Value, Value, Value), ModelError> {
        self.composition_supply("historisch-2017")
    }

    fn composition_supply(
        &self,
        composition_id: &str,
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        Ok((
            json!({
                "pvInstalledGW": comp_number(composition_id, "pvInstalledGW")?,
                "windOnInstalledGW": comp_number(composition_id, "windOnInstalledGW")?,
                "windOffInstalledGW": comp_number(composition_id, "windOffInstalledGW")?,
                "kernkraftInstalledGW": comp_number(composition_id, "kernkraftInstalledGW")?,
                "biomasseInstalledGW": comp_number(composition_id, "biomasseInstalledGW")?,
                "laufwasserInstalledGW": comp_number(composition_id, "laufwasserInstalledGW")?,
                "gasInstalledGW": comp_number(composition_id, "gasInstalledGW")?,
                "kohleInstalledGW": comp_number(composition_id, "kohleInstalledGW")?,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.0,
            }),
            json!({
                "batteriePowerGW": comp_number(composition_id, "batteriePowerGW")?,
                "batterieEnergyGWh": comp_number(composition_id, "batterieEnergyGWh")?,
                "pumpspeicherPowerGW": comp_number(composition_id, "pumpspeicherPowerGW")?,
                "pumpspeicherEnergyGWh": comp_number(composition_id, "pumpspeicherEnergyGWh")?,
                "h2ChargePowerGW": comp_number(composition_id, "h2ChargePowerGW")?,
                "h2DischargePowerGW": comp_number(composition_id, "h2DischargePowerGW")?,
                "h2EnergyGWh": comp_number(composition_id, "h2EnergyGWh")?,
            }),
            json!({
                "stromGW": comp_number(composition_id, "importStromGW")?,
                "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
                "h2TWh": comp_number(composition_id, "importH2TWh")?,
            }),
            json!({
                "stromGW": comp_number(composition_id, "exportStromGW")?,
            }),
        ))
    }

    fn preset_100ee_noimport(
        &self,
        demand_twh: f64,
        scenario: &Value,
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        // Effektive Stromnachfrage: der Sektor-H2-Bedarf wird im Engine-Pool aus
        // Überschuss-Elektrolyse gedeckt (H2-LHV / chargeEfficiency Strom je LHV)
        // statt als direkte Sektor-Elektrolyse-Stromlast. Seit der Pool echtes
        // H2-Zwischenprodukt führt (Bedarf = Sektor-Strom × chargeEfficiency),
        // ist die Korrektur fast neutral — übrig bleibt nur der Stahl-Aufschlag
        // (Pool-Elektrolyse 0,62 statt Onsite 52 kWh/kg ≈ 0,641, ~+3 TWh).
        // Speicher (Batterie/Rückverstromung/Kaverne) skalieren dagegen mit der
        // STROMLAST (Demand minus Sektor-Elektrolyse-Strom): die Pool-Sektoren
        // bringen ihre Flexibilität selbst mit (Audit AP04).
        let lhv = self.sector_h2_demand_twh(scenario)?;
        let strom = self.sector_h2_strom_twh(scenario)?;
        let sector_strom_total = strom.stahl + strom.chemie + strom.schiff + strom.flug;
        let sector_lhv_total = lhv.stahl + lhv.chemie + lhv.schiff + lhv.flug;
        let charge_eff = self.storage["h2"].charge_efficiency.max(0.1);
        let eff_demand_twh = demand_twh - sector_strom_total + sector_lhv_total / charge_eff;
        let stromlast_twh = demand_twh - sector_strom_total;
        self.preset_100ee_with_demand(
            eff_demand_twh,
            stromlast_twh,
            0.0,
            comp_number("historisch-2025", "exportStromGW")?,
        )
    }

    fn preset_100ee_import(
        &self,
        demand_twh: f64,
        scenario: &Value,
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        // Alle Werte aus dem Preset-Modul model/erzeugung/100ee-import/model.rs.
        use preset_100ee_import::{
            EE_PV_SHARE, EE_WIND_ON_SHARE, EE_WIND_OFF_SHARE,
            STROM_IMPORT_EMISSION_G_PER_KWH,
            target_variable_re_twh, variable_re_gw, wind_offshore_gw,
            wind_offshore_shortfall_twh, strom_import_gw_cap,
            battery_power_gw, battery_energy_gwh,
            h2_charge_power_gw, h2_discharge_power_gw, h2_energy_gwh, h2_import_twh,
            strom_reduction_twh, remaining_sectors, h2_import_for_strom_twh,
        };
        let yield_pv = self.annual_yield_twh_per_gw("solar").max(0.1);
        let yield_wind_on = self.annual_yield_twh_per_gw("windon").max(0.1);
        let yield_wind_off = self.annual_yield_twh_per_gw("windoff").max(0.1);
        let biomasse_baseline_gw = comp_number("historisch-2025", "biomasseInstalledGW")?;
        let laufwasser_baseline_gw = comp_number("historisch-2025", "laufwasserInstalledGW")?;

        // Sektor-H2-Potenzial (LHV) und Strom-Hebel, absteigend nach Hebel —
        // identische Deckungsreihenfolge wie der Engine-H2-Pool im run_loop.
        let lhv = self.sector_h2_demand_twh(scenario)?;
        let ratio = self.sector_strom_per_h2()?;
        let mut sectors: Vec<(f64, f64)> = vec![
            (lhv.stahl, ratio.stahl),
            (lhv.chemie, ratio.chemie),
            (lhv.schiff, ratio.schiff),
            (lhv.flug, ratio.flug),
        ];
        sectors.retain(|(lhv_twh, _)| *lhv_twh > 0.0);
        sectors.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        let sector_lhv_total: f64 = sectors.iter().map(|(lhv_twh, _)| lhv_twh).sum();

        // H2-Import nur bis zum Sektorbedarf — Import ohne Abnehmer liefe in die
        // volle Kaverne und verfiele (bei heutiger Last: Import 0).
        let h2_import_base = h2_import_twh(demand_twh).min(sector_lhv_total);
        // EE-Flotte auf die EFFEKTIVE Stromnachfrage nach Import-Substitution
        // auslegen (vorher Doppelzählung: voller Elektrolyse-Strom + Import).
        let eff_demand_twh = demand_twh - strom_reduction_twh(h2_import_base, &sectors);
        let target =
            target_variable_re_twh(
                eff_demand_twh,
                biomasse_baseline_gw,
                self.generation["biomasse"].availability,
                laufwasser_baseline_gw,
                self.generation["laufwasser"].availability,
            );
        let total_share = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
        let pv_gw = variable_re_gw(target, EE_PV_SHARE, total_share, yield_pv);
        let wind_on_gw = variable_re_gw(target, EE_WIND_ON_SHARE, total_share, yield_wind_on);
        let wind_off_gw = wind_offshore_gw(target, EE_WIND_OFF_SHARE, total_share, yield_wind_off);
        // Wenn Wind off gecappt: Shortfall bevorzugt über zusätzlichen H2-Import
        // (Demand-Substitution im restlichen Sektor-Headroom), Rest über PV.
        let shortfall_strom_twh =
            wind_offshore_shortfall_twh(target, EE_WIND_OFF_SHARE, total_share, yield_wind_off);
        let rest_sectors = remaining_sectors(&sectors, h2_import_base);
        let (h2_import_extra, strom_covered_twh) =
            h2_import_for_strom_twh(shortfall_strom_twh, &rest_sectors);
        let pv_extra_gw = (shortfall_strom_twh - strom_covered_twh).max(0.0) / yield_pv;
        let h2_import_total = h2_import_base + h2_import_extra;
        Ok((
            json!({
                "pvInstalledGW": snap_gen("pv", pv_gw + pv_extra_gw)?,
                "windOnInstalledGW": snap_gen("windon", wind_on_gw)?,
                "windOffInstalledGW": snap_gen("windoff", wind_off_gw)?,
                "kernkraftInstalledGW": 0.0,
                "biomasseInstalledGW": biomasse_baseline_gw,
                "laufwasserInstalledGW": laufwasser_baseline_gw,
                "gasInstalledGW": 0.0,
                "kohleInstalledGW": 0.0,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.0,
            }),
            json!({
                "batteriePowerGW": snap_storage("batterie", "powerGW", battery_power_gw(eff_demand_twh))?,
                "batterieEnergyGWh": snap_storage("batterie", "energyGWh", battery_energy_gwh(eff_demand_twh))?,
                "pumpspeicherPowerGW": comp_number("historisch-2025", "pumpspeicherPowerGW")?,
                "pumpspeicherEnergyGWh": comp_number("historisch-2025", "pumpspeicherEnergyGWh")?,
                "h2ChargePowerGW": snap_storage("h2", "chargePowerGW", h2_charge_power_gw(eff_demand_twh))?,
                "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", h2_discharge_power_gw(eff_demand_twh))?,
                "h2EnergyGWh": snap_storage("h2", "energyGWh", h2_energy_gwh(eff_demand_twh))?,
            }),
            json!({
                "stromGW": strom_import_gw_cap(eff_demand_twh),
                "stromEmissionGperKWh": STROM_IMPORT_EMISSION_G_PER_KWH,
                "h2TWh": h2_import_total,
            }),
            json!({
                "stromGW": comp_number("historisch-2025", "exportStromGW")?,
            }),
        ))
    }

    // Preset "100% H2-Import": keine heimische Erzeugung, die gesamte Stromlast
    // wird aus importiertem H₂ rückverstromt; der Sektor-Pool zieht direkt aus
    // demselben Import. Sizing-Konstanten im Modul model/erzeugung/100h2-import.
    fn preset_100h2_import(
        &self,
        demand_twh: f64,
        scenario: &Value,
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        use preset_100h2_import::{
            cavern_energy_gwh, discharge_power_gw, import_h2_lhv_twh,
            STROM_IMPORT_EMISSION_G_PER_KWH,
        };
        let discharge_eff = self.storage["h2"].discharge_efficiency.max(0.1);
        // Sektor-H₂ (LHV) deckt der Import direkt; die zu deckende Stromlast ist
        // Demand minus Sektor-Elektrolyse-Strom (diese Sektoren ziehen H₂ statt Strom).
        let lhv = self.sector_h2_demand_twh(scenario)?;
        let sector_lhv_total = lhv.stahl + lhv.chemie + lhv.schiff + lhv.flug;
        let strom = self.sector_h2_strom_twh(scenario)?;
        let sector_strom_total = strom.stahl + strom.chemie + strom.schiff + strom.flug;
        let stromlast_twh = (demand_twh - sector_strom_total).max(0.0);
        // Spitzen-Stromlast nach (konstanter) Pool-Reduktion → Rückverstromungs-Leistung.
        let pool_reduction_gw =
            self.h2_pool_strom_reduction_gw(self.total_sector_h2_demand_gw(scenario)?, scenario)?;
        let frame = self.hours_for(scenario)?;
        let mut peak_gw = 0.0_f64;
        for row in frame.iter() {
            peak_gw = peak_gw.max(self.demand_gw(row, scenario, pool_reduction_gw)?);
        }
        let import_lhv = import_h2_lhv_twh(stromlast_twh, sector_lhv_total, discharge_eff);
        Ok((
            json!({
                "pvInstalledGW": 0.0,
                "windOnInstalledGW": 0.0,
                "windOffInstalledGW": 0.0,
                "kernkraftInstalledGW": 0.0,
                "biomasseInstalledGW": 0.0,
                "laufwasserInstalledGW": 0.0,
                "gasInstalledGW": 0.0,
                "kohleInstalledGW": 0.0,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.0,
            }),
            json!({
                "batteriePowerGW": 0.0,
                "batterieEnergyGWh": 0.0,
                "pumpspeicherPowerGW": comp_number("historisch-2025", "pumpspeicherPowerGW")?,
                "pumpspeicherEnergyGWh": comp_number("historisch-2025", "pumpspeicherEnergyGWh")?,
                "h2ChargePowerGW": 0.0,
                "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", discharge_power_gw(peak_gw))?,
                "h2EnergyGWh": snap_storage("h2", "energyGWh", cavern_energy_gwh(stromlast_twh, discharge_eff))?,
            }),
            json!({
                "stromGW": 0.0,
                "stromEmissionGperKWh": STROM_IMPORT_EMISSION_G_PER_KWH,
                "h2TWh": import_lhv,
            }),
            json!({
                "stromGW": comp_number("historisch-2025", "exportStromGW")?,
            }),
        ))
    }

    // storage_demand_twh: STROMLAST als Speicher-Treiber (Demand minus Sektor-
    // Elektrolyse-Strom) — nur die Elektrolyse-Leistung skaliert mit demand_twh,
    // weil sie auch das Sektor-H2 des Pools produziert (Audit AP04).
    fn preset_100ee_with_demand(
        &self,
        demand_twh: f64,
        storage_demand_twh: f64,
        import_gw: f64,
        export_gw: f64,
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        // Alle Werte aus dem Preset-Modul model/erzeugung/100ee-noimport/model.rs.
        // Der Kern ist Dispatch-Engine; Szenario-Parameter leben im Preset.
        use preset_100ee_lokal::{
            EE_PV_SHARE, EE_WIND_ON_SHARE, EE_WIND_OFF_SHARE,
            target_variable_re_twh, variable_re_gw, wind_offshore_gw,
            wind_on_compensation_for_wind_offshore_cap,
            battery_power_gw, battery_energy_gwh,
            h2_charge_power_gw, h2_discharge_power_gw, h2_energy_gwh,
        };
        let yield_pv = self.annual_yield_twh_per_gw("solar").max(0.1);
        let yield_wind_on = self.annual_yield_twh_per_gw("windon").max(0.1);
        let yield_wind_off = self.annual_yield_twh_per_gw("windoff").max(0.1);
        let biomasse_baseline_gw = comp_number("historisch-2025", "biomasseInstalledGW")?;
        let laufwasser_baseline_gw = comp_number("historisch-2025", "laufwasserInstalledGW")?;
        let target = target_variable_re_twh(
            demand_twh,
            biomasse_baseline_gw,
            self.generation["biomasse"].availability,
            laufwasser_baseline_gw,
            self.generation["laufwasser"].availability,
        );
        let total_share = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
        let pv_gw = variable_re_gw(target, EE_PV_SHARE, total_share, yield_pv);
        // Offshore-Cap-Shortfall wird über Wind onshore gedeckt (winter-
        // komplementär, system-günstiger als PV; MC-Optimum, Audit AP05).
        let wind_on_compensation = wind_on_compensation_for_wind_offshore_cap(
            target, EE_WIND_OFF_SHARE, total_share, yield_wind_off, yield_wind_on,
        );
        let wind_on_gw =
            variable_re_gw(target, EE_WIND_ON_SHARE, total_share, yield_wind_on) + wind_on_compensation;
        let wind_off_gw = wind_offshore_gw(target, EE_WIND_OFF_SHARE, total_share, yield_wind_off);
        Ok((
            json!({
                "pvInstalledGW": snap_gen("pv", pv_gw)?,
                "windOnInstalledGW": snap_gen("windon", wind_on_gw)?,
                "windOffInstalledGW": snap_gen("windoff", wind_off_gw)?,
                "kernkraftInstalledGW": 0.0,
                "biomasseInstalledGW": biomasse_baseline_gw,
                "laufwasserInstalledGW": laufwasser_baseline_gw,
                "gasInstalledGW": 0.0,
                "kohleInstalledGW": 0.0,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.0,
            }),
            json!({
                "batteriePowerGW": snap_storage("batterie", "powerGW", battery_power_gw(storage_demand_twh))?,
                "batterieEnergyGWh": snap_storage("batterie", "energyGWh", battery_energy_gwh(storage_demand_twh))?,
                "pumpspeicherPowerGW": comp_number("historisch-2025", "pumpspeicherPowerGW")?,
                "pumpspeicherEnergyGWh": comp_number("historisch-2025", "pumpspeicherEnergyGWh")?,
                "h2ChargePowerGW": snap_storage("h2", "chargePowerGW", h2_charge_power_gw(demand_twh))?,
                "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", h2_discharge_power_gw(storage_demand_twh))?,
                "h2EnergyGWh": snap_storage("h2", "energyGWh", h2_energy_gwh(storage_demand_twh))?,
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
    ) -> Result<(Value, Value, Value, Value), ModelError> {
        let factor = demand_twh / 466.0;
        Ok((
            json!({
                "pvInstalledGW": snap_gen("pv", comp_number("historisch-2025", "pvInstalledGW")? * factor)?,
                "windOnInstalledGW": snap_gen("windon", comp_number("historisch-2025", "windOnInstalledGW")? * factor)?,
                "windOffInstalledGW": snap_gen("windoff", comp_number("historisch-2025", "windOffInstalledGW")? * factor)?,
                "kernkraftInstalledGW": snap_gen("kernkraft", comp_number("historisch-2025", "kernkraftInstalledGW")? * factor)?,
                "biomasseInstalledGW": snap_gen("biomasse", comp_number("historisch-2025", "biomasseInstalledGW")? * factor)?,
                "laufwasserInstalledGW": snap_gen("laufwasser", comp_number("historisch-2025", "laufwasserInstalledGW")? * factor)?,
                "gasInstalledGW": snap_gen("gas", comp_number("historisch-2025", "gasInstalledGW")? * factor)?,
                "kohleInstalledGW": snap_gen("kohle", comp_number("historisch-2025", "kohleInstalledGW")? * factor)?,
                "pvCapacityFactorMultiplier": 1.0,
                "windOnCapacityFactorMultiplier": 1.0,
                "windOffCapacityFactorMultiplier": 1.0,
            }),
            json!({
                "batteriePowerGW": snap_storage("batterie", "powerGW", comp_number("historisch-2025", "batteriePowerGW")? * factor)?,
                "batterieEnergyGWh": snap_storage("batterie", "energyGWh", comp_number("historisch-2025", "batterieEnergyGWh")? * factor)?,
                "pumpspeicherPowerGW": snap_storage("pumpspeicher", "powerGW", comp_number("historisch-2025", "pumpspeicherPowerGW")? * factor)?,
                "pumpspeicherEnergyGWh": snap_storage("pumpspeicher", "energyGWh", comp_number("historisch-2025", "pumpspeicherEnergyGWh")? * factor)?,
                "h2ChargePowerGW": snap_storage("h2", "chargePowerGW", comp_number("historisch-2025", "h2ChargePowerGW")? * factor)?,
                "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", comp_number("historisch-2025", "h2DischargePowerGW")? * factor)?,
                "h2EnergyGWh": snap_storage("h2", "energyGWh", comp_number("historisch-2025", "h2EnergyGWh")? * factor)?,
            }),
            json!({
                "stromGW": snap_trade("strom-handel", &["import", "stromGW"], comp_number("historisch-2025", "importStromGW")? * factor)?,
                "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
                "h2TWh": comp_number("historisch-2025", "importH2TWh")?,
            }),
            json!({
                "stromGW": snap_trade("strom-handel", &["export", "stromGW"], comp_number("historisch-2025", "exportStromGW")? * factor)?,
            }),
        ))
    }

    fn annual_yield_twh_per_gw(&self, field: &str) -> f64 {
        self.hours
            .iter()
            .map(|hour| match field {
                "solar" => hour.solar_factor,
                "windoff" => hour.wind_off_factor,
                _ => hour.wind_on_factor,
            })
            .sum::<f64>()
            / 1000.0
    }

    fn initial_storage_state(&self, scenario: &Value) -> Result<StorageState, ModelError> {
        Ok(StorageState {
            batterie: s_number(scenario, &["storage", "batterieEnergyGWh"])?
                * self.storage["batterie"].initial_state_of_charge_fraction,
            pumpspeicher: s_number(scenario, &["storage", "pumpspeicherEnergyGWh"])?
                * self.storage["pumpspeicher"].initial_state_of_charge_fraction,
            h2: s_number(scenario, &["storage", "h2EnergyGWh"])?
                * self.storage["h2"].initial_state_of_charge_fraction,
        })
    }

    fn storage_slots(&self, scenario: &Value) -> Result<Vec<StorageSlot>, ModelError> {
        let mut slots = vec![
            StorageSlot {
                id: "batterie",
                charge_power_gw: s_number(scenario, &["storage", "batteriePowerGW"])?,
                discharge_power_gw: s_number(scenario, &["storage", "batteriePowerGW"])?,
                energy_gwh: s_number(scenario, &["storage", "batterieEnergyGWh"])?,
                charge_eta: self.storage["batterie"].charge_efficiency,
                discharge_eta: self.storage["batterie"].discharge_efficiency,
                priority: self.storage["batterie"].dispatch_priority,
            },
            StorageSlot {
                id: "pumpspeicher",
                charge_power_gw: s_number(scenario, &["storage", "pumpspeicherPowerGW"])?,
                discharge_power_gw: s_number(scenario, &["storage", "pumpspeicherPowerGW"])?,
                energy_gwh: s_number(scenario, &["storage", "pumpspeicherEnergyGWh"])?,
                charge_eta: self.storage["pumpspeicher"].charge_efficiency,
                discharge_eta: self.storage["pumpspeicher"].discharge_efficiency,
                priority: self.storage["pumpspeicher"].dispatch_priority,
            },
            StorageSlot {
                id: "h2",
                charge_power_gw: s_number(scenario, &["storage", "h2ChargePowerGW"])?,
                discharge_power_gw: s_number(scenario, &["storage", "h2DischargePowerGW"])?,
                energy_gwh: s_number(scenario, &["storage", "h2EnergyGWh"])?,
                charge_eta: self.storage["h2"].charge_efficiency,
                discharge_eta: self.storage["h2"].discharge_efficiency,
                priority: self.storage["h2"].dispatch_priority,
            },
        ];
        slots.sort_by_key(|slot| slot.priority);
        Ok(slots)
    }

    fn run_loop(
        &self,
        scenario: &Value,
        frame: &[HourInput],
        mut storage: StorageState,
    ) -> Result<(Vec<SimHour>, StorageState), ModelError> {
        let slots = self.storage_slots(scenario)?;
        let fixed_generation = is_fixed_generation_scenario(scenario);
        // Auch im fixed-generation-Pfad (historische Ist-Jahre) flexiblen Import bis
        // zur Interkonnektor-Kapazitaet erlauben: er deckt die kleine Bilanzluecke
        // (historische Erzeugung + Netto-Import vs. Last) statt sie als kuenstlichen
        // Lastabwurf auszuweisen. Fossile Erzeugung bleibt weiterhin fix (kein Ramp).
        let import_limit_gw = s_number(scenario, &["import", "stromGW"])?;
        let export_limit_gw = if fixed_generation {
            0.0
        } else {
            s_number(scenario, &["export", "stromGW"])?
        };
        let import_emission = s_number(scenario, &["import", "stromEmissionGperKWh"])?;
        let sector_h2_demand_gw = self.total_sector_h2_demand_gw(scenario)?;
        let h2_import_inflow_gw = s_number(scenario, &["import", "h2TWh"])? * 1000.0 / 8760.0;
        let h2_energy_cap = s_number(scenario, &["storage", "h2EnergyGWh"])?;
        let demand_last_2025 = s_bool(scenario, &["demand", "last-2025"])?;
        let mut hours = Vec::with_capacity(frame.len());

        for row in frame {
            // H₂-Pool: SoC, Import-Inflow und Sektor-Bedarf rechnen alle in
            // H₂-LHV-Einheiten (Elektrolyse-Verlust beim Laden, Rückverstromungs-
            // Verlust beim Entladen) — keine Einheitenvermischung mehr.
            let h2_available_gw = storage.h2 + h2_import_inflow_gw;
            let pool_cover_h2_gw = if sector_h2_demand_gw > 0.0 {
                sector_h2_demand_gw.min(h2_available_gw)
            } else {
                0.0
            };
            storage.h2 = h2_energy_cap.min(h2_available_gw - pool_cover_h2_gw);
            let h2_pool_reduction_gw =
                self.h2_pool_strom_reduction_gw(pool_cover_h2_gw, scenario)?;
            let load_gw = self.demand_gw(row, scenario, h2_pool_reduction_gw)?;
            // e100-Zusatzlast = Gesamtlast minus historische Basislast (fuer den fixed-Pfad:
            // die Basislast wurde im Ist-Jahr real gedeckt, die e100-Last nicht).
            let e100_load_gw = (load_gw - if demand_last_2025 { row.load_mw / 1000.0 } else { 0.0 }).max(0.0);
            let build = self.build_supply(row, scenario)?;

            let mut pv_gw = build.pv_available_gw;
            let mut wind_on_gw = build.wind_on_available_gw;
            let mut wind_off_gw = build.wind_off_available_gw;
            let mut kernkraft_gw = build.kernkraft_available_gw;
            let mut biomasse_gw = build.biomasse_gw;
            let mut laufwasser_gw = build.laufwasser_gw;
            let geothermal_gw = build.geothermal_gw;
            let waste_gw = build.waste_gw;
            let oil_gw = build.oil_gw;
            let other_gw = build.other_gw;
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
            let mut import_gw = build.fixed_import_gw;
            let mut export_gw = build.fixed_export_gw;
            let mut load_shedding_gw = 0.0;

            let baseline_supply = pv_gw
                + wind_on_gw
                + wind_off_gw
                + kernkraft_gw
                + biomasse_gw
                + laufwasser_gw
                + geothermal_gw
                + waste_gw
                + oil_gw
                + other_gw
                + gas_gw
                + kohle_gw;
            let mut mismatch = baseline_supply + import_gw - export_gw - load_gw;

            if mismatch > EPS {
                for slot in &slots {
                    let (charged, new_soc) = charge_storage(
                        mismatch,
                        slot.charge_power_gw,
                        slot.charge_eta,
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
                if !build.fixed_generation {
                    export_gw = mismatch.min(export_limit_gw).max(0.0);
                    mismatch -= export_gw;
                }

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
                        slot.discharge_eta,
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
                // Heimische Regelbare VOR flexiblem Import hochfahren: das Modell kennt
                // keine Preise, daher gilt Versorgungssicherheits-Logik — installierte
                // Gas-/Kohle-Kapazitaet wird genutzt, bevor Import als Flex-Puffer
                // einspringt (vorher lief Import zuerst und machte fossile Parks in
                // Custom-Szenarien unplausibel importlastig).
                if deficit > EPS && !build.fixed_generation {
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
                // Flexibler Import (additiv ueber den ggf. schon gesetzten fixed_import_gw).
                let extra_import = if build.fixed_generation {
                    // Ist-Jahr: die historische Basislast war real gedeckt → ihre Bilanzluecke
                    // voll per Import schliessen (sonst kuenstliche Blackouts in einem realen,
                    // stoerungsfrei versorgten Jahr). Die e100-Zusatzlast bleibt jedoch als
                    // ehrliches Defizit (fixe 2025-Erzeugung deckt sie nicht).
                    (deficit - e100_load_gw).max(0.0)
                } else {
                    deficit.min((import_limit_gw - import_gw).max(0.0)).max(0.0)
                };
                import_gw += extra_import;
                deficit -= extra_import;
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
                + geothermal_gw
                + waste_gw
                + oil_gw
                + other_gw
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
                geothermal_gw,
                waste_gw,
                oil_gw,
                other_gw,
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
                h2_pool_reduction_gw,
            });
        }

        Ok((hours, storage))
    }

    fn build_supply(
        &self,
        row: &HourInput,
        scenario: &Value,
    ) -> Result<SupplyBuild, ModelError> {
        if let Some(year) = fixed_generation_year(scenario) {
            let source = match year {
                2025 => &self.historical_2025,
                2017 => &self.historical_2017,
                _ => return Err(data_error(format!("unknown fixed generation year {year}"))),
            };
            let hour = source
                .get(row.index)
                .ok_or_else(|| data_error(format!("missing historical generation for hour {}", row.index)))?;
            let import_gw = (hour.import_export_mw / 1000.0).max(0.0);
            let export_gw = (-hour.import_export_mw / 1000.0).max(0.0);
            return Ok(SupplyBuild {
                fixed_generation: true,
                pv_available_gw: hour.pv_mw / 1000.0,
                wind_on_available_gw: hour.wind_on_mw / 1000.0,
                wind_off_available_gw: hour.wind_off_mw / 1000.0,
                kernkraft_available_gw: hour.nuclear_mw / 1000.0,
                biomasse_gw: hour.biomass_mw / 1000.0,
                laufwasser_gw: hour.hydro_mw / 1000.0,
                gas_min_gw: hour.gas_mw / 1000.0,
                kohle_min_gw: hour.coal_mw / 1000.0,
                gas_max_gw: hour.gas_mw / 1000.0,
                kohle_max_gw: hour.coal_mw / 1000.0,
                geothermal_gw: hour.geothermal_mw / 1000.0,
                waste_gw: hour.waste_mw / 1000.0,
                oil_gw: hour.oil_mw / 1000.0,
                other_gw: hour.other_mw / 1000.0,
                fixed_import_gw: import_gw,
                fixed_export_gw: export_gw,
            });
        }
        let pv_factor = (row.solar_factor
            * s_number(scenario, &["generation", "pvCapacityFactorMultiplier"])?)
        .min(1.0);
        let wind_on_factor = (row.wind_on_factor
            * s_number(scenario, &["generation", "windOnCapacityFactorMultiplier"])?)
        .min(1.0);
        let wind_off_factor = (row.wind_off_factor
            * s_number(scenario, &["generation", "windOffCapacityFactorMultiplier"])?)
        .min(1.0);
        Ok(SupplyBuild {
            fixed_generation: false,
            pv_available_gw: s_number(scenario, &["generation", "pvInstalledGW"])? * pv_factor,
            wind_on_available_gw: s_number(scenario, &["generation", "windOnInstalledGW"])?
                * wind_on_factor,
            wind_off_available_gw: s_number(scenario, &["generation", "windOffInstalledGW"])?
                * wind_off_factor,
            kernkraft_available_gw: s_number(scenario, &["generation", "kernkraftInstalledGW"])?
                * self.generation["kernkraft"].availability_for_month(row.month_index),
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
            geothermal_gw: 0.0,
            waste_gw: 0.0,
            oil_gw: 0.0,
            other_gw: 0.0,
            fixed_import_gw: 0.0,
            fixed_export_gw: 0.0,
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

    // pool_reduction_gw: vorab via h2_pool_strom_reduction_gw berechnete
    // strom-äquivalente Substitution der Sektor-Last durch den H₂-Pool.
    fn demand_gw(
        &self,
        row: &HourInput,
        scenario: &Value,
        pool_reduction_gw: f64,
    ) -> Result<f64, ModelError> {
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
        Ok((load - pool_reduction_gw).max(0.0))
    }

    fn hourly_e100(
        &self,
        row: &HourInput,
        scenario: &Value,
        id: DemandId,
        enabled_key: &str,
        target_key: &str,
    ) -> Result<f64, ModelError> {
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

    fn total_sector_h2_demand_gw(&self, scenario: &Value) -> Result<f64, ModelError> {
        let d = self.sector_h2_demand_twh(scenario)?;
        Ok((d.stahl + d.chemie + d.schiff + d.flug) * 1000.0 / 8760.0)
    }

    fn h2_pool_strom_reduction_gw(
        &self,
        pool_cover_h2_gw: f64,
        scenario: &Value,
    ) -> Result<f64, ModelError> {
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

    fn sector_h2_demand_twh(&self, scenario: &Value) -> Result<SectorH2, ModelError> {
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

    fn sector_h2_strom_twh(&self, scenario: &Value) -> Result<SectorH2, ModelError> {
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

    // Strom je TWh Pool-H₂ (H₂-LHV). Der Pool führt ein ZWISCHENPRODUKT:
    // je TWh H₂ entfällt nur der Elektrolyse-Strom (1/chargeEfficiency des
    // H₂-Speicherpakets); die Synthese-Verluste H₂→Endprodukt (PtL-Kerosin,
    // e-Fuels, Chemie-Derivate) trägt der Pool H₂-seitig — der Sektor zieht
    // entsprechend mehr H₂ (Kette Flug 0,38 = Elektrolyse 0,62 × Synthese
    // ≈ 0,61). Stünde hier die volle Ketten-Ratio, entstünde beim Cover
    // Energie aus dem Nichts (Laden kostet 1/0,62, Entlasten spart 1/0,38).
    // Stahl nutzt den im Sektorpaket dokumentierten Onsite-Elektrolyseur
    // (52 kWh/kg H₂); H₂ ist dort selbst das Endprodukt.
    fn sector_strom_per_h2(&self) -> Result<SectorH2, ModelError> {
        let electrolysis = 1.0 / self.storage["h2"].charge_efficiency.max(0.1);
        Ok(SectorH2 {
            stahl: number(
                &self.demand[&DemandId::Stahl].data,
                "electrolyzerKwhPerKgH2",
            )? / H2_LHV_KWH_PER_KG,
            chemie: electrolysis,
            schiff: electrolysis,
            flug: electrolysis,
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

fn fixed_generation_year(scenario: &Value) -> Option<u32> {
    let marker = scenario
        .get("_fixedGenerationYear")
        .and_then(Value::as_u64)
        .map(|value| value as u32);
    if marker.is_some() {
        return marker;
    }
    match scenario.get("supplyPreset").and_then(Value::as_str) {
        Some("historical-2025") => Some(2025),
        Some("historical-2017") => Some(2017),
        _ => None,
    }
}

fn is_fixed_generation_scenario(scenario: &Value) -> bool {
    fixed_generation_year(scenario).is_some()
}
