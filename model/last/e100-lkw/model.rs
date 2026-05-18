pub fn additional_bn_km(target_bn_km: f64, already_electric_bn_km: f64) -> f64 {
    (target_bn_km - already_electric_bn_km).max(0.0)
}

pub fn additional_twh(target_bn_km: f64, already_electric_bn_km: f64, kwh_per_km: f64) -> f64 {
    additional_bn_km(target_bn_km, already_electric_bn_km) * kwh_per_km
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_bn_km: f64,
    already_electric_bn_km: f64,
    kwh_per_km: f64,
    hourly_multipliers: &[f64],
) -> f64 {
    let annual_twh = additional_twh(target_bn_km, already_electric_bn_km, kwh_per_km);
    annual_twh * 1000.0 * hourly_multipliers[hour_of_day_berlin] / 8760.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_default_additional_twh() {
        let twh = additional_twh(117.0, 1.5, 0.6);
        assert!((twh - 69.3).abs() < 1e-9);
    }
}
