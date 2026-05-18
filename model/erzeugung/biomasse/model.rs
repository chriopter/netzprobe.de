pub const ID: &str = "biomasse";
pub const NAME: &str = "Biomasse";
pub const INSTALLED_2025_GW: f64 = 4.8;
pub const DEFAULT_INSTALLED_GW: f64 = 4.8;
pub const MIN_INSTALLED_GW: f64 = 0.0;
pub const MAX_INSTALLED_GW: f64 = 50.0;
pub const STEP_GW: f64 = 1.0;
pub const AVAILABILITY: f64 = 0.86;
pub const CO2E_G_PER_KWH: f64 = 230.0;

pub fn supply_gw(installed_gw: f64) -> f64 {
    installed_gw * AVAILABILITY
}
