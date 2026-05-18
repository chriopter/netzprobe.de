pub const DEFAULT_IMPORT_2025_GW: f64 = 13.0;
pub const DEFAULT_IMPORT_MAX_GW: f64 = 13.0;
pub const MIN_IMPORT_GW: f64 = 0.0;
pub const MAX_IMPORT_GW: f64 = 200.0;
pub const STEP_IMPORT_GW: f64 = 5.0;
pub const IMPORT_EMISSION_G_PER_KWH: f64 = 300.0;
pub const DEFAULT_EXPORT_2025_GW: f64 = 25.0;
pub const DEFAULT_EXPORT_MAX_GW: f64 = 25.0;
pub const MIN_EXPORT_GW: f64 = 0.0;
pub const MAX_EXPORT_GW: f64 = 200.0;
pub const STEP_EXPORT_GW: f64 = 5.0;

pub fn import_dispatch_gw(deficit_gw: f64, import_cap_gw: f64) -> f64 {
    if deficit_gw <= 0.0 || import_cap_gw <= 0.0 {
        return 0.0;
    }

    deficit_gw.min(import_cap_gw)
}

pub fn export_dispatch_gw(surplus_gw: f64, export_cap_gw: f64) -> f64 {
    if surplus_gw <= 0.0 || export_cap_gw <= 0.0 {
        return 0.0;
    }

    surplus_gw.min(export_cap_gw)
}

pub fn import_co2_tonnes_per_hour(import_gw: f64, emission_g_per_kwh: f64) -> f64 {
    import_gw * emission_g_per_kwh
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn caps_import_and_applies_emission_factor() {
        let import_gw = import_dispatch_gw(20.0, DEFAULT_IMPORT_MAX_GW);
        assert_eq!(import_gw, 13.0);
        assert_eq!(
            import_co2_tonnes_per_hour(import_gw, IMPORT_EMISSION_G_PER_KWH),
            3900.0
        );
    }
}
