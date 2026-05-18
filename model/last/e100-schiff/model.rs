pub fn additional_twh(target_twh: f64, already_electric_twh: f64) -> f64 {
    (target_twh - already_electric_twh).max(0.0)
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_twh: f64,
    already_electric_twh: f64,
    hourly_multipliers: &[f64],
) -> f64 {
    let annual_twh = additional_twh(target_twh, already_electric_twh);
    annual_twh * 1000.0 * hourly_multipliers[hour_of_day_berlin] / 8760.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn subtracts_existing_electric_share() {
        let twh = additional_twh(80.0, 0.3);
        assert!((twh - 79.7).abs() < 1e-9);
    }
}
