// Preset "100% EE + Import" — Source-of-Truth.
//
// Kalibrierung gegen DE-2045-Klimaneutralitäts-Studien (Mai 2026):
// - Agora KN2045:        Demand 1270 TWh, PV 470 GW, Wind on 180, Wind off 73, H2-Import 270 TWh
// - BMWK LFS3 T45-H2:    Demand 750 TWh,  H2-Import 100-150 TWh, Strom-Import gering
// - dena Aufbruch KN100: H2-Gesamt 458 TWh, davon Großteil Import (250+)
// - Ariadne Modellvgl.:  H2-Import 60-250 TWh, E-Fuels 100-130, Strom-Import ~94 TWh
//
// Unterschied zum lokal-Preset (100ee-noimport):
// - Cushion 1.20 statt 1.30: Import puffert saisonalen Mismatch, weniger Überbau nötig
// - Mix 35/40/25: PV-lastiger (35 statt 30), Wind off zurück auf 25, weil Saison-Komplementarität
//   weniger kritisch wenn H2-Import den Winter-Engpass abdeckt
// - H2-Import: 0.15 × Demand jährlich, gedeckelt auf den Sektor-H2-Bedarf (LHV) —
//   Import ohne Abnehmer würde nur die Kaverne überlaufen lassen (totes Geld).
//   Die EE-Flotte wird auf die EFFEKTIVE Stromnachfrage nach Import-Substitution
//   ausgelegt (Engine-Pool ersetzt Sektor-Elektrolyse-Strom mit Hebel strom_per_h2),
//   nicht mehr doppelt für Elektrolyse-Strom UND Import (frühere Doppelzählung,
//   ~47 % Abregelung bei e100).
// - Strom-Import-Cap: 0.011 GW/TWh effektiver Demand (Ariadne-Anker, s. u.)

pub const EE_PV_SHARE: f64 = 0.35;
pub const EE_WIND_ON_SHARE: f64 = 0.40;
pub const EE_WIND_OFF_SHARE: f64 = 0.25;
// Cushion 1.30 auf die EFFEKTIVE Demand (nach Import-Substitution): Reserve für
// Wetterjahr-Schwankungen + reale Speicherkette (Elektrolyse 0,62 × Rückverstromung
// 0,55). Kalibriert nach LHV-Pool-Fix: 1,20 ließ bei heutiger Last 207 h und bei
// e100 ~300 h Lastabwurf; 1,25 reichte nur für heutige Last, 1,30 deckt beide.
pub const EE_CUSHION: f64 = 1.30;
// Batterie: 0.15 GW/TWh + 0.8 GWh/TWh. Weniger als lokal (0.3/1.5), weil H2- und Strom-Import
// als Flex-Puffer verfügbar. Bei e100 ergibt das ~275 GW / 1465 GWh — ausreichend für Peak.
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.15;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 0.8;
// H2 Charge/Discharge — Iteration 3 nach Lasttest mit LHV-Pool:
// Charge 0.12 GW/TWh (Sommer-Überschuss-Aufnahme). Discharge 0.18 GW/TWh: die
// Rückverstromung trägt die gesicherte Leistung gegen den Winterabend-Peak
// (~0,16-0,20 GW Peak je TWh Last); 0.08 ließ 206 h Lastabwurf bei heutiger
// Last, die Kante liegt bei 0.17 (e100) — 0.18 ist eine Snap-Stufe Marge.
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.12;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.18;
// H2-Saisonspeicher: 0.15 × effektive Demand (LHV). Bei e100 ~160 TWh, bei
// heutiger Last ~70 TWh. In LHV-Einheiten entspricht das elektrisch ~55 % davon;
// 0.10 ließ nach dem LHV-Fix Winterlücken (Energie-, nicht Leistungsmangel).
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.15;
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

// Wenn Wind off gecappt: Energie-Shortfall in TWh Strom, der kompensiert werden
// muss — bevorzugt über zusätzlichen H2-Import (Demand-Substitution in den
// Sektoren, solange dort Headroom ist), Rest über PV (das lokal-Preset kompensiert dagegen via WindOn).
pub fn wind_offshore_shortfall_twh(
    target_twh: f64,
    share_wind_off: f64,
    total_share: f64,
    yield_wind_offshore: f64,
) -> f64 {
    let wind_off_raw_gw = (target_twh * share_wind_off / total_share) / yield_wind_offshore.max(0.1);
    let wind_off_shortfall_gw = (wind_off_raw_gw - EE_WIND_OFFSHORE_MAX_GW).max(0.0);
    wind_off_shortfall_gw * yield_wind_offshore
}

