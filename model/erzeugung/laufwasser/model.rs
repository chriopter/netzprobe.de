pub const ID: &str = "laufwasser";
pub const NAME: &str = "Laufwasser";
pub const MIN_INSTALLED_GW: f64 = 0.0;
pub const MAX_INSTALLED_GW: f64 = 48.0;
pub const STEP_GW: f64 = 0.5;
// = referenceYield 4,0 TWh/GW·a ÷ 8,76 — geeicht an der realen Laufwasser-
// Erzeugung (BDEW 17,5–20,7 TWh/a), nicht an der PSW-haltigen 2025-Stundenreihe.
pub const AVAILABILITY: f64 = 0.457;
pub const CO2E_G_PER_KWH: f64 = 11.0;

pub fn supply_gw(installed_gw: f64) -> f64 {
    installed_gw * AVAILABILITY
}
