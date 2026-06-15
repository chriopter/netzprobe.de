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
//   model/kern/kern/model.rs). Erzeugung und Elektrolyse skalieren mit der eff. Demand;
//   Batterie/Rückverstromung/Kaverne mit der STROMLAST (Demand − Sektor-Strom).
// - Cushion 1.30 (Studienkorridor 1.25-1.40; trägt Roundtrip 0.34 = 0.62 × 0.55)
// - Mix 30/40/30 (PV / Wind on / Wind off) — Wind 70% total, saisonale Komplementarität
// - H2-Kaverne 0.11 × Stromlast in TWh H2-LHV: bei e100 ~115 TWh
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
// Last und bei e100, robust bis Windjahr ×0.85 (Heute-Lücke geschlossen seit
// der korrekten Baseline-Produktion; Doppel-Stress ×0.85+PV0.9: heute ~0.2 TWh).
// Preis der Autarkie: bei e100 werden 416 TWh abgeregelt (~18 %).
pub const EE_CUSHION: f64 = 1.30;
// Speicher-Treiber ist die STROMLAST (Demand minus Sektor-Elektrolyse-Strom),
// nicht die effektive Demand: die H2-Pool-Sektoren bringen ihre Flexibilität
// selbst mit (Elektrolyse folgt dem Überschuss), nur die echte Stromlast braucht
// Batterie-/Rückverstromungs-Deckung. Ein 200-Sample-MC (schwachwind-robust,
// x0,85) stützt je TWh STROMLAST Koeffizienten nahe dem heutigen Lasttest-
// Anker (Kaverne: heute 0,107, MC-Spanne 0,09-0,12) — die alte Skalierung mit
// der effektiven Demand überbaute Kaverne/Rückverstromung/Batterie bei e100
// um ~40-70 % (Audit AP04); Treiber-Wahl physikalisch begründet, MC kann sie
// bei fixer Last allein nicht belegen (n=2 Stützstellen).
// Batterie: 0.20 GW/TWh-Last + 1.7 GWh/TWh-Last (entkoppelte C-Rate ~8,5 h):
// die LEISTUNG ist auf den Stress-Abruf ausgelegt (max ~167 GW im Doppel-
// Stress Wind x0,85 + PV x0,9; 0,20 x Last = 215 GW = ~30 % Marge) — die alte
// 5h-Kopplung (360 GW) lag beim Doppelten des je gemessenen Abrufs; Abregelung
// und Export aendern sich durch die Entkopplung nicht (H2-Elektrolyse nimmt
// die Spitzen auf). Spart ~2,7 Mrd EUR/a (Audit-Nachzuegler).
pub const EE_BATTERY_POWER_PER_TWH: f64 = 0.20;
pub const EE_BATTERY_ENERGY_PER_TWH: f64 = 1.7;
// H2 Charge 0.24 GW je TWh EFFEKTIVER Demand (einziger eff-Treiber: die
//   Elektrolyse produziert auch das Sektor-H2 des Pools).
// H2 Discharge 0.195 GW/TWh-Last: deckt Winter-Peaks gemeinsam mit Batterie.
pub const EE_H2_CHARGE_PER_TWH: f64 = 0.24;
pub const EE_H2_DISCHARGE_PER_TWH: f64 = 0.195;
// H2-Saisonspeicher 0.11 × STROMLAST in TWh H2-LHV (vergleichbar mit Kavernen-
// Potenzial-Angaben): bei heutiger Last 50 TWh, bei e100 (Last ~1068 TWh)
// ~117 TWh — im MC-Korridor 92-128 TWh und nahe Fraunhofer-ISE-Stand-alone-
// Minimum ~130 TWh (BMWK 80, Agora 70, DVGW ~120 — alle MIT Import).
// Salzkavernen-Potenzial DE 9400 TWh (Fraunhofer IEG) → genutzt ~1 %.
pub const EE_H2_ENERGY_FRACTION_OF_DEMAND: f64 = 0.11;
// Physisches Maximum Wind offshore DE-AWZ laut BSH FEP / WindSeeG: 70 GW bis 2045.
// Floating-Offshore könnte +20-30 GW, aber kommerziell erst nach 2040 — daher Hard-Cap.
pub const EE_WIND_OFFSHORE_MAX_GW: f64 = 70.0;

use serde_json::{json, Value};
use super::data::{comp_number, snap_gen, snap_storage, trade_number};
use super::error::ModelError;
use super::StaticModel;

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

