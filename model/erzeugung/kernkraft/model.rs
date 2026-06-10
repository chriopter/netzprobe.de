pub const ID: &str = "kernkraft";
pub const NAME: &str = "Kernkraft";
pub const MIN_INSTALLED_GW: f64 = 0.0;
pub const MAX_INSTALLED_GW: f64 = 500.0;
pub const STEP_GW: f64 = 0.5;
// Flacher Jahresmittel-Fallback. Der Dispatch nutzt das 12-Monats-Profil
// availabilityMonthly aus package.json (Sommer-Revisionsfenster, Winter 0,95,
// Sommertal 0,83; Jahresmittel 0,90) — siehe kern/model.rs availability_for_month.
pub const AVAILABILITY: f64 = 0.9;
pub const CO2E_G_PER_KWH: f64 = 12.0;

pub fn supply_gw(installed_gw: f64, monthly_availability: f64) -> f64 {
    installed_gw * monthly_availability
}
