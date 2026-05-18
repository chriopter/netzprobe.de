use super::{EPS, StorageState};

pub(super) fn charge_storage(
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
    (charged_gw, soc_gwh + charged_gw * eta)
}

pub(super) fn discharge_storage(needed_gw: f64, power_gw: f64, soc_gwh: f64) -> (f64, f64) {
    if needed_gw <= 0.0 || power_gw <= 0.0 || soc_gwh <= EPS {
        return (0.0, soc_gwh);
    }
    let discharged_gw = needed_gw.min(power_gw).min(soc_gwh);
    (discharged_gw, soc_gwh - discharged_gw)
}

pub(super) fn ramp_dispatchables(
    deficit_gw: f64,
    gas_headroom_gw: f64,
    kohle_headroom_gw: f64,
    gas_ratio: f64,
    kohle_ratio: f64,
) -> (f64, f64, f64) {
    if deficit_gw <= EPS {
        return (0.0, 0.0, 0.0);
    }
    let total_ratio = (gas_ratio + kohle_ratio).max(EPS);
    let mut gas_ramp = (deficit_gw * gas_ratio / total_ratio).min(gas_headroom_gw.max(0.0));
    let mut kohle_ramp = (deficit_gw * kohle_ratio / total_ratio).min(kohle_headroom_gw.max(0.0));
    let mut remaining = deficit_gw - gas_ramp - kohle_ramp;
    if remaining > EPS {
        let extra_gas = remaining.min((gas_headroom_gw - gas_ramp).max(0.0));
        gas_ramp += extra_gas;
        remaining -= extra_gas;
        let extra_kohle = remaining.min((kohle_headroom_gw - kohle_ramp).max(0.0));
        kohle_ramp += extra_kohle;
        remaining -= extra_kohle;
    }
    (gas_ramp, kohle_ramp, remaining.max(0.0))
}

pub(super) fn storage_get(storage: StorageState, id: &str) -> f64 {
    match id {
        "batterie" => storage.batterie,
        "pumpspeicher" => storage.pumpspeicher,
        "h2" => storage.h2,
        _ => 0.0,
    }
}

pub(super) fn storage_set(storage: &mut StorageState, id: &str, value: f64) {
    match id {
        "batterie" => storage.batterie = value,
        "pumpspeicher" => storage.pumpspeicher = value,
        "h2" => storage.h2 = value,
        _ => {}
    }
}
