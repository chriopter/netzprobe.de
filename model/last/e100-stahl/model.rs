#![allow(dead_code)]

#[derive(Debug, Clone)]
pub struct E100StahlData {
    pub mwh_per_ton: f64,
    pub already_electric_twh: f64,
    pub hourly_multipliers: [f64; 24],
}

pub fn additional_twh(target_mio_ton: f64, model: &E100StahlData) -> f64 {
    let gross_twh = target_mio_ton.max(0.0) * model.mwh_per_ton;
    (gross_twh - model.already_electric_twh).max(0.0)
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_mio_ton: f64,
    model: &E100StahlData,
) -> f64 {
    let annual_twh = additional_twh(target_mio_ton, model);
    let hour_multiplier = model.hourly_multipliers[hour_of_day_berlin];
    annual_twh * 1000.0 * hour_multiplier / 8760.0
}