// Abgezogen wird die TATSÄCHLICHE Jahresproduktion der Baselines
// (GW × 8,76 × availability), nicht die Nennleistungs-Energie — sonst
// unterbaut das Preset die variable EE um die Differenz (~29 TWh bei
// Bio 0,86 / Laufwasser 0,457), nur kaschiert vom Cushion (Audit-Nachzügler).
pub fn target_variable_re_twh(
    demand_twh: f64,
    biomasse_default_installed_gw: f64,
    biomasse_availability: f64,
    laufwasser_default_installed_gw: f64,
    laufwasser_availability: f64,
) -> f64 {
    let baseline_bio_twh = biomasse_default_installed_gw * 8.76 * biomasse_availability;
    let baseline_hydro_twh = laufwasser_default_installed_gw * 8.76 * laufwasser_availability;
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

// Falls Wind offshore gecappt wird (>70 GW Anforderung), kompensiert WIND ONSHORE
// den Energieausfall — nicht PV: Wind liefert winter-komplementär (weniger
// Saisonspeicher-Bedarf) und ist je TWh system-günstiger; das MC-Optimum
// (Audit AP05) und der eigene Heide-Anker (55-60 % Wind) bestätigen die
// Richtung. Flächen-Caveat: das treibt Wind onshore weit über das
// 2-%-Vorrangflächen-Ziel — Stresstest, kein Pfad.
// Rückgabe: zusätzliche WindOn-GW, die den Wind-off-Shortfall ersetzen.
pub fn wind_on_compensation_for_wind_offshore_cap(
    target_twh: f64,
    share_wind_off: f64,
    total_share: f64,
    yield_wind_offshore: f64,
    yield_wind_on: f64,
) -> f64 {
    let wind_off_raw_gw = (target_twh * share_wind_off / total_share) / yield_wind_offshore.max(0.1);
    let wind_off_shortfall_gw = (wind_off_raw_gw - EE_WIND_OFFSHORE_MAX_GW).max(0.0);
    let shortfall_twh = wind_off_shortfall_gw * yield_wind_offshore;
    shortfall_twh / yield_wind_on.max(0.1)
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

pub fn apply(
    model: &StaticModel,
    demand_twh: f64,
    scenario: &Value,
) -> Result<(Value, Value, Value, Value), ModelError> {
    // Effektive Stromnachfrage: der Sektor-H2-Bedarf wird im Engine-Pool aus
    // Überschuss-Elektrolyse gedeckt (H2-LHV / chargeEfficiency Strom je LHV)
    // statt als direkte Sektor-Elektrolyse-Stromlast. Seit der Pool echtes
    // H2-Zwischenprodukt führt (Bedarf = Sektor-Strom × chargeEfficiency),
    // ist die Korrektur fast neutral — übrig bleibt nur der Stahl-Aufschlag
    // (Pool-Elektrolyse 0,62 statt Onsite 52 kWh/kg ≈ 0,641, ~+3 TWh).
    // Speicher (Batterie/Rückverstromung/Kaverne) skalieren dagegen mit der
    // STROMLAST (Demand minus Sektor-Elektrolyse-Strom): die Pool-Sektoren
    // bringen ihre Flexibilität selbst mit (Audit AP04).
    let lhv = model.sector_h2_demand_twh(scenario)?;
    let strom = model.sector_h2_strom_twh(scenario)?;
    let sector_strom_total = strom.stahl + strom.chemie + strom.schiff + strom.flug;
    let sector_lhv_total = lhv.stahl + lhv.chemie + lhv.schiff + lhv.flug;
    let charge_eff = model.storage["h2"].charge_efficiency.max(0.1);
    let eff_demand_twh = demand_twh - sector_strom_total + sector_lhv_total / charge_eff;
    let stromlast_twh = demand_twh - sector_strom_total;
    preset_100ee_with_demand(
        model,
        eff_demand_twh,
        stromlast_twh,
        0.0,
        comp_number("historisch-2025", "exportStromGW")?,
    )
}

// storage_demand_twh: STROMLAST als Speicher-Treiber (Demand minus Sektor-
// Elektrolyse-Strom) — nur die Elektrolyse-Leistung skaliert mit demand_twh,
// weil sie auch das Sektor-H2 des Pools produziert (Audit AP04).
fn preset_100ee_with_demand(
    model: &StaticModel,
    demand_twh: f64,
    storage_demand_twh: f64,
    import_gw: f64,
    export_gw: f64,
) -> Result<(Value, Value, Value, Value), ModelError> {
    let yield_pv = model.annual_yield_twh_per_gw("solar").max(0.1);
    let yield_wind_on = model.annual_yield_twh_per_gw("windon").max(0.1);
    let yield_wind_off = model.annual_yield_twh_per_gw("windoff").max(0.1);
    let biomasse_baseline_gw = comp_number("historisch-2025", "biomasseInstalledGW")?;
    let laufwasser_baseline_gw = comp_number("historisch-2025", "laufwasserInstalledGW")?;
    let target = target_variable_re_twh(
        demand_twh,
        biomasse_baseline_gw,
        model.generation["biomasse"].availability,
        laufwasser_baseline_gw,
        model.generation["laufwasser"].availability,
    );
    let total_share = EE_PV_SHARE + EE_WIND_ON_SHARE + EE_WIND_OFF_SHARE;
    let pv_gw = variable_re_gw(target, EE_PV_SHARE, total_share, yield_pv);
    // Offshore-Cap-Shortfall wird über Wind onshore gedeckt (winter-
    // komplementär, system-günstiger als PV; MC-Optimum, Audit AP05).
    let wind_on_compensation = wind_on_compensation_for_wind_offshore_cap(
        target, EE_WIND_OFF_SHARE, total_share, yield_wind_off, yield_wind_on,
    );
    let wind_on_gw =
        variable_re_gw(target, EE_WIND_ON_SHARE, total_share, yield_wind_on) + wind_on_compensation;
    let wind_off_gw = wind_offshore_gw(target, EE_WIND_OFF_SHARE, total_share, yield_wind_off);
    Ok((
        json!({
            "pvInstalledGW": snap_gen("pv", pv_gw)?,
            "windOnInstalledGW": snap_gen("windon", wind_on_gw)?,
            "windOffInstalledGW": snap_gen("windoff", wind_off_gw)?,
            "kernkraftInstalledGW": 0.0,
            "biomasseInstalledGW": biomasse_baseline_gw,
            "laufwasserInstalledGW": laufwasser_baseline_gw,
            "gasInstalledGW": 0.0,
            "kohleInstalledGW": 0.0,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.0,
        }),
        json!({
            "batteriePowerGW": snap_storage("batterie", "powerGW", battery_power_gw(storage_demand_twh))?,
            "batterieEnergyGWh": snap_storage("batterie", "energyGWh", battery_energy_gwh(storage_demand_twh))?,
            "pumpspeicherPowerGW": comp_number("historisch-2025", "pumpspeicherPowerGW")?,
            "pumpspeicherEnergyGWh": comp_number("historisch-2025", "pumpspeicherEnergyGWh")?,
            "h2ChargePowerGW": snap_storage("h2", "chargePowerGW", h2_charge_power_gw(demand_twh))?,
            "h2DischargePowerGW": snap_storage("h2", "dischargePowerGW", h2_discharge_power_gw(storage_demand_twh))?,
            "h2EnergyGWh": snap_storage("h2", "energyGWh", h2_energy_gwh(storage_demand_twh))?,
        }),
        json!({
            "stromGW": import_gw,
            "stromEmissionGperKWh": trade_number("strom-handel", &["import", "emissionGperKWh"])?,
            "h2TWh": 0.0,
        }),
        json!({ "stromGW": export_gw }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_storage_rules_for_466_twh() {
        // Batterie 0.20 × 466 = 93.2 GW, 1.7 × 466 = 792.2 GWh (Treiber: Stromlast)
        assert!((battery_power_gw(466.0) - 93.2).abs() < 1e-9);
        assert!((battery_energy_gwh(466.0) - 792.2).abs() < 1e-9);
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
    fn wind_on_compensation_replaces_capped_offshore_energy() {
        // Shortfall-Energie (über 70 GW) muss vollständig in WindOn-GW übersetzt werden.
        let target = 2_000.0;
        let yield_wind_off = 2.8;
        let yield_wind_on = 1.6;
        let raw_gw = target * 0.30 / yield_wind_off;
        let shortfall_twh = (raw_gw - EE_WIND_OFFSHORE_MAX_GW).max(0.0) * yield_wind_off;
        let won_gw = wind_on_compensation_for_wind_offshore_cap(target, 0.30, 1.0, yield_wind_off, yield_wind_on);
        assert!((won_gw * yield_wind_on - shortfall_twh).abs() < 1e-6);
    }
}
