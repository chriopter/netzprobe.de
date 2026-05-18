use netzprobe_kern::{ModelError, ResultFingerprint, StaticModel};
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoldenFixture {
    pub version: u32,
    pub seed: String,
    pub generated_by: String,
    pub hour_samples: Vec<usize>,
    pub cases: Vec<GoldenCase>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoldenCase {
    pub id: String,
    pub scenario: Value,
    pub fingerprint: ResultFingerprint,
}

#[derive(Debug, Clone)]
pub struct SimulationHarness;

impl SimulationHarness {
    pub fn new() -> Self {
        Self
    }

    pub fn run_fingerprint(&self, scenario: &Value) -> Result<ResultFingerprint, ModelError> {
        let model = StaticModel::load()?;
        let result = model.run(scenario)?;
        Ok(result.fingerprint())
    }

    pub fn run_api_result(&self, scenario: &Value) -> Result<Value, ModelError> {
        self.run_api_result_with_view(scenario, None)
    }

    pub fn run_api_result_with_view(
        &self,
        scenario: &Value,
        view: Option<ApiView>,
    ) -> Result<Value, ModelError> {
        let model = StaticModel::load()?;
        let result = model.run(scenario)?;
        Ok(result.to_api_value(view.as_ref()))
    }

    pub fn resolve_scenario(&self, scenario: &Value) -> Result<Value, ModelError> {
        StaticModel::load()?.resolve_supply_preset(scenario)
    }
}

pub use netzprobe_kern::ApiView;

pub fn load_golden_fixture(raw: &str) -> Result<GoldenFixture, serde_json::Error> {
    serde_json::from_str(raw)
}

#[cfg(test)]
mod tests {
    use super::{SimulationHarness, load_golden_fixture};

    #[test]
    fn parses_minimal_fixture_with_typed_fingerprint() {
        let raw = r#"{
          "version": 1,
          "seed": "netzprobe-rust-parity-v1",
          "generatedBy": "test/golden/generate-rust-parity.mjs",
          "hourSamples": [0],
          "cases": [{
            "id": "golden-01",
            "scenario": {"demand": {}},
            "fingerprint": {
              "summary": {
                "totalDemandTWh": 1,
                "renewableSharePct": 2,
                "renewableTWh": 3,
                "curtailmentTWh": 4,
                "importTWh": 5,
                "exportTWh": 6,
                "loadSheddingTWh": 7,
                "hoursWithLoadShedding": 8,
                "co2MtPerYear": 9,
                "co2GperKWh": 10,
                "peakLoadGW": 11,
                "securityStatus": "stabil"
              },
              "hours": {
                "hour0": {
                  "loadGW": 1,
                  "supplyGW": 2,
                  "importGW": 3,
                  "exportGW": 4,
                  "storageChargeGW": 5,
                  "storageDischargeGW": 6,
                  "batterieSocGWh": 7,
                  "pumpspeicherSocGWh": 8,
                  "h2SocGWh": 9,
                  "loadSheddingGW": 10,
                  "curtailmentGW": 11,
                  "co2Tph": 12
                }
              }
            }
          }]
        }"#;

        let fixture = load_golden_fixture(raw).unwrap();

        assert_eq!(fixture.cases[0].fingerprint.summary.total_demand_twh, 1.0);
    }

    #[test]
    fn simulation_can_run_first_golden_case() {
        let raw = include_str!("../../test/fixtures/rust-parity-v1.json");
        let fixture = load_golden_fixture(raw).unwrap();
        let harness = SimulationHarness::new();
        let fingerprint = harness.run_fingerprint(&fixture.cases[0].scenario).unwrap();

        assert_eq!(fingerprint.hours.len(), 9);
    }
}
