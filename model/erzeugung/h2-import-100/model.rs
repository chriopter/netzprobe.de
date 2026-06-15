// Preset "H₂-Import 100%" (h2-import-100) — Source-of-Truth.
//
// Anwendungsfall: Gedanken-Anker, kein realistischer Pfad. Die GESAMTE Last wird
// aus importiertem Wasserstoff rückverstromt — keine heimische Erzeugung, keine
// Batterie. Der Import füllt (flach über das Jahr) die Kaverne, die
// Rückverstromungs-Turbinen (dischargeEfficiency 0,55) decken daraus die Stromlast;
// die stofflichen H₂-Sektoren (Stahl/Chemie/Schiff/Flug) zieht der Pool direkt aus
// demselben Import.
//
// Bewusste Vereinfachung der Engine: der Import läuft als KONSTANTER Zufluss
// (h2TWh / 8760). Reale Importe ließen sich saisonal einplanen (mehr im Winter);
// hier muss die Kaverne den saisonalen Versatz puffern, sonst Sommer-Überlauf
// (Verlust) und Winter-Defizit (Lastabwurf). Daher großzügige Kaverne + Import-
// Marge; die verbleibende Abregelung/der Lastabwurf zeigt genau diese Grenze.
//
// Sizing-Logik (Werte hier, Verdrahtung mit Last/Spitze im kern model.rs):
// - Rückverstromung = Spitzen-Stromlast × Cushion (deckt den Peak direkt).
// - Import (LHV)    = Sektor-H₂ direkt + Stromlast / Rückverstromungs-Wirkungsgrad,
//                     × Marge (gegen Kavernen-Überlaufverluste bei flachem Zufluss).
// - Kaverne (LHV)   = Anteil der Jahres-Stromlast als Saisonpuffer, in LHV.

use serde_json::{json, Value};
use super::data::{comp_number, snap_storage};
use super::error::ModelError;
use super::StaticModel;

// Rückverstromungs-Leistung deckt die Spitzen-Stromlast mit etwas Marge.
pub const DISCHARGE_CUSHION: f64 = 1.05;
// Import knapp über dem reinen Jahresbedarf: bei flachem Zufluss + 0,20-Kaverne
// deckt der exakte Bedarf bereits ~0 Lastabwurf (Sweep), 1,02 puffert die letzte
// Engpass-Stunde — mehr wäre nur Überlauf-Verlust (bezahlter, ungenutzter H₂).
pub const IMPORT_MARGIN: f64 = 1.02;
// Saisonale Kaverne als Anteil der Jahres-Stromlast (strom-äquivalent), via
// Rückverstromungs-Wirkungsgrad in H₂-LHV umgerechnet. Großzügig, weil bei
// flachem Import der gesamte Sommer-Winter-Versatz hier gepuffert werden muss.
pub const CAVERN_FRACTION_OF_STROMLAST: f64 = 0.20;
// Grüner H₂-Import inkl. Transport, konsistent mit dem ee-85-h2-15-Preset.
pub const STROM_IMPORT_EMISSION_G_PER_KWH: f64 = 25.0;

// H₂-Import (LHV, TWh): Sektor-Pool direkt + Stromlast über die Rückverstromung,
// mit Marge gegen Kavernen-Überlaufverluste.
pub fn import_h2_lhv_twh(stromlast_twh: f64, sector_lhv_twh: f64, discharge_eff: f64) -> f64 {
    (sector_lhv_twh.max(0.0) + stromlast_twh.max(0.0) / discharge_eff.max(0.1)) * IMPORT_MARGIN
}

// Rückverstromungs-Leistung (GW, elektrisch) = Spitzen-Stromlast × Cushion.
pub fn discharge_power_gw(peak_electricity_gw: f64) -> f64 {
    peak_electricity_gw.max(0.0) * DISCHARGE_CUSHION
}

// Kavernen-Energie (GWh, H₂-LHV) als saisonaler Puffer.
pub fn cavern_energy_gwh(stromlast_twh: f64, discharge_eff: f64) -> f64 {
    stromlast_twh.max(0.0) * CAVERN_FRACTION_OF_STROMLAST * 1000.0 / discharge_eff.max(0.1)
}

