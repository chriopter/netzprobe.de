// Kalibrierung gegen DE-2045-Klimaneutralitäts-Studien (Mai 2026):
// - BMWK Langfristszenarien 3 (T45-Strom): Demand 750 TWh, PV 400, Wind on 160, Wind off 70, H2 70-100 TWh
// - Agora KN2045: Demand 1270 TWh, PV 470, Wind on 180, Wind off 73, H2 70-80 TWh
// - Ariadne Szenarienreport: Demand 1037-1423 TWh, H2 16-17 TWh (Industrie-Bedarf separat)
// - Fraunhofer ISE 2024 (REMod): mind. 130 TWh H2-Saisonspeicher bei DE-stand-alone
// - Heide et al.: saisonal-optimaler Mix 55-60% Wind / 40-45% PV
// - Curtailment 10-12% (ISE, kostenoptimal); Überbau-Konsens 1.25-1.40
//
// Annahmen für stand-alone DE (kein Import):
// - Auslegung auf die EFFEKTIVE Stromnachfrage: eff = demand − Sektor-Elektrolyse-Strom
//   + Sektor-LHV / 0.62 (chargeEfficiency) — der Engine-H2-Pool deckt den Sektor-H2-Bedarf
//   aus Überschuss-Elektrolyse statt als direkte Stromlast (preset_100ee_noimport in
//   model/kern/kern/model.rs). Alle GW/GWh-Regeln hier skalieren mit dieser eff. Demand.
// - Cushion 1.30 (Studienkorridor 1.25-1.40; trägt Roundtrip 0.34 = 0.62 × 0.55)
// - Mix 30/40/30 (PV / Wind on / Wind off) — Wind 70% total, saisonale Komplementarität
// - H2-Kaverne 0.11 × Demand in TWh H2-LHV: bei e100 ~180 TWh
//   Vergleich BMWK 80 / Agora 70 / ISE-Stand-alone-Minimum 130 — oberer Rand, weil ohne Import
// - WICHTIG: kein Studienpfad modelliert echtes Stand-alone DE ohne H2-Import. Werte sind
//   konsistent mit Studienkorridor BEI gleicher Demand-Annahme; bei e100 = 1808 TWh brutto
//   (ohne Sektorkopplung / WP-JAZ-Effizienz / Smart Charging) liegt Demand über Studien;
//   simulierte Stromlast nach H2-Pool-Substitution: 1068 TWh.

pub const EE_PV_SHARE: f64 = 0.30;
pub const EE_WIND_ON_SHARE: f64 = 0.40;
pub const EE_WIND_OFF_SHARE: f64 = 0.30;
// Cushion 1.30 (Stand-alone-DE-Überbau, Fraunhofer ISE Konsens 1.25-1.40, hier mittig).
// Der Agora-Wert 1.15-1.20 gilt nur MIT Import; ohne Import zu knapp (frühere Messung:
// 499 h Lastabwurf bei 1.15). Lasttest nach dem LHV-konsistenten H2-Pool (Laden 0.62,
// Entladen 0.55, Roundtrip 0.34), Wetter-/Lastjahr 2025: 0 h Lastabwurf bei heutiger
// Last und bei e100, robust auch bei Windjahr ×0.90 und ×0.85. Preis der Autarkie ist
// Überbau: bei e100 werden 356 TWh abgeregelt (~17 %) — ehrlicher ausgewiesen als zuvor,
// wo die verlustreiche Elektrolyse-Doppelzählung den Überbau versteckte.
pub const EE_CUSHION: f64 = 1.30;
// Batterie: 0.4 GW/TWh + 2.0 GWh/TWh (C-Rate 5h). Aggressiv für Peak-Last-Deckung +
// Tag/Nacht-Glättung in vollelektrifiziertem Szenario.
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.4;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 2.0;
// H2 Charge 0.30 GW/TWh: nimmt Sommer-PV-Spitzen auf und produziert zusätzlich das
//   Sektor-H2 (Pool deckt Stahl/Chemie/Schiff/Flug aus Überschuss-Elektrolyse).
// H2 Discharge 0.15 GW/TWh: deckt Peak-Last gemeinsam mit Batterie.
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.30;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.15;
// H2-Saisonspeicher 0.11 × Demand, dimensioniert in TWh H2-LHV (vergleichbar mit
// Kavernen-Potenzial-Angaben): bei heutiger Last 50 TWh, bei e100 (eff. Demand ~1650 TWh)
// 180 TWh. Oberer Studienkorridor (Fraunhofer ISE Stand-alone-Minimum ~130 TWh; BMWK 80,
// Agora 70, DVGW ~120 — alle MIT Import, daher hier oberer Rand). Salzkavernen-Potenzial
// DE 9400 TWh (Fraunhofer IEG) → genutzt nur ~2 %, also problemlos.
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.11;
// Physisches Maximum Wind offshore DE-AWZ laut BSH FEP / WindSeeG: 70 GW bis 2045.
// Floating-Offshore könnte +20-30 GW, aber kommerziell erst nach 2040 — daher Hard-Cap.
pub const EE_WIND_OFFSHORE_MAX_GW: f64 = 70.0;

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

