// Preset "Kernkraft 100%" (kernkraft-100) — Source-of-Truth.
//
// Kalibrierung gegen 3 Experten-Konsens (Mai 2026):
// - Technik-Experte: Cushion 1.15, CF 0.70 (FR-Realität)
// - Studien-Experte: 100%-Kernkraft kein publizierter Pfad; selbst RTE N03 nur 50/50
// - System-Architekt: Cushion 1.55, CF 0.75, Batterie 366 GW (sehr großzügig)
// - Median-Kompromiss: Cushion 1.30, availability 0.9 (DE-Bestandskonvoi-Median),
//   Batterie 0.05 GW/TWh + 0.20 GWh/TWh (Tag/Nacht-Glättung, keine Saison).
//
// Anwendungsfall: Stresstest-Anker, kein realistischer Pfad. Siehe package.json.

use serde_json::{json, Value};
use super::data::{comp_number, snap_gen, trade_number};
use super::error::ModelError;
use super::StaticModel;

// Iteration 3 (Mai 2026): Frankreich-Modell ohne Batterie.
// Seit Juni 2026 gilt zusätzlich das saisonale Revisionsprofil availabilityMonthly
// (Winter 0,95, Sommertal 0,83; Jahresmittel 0,90) statt flacher 0,9 — siehe
// kernkraft/package.json; das Sizing über KERN_REFERENCE_YIELD bleibt jahresbasiert.
// - Cushion 1.40 (statt 1.10): genug Kernkraft installiert, damit Peak-Demand
//   direkt aus Kernkraft-Output gedeckt wird ohne Batterie-Puffer.
// - Batterie = 0: bei lastfolgender Kernkraft (5%/min Rampe, Min-Last 30-50%)
//   übernimmt die Kernkraft selbst die Tag/Nacht-Glättung. Französisches Modell:
//   ~5 GW Pumpspeicher reicht für DE (heute 9.4 GW PSW), keine Großbatterien.
// - Folge: höhere "Curtailment"-Anzeige (= Lastfolge-Drosselung bei Nacht-Min),
//   aber das ist physikalisch korrekt für ein Kernkraft-dominiertes System.
pub const KERN_CUSHION: f64 = 1.40;
pub const KERN_REFERENCE_YIELD_TWH_PER_GWA: f64 = 7.6;

fn target_kern_twh(
    demand_twh: f64,
    biomasse_default_installed_gw: f64,
    laufwasser_default_installed_gw: f64,
) -> f64 {
    let baseline_bio_twh = biomasse_default_installed_gw * 8.76;
    let baseline_hydro_twh = laufwasser_default_installed_gw * 8.76;
    (demand_twh * KERN_CUSHION - baseline_bio_twh - baseline_hydro_twh).max(0.0)
}

fn kern_gw(target_twh: f64) -> f64 {
    target_twh / KERN_REFERENCE_YIELD_TWH_PER_GWA.max(0.1)
}

/// Wendet das Preset auf eine gegebene Demand-Last an und liefert das vollständige
/// Supply-Tupel (generation, storage, import, export) als JSON-Werte zurück.
/// Der Kern ist nur Dispatcher — alle Werte und Logik leben hier im Preset-Modul.
///
/// "100% Kernkraft" heißt: ALLE anderen Erzeuger auf 0 (auch Bio/Hydro). Vorher
/// hatten wir Bio (9 GW) + Hydro (5 GW) als Baseline — das ließ die Sidebar-
/// Checkboxes aktiv stehen, war für User irreführend.
pub fn apply(
    _model: &StaticModel,
    demand_twh: f64,
    _scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    // Bio/Hydro auf 0 → Kernkraft muss vollen Demand decken.
    let target = target_kern_twh(demand_twh, 0.0, 0.0);
    let kernkraft_gw = kern_gw(target);
    Ok((
        json!({
            "pvInstalledGW": 0.0,
            "windOnInstalledGW": 0.0,
            "windOffInstalledGW": 0.0,
            "kernkraftInstalledGW": snap_gen("kernkraft", kernkraft_gw)?,
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
            "h2DischargePowerGW": 0.0,
            "h2EnergyGWh": 0.0,
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
    fn computes_kern_gw_for_e100_demand() {
        // e100 (1830 TWh): target = 1830*1.40 = 2562 TWh, KK = 2562 / 7.6 = ~337 GW
        // Cushion 1.40 deckt Peak (300 GW) direkt aus Kernkraft × availability 0.9.
        let target = target_kern_twh(1830.0, 0.0, 0.0);
        let gw = kern_gw(target);
        assert!((gw - 337.0).abs() < 1.0, "Expected ~337 GW, got {}", gw);
    }

    #[test]
    fn computes_kern_gw_for_2025_demand() {
        // 466 TWh: target = 466*1.40 = 652 TWh, KK = 652 / 7.6 = 86 GW
        let target = target_kern_twh(466.0, 0.0, 0.0);
        let gw = kern_gw(target);
        assert!((gw - 86.0).abs() < 1.0, "Expected ~86 GW, got {}", gw);
    }
}
