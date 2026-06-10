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
// Cushion 1.20: Reserve für Wetterjahr-Schwankungen + Round-trip-Verluste.
pub const EE_CUSHION: f64 = 1.20;
// Batterie: 0.15 GW/TWh + 0.8 GWh/TWh. Weniger als lokal (0.3/1.5), weil H2- und Strom-Import
// als Flex-Puffer verfügbar. Bei e100 ergibt das ~275 GW / 1465 GWh — ausreichend für Peak.
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.15;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 0.8;
// H2 Charge/Discharge — Iteration 2 nach Lasttest:
// Charge 0.12 GW/TWh (Sommer-Überschuss-Aufnahme), Discharge 0.08 GW/TWh (Winter-Peak).
// Niedriger als lokal weil H2-Import zusätzliche Pufferung bietet.
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.12;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.08;
// H2-Saisonspeicher: 0.10 × Demand. Bei e100 ~183 TWh, bei 2025 ~47 TWh.
// Über Agora-Konsens 70-80 TWh, weil bei e100-Demand mehr Saisonpufferung nötig.
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.10;
// Physisches Maximum Wind offshore DE-AWZ laut BSH FEP / WindSeeG: 70 GW bis 2045.
pub const EE_WIND_OFFSHORE_MAX_GW: f64 = 70.0;

pub const H2_IMPORT_TWH_FRACTION_OF_DEMAND: f64 = 0.15;
// Strom-Import-Cap proportional zur Demand (statt absolut 20 GW): typisch ~1.1 % der Last
// als Cap-Leistung; bei 466 TWh → 5 GW (~22 TWh/a bei 50 % Auslastung; konsistent mit
// Ariadne 94 TWh bei 1100 TWh Demand), bei 1830 TWh → 20 GW (~88 TWh/a).
// Hintergrund: EU-NTC-Ausbau-Ziel 2030 ~25-30 GW, aber Nachbarländer haben in 2045 selten
// strukturelle Überschüsse — Import primär als Flex-Puffer, nicht als Säule.
pub const STROM_IMPORT_GW_PER_TWH: f64 = 0.011;
// Emissionsfaktor 25 g/kWh: grüner H2-Import (Elektrolyse mit RE in MENA/Skandinavien/AUS),
// inkl. Transport-Verluste 5-10 g (Liquefaktion oder Ammoniak-Carrier). Konsistent mit
// "100ee"-Label. Blauer H2 (CCS, ~100 g/kWh) wäre Inkonsistenz zum Preset-Namen.
pub const STROM_IMPORT_EMISSION_G_PER_KWH: f64 = 25.0;

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

// Offshore-Yield kommt seit dem Faktor-Split direkt aus windOff100m (beobachtete
// Offshore-Einspeisung 2025, ~2,8 TWh/GW·a) — kein Multiplier-Umweg mehr.
pub fn wind_offshore_gw(target_twh: f64, share: f64, total_share: f64, yield_wind_offshore: f64) -> f64 {
    let raw_gw = (target_twh * share / total_share) / yield_wind_offshore.max(0.1);
    raw_gw.min(EE_WIND_OFFSHORE_MAX_GW)
}

// Wenn Wind off gecappt: H2-Import deckt den Energie-Shortfall ab (statt mehr PV wie lokal).
// Begründung: Import-Pfad rechtfertigt sich gerade durch Limits in inländischer Erzeugung.
pub fn h2_import_compensation_twh(
    target_twh: f64,
    share_wind_off: f64,
    total_share: f64,
    yield_wind_offshore: f64,
) -> f64 {
    let wind_off_raw_gw = (target_twh * share_wind_off / total_share) / yield_wind_offshore.max(0.1);
    let wind_off_shortfall_gw = (wind_off_raw_gw - EE_WIND_OFFSHORE_MAX_GW).max(0.0);
    wind_off_shortfall_gw * yield_wind_offshore
}

pub fn strom_import_gw_cap(demand_twh: f64) -> f64 {
    demand_twh * STROM_IMPORT_GW_PER_TWH
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
        // H2-Saisonspeicher 0.10 × 1830 = 183 TWh (über Agora 70-80, weil hohe e100-Demand)
        let h2_energy = h2_energy_gwh(1830.0);
        assert!((h2_energy - 183_000.0).abs() < 1e-6);
    }

    #[test]
    fn charge_higher_than_discharge() {
        assert!(EE_H2_CHARGE_PER_TWH > EE_H2_DISCHARGE_PER_TWH);
    }

    #[test]
    fn wind_offshore_capped_at_70_gw() {
        let result = wind_offshore_gw(10_000.0, 0.25, 1.0, 2.8);
        assert!((result - EE_WIND_OFFSHORE_MAX_GW).abs() < 1e-6);
    }

    #[test]
    fn strom_import_cap_scales_with_demand() {
        // 466 TWh → ~5 GW; 1830 TWh → ~20 GW
        assert!((strom_import_gw_cap(466.0) - 5.126).abs() < 0.01);
        assert!((strom_import_gw_cap(1830.0) - 20.13).abs() < 0.01);
    }

    #[test]
    fn import_emission_is_green_h2() {
        // 25 g/kWh = grüner H2 inkl. Transport (Elektrolyse-RE-betrieben, MENA/Skandinavien).
        // Blauer H2 mit CCS wäre ~100 g/kWh und würde "100ee"-Label widersprechen.
        assert!(STROM_IMPORT_EMISSION_G_PER_KWH < 50.0);
    }
}
