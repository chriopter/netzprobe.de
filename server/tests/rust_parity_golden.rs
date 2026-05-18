use netzprobe_api::{
    fingerprint::GOLDEN_HOUR_SAMPLES,
    model_registry::ModelRegistry,
    simulation::{SimulationHarness, load_golden_fixture},
};

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
    let harness = SimulationHarness::new(ModelRegistry::empty());

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
