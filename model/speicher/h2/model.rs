pub const CHARGE_POWER_2025_GW: f64 = 0.1;
pub const DEFAULT_CHARGE_POWER_GW: f64 = 0.1;
pub const MIN_CHARGE_POWER_GW: f64 = 0.0;
pub const MAX_CHARGE_POWER_GW: f64 = 300.0;
pub const STEP_CHARGE_POWER_GW: f64 = 5.0;
pub const DISCHARGE_POWER_2025_GW: f64 = 0.0;
pub const DEFAULT_DISCHARGE_POWER_GW: f64 = 0.0;
pub const MIN_DISCHARGE_POWER_GW: f64 = 0.0;
pub const MAX_DISCHARGE_POWER_GW: f64 = 300.0;
pub const STEP_DISCHARGE_POWER_GW: f64 = 5.0;
pub const ENERGY_2025_GWH: f64 = 0.1;
pub const DEFAULT_ENERGY_GWH: f64 = 0.1;
pub const MIN_ENERGY_GWH: f64 = 0.0;
pub const MAX_ENERGY_GWH: f64 = 500_000.0;
pub const STEP_ENERGY_GWH: f64 = 5000.0;
pub const ROUNDTRIP_EFFICIENCY: f64 = 0.34;
pub const INITIAL_STATE_OF_CHARGE_FRACTION: f64 = 0.0;
pub const DISPATCH_PRIORITY: u8 = 3;

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ChargeResult {
    pub charged_gw: f64,
    pub new_soc_gwh: f64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct DischargeResult {
    pub discharged_gw: f64,
    pub new_soc_gwh: f64,
}

pub fn initial_state_of_charge_gwh(energy_gwh: f64) -> f64 {
    energy_gwh * INITIAL_STATE_OF_CHARGE_FRACTION
}

pub fn h2_import_inflow_gw(import_twh_per_year: f64) -> f64 {
    import_twh_per_year * 1000.0 / 8760.0
}

pub fn cover_sector_h2_demand(
    pool_soc_gwh: f64,
    import_inflow_gw: f64,
    demand_gw: f64,
    energy_cap_gwh: f64,
) -> (f64, f64) {
    let available_gw = pool_soc_gwh + import_inflow_gw;
    let covered_gw = if demand_gw > 0.0 {
        demand_gw.min(available_gw)
    } else {
        0.0
    };
    let new_soc_gwh = (available_gw - covered_gw).min(energy_cap_gwh);

    (covered_gw, new_soc_gwh)
}

pub fn charge_storage(
    remaining_gw: f64,
    charge_power_gw: f64,
    soc_gwh: f64,
    energy_gwh: f64,
) -> ChargeResult {
    if remaining_gw <= 0.0 || charge_power_gw <= 0.0 || energy_gwh <= 0.0 || soc_gwh >= energy_gwh {
        return ChargeResult {
            charged_gw: 0.0,
            new_soc_gwh: soc_gwh,
        };
    }

    let free_energy_gwh = energy_gwh - soc_gwh;
    let charged_gw = remaining_gw
        .min(charge_power_gw)
        .min(free_energy_gwh / ROUNDTRIP_EFFICIENCY);

    ChargeResult {
        charged_gw,
        new_soc_gwh: soc_gwh + charged_gw * ROUNDTRIP_EFFICIENCY,
    }
}

pub fn discharge_storage(needed_gw: f64, discharge_power_gw: f64, soc_gwh: f64) -> DischargeResult {
    if needed_gw <= 0.0 || discharge_power_gw <= 0.0 || soc_gwh <= 0.0 {
        return DischargeResult {
            discharged_gw: 0.0,
            new_soc_gwh: soc_gwh,
        };
    }

    let discharged_gw = needed_gw.min(discharge_power_gw).min(soc_gwh);

    DischargeResult {
        discharged_gw,
        new_soc_gwh: soc_gwh - discharged_gw,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_annual_h2_import_to_constant_hourly_inflow() {
        assert!((h2_import_inflow_gw(87.6) - 10.0).abs() < 1e-12);
    }
}
