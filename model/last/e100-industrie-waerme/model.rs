#![allow(dead_code)]

#[derive(Debug, Clone)]
pub struct E100IndustrieWaermeData {
    pub already_electric_heat_twh: f64,
    pub electricity_per_heat: f64,
    pub hourly_multipliers: [f64; 24],
}

pub fn additional_heat_twh(target_heat_twh: f64, model: &E100IndustrieWaermeData) -> f64 {
    (target_heat_twh - model.already_electric_heat_twh).max(0.0)
}

pub fn additional_electricity_twh(target_heat_twh: f64, model: &E100IndustrieWaermeData) -> f64 {
    additional_heat_twh(target_heat_twh, model) * model.electricity_per_heat
}

pub fn hourly_load_gw(
    hour_of_day_berlin: usize,
    target_heat_twh: f64,
    model: &E100IndustrieWaermeData,
) -> f64 {
    let annual_electricity_twh = additional_electricity_twh(target_heat_twh, model);
    let hour_multiplier = model.hourly_multipliers[hour_of_day_berlin];
    annual_electricity_twh * 1000.0 * hour_multiplier / 8760.0
}
