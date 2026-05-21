pub const EE_PV_SHARE: f64 = 0.30;
pub const EE_WIND_ON_SHARE: f64 = 0.45;
pub const EE_WIND_OFF_SHARE: f64 = 0.15;
pub const EE_CUSHION: f64 = 1.4;
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.1;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 0.5;
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.06;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.12;
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.15;

pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

pub fn snap(value: f64, min: f64, max: f64, step: f64) -> f64 {
    let clamped = clamp(value, min, max);
    if step <= 0.0 {
        return clamped;
    }
    let stepped = ((clamped - min) / step).round() * step + min;
    clamp(stepped, min, max)
}

pub fn annual_yield_twh_per_gw(factors: &[f64]) -> f64 {
    factors.iter().sum::<f64>() / 1000.0
}

pub fn target_variable_re_twh(
    demand_twh: f64,
    biomasse_default_installed_gw: f64,
    laufwasser_default_installed_gw: f64,
) -> f64 {
    let baseline_bio_twh = biomasse_default_installed_gw * 8.76;
    let baseline_hydro_twh = laufwasser_default_installed_gw * 8.76;
    (demand_twh * EE_CUSHION - baseline_bio_twh - baseline_hydro_twh).max(0.0)
}

pub fn variable_re_gw(target_twh: f64, share: f64, total_share: f64, yield_twh_per_gw: f64) -> f64 {
    (target_twh * share / total_share) / yield_twh_per_gw.max(0.1)
}

pub fn battery_power_gw(demand_twh: f64) -> f64 {
    demand_twh * EE_BATTERY_POWER_PER_TWH
}

pub fn battery_energy_gwh(demand_twh: f64) -> f64 {
    demand_twh * EE_BATTERY_ENERGY_PER_TWH
}

pub fn h2_charge_power_gw(demand_twh: f64) -> f64 {
    demand_twh * EE_H2_CHARGE_PER_TWH
}

pub fn h2_discharge_power_gw(demand_twh: f64) -> f64 {
    demand_twh * EE_H2_DISCHARGE_PER_TWH
}

pub fn h2_energy_gwh(demand_twh: f64) -> f64 {
    demand_twh * EE_H2_ENERGY_FRACTION_OF_DEMAND * 1000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_storage_rules_for_466_twh() {
        assert!((battery_power_gw(466.0) - 46.6).abs() < 1e-9);
        assert!((battery_energy_gwh(466.0) - 233.0).abs() < 1e-9);
        assert!((h2_energy_gwh(466.0) - 69_900.0).abs() < 1e-9);
    }
}
