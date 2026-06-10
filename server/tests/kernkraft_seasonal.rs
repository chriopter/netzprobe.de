// Saisonale Kernkraft-Verfügbarkeit (Revisionsplanung im Sommer).
//
// Reale Flotten legen Brennelementwechsel/Revisionen in die Sommermonate
// (Frankreich: Winter ~Vollverfügbarkeit, Sommer-Tal; DE-Konvoi: Revisionen
// Mai–September). Das kernkraft-Paket trägt dafür ein availabilityMonthly-
// Profil; die Engine wendet es stundenweise nach Monat an. Diese Tests sichern
// Profil-Invarianten und die Engine-Anwendung.
use netzprobe_api::simulation::SimulationHarness;
use serde_json::{Value, json};

fn kernkraft_monthly() -> Vec<f64> {
    let raw = include_str!("../../model/erzeugung/kernkraft/package.json");
    let pkg: Value = serde_json::from_str(raw).expect("kernkraft package is valid JSON");
    pkg["parameters"]["availabilityMonthly"]
        .as_array()
        .expect("kernkraft has availabilityMonthly")
        .iter()
        .filter_map(Value::as_f64)
        .collect()
}

const DAYS: [f64; 12] = [31.0, 28.0, 31.0, 30.0, 31.0, 30.0, 31.0, 31.0, 30.0, 31.0, 30.0, 31.0];

#[test]
fn monthly_profile_is_seasonal_and_calibrated() {
    let monthly = kernkraft_monthly();
    assert_eq!(monthly.len(), 12);
    // Stunden-gewichtetes Jahresmittel bleibt auf der bisherigen Kalibrierung 0,90.
    let weighted: f64 = monthly.iter().zip(DAYS).map(|(a, d)| a * d).sum::<f64>() / 365.0;
    assert!(
        (weighted - 0.90).abs() < 0.005,
        "Jahresmittel muss ~0,90 bleiben (Kalibrierung), ist {weighted:.4}"
    );
    // Saisonform: Winterplateau über Sommer-Tal, plausible Spannen.
    let winter = (monthly[11] + monthly[0] + monthly[1]) / 3.0;
    let summer = (monthly[5] + monthly[6] + monthly[7]) / 3.0;
    assert!(winter > 0.92, "Winter-Verfügbarkeit zu niedrig: {winter:.2}");
    assert!(summer < 0.85, "Sommer-Tal fehlt: {summer:.2}");
    assert!(winter - summer > 0.10, "Saisonhub zu klein: {:.2}", winter - summer);
    for (i, a) in monthly.iter().enumerate() {
        assert!((0.5..=1.0).contains(a), "Monat {i}: {a} außerhalb [0,5; 1,0]");
    }
}

#[test]
fn engine_applies_monthly_availability_to_kernkraft_only() {
    // 20 GW Kernkraft bei 2025-Last (~53 GW Mittel): Baseload läuft nie in
    // Curtailment, kernkraftGW muss also exakt installierte Leistung ×
    // Monatsverfügbarkeit sein. Biomasse bleibt flach (Profil ist kernkraft-spezifisch).
    let harness = SimulationHarness::new();
    let result = harness
        .run_api_result(&scenario_with_kernkraft(20.0))
        .expect("simulation runs");
    let hours = result["hours"].as_array().expect("hours");
    assert!(hours.len() >= 8760);

    let monthly = kernkraft_monthly();
    let mut kern_by_month = vec![(0.0f64, 0u32); 12];
    let mut bio_min = f64::MAX;
    let mut bio_max: f64 = 0.0;
    for hour in hours {
        let month: usize = hour["time"].as_str().unwrap()[5..7].parse::<usize>().unwrap() - 1;
        let kern = hour["kernkraftGW"].as_f64().unwrap();
        kern_by_month[month].0 += kern;
        kern_by_month[month].1 += 1;
        let bio = hour["biomasseGW"].as_f64().unwrap();
        bio_min = bio_min.min(bio);
        bio_max = bio_max.max(bio);
    }
    for (month, (sum, count)) in kern_by_month.iter().enumerate() {
        let mean = sum / f64::from(*count);
        let expected = 20.0 * monthly[month];
        assert!(
            (mean - expected).abs() < 0.05,
            "Monat {}: kernkraftGW-Mittel {mean:.2} != 20 GW × {:.2}",
            month + 1,
            monthly[month]
        );
    }
    assert!(
        (bio_max - bio_min).abs() < 0.01,
        "Biomasse muss flach bleiben (kein Saisonprofil): {bio_min:.3}..{bio_max:.3}"
    );
}

fn scenario_with_kernkraft(kernkraft_gw: f64) -> Value {
    json!({
        "id": "kern-seasonal", "name": "kern-seasonal", "description": "",
        "supplyPreset": "custom",
        "loadYear": 2025,
        "demand": {
            "last-2025": true,
            "e100-pkw": false, "e100-pkw-million-km": 472200,
            "e100-heiz": false, "e100-heiz-target-heat-twh": 530,
            "e100-lkw": false, "e100-lkw-target-bn-km": 117,
            "e100-bahn": false, "e100-bahn-target-twh": 10,
            "e100-schiff": false, "e100-schiff-target-twh": 80,
            "e100-flug": false, "e100-flug-target-twh": 300,
            "e100-ghd": false, "e100-ghd-target-heat-twh": 163,
            "e100-industrie-waerme": false, "e100-industrie-waerme-target-heat-twh": 220,
            "e100-stahl": false, "e100-stahl-target-mio-ton": 28,
            "e100-chemie": false, "e100-chemie-target-twh": 440
        },
        "generation": {
            "pvInstalledGW": 0, "windOnInstalledGW": 0, "windOffInstalledGW": 0,
            "kernkraftInstalledGW": kernkraft_gw,
            "biomasseInstalledGW": 9.0, "laufwasserInstalledGW": 4.94,
            "gasInstalledGW": 35.5, "kohleInstalledGW": 31,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.0
        },
        "storage": {
            "batteriePowerGW": 0, "batterieEnergyGWh": 0,
            "pumpspeicherPowerGW": 0, "pumpspeicherEnergyGWh": 0,
            "h2ChargePowerGW": 0, "h2DischargePowerGW": 0, "h2EnergyGWh": 0
        },
        "import": { "stromGW": 13, "stromEmissionGperKWh": 300, "h2TWh": 0 },
        "export": { "stromGW": 25 }
    })
}
