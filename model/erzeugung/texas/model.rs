// Preset "Texas-Mix" (texas) — Source-of-Truth.
//
// Idee: den ERCOT-Energiemix 2025 (Anteile an der Jahreserzeugung) lastfolgend
// auf die deutsche Last und das deutsche Wetterjahr übertragen. Die Anteile
// sind das ERCOT-Verhältnis; die GW-Flotten werden aus den DEUTSCHEN
// Einspeisefaktoren rückgerechnet, damit die Energieanteile im hiesigen
// Wetterjahr tatsächlich getroffen werden (texanische Kapazitätsfaktoren —
// PV ~25 %, Wind ~35 % — wären hier nicht reproduzierbar).
//
// ERCOT 2025 (Anteile Netto-Jahreserzeugung 486 TWh, EIA-930 Gesamtjahr,
// kreuzgeprüft mit EIA Today in Energy 02/2026):
//   Gas 40,9 % · Wind 23,6 % · Solar 13,9 % · Kohle 13,0 % · Kernkraft 8,6 %
// Hydro (0,11 %) und Sonstige (0,06 %) sind vernachlässigt; Batteriespeicher
// sind netto ~0 (Laden −5,6 / Entladen +5,1 TWh).
//
// ERCOT ist ein Inselnetz (kaum DC-Kuppelstellen): Import/Export = 0,
// kein Pumpspeicher, kein H₂ — Flexibilität kommt aus Gas, Kohle und der
// (in Texas stark wachsenden) Batterieflotte.
//
// Variable EE (PV, Wind onshore) werden exakt über den Jahresertrag der
// deutschen Faktoren ausgelegt; Kernkraft als Baseload über die
// Jahresverfügbarkeit. Gas und Kohle deckt der Dispatch lastfolgend — ihre
// Kapazitäten sind so kalibriert, dass die Jahresanteile bei heutiger Last
// das ERCOT-Verhältnis treffen (Kohle-Kapazität ist der Split-Knopf, weil
// die Engine Hochlauf 2:1 Gas:Kohle verteilt und die Kohle am Cap läuft).

use serde_json::{json, Value};
use super::data::{snap_gen, snap_storage, trade_number};
use super::error::ModelError;
use super::StaticModel;

// Energieanteile an der Jahreserzeugung (ERCOT 2025, EIA-930; Summe 1,000).
pub const SHARE_GAS: f64 = 0.409;
pub const SHARE_WIND: f64 = 0.236;
pub const SHARE_PV: f64 = 0.139;
pub const SHARE_KOHLE: f64 = 0.130;
pub const SHARE_KERN: f64 = 0.086;

// Dispatchable-Kapazität aus Anteil und Jahresauslastung: GW je TWh Last =
// Anteil / (8,76 × Auslastung). Die Auslastungen sind am DEUTSCHEN Dispatch
// kalibriert (Lasttest 2025), liegen aber nahe an den realen ERCOT-Flotten-
// werten (Gas ~0,35 Flottenmittel inkl. Peaker, Kohle läuft hier nahe am Cap;
// ERCOT-Kohle ~0,47). Gas trägt zugleich die gesicherte Leistung des
// Inselnetzes gegen den Winter-Peak.
pub const GAS_UTILIZATION: f64 = 0.34;
pub const KOHLE_UTILIZATION: f64 = 0.80;
pub const GAS_GW_PER_TWH: f64 = SHARE_GAS / (8.76 * GAS_UTILIZATION);
pub const KOHLE_GW_PER_TWH: f64 = SHARE_KOHLE / (8.76 * KOHLE_UTILIZATION);

// Batterie nach ERCOT-Bestand Ende 2025: 14,1 GW / ~23 GWh (mittlere Dauer
// 1,65 h, Modo Energy) auf 486 TWh Jahreserzeugung.
pub const BATTERY_POWER_PER_TWH: f64 = 0.029;
pub const BATTERY_ENERGY_GWH_PER_TWH: f64 = 0.047;

pub fn apply(
    model: &StaticModel,
    demand_twh: f64,
    _scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    let yield_pv = model.annual_yield_twh_per_gw("solar").max(0.1);
    let yield_wind_on = model.annual_yield_twh_per_gw("windon").max(0.1);
    // Kernkraft: Baseload mit Jahresverfügbarkeit → TWh/GW·a = 8,76 × avail.
    let kern_availability = model.generation["kernkraft"].availability.max(0.1);
    let yield_kern = 8.76 * kern_availability;

    let pv_gw = demand_twh * SHARE_PV / yield_pv;
    let wind_on_gw = demand_twh * SHARE_WIND / yield_wind_on;
    let kern_gw = demand_twh * SHARE_KERN / yield_kern;
    let gas_gw = demand_twh * GAS_GW_PER_TWH;
    let kohle_gw = demand_twh * KOHLE_GW_PER_TWH;

    Ok((
        json!({
            "pvInstalledGW": snap_gen("pv", pv_gw)?,
            "windOnInstalledGW": snap_gen("windon", wind_on_gw)?,
            // Texanischer Wind ist Onshore (Panhandle/Küste) — kein Offshore.
            "windOffInstalledGW": 0.0,
            "kernkraftInstalledGW": snap_gen("kernkraft", kern_gw)?,
            // Biomasse/Laufwasser in ERCOT vernachlässigbar (<1 %, im Gas-Rest).
            "biomasseInstalledGW": 0.0,
            "laufwasserInstalledGW": 0.0,
            "gasInstalledGW": snap_gen("gas", gas_gw)?,
            "kohleInstalledGW": snap_gen("kohle", kohle_gw)?,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.0,
        }),
        json!({
            "batteriePowerGW": snap_storage("batterie", "powerGW", demand_twh * BATTERY_POWER_PER_TWH)?,
            "batterieEnergyGWh": snap_storage("batterie", "energyGWh", demand_twh * BATTERY_ENERGY_GWH_PER_TWH)?,
            // ERCOT hat keinen nennenswerten Pumpspeicher.
            "pumpspeicherPowerGW": 0.0,
            "pumpspeicherEnergyGWh": 0.0,
            "h2ChargePowerGW": 0.0,
            "h2DischargePowerGW": 0.0,
            "h2EnergyGWh": 0.0,
        }),
        json!({
            // Inselnetz: keine Kuppelstellen.
            "stromGW": 0.0,
            "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
            "h2TWh": 0.0,
        }),
        json!({
            "stromGW": 0.0,
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shares_sum_to_one() {
        let total = SHARE_GAS + SHARE_WIND + SHARE_PV + SHARE_KOHLE + SHARE_KERN;
        assert!((total - 1.0).abs() < 1e-9);
    }

    #[test]
    fn gas_dominates_like_ercot() {
        assert!(SHARE_GAS > SHARE_WIND);
        assert!(SHARE_WIND > SHARE_PV);
    }

    #[test]
    fn scales_linearly_with_load() {
        let g1 = 466.0 * GAS_GW_PER_TWH;
        let g2 = 932.0 * GAS_GW_PER_TWH;
        assert!((g2 - 2.0 * g1).abs() < 1e-9);
    }
}
