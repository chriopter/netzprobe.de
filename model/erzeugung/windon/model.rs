pub const ID: &str = "windon";
pub const NAME: &str = "Wind Onshore";
pub const INSTALLED_2025_GW: f64 = 62.8;
pub const DEFAULT_INSTALLED_GW: f64 = 62.8;
pub const MIN_INSTALLED_GW: f64 = 0.0;
pub const MAX_INSTALLED_GW: f64 = 1200.0;
pub const STEP_GW: f64 = 5.0;
pub const FACTOR_PACKAGE: &str = "einspeisefaktoren-2025";
pub const FACTOR_FIELD: &str = "wind100m";
pub const CO2E_G_PER_KWH: f64 = 13.0;

pub fn supply_gw(installed_gw: f64, wind100m: f64) -> f64 {
    installed_gw * wind100m
}