// Preset "100% H2-Import": keine heimische Erzeugung, die gesamte Stromlast
// wird aus importiertem H₂ rückverstromt; der Sektor-Pool zieht direkt aus
// demselben Import.
pub fn apply(
    model: &StaticModel,
    demand_twh: f64,
    scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    let discharge_eff = model.storage["h2"].discharge_efficiency.max(0.1);
    // Sektor-H₂ (LHV) deckt der Import direkt; die zu deckende Stromlast ist
    // Demand minus Sektor-Elektrolyse-Strom (diese Sektoren ziehen H₂ statt Strom).
    let lhv = model.sector_h2_demand_twh(scenario)?;
    let sector_lhv_total = lhv.stahl + lhv.chemie + lhv.schiff + lhv.flug;
    let strom = model.sector_h2_strom_twh(scenario)?;
    let sector_strom_total = strom.stahl + strom.chemie + strom.schiff + strom.flug;
    let stromlast_twh = (demand_twh - sector_strom_total).max(0.0);
    // Spitzen-Stromlast nach (konstanter) Pool-Reduktion → Rückverstromungs-Leistung.
    let pool_reduction_gw =
        model.h2_pool_strom_reduction_gw(model.total_sector_h2_demand_gw(scenario)?, scenario)?;
    let frame = model.hours_for(scenario)?;
    let mut peak_gw = 0.0_f64;
    for row in frame.iter() {
        peak_gw = peak_gw.max(model.demand_gw(row, scenario, pool_reduction_gw)?);
    }
    let import_lhv = import_h2_lhv_twh(stromlast_twh, sector_lhv_total, discharge_eff);
    Ok((
        json!({
            "pvInstalledGW": 0.0,
            "windOnInstalledGW": 0.0,
            "windOffInstalledGW": 0.0,
            "kernkraftInstalledGW": 0.0,
            "biomasseInstalledGW": 0.0,
            "laufwasserInstalledGW": 0.0,
            "gasInstalledGW": 0.0,
            "kohleInstalledGW": 0.0,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.0,
        }),
        json!({
            "batteriePowerGW": 0.0,
            "batterieEnergyGWh": 0.0,
            "pumpspeicherPowerGW": comp_number("historisch-2025", "pumpspeicherPowerGW")?,
            "pumpspeicherEnergyGWh": comp_number("historisch-2025", "pumpspeicherEnergyGWh")?,
            "h2ChargePowerGW": 0.0,
            "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", discharge_power_gw(peak_gw))?,
            "h2EnergyGWh": snap_storage("h2", "energyGWh", cavern_energy_gwh(stromlast_twh, discharge_eff))?,
        }),
        json!({
            "stromGW": 0.0,
            "stromEmissionGperKWh": STROM_IMPORT_EMISSION_G_PER_KWH,
            "h2TWh": import_lhv,
        }),
        json!({
            "stromGW": comp_number("historisch-2025", "exportStromGW")?,
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn import_covers_sector_plus_reelectrification() {
        // 1300 TWh Stromlast, 400 TWh Sektor-LHV, Rückverstromung 0,55:
        // (400 + 1300/0,55) × 1,02 ≈ 2819 TWh LHV.
        let lhv = import_h2_lhv_twh(1300.0, 400.0, 0.55);
        let expect = (400.0 + 1300.0 / 0.55) * IMPORT_MARGIN;
        assert!((lhv - expect).abs() < 1e-6);
        assert!(lhv > 2800.0 && lhv < 2840.0);
    }

    #[test]
    fn discharge_covers_peak_with_margin() {
        assert!((discharge_power_gw(280.0) - 294.0).abs() < 1e-9);
    }

    #[test]
    fn cavern_scales_with_stromlast_in_lhv() {
        // 1300 TWh × 0,20 / 0,55 × 1000 ≈ 472.727 GWh LHV.
        let gwh = cavern_energy_gwh(1300.0, 0.55);
        assert!((gwh - 1300.0 * 0.20 * 1000.0 / 0.55).abs() < 1e-6);
        assert!(gwh > 470_000.0 && gwh < 475_000.0);
    }
}
