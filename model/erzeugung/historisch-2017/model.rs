use serde_json::Value;
use super::error::ModelError;
use super::StaticModel;

pub fn apply(
    model: &StaticModel,
    _demand_twh: f64,
    _scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    model.composition_supply("historisch-2017")
}

pub const INSTALLED_2017_PV_GW: f64 = 42.4;
pub const INSTALLED_2017_WIND_ON_GW: f64 = 50.2;
pub const INSTALLED_2017_WIND_OFF_GW: f64 = 5.4;
pub const INSTALLED_2017_KERNKRAFT_GW: f64 = 10.8;
pub const INSTALLED_2017_BIOMASSE_GW: f64 = 7.6;
pub const INSTALLED_2017_LAUFWASSER_GW: f64 = 4.8;
pub const INSTALLED_2017_GAS_GW: f64 = 30.0;
pub const INSTALLED_2017_KOHLE_GW: f64 = 46.0;

pub const BATTERIE_POWER_GW: f64 = 0.0;
pub const BATTERIE_ENERGY_GWH: f64 = 0.0;
pub const PUMPSPEICHER_POWER_GW: f64 = 9.4;
pub const PUMPSPEICHER_ENERGY_GWH: f64 = 40.0;
pub const H2_CHARGE_POWER_GW: f64 = 0.0;
pub const H2_DISCHARGE_POWER_GW: f64 = 0.0;
pub const H2_ENERGY_GWH: f64 = 0.0;
pub const IMPORT_STROM_GW: f64 = 14.0;
pub const EXPORT_STROM_GW: f64 = 30.0;

pub fn generation_installed_gw() -> [f64; 8] {
    [
        INSTALLED_2017_PV_GW,
        INSTALLED_2017_WIND_ON_GW,
        INSTALLED_2017_WIND_OFF_GW,
        INSTALLED_2017_KERNKRAFT_GW,
        INSTALLED_2017_BIOMASSE_GW,
        INSTALLED_2017_LAUFWASSER_GW,
        INSTALLED_2017_GAS_GW,
        INSTALLED_2017_KOHLE_GW,
    ]
}
