#![allow(dead_code)]

#[derive(Debug, Clone)]
pub struct E100ChemieData {
    pub already_electric_twh: f64,
    pub hourly_multipliers: [f64; 24],
}

pub fn additional_twh(target_total_twh: f64, model: &E100ChemieData) -> f64 {
    (target_total_twh - model.already_electric_twh).max(0.0)
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_total_twh: f64,
    model: &E100ChemieData,
) -> f64 {
    let annual_additional_twh = additional_twh(target_total_twh, model);
    let hour_multiplier = model.hourly_multipliers[hour_of_day_berlin];
    annual_additional_twh * 1000.0 * hour_multiplier / 8760.0
}