// Sektor-Substitution: H2-Import (LHV) ersetzt Inlands-Elektrolyse-Strom der
// Sektoren. `sectors` = (LHV-Bedarf TWh, Strom-Hebel strom_per_h2) absteigend
// nach Hebel sortiert — gleiche Deckungsreihenfolge wie der Engine-H2-Pool.
pub fn strom_reduction_twh(import_lhv_twh: f64, sectors: &[(f64, f64)]) -> f64 {
    let mut remaining = import_lhv_twh.max(0.0);
    let mut reduction = 0.0;
    for (lhv_twh, ratio) in sectors {
        if remaining <= 0.0 {
            break;
        }
        let used = remaining.min(*lhv_twh);
        reduction += used * ratio;
        remaining -= used;
    }
    reduction
}

// Restliche Sektor-Headrooms nach Abzug eines bereits verplanten Imports.
pub fn remaining_sectors(sectors: &[(f64, f64)], consumed_lhv_twh: f64) -> Vec<(f64, f64)> {
    let mut remaining = consumed_lhv_twh.max(0.0);
    let mut rest = Vec::new();
    for (lhv_twh, ratio) in sectors {
        let used = remaining.min(*lhv_twh);
        remaining -= used;
        let headroom = lhv_twh - used;
        if headroom > 0.0 {
            rest.push((headroom, *ratio));
        }
    }
    rest
}

// Wie viel zusätzlicher H2-Import (LHV) nötig ist, um `strom_twh` Stromnachfrage
// per Sektor-Substitution zu ersetzen — begrenzt durch den Sektor-Headroom.
// Rückgabe: (LHV genutzt, Strom tatsächlich gedeckt).
pub fn h2_import_for_strom_twh(strom_twh: f64, sectors: &[(f64, f64)]) -> (f64, f64) {
    let mut remaining_strom = strom_twh.max(0.0);
    let mut lhv_used = 0.0;
    for (lhv_twh, ratio) in sectors {
        if remaining_strom <= 0.0 || *ratio <= 0.0 {
            break;
        }
        let lhv_needed = remaining_strom / ratio;
        let used = lhv_needed.min(*lhv_twh);
        lhv_used += used;
        remaining_strom -= used * ratio;
    }
    (lhv_used, strom_twh.max(0.0) - remaining_strom)
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
    fn h2_import_follows_demand_fraction() {
        // Basis-Import 0.15 × Demand; der Deckel auf den Sektor-LHV-Bedarf
        // wird in der Preset-Auflösung (kern model.rs) angewandt.
        assert!((h2_import_twh(1342.0) - 201.3).abs() < 1e-6);
        assert!((h2_energy_gwh(1342.0) - 201_300.0).abs() < 1e-6);
    }

    #[test]
    fn substitution_covers_sectors_in_ratio_order() {
        // Zwei Sektoren: 100 LHV mit Hebel 2.6, 100 LHV mit Hebel 1.6.
        let sectors = vec![(100.0, 2.6), (100.0, 1.6)];
        // 50 LHV Import → deckt nur den hochhebligen Sektor: 50 × 2.6 = 130 TWh Strom.
        assert!((strom_reduction_twh(50.0, &sectors) - 130.0).abs() < 1e-9);
        // 150 LHV → 100 × 2.6 + 50 × 1.6 = 340.
        assert!((strom_reduction_twh(150.0, &sectors) - 340.0).abs() < 1e-9);
        // Headroom nach 120 LHV: (80, 1.6).
        let rest = remaining_sectors(&sectors, 120.0);
        assert_eq!(rest.len(), 1);
        assert!((rest[0].0 - 80.0).abs() < 1e-9);
        // 200 TWh Strom ersetzen: braucht 100/2.6... → erst Sektor 1 voll (260 Strom > 200)
        let (lhv, covered) = h2_import_for_strom_twh(200.0, &sectors);
        assert!((covered - 200.0).abs() < 1e-9);
        assert!((lhv - 200.0 / 2.6).abs() < 1e-9);
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
