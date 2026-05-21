pub const H2_IMPORT_EMISSION_G_PER_KWH: f64 = 100.0;
pub const DEMAND_DIVISOR_FOR_100EE_BASE: f64 = 3.0;

pub fn base_demand_twh(demand_twh: f64) -> f64 {
    demand_twh / DEMAND_DIVISOR_FOR_100EE_BASE
}

pub fn import_strom_gw(import_max_gw: f64) -> f64 {
    import_max_gw
}

pub fn import_strom_emission_g_per_kwh() -> f64 {
    H2_IMPORT_EMISSION_G_PER_KWH
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn uses_one_third_base_demand() {
        assert!((base_demand_twh(900.0) - 300.0).abs() < 1e-9);
        assert!((import_strom_emission_g_per_kwh() - 100.0).abs() < 1e-9);
    }
}
