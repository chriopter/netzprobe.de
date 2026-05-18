#![allow(dead_code)]

#[derive(Debug, Clone)]
pub struct E100GhdData {
    pub already_electric_heat_twh: f64,
    pub seasonal_cop: f64,
    pub hourly_multipliers: [f64; 24],
}

pub fn additional_heat_twh(target_heat_twh: f64, model: &E100GhdData) -> f64 {
    (target_heat_twh - model.already_electric_heat_twh).max(0.0)
}

pub fn additional_electricity_twh(target_heat_twh: f64, model: &E100GhdData) -> f64 {
    additional_heat_twh(target_heat_twh, model) / model.seasonal_cop
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    heating_degree_day_weight: f64,
    target_heat_twh: f64,
    model: &E100GhdData,
) -> f64 {
    let annual_electricity_twh = additional_electricity_twh(target_heat_twh, model);
    let hour_multiplier = model.hourly_multipliers[hour_of_day_berlin];
    annual_electricity_twh * 1000.0 * heating_degree_day_weight * hour_multiplier / 24.0
}
