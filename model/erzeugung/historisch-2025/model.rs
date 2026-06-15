use serde_json::Value;
use super::error::ModelError;
use super::StaticModel;

pub fn apply(
    model: &StaticModel,
    _demand_twh: f64,
    _scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    model.composition_supply("historisch-2025")
}

pub fn default_installed_gw(default_installed_gw: f64) -> f64 {
    default_installed_gw
}

pub fn default_power_gw(default_power_gw: f64) -> f64 {
    default_power_gw
}

pub fn default_energy_gwh(default_energy_gwh: f64) -> f64 {
    default_energy_gwh
}

pub fn default_import_strom_gw(default_max_gw: f64) -> f64 {
    default_max_gw
}

pub fn default_export_strom_gw(default_max_gw: f64) -> f64 {
    default_max_gw
}

pub fn pv_capacity_factor_multiplier() -> f64 {
    1.0
}

pub fn wind_on_capacity_factor_multiplier() -> f64 {
    1.0
}

pub fn wind_off_capacity_factor_multiplier() -> f64 {
    1.8
}