// Offshore-Yield kommt seit dem Faktor-Split direkt aus windOff100m (beobachtete
// Offshore-Einspeisung 2025, ~2,8 TWh/GW·a) — kein Multiplier-Umweg mehr.
pub fn wind_offshore_gw(target_twh: f64, share: f64, total_share: f64, yield_wind_offshore: f64) -> f64 {
    let raw_gw = (target_twh * share / total_share) / yield_wind_offshore.max(0.1);
    raw_gw.min(EE_WIND_OFFSHORE_MAX_GW)
}

// Falls Wind offshore gecappt wird (>70 GW Anforderung), kompensiert PV den Energieausfall.
// PV ist mengenmäßig elastischer (Dachflächen, Agri-PV, Konversionsflächen) als Wind onshore
// (2 %-Vorrangflächen-Limit). Rückgabe: zusätzliche PV-GW, die den Wind-off-Shortfall ersetzen.
pub fn pv_compensation_for_wind_offshore_cap(
    target_twh: f64,
    share_wind_off: f64,
    total_share: f64,
    yield_wind_offshore: f64,
    yield_pv: f64,
) -> f64 {
    let wind_off_raw_gw = (target_twh * share_wind_off / total_share) / yield_wind_offshore.max(0.1);
    let wind_off_shortfall_gw = (wind_off_raw_gw - EE_WIND_OFFSHORE_MAX_GW).max(0.0);
    let shortfall_twh = wind_off_shortfall_gw * yield_wind_offshore;
    shortfall_twh / yield_pv.max(0.1)
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
        // Batterie 0.4 × 466 = 186.4 GW, 2.0 × 466 = 932 GWh
        assert!((battery_power_gw(466.0) - 186.4).abs() < 1e-9);
        assert!((battery_energy_gwh(466.0) - 932.0).abs() < 1e-9);
        // H2-Energie 0.11 × 466 × 1000 = 51_260 GWh = 51.26 TWh
        assert!((h2_energy_gwh(466.0) - 51_260.0).abs() < 1e-9);
    }

    #[test]
    fn mix_shares_sum_to_one() {
        let total = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
        assert!((total - 1.0).abs() < 1e-9);
    }

    #[test]
    fn charge_higher_than_discharge() {
        // Elektrolyse > Rückverstromung: Sommer-Überschuss füllt Speicher über viele Stunden,
        // Rückverstromung deckt nur Winter-Spitzen.
        assert!(EE_H2_CHARGE_PER_TWH > EE_H2_DISCHARGE_PER_TWH);
    }

    #[test]
    fn wind_offshore_capped_at_70_gw() {
        // Bei sehr hohem Target sollte Wind off bei 70 GW kappen.
        let huge_target = 10_000.0;
        let yield_wind_off = 2.8;
        let total_share = 1.0;
        let result = wind_offshore_gw(huge_target, 0.30, total_share, yield_wind_off);
        assert!((result - EE_WIND_OFFSHORE_MAX_GW).abs() < 1e-6);
    }

    #[test]
    fn pv_compensation_replaces_capped_offshore_energy() {
        // Shortfall-Energie (über 70 GW) muss vollständig in PV-GW übersetzt werden.
        let target = 2_000.0;
        let yield_wind_off = 2.8;
        let yield_pv = 0.7;
        let raw_gw = target * 0.30 / yield_wind_off;
        let shortfall_twh = (raw_gw - EE_WIND_OFFSHORE_MAX_GW).max(0.0) * yield_wind_off;
        let pv_gw = pv_compensation_for_wind_offshore_cap(target, 0.30, 1.0, yield_wind_off, yield_pv);
        assert!((pv_gw * yield_pv - shortfall_twh).abs() < 1e-6);
    }
}
