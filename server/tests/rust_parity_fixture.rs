use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GoldenFixture {
    version: u32,
    seed: String,
    hour_samples: Vec<usize>,
    cases: Vec<GoldenCase>,
}

#[derive(Debug, Deserialize)]
struct GoldenCase {
    id: String,
    scenario: serde_json::Value,
    fingerprint: serde_json::Value,
}

#[test]
fn loads_typescript_golden_fixture() {
    let raw = include_str!("../../test/fixtures/rust-parity-v1.json");
    let fixture: GoldenFixture =
        serde_json::from_str(raw).expect("golden fixture must be valid JSON");

    assert_eq!(fixture.version, 1);
    assert_eq!(fixture.seed, "netzprobe-rust-parity-v1");
    assert_eq!(
        fixture.hour_samples,
        vec![0, 168, 720, 1440, 2160, 4000, 6000, 8000, 8759]
    );
    assert_eq!(fixture.cases.len(), 50);
    assert_eq!(fixture.cases[0].id, "golden-01");

    for case in fixture.cases {
        assert!(
            case.scenario.get("demand").is_some(),
            "{} has no demand block",
            case.id
        );
        assert!(
            case.fingerprint.get("summary").is_some(),
            "{} has no summary fingerprint",
            case.id
        );
        assert!(
            case.fingerprint.get("hours").is_some(),
            "{} has no hour fingerprints",
            case.id
        );
    }
}
