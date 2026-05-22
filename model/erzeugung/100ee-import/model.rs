// Preset "100% EE + Import" — Source-of-Truth.
//
// Kalibrierung gegen DE-2045-Klimaneutralitäts-Studien (Mai 2026):
// - Agora KN2045:        Demand 1270 TWh, PV 470 GW, Wind on 180, Wind off 73, H2-Import 270 TWh
// - BMWK LFS3 T45-H2:    Demand 750 TWh,  H2-Import 100-150 TWh, Strom-Import gering
// - dena Aufbruch KN100: H2-Gesamt 458 TWh, davon Großteil Import (250+)
// - Ariadne Modellvgl.:  H2-Import 60-250 TWh, E-Fuels 100-130, Strom-Import ~94 TWh
//
// Unterschied zum lokal-Preset (100ee-noimport):
// - Cushion 1.10 statt 1.25: Import puffert saisonalen Mismatch, weniger Überbau nötig
// - Mix 35/40/25: PV-lastiger (35 statt 30), Wind off zurück auf 25, weil Saison-Komplementarität
//   weniger kritisch wenn H2-Import den Winter-Engpass abdeckt
// - H2-Saisonspeicher 0.04 × Demand statt 0.06: ~73 TWh bei 1830 TWh Demand
//   (Agora 70-80 TWh, Studien-Median bei Import-Szenarien)
// - H2-Import-TWh: 0.15 × Demand jährlich → ~275 TWh bei 1830 TWh (Agora-konform)
// - Strom-Import-Cap: 20 GW (~94 TWh bei 50 % Auslastung; Ariadne-Wert)

pub const EE_PV_SHARE: f64 = 0.35;
pub const EE_WIND_ON_SHARE: f64 = 0.40;
pub const EE_WIND_OFF_SHARE: f64 = 0.25;
pub const EE_CUSHION: f64 = 1.10;
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.08;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 0.4;
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.03;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.06;
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.04;
pub const EE_WIND_OFF_CAPACITY_FACTOR_MULTIPLIER: f64 = 1.8;

pub const H2_IMPORT_TWH_FRACTION_OF_DEMAND: f64 = 0.15;
pub const STROM_IMPORT_GW_CAP: f64 = 20.0;
pub const STROM_IMPORT_EMISSION_G_PER_KWH: f64 = 100.0;

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

pub fn h2_import_twh(demand_twh: f64) -> f64 {
    demand_twh * H2_IMPORT_TWH_FRACTION_OF_DEMAND
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mix_shares_sum_to_one() {
        let total = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
        assert!((total - 1.0).abs() < 1e-9);
    }

    #[test]
    fn agora_skaliert_auf_e100_demand() {
        // e100-Demand 1830 TWh: H2-Import ~275 TWh (Agora 270 TWh × 1.02 Skalierung)
        let h2_imp = h2_import_twh(1830.0);
        assert!((h2_imp - 274.5).abs() < 1e-6);
        // H2-Saisonspeicher ~73 TWh (Agora 70-80, Studien-Median)
        let h2_energy = h2_energy_gwh(1830.0);
        assert!((h2_energy - 73_200.0).abs() < 1e-6);
    }
}
