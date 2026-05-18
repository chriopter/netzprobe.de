pub const ID: &str = "gas";
pub const NAME: &str = "Gas";
pub const INSTALLED_2025_GW: f64 = 35.5;
pub const DEFAULT_INSTALLED_GW: f64 = 35.5;
pub const MIN_INSTALLED_GW: f64 = 0.0;
pub const MAX_INSTALLED_GW: f64 = 360.0;
pub const STEP_GW: f64 = 5.0;
pub const AVAILABILITY: f64 = 0.9;
pub const MIN_LOAD_FRACTION: f64 = 0.05;
pub const CO2E_G_PER_KWH: f64 = 494.0;

pub fn available_gw(installed_gw: f64) -> f64 {
    installed_gw * AVAILABILITY
}

pub fn min_load_gw(installed_gw: f64) -> f64 {
    available_gw(installed_gw) * MIN_LOAD_FRACTION
}
