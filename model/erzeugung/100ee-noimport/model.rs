// Kalibrierung gegen DE-2045-Klimaneutralitäts-Studien (Mai 2026):
// - BMWK Langfristszenarien 3 (T45-Strom): Demand 750 TWh, PV 400, Wind on 160, Wind off 70, H2 70-100 TWh
// - Agora KN2045: Demand 1270 TWh, PV 470, Wind on 180, Wind off 73, H2 70-80 TWh
// - Ariadne Szenarienreport: Demand 1037-1423 TWh, H2 16-17 TWh (Industrie-Bedarf separat)
// - Fraunhofer ISE 2024 (REMod): mind. 130 TWh H2-Saisonspeicher bei DE-stand-alone
// - Heide et al.: saisonal-optimaler Mix 55-60% Wind / 40-45% PV
// - Curtailment 10-12% (ISE, kostenoptimal); Überbau-Konsens 1.25-1.40
//
// Annahmen für stand-alone DE (kein Import):
// - Cushion 1.25 (Studien-Median, Curtailment-Verluste eingerechnet)
// - Mix 30/40/30 (PV / Wind on / Wind off) — Wind 70% total, saisonale Komplementarität
// - H2-Energie 0.06 × Demand TWh: 110 TWh bei e100-Demand 1830 TWh
//   Vergleich BMWK 80 / Agora 70 / DVGW 94 (skaliert auf 1830 TWh ~120 TWh) — mittig im Korridor
// - WICHTIG: kein Studienpfad modelliert echtes Stand-alone DE ohne H2-Import. Werte sind
//   konsistent mit Studienkorridor BEI gleicher Demand-Annahme; bei e100=1830 TWh (ohne
//   Sektorkopplung / WP-JAZ-Effizienz / Smart Charging) liegt Demand ~50-60% über Studien.

pub const EE_PV_SHARE: f64 = 0.30;
pub const EE_WIND_ON_SHARE: f64 = 0.40;
pub const EE_WIND_OFF_SHARE: f64 = 0.30;
pub const EE_CUSHION: f64 = 1.25;
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.1;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 0.5;
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.04;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.08;
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.06;
pub const EE_WIND_OFF_CAPACITY_FACTOR_MULTIPLIER: f64 = 1.8;

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

pub fn annual_yield_twh_per_gw(factors: &[f64]) -> f64 {
    factors.iter().sum::<f64>() / 1000.0
}

pub fn target_variable_re_twh(
    demand_twh: f64,
    biomasse_default_installed_gw: f64,
    laufwasser_default_installed_gw: f64,
) -> f64 {
    let baseline_bio_twh = biomasse_default_installed_gw * 8.76;
    let baseline_hydro_twh = laufwasser_default_installed_gw * 8.76;
    (demand_twh * EE_CUSHION - baseline_bio_twh - baseline_hydro_twh).max(0.0)
}

pub fn variable_re_gw(target_twh: f64, share: f64, total_share: f64, yield_twh_per_gw: f64) -> f64 {
    (target_twh * share / total_share) / yield_twh_per_gw.max(0.1)
}

pub fn wind_offshore_gw(target_twh: f64, share: f64, total_share: f64, yield_wind_onshore: f64) -> f64 {
    let yield_offshore = yield_wind_onshore * EE_WIND_OFF_CAPACITY_FACTOR_MULTIPLIER;
    (target_twh * share / total_share) / yield_offshore.max(0.1)
}

pub fn battery_power_gw(demand_twh: f64) -> f64 {
    demand_twh * EE_BATTERY_POWER_PER_TWH
}

pub fn battery_energy_gwh(demand_twh: f64) -> f64 {
    demand_twh * EE_BATTERY_ENERGY_PER_TWH
}

pub fn h2_charge_power_gw(demand_twh: f64) -> f64 {
    demand_twh * EE_H2_CHARGE_PER_TWH
}

pub fn h2_discharge_power_gw(demand_twh: f64) -> f64 {
    demand_twh * EE_H2_DISCHARGE_PER_TWH
}

pub fn h2_energy_gwh(demand_twh: f64) -> f64 {
    demand_twh * EE_H2_ENERGY_FRACTION_OF_DEMAND * 1000.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_storage_rules_for_466_twh() {
        assert!((battery_power_gw(466.0) - 46.6).abs() < 1e-9);
        assert!((battery_energy_gwh(466.0) - 233.0).abs() < 1e-9);
        // H2-Energie 0.06 × 466 × 1000 = 27_960 GWh (statt vorher 69_900)
        assert!((h2_energy_gwh(466.0) - 27_960.0).abs() < 1e-9);
    }

    #[test]
    fn mix_shares_sum_to_one() {
        let total = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
        assert!((total - 1.0).abs() < 1e-9);
    }
}
