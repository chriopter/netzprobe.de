// Preset "EE moderat + Restkern (lastfolgend, CO₂-arm)" — Source-of-Truth.
//
// Idee: Erneuerbare NICHT bis zum teuren Überbau treiben, sondern auf einem
// moderaten Niveau halten und den festen Rest mit Kernkraft als lastfolgender
// Grundlast decken. KEIN Gas (CO₂-frei bis auf den irreduziblen e100-Prozess-
// Boden ~30 Mt); die tiefe Dunkelflaute deckt ein H₂-Saisonspeicher.
//
// Konzept-Anker: WePlanet DACH "Deutschlands Energiezukunft" (2025).
//
// Die Koeffizienten (GW je TWh Jahreslast) stammen aus einer Kostenoptimierung
// über die lokale Engine auf dem PRESET-Pfad (H₂-Sektorpool aktiv): Gitter aus
// EE-Niveau × Kernkraft × Peaking-Typ (Gas vs H₂) × Speichergrößen, je Kandidat
// €/MWh (Port von kosten.ts) + CO₂ + Lastabwurf ausgewertet. Befund: bei e100
// ist die Kostenfläche flach (~186–190 €/MWh über Kernkraft 180–235 GW), und
// WENIGER Kernkraft bricht die Versorgungssicherheit (260–500 TWh Lastabwurf),
// weil der H₂-Speicher den Sektor-H₂ (461 TWh LHV) UND die Dunkelflaute decken
// muss. Gewählt: der schlankste sichere Punkt mit dem geringsten Curtailment
// (~180 GW Kernkraft, nur 12 TWh Drosselung): ~187 €/MWh, ~34 Mt CO₂, 0 h
// Lastabwurf. Reine Kernkraft wäre ~1 €/MWh billiger, regelt aber 200+ TWh ab.
// Die scheinbare Überproduktion (Kernkraft > Momentanlast) ist die Elektrolyse-
// Speisung für den heimischen Sektor-H₂, keine Verschwendung (Curtailment 12 TWh).
//
// Alles als GW je TWh Jahreslast → skaliert mit jeder Last (heute / e100 /
// manuell), Kernkraft im Dispatch curtailbar → lastfolgend.

use serde_json::{json, Value};
use super::data::{comp_number, snap_gen, snap_storage, trade_number};
use super::error::ModelError;
use super::StaticModel;

// Erzeuger-Kapazität je TWh Jahreslast (kostenoptimal-gasfrei, e100-kalibriert).
pub const PV_GW_PER_TWH: f64 = 0.101;
pub const WIND_ON_GW_PER_TWH: f64 = 0.068;
pub const WIND_OFF_GW_PER_TWH: f64 = 0.0177;
pub const KERN_GW_PER_TWH: f64 = 0.0996;
// Kein Gas — CO₂-frei. Die Dunkelflaute deckt der H₂-Saisonspeicher.
pub const GAS_GW_PER_TWH: f64 = 0.0;
// Physisches Maximum Wind offshore DE-AWZ (BSH FEP / WindSeeG 2045).
pub const WIND_OFFSHORE_MAX_GW: f64 = 70.0;
// Batterie (Tag/Nacht-PV-Glättung).
pub const BATTERY_POWER_PER_TWH: f64 = 0.12;
pub const BATTERY_ENERGY_GWH_PER_TWH: f64 = 1.0;
// H₂-Saisonspeicher (Elektrolyse / Rückverstromung / Kaverne) — deckt die
// gasfreie Dunkelflaute. Kaverne in GWh H₂-LHV je TWh Jahreslast.
pub const H2_CHARGE_GW_PER_TWH: f64 = 0.0608;
pub const H2_DISCHARGE_GW_PER_TWH: f64 = 0.0553;
pub const H2_ENERGY_GWH_PER_TWH: f64 = 66.4;

pub fn apply(
    _model: &StaticModel,
    demand_twh: f64,
) -> Result<(Value, Value, Value, Value), ModelError> {
    let pv_gw = demand_twh * PV_GW_PER_TWH;
    let wind_on_gw = demand_twh * WIND_ON_GW_PER_TWH;
    let wind_off_gw = (demand_twh * WIND_OFF_GW_PER_TWH).min(WIND_OFFSHORE_MAX_GW);
    let kern_gw = demand_twh * KERN_GW_PER_TWH;
    let gas_gw = demand_twh * GAS_GW_PER_TWH;

    Ok((
        json!({
            "pvInstalledGW": snap_gen("pv", pv_gw)?,
            "windOnInstalledGW": snap_gen("windon", wind_on_gw)?,
            "windOffInstalledGW": snap_gen("windoff", wind_off_gw)?,
            "kernkraftInstalledGW": snap_gen("kernkraft", kern_gw)?,
            "biomasseInstalledGW": comp_number("historisch-2025", "biomasseInstalledGW")?,
            "laufwasserInstalledGW": comp_number("historisch-2025", "laufwasserInstalledGW")?,
            "gasInstalledGW": snap_gen("gas", gas_gw)?,
            "kohleInstalledGW": 0.0,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.0,
        }),
        json!({
            "batteriePowerGW": snap_storage("batterie", "powerGW", demand_twh * BATTERY_POWER_PER_TWH)?,
            "batterieEnergyGWh": snap_storage("batterie", "energyGWh", demand_twh * BATTERY_ENERGY_GWH_PER_TWH)?,
            "pumpspeicherPowerGW": comp_number("historisch-2025", "pumpspeicherPowerGW")?,
            "pumpspeicherEnergyGWh": comp_number("historisch-2025", "pumpspeicherEnergyGWh")?,
            "h2ChargePowerGW": snap_storage("h2", "chargePowerGW", demand_twh * H2_CHARGE_GW_PER_TWH)?,
            "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", demand_twh * H2_DISCHARGE_GW_PER_TWH)?,
            "h2EnergyGWh": snap_storage("h2", "energyGWh", demand_twh * H2_ENERGY_GWH_PER_TWH)?,
        }),
        json!({
            "stromGW": 0.0,
            "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
            "h2TWh": 0.0,
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
    fn gas_free() {
        assert_eq!(GAS_GW_PER_TWH, 0.0);
    }

    #[test]
    fn ee_and_kern_are_both_substantial() {
        // Weder reine Kernkraft noch reines EE: beide tragen spürbar bei.
        let ee = PV_GW_PER_TWH + WIND_ON_GW_PER_TWH + WIND_OFF_GW_PER_TWH;
        assert!(KERN_GW_PER_TWH > 0.05, "Kernkraft zu klein");
        assert!(ee > 0.15, "EE zu klein");
    }

    #[test]
    fn scales_linearly_with_load() {
        // Doppelte Last ⇒ doppelte Kernkraft (lastfolgend, jede Last einstellbar).
        let k1 = 466.0 * KERN_GW_PER_TWH;
        let k2 = 932.0 * KERN_GW_PER_TWH;
        assert!((k2 - 2.0 * k1).abs() < 1e-9);
    }
}
