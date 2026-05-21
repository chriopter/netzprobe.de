pub const ID: &str = "pv";
pub const NAME: &str = "Photovoltaik";
pub const MIN_INSTALLED_GW: f64 = 0.0;
pub const MAX_INSTALLED_GW: f64 = 2000.0;
pub const STEP_GW: f64 = 10.0;
pub const FACTOR_PACKAGE: &str = "einspeisefaktoren-2025";
pub const FACTOR_FIELD: &str = "solarIrradiance";
pub const CO2E_G_PER_KWH: f64 = 35.0;

pub fn supply_gw(installed_gw: f64, solar_irradiance: f64) -> f64 {
    installed_gw * solar_irradiance
}
