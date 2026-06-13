// Preset "100% H2-Import" — Source-of-Truth.
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
// Grüner H₂-Import inkl. Transport, konsistent mit dem 100ee-import-Preset.
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
