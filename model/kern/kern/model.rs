const EPS: f64 = 1e-9;

pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

pub fn storage_initial_soc(energy_gwh: f64, initial_state_of_charge_fraction: f64) -> f64 {
    energy_gwh * initial_state_of_charge_fraction
}

pub fn charge_storage(
    remaining_gw: f64,
    power_gw: f64,
    eta: f64,
    soc_gwh: f64,
    energy_gwh: f64,
) -> (f64, f64) {
    if remaining_gw <= 0.0 || power_gw <= 0.0 || energy_gwh <= 0.0 || soc_gwh >= energy_gwh - EPS {
        return (0.0, soc_gwh);
    }

    let free_energy_gwh = energy_gwh - soc_gwh;
    let max_accept_gw = power_gw.min(free_energy_gwh / eta.max(EPS));
    let charged_gw = remaining_gw.min(max_accept_gw);
    let new_soc_gwh = clamp(soc_gwh + charged_gw * eta, 0.0, energy_gwh);

    (charged_gw, new_soc_gwh)
}

pub fn discharge_storage(
    deficit_gw: f64,
    power_gw: f64,
    soc_gwh: f64,
    energy_gwh: f64,
) -> (f64, f64) {
    if deficit_gw <= 0.0 || power_gw <= 0.0 || energy_gwh <= 0.0 || soc_gwh <= EPS {
        return (0.0, soc_gwh);
    }

    let discharged_gw = deficit_gw.min(power_gw).min(soc_gwh);
    let new_soc_gwh = clamp(soc_gwh - discharged_gw, 0.0, energy_gwh);

    (discharged_gw, new_soc_gwh)
}

pub fn variable_available_gw(
    installed_gw: f64,
    factor: f64,
    capacity_factor_multiplier: f64,
) -> f64 {
    installed_gw * (factor * capacity_factor_multiplier).min(1.0)
}

pub fn baseload_available_gw(installed_gw: f64, availability: f64) -> f64 {
    installed_gw * availability
}

pub fn dispatchable_min_gw(installed_gw: f64, availability: f64, min_load_fraction: f64) -> f64 {
    installed_gw * availability * min_load_fraction
}

pub fn dispatchable_max_gw(installed_gw: f64, availability: f64) -> f64 {
    installed_gw * availability
}

pub fn import_h2_inflow_gw(h2_twh: f64) -> f64 {
    h2_twh * 1000.0 / 8760.0
}

pub fn co2_tonnes_per_hour(supply_gw: f64, emission_g_per_kwh: f64) -> f64 {
    supply_gw * emission_g_per_kwh
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn charges_storage_with_efficiency() {
        let (charged, soc) = charge_storage(10.0, 8.0, 0.8, 2.0, 10.0);
        assert!((charged - 8.0).abs() < 1e-9);
        assert!((soc - 8.4).abs() < 1e-9);
    }

    #[test]
    fn discharges_storage_by_available_soc() {
        let (discharged, soc) = discharge_storage(10.0, 8.0, 3.0, 10.0);
        assert!((discharged - 3.0).abs() < 1e-9);
        assert!(soc.abs() < 1e-9);
    }
}
