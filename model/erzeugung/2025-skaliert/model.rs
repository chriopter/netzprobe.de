pub const SCALING_BASELINE_DEMAND_TWH: f64 = 466.0;

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
