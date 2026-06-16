use serde_json::{json, Value};
use super::data::{comp_number, snap_gen, snap_storage, snap_trade, trade_number};
use super::error::ModelError;
use super::StaticModel;

pub const SCALING_BASELINE_DEMAND_TWH: f64 = 466.0;

pub fn apply(
    _model: &StaticModel,
    demand_twh: f64,
    _scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    let factor = scaling_factor(demand_twh);
    Ok((
        json!({
            "pvInstalledGW": snap_gen("pv", comp_number("historisch-2025", "pvInstalledGW")? * factor)?,
            "windOnInstalledGW": snap_gen("windon", comp_number("historisch-2025", "windOnInstalledGW")? * factor)?,
            "windOffInstalledGW": snap_gen("windoff", comp_number("historisch-2025", "windOffInstalledGW")? * factor)?,
            "kernkraftInstalledGW": snap_gen("kernkraft", comp_number("historisch-2025", "kernkraftInstalledGW")? * factor)?,
            "biomasseInstalledGW": snap_gen("biomasse", comp_number("historisch-2025", "biomasseInstalledGW")?)?,
            "laufwasserInstalledGW": snap_gen("laufwasser", comp_number("historisch-2025", "laufwasserInstalledGW")?)?,
            "gasInstalledGW": snap_gen("gas", comp_number("historisch-2025", "gasInstalledGW")? * factor)?,
            "kohleInstalledGW": snap_gen("kohle", comp_number("historisch-2025", "kohleInstalledGW")? * factor)?,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.0,
        }),
        json!({
            "batteriePowerGW": snap_storage("batterie", "powerGW", comp_number("historisch-2025", "batteriePowerGW")? * factor)?,
            "batterieEnergyGWh": snap_storage("batterie", "energyGWh", comp_number("historisch-2025", "batterieEnergyGWh")? * factor)?,
            "pumpspeicherPowerGW": snap_storage("pumpspeicher", "powerGW", comp_number("historisch-2025", "pumpspeicherPowerGW")?)?,
            "pumpspeicherEnergyGWh": snap_storage("pumpspeicher", "energyGWh", comp_number("historisch-2025", "pumpspeicherEnergyGWh")?)?,
            "h2ChargePowerGW": snap_storage("h2", "chargePowerGW", comp_number("historisch-2025", "h2ChargePowerGW")? * factor)?,
            "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", comp_number("historisch-2025", "h2DischargePowerGW")? * factor)?,
            "h2EnergyGWh": snap_storage("h2", "energyGWh", comp_number("historisch-2025", "h2EnergyGWh")? * factor)?,
        }),
        json!({
            "stromGW": snap_trade("strom-handel", &["import", "stromGW"], comp_number("historisch-2025", "importStromGW")? * factor)?,
            "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
            "h2TWh": comp_number("historisch-2025", "importH2TWh")?,
        }),
        json!({
            "stromGW": snap_trade("strom-handel", &["export", "stromGW"], comp_number("historisch-2025", "exportStromGW")? * factor)?,
        }),
    ))
}

pub fn clamp(value: f64, min: f64, max: f64) -> f64 {
    value.max(min).min(max)
}

pub fn snap(value: f64, min: f64, max: f64, step: f64) -> f64 {
    let clamped = clamp(value, min, max);
    if step <= 0.0 {
        return clamped;
    }
    let stepped = ((clamped - min) / step).round() * step + min;
    clamp(stepped, min, max)
}

pub fn scaling_factor(demand_twh: f64) -> f64 {
    demand_twh / SCALING_BASELINE_DEMAND_TWH
}

pub fn scaled_slider(default_value: f64, min: f64, max: f64, step: f64, demand_twh: f64) -> f64 {
    snap(default_value * scaling_factor(demand_twh), min, max, step)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn doubles_at_932_twh() {
        assert!((scaling_factor(932.0) - 2.0).abs() < 1e-9);
        assert!((scaled_slider(102.5, 0.0, 2000.0, 0.1, 932.0) - 205.0).abs() < 1e-9);
    }
}
