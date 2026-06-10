use netzprobe_api::simulation::{SimulationHarness, load_golden_fixture};
use netzprobe_kern::GOLDEN_HOUR_SAMPLES;
use serde_json::{Value, json};

#[test]
fn loads_all_typescript_golden_cases_for_future_parity() {
    let raw = include_str!("../../test/fixtures/rust-parity-v1.json");
    let fixture = load_golden_fixture(raw).expect("golden fixture must be valid JSON");

    assert_eq!(fixture.version, 1);
    assert_eq!(fixture.seed, "netzprobe-rust-parity-v1");
    assert_eq!(fixture.hour_samples, GOLDEN_HOUR_SAMPLES);
    assert_eq!(fixture.cases.len(), 50);

    for case in &fixture.cases {
        assert!(
            case.scenario.get("demand").is_some(),
            "{} has no demand block",
            case.id
        );
        assert_eq!(case.fingerprint.hours.len(), GOLDEN_HOUR_SAMPLES.len());
        for sample in GOLDEN_HOUR_SAMPLES {
            assert!(
                case.fingerprint
                    .hours
                    .contains_key(&format!("hour{sample}")),
                "{} misses hour{sample}",
                case.id
            );
        }
    }
}

#[test]
fn rust_simulation_matches_all_typescript_golden_cases() {
    let raw = include_str!("../../test/fixtures/rust-parity-v1.json");
    let fixture = load_golden_fixture(raw).expect("golden fixture must be valid JSON");
    let harness = SimulationHarness::new();

    for case in fixture.cases {
        let actual = harness
            .run_fingerprint(&case.scenario)
            .unwrap_or_else(|err| panic!("{} failed: {err}", case.id));

        assert_eq!(
            actual, case.fingerprint,
            "{} does not match TypeScript golden fingerprint",
            case.id,
        );
    }
}

#[test]
fn historical_2025_e100_keeps_observed_generation_fixed() {
    let harness = SimulationHarness::new();
    let resolved = harness
        .resolve_scenario(&e100_historical_2025_scenario())
        .expect("historical preset should resolve");
    assert_eq!(
        resolved.get("supplyPreset").and_then(Value::as_str),
        Some("historical-2025"),
        "historical presets must not resolve to custom because that hides the fixed-generation semantics"
    );

    let result = harness
        .run_api_result(&e100_historical_2025_scenario())
        .expect("e100 historical 2025 simulation should run");

    let summary = result.get("summary").expect("summary");
    let missing_twh = summary
        .get("loadSheddingTWh")
        .and_then(Value::as_f64)
        .expect("loadSheddingTWh");
    assert!(
        missing_twh > 1_000.0,
        "fixed 2025 generation must not ramp gas/coal to hide e100 deficit: {missing_twh}"
    );

    let fossil_twh = result
        .get("hours")
        .and_then(Value::as_array)
        .expect("hours")
        .iter()
        .map(|hour| {
            hour.get("gasGW").and_then(Value::as_f64).unwrap_or(0.0)
                + hour.get("kohleGW").and_then(Value::as_f64).unwrap_or(0.0)
        })
        .sum::<f64>()
        / 1000.0;
    assert!(
        fossil_twh <= 150.0,
        "historical 2025 fossil generation should stay near observed gas+coal, got {fossil_twh}"
    );
}

fn e100_historical_2025_scenario() -> Value {
    json!({
        "id": "e100-regression",
        "name": "100% Elektrifizierung Regression",
        "description": "",
        "supplyPreset": "historical-2025",
        "loadYear": 2025,
        "demand": {
            "last-2025": true,
            "e100-pkw": true, "e100-pkw-million-km": 472200,
            "e100-heiz": true, "e100-heiz-target-heat-twh": 530,
            "e100-lkw": true, "e100-lkw-target-bn-km": 117,
            "e100-bahn": true, "e100-bahn-target-twh": 10,
            "e100-schiff": true, "e100-schiff-target-twh": 80,
            "e100-flug": true, "e100-flug-target-twh": 300,
            "e100-ghd": true, "e100-ghd-target-heat-twh": 163,
            "e100-industrie-waerme": true, "e100-industrie-waerme-target-heat-twh": 220,
            "e100-stahl": true, "e100-stahl-target-mio-ton": 28,
            "e100-chemie": true, "e100-chemie-target-twh": 440
        },
        "generation": {
            "pvInstalledGW": 102.5,
            "windOnInstalledGW": 62.8,
            "windOffInstalledGW": 9.4,
            "kernkraftInstalledGW": 0,
            "biomasseInstalledGW": 4.8,
            "laufwasserInstalledGW": 4.8,
            "gasInstalledGW": 35.5,
            "kohleInstalledGW": 31,
            "pvCapacityFactorMultiplier": 1.0,
            "windOnCapacityFactorMultiplier": 1.0,
            "windOffCapacityFactorMultiplier": 1.8
        },
        "storage": {
            "batteriePowerGW": 10,
            "batterieEnergyGWh": 25,
            "pumpspeicherPowerGW": 9.4,
            "pumpspeicherEnergyGWh": 45,
            "h2ChargePowerGW": 0.1,
            "h2DischargePowerGW": 0,
            "h2EnergyGWh": 0.1
        },
        "import": {
            "stromGW": 13,
            "stromEmissionGperKWh": 300,
            "h2TWh": 0
        },
        "export": {
            "stromGW": 25
        }
    })
}

// Regeneriert die Golden-Fingerprints nach einer LEGITIMEN Modelländerung
// (z. B. neue Einspeisefaktoren). Szenarien bleiben unverändert, nur die
// Fingerprints werden mit dem aktuellen Modell neu berechnet. Lauf:
//   cargo test -p netzprobe-api --test rust_parity_golden -- --ignored regenerate
// Danach den Diff von test/fixtures/rust-parity-v1.json fachlich reviewen.
#[test]
#[ignore]
fn regenerate_golden_fixture() {
    let raw = include_str!("../../test/fixtures/rust-parity-v1.json");
    let mut fixture: Value = serde_json::from_str(raw).expect("fixture must be valid JSON");
    let harness = SimulationHarness::new();
    let cases = fixture
        .get_mut("cases")
        .and_then(Value::as_array_mut)
        .expect("fixture has cases");
    for case in cases.iter_mut() {
        let scenario = case.get("scenario").expect("case has scenario").clone();
        let id = case.get("id").and_then(Value::as_str).unwrap_or("?").to_string();
        let fingerprint = harness
            .run_fingerprint(&scenario)
            .unwrap_or_else(|err| panic!("{id} failed: {err}"));
        case["fingerprint"] = serde_json::to_value(fingerprint).expect("fingerprint serializes");
    }
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../test/fixtures/rust-parity-v1.json");
    std::fs::write(path, format!("{}\n", serde_json::to_string(&fixture).expect("fixture serializes")))
        .expect("fixture written");
}
