pub fn additional_million_km(target_million_km: f64, already_electric_million_km: f64) -> f64 {
    (target_million_km - already_electric_million_km).max(0.0)
}

pub fn additional_twh(
    target_million_km: f64,
    already_electric_million_km: f64,
    kwh_per_100_km: f64,
) -> f64 {
    additional_million_km(target_million_km, already_electric_million_km) * kwh_per_100_km
        / 100_000.0
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_million_km: f64,
    already_electric_million_km: f64,
    kwh_per_100_km: f64,
    hourly_multipliers: &[f64],
) -> f64 {
    let annual_twh = additional_twh(
        target_million_km,
        already_electric_million_km,
        kwh_per_100_km,
    );
    annual_twh * 1000.0 * hourly_multipliers[hour_of_day_berlin] / 8760.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_default_additional_twh() {
        let twh = additional_twh(472_200.0, 20_000.0, 20.0);
        assert!((twh - 90.44).abs() < 1e-9);
    }
}
