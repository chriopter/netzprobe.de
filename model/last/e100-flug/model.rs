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
    fn default_target_is_unchanged_without_existing_electric_share() {
        assert_eq!(additional_twh(300.0, 0.0), 300.0);
    }
}
