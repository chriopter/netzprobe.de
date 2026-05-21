pub const DEFAULT_POWER_GW: f64 = 10.0;
pub const MIN_POWER_GW: f64 = 0.0;
pub const MAX_POWER_GW: f64 = 500.0;
pub const STEP_POWER_GW: f64 = 10.0;
pub const DEFAULT_ENERGY_GWH: f64 = 25.0;
pub const MIN_ENERGY_GWH: f64 = 0.0;
pub const MAX_ENERGY_GWH: f64 = 5000.0;
pub const STEP_ENERGY_GWH: f64 = 50.0;
pub const ROUNDTRIP_EFFICIENCY: f64 = 0.8;
pub const INITIAL_STATE_OF_CHARGE_FRACTION: f64 = 0.0;
pub const DISPATCH_PRIORITY: u8 = 1;

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

pub fn charge_storage(
    remaining_gw: f64,
    power_gw: f64,
    soc_gwh: f64,
    energy_gwh: f64,
) -> ChargeResult {
    if remaining_gw <= 0.0 || power_gw <= 0.0 || energy_gwh <= 0.0 || soc_gwh >= energy_gwh {
        return ChargeResult {
            charged_gw: 0.0,
            new_soc_gwh: soc_gwh,
        };
    }

    let free_energy_gwh = energy_gwh - soc_gwh;
    let charged_gw = remaining_gw
        .min(power_gw)
        .min(free_energy_gwh / ROUNDTRIP_EFFICIENCY);

    ChargeResult {
        charged_gw,
        new_soc_gwh: soc_gwh + charged_gw * ROUNDTRIP_EFFICIENCY,
    }
}

pub fn discharge_storage(needed_gw: f64, power_gw: f64, soc_gwh: f64) -> DischargeResult {
    if needed_gw <= 0.0 || power_gw <= 0.0 || soc_gwh <= 0.0 {
        return DischargeResult {
            discharged_gw: 0.0,
            new_soc_gwh: soc_gwh,
        };
    }

    let discharged_gw = needed_gw.min(power_gw).min(soc_gwh);

    DischargeResult {
        discharged_gw,
        new_soc_gwh: soc_gwh - discharged_gw,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn charges_with_roundtrip_efficiency_on_charge_side() {
        let result = charge_storage(10.0, DEFAULT_POWER_GW, 0.0, DEFAULT_ENERGY_GWH);
        assert_eq!(result.charged_gw, 10.0);
        assert_eq!(result.new_soc_gwh, 8.0);
    }
}
