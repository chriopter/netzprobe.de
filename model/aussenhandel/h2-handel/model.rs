pub const DEFAULT_TWH: f64 = 0.0;
pub const MIN_TWH: f64 = 0.0;
pub const MAX_TWH: f64 = 600.0;
pub const STEP_TWH: f64 = 10.0;

pub fn import_inflow_gw(import_twh_per_year: f64) -> f64 {
    import_twh_per_year * 1000.0 / 8760.0
}

pub fn power_reduction_gw(pool_cover_h2_gw: f64, sector_efficiency: f64) -> f64 {
    if pool_cover_h2_gw <= 0.0 || sector_efficiency <= 0.0 {
        return 0.0;
    }

    pool_cover_h2_gw / sector_efficiency
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_annual_import_to_constant_pool_inflow() {
        assert!((import_inflow_gw(87.6) - 10.0).abs() < 1e-12);
    }
}
