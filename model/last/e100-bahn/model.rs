pub fn additional_twh(target_twh: f64) -> f64 {
    target_twh.max(0.0)
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_twh: f64,
    hourly_multipliers: &[f64],
) -> f64 {
    let annual_twh = additional_twh(target_twh);
    annual_twh * 1000.0 * hourly_multipliers[hour_of_day_berlin] / 8760.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clips_negative_targets() {
        assert_eq!(additional_twh(-1.0), 0.0);
    }
}
