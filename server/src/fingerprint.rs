use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultFingerprint {
    pub summary: SummaryFingerprint,
    pub hours: BTreeMap<String, HourFingerprint>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryFingerprint {
    #[serde(rename = "totalDemandTWh")]
    pub total_demand_twh: f64,
    pub renewable_share_pct: f64,
    #[serde(rename = "renewableTWh")]
    pub renewable_twh: f64,
    #[serde(rename = "curtailmentTWh")]
    pub curtailment_twh: f64,
    #[serde(rename = "importTWh")]
    pub import_twh: f64,
    #[serde(rename = "exportTWh")]
    pub export_twh: f64,
    #[serde(rename = "loadSheddingTWh")]
    pub load_shedding_twh: f64,
    pub hours_with_load_shedding: u32,
    pub co2_mt_per_year: f64,
    #[serde(rename = "co2GperKWh")]
    pub co2_gper_kwh: f64,
    #[serde(rename = "peakLoadGW")]
    pub peak_load_gw: f64,
    pub security_status: SecurityStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SecurityStatus {
    Stabil,
    Angespannt,
    Kritisch,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HourFingerprint {
    #[serde(rename = "loadGW")]
    pub load_gw: f64,
    #[serde(rename = "supplyGW")]
    pub supply_gw: f64,
    #[serde(rename = "importGW")]
    pub import_gw: f64,
    #[serde(rename = "exportGW")]
    pub export_gw: f64,
    #[serde(rename = "storageChargeGW")]
    pub storage_charge_gw: f64,
    #[serde(rename = "storageDischargeGW")]
    pub storage_discharge_gw: f64,
    #[serde(rename = "batterieSocGWh")]
    pub batterie_soc_gwh: f64,
    #[serde(rename = "pumpspeicherSocGWh")]
    pub pumpspeicher_soc_gwh: f64,
    #[serde(rename = "h2SocGWh")]
    pub h2_soc_gwh: f64,
    #[serde(rename = "loadSheddingGW")]
    pub load_shedding_gw: f64,
    #[serde(rename = "curtailmentGW")]
    pub curtailment_gw: f64,
    pub co2_tph: f64,
}

pub const GOLDEN_HOUR_SAMPLES: [usize; 9] = [0, 168, 720, 1440, 2160, 4000, 6000, 8000, 8759];

#[cfg(test)]
mod tests {
    use super::{GOLDEN_HOUR_SAMPLES, ResultFingerprint};

    #[test]
    fn deserializes_typescript_fingerprint_shape() {
        let raw = r#"{
          "summary": {
            "totalDemandTWh": 1.234,
            "renewableSharePct": 2.34,
            "renewableTWh": 3.456,
            "curtailmentTWh": 4.567,
            "importTWh": 5.678,
            "exportTWh": 6.789,
            "loadSheddingTWh": 7.891,
            "hoursWithLoadShedding": 8,
            "co2MtPerYear": 9.012,
            "co2GperKWh": 10.12,
            "peakLoadGW": 11.23,
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
        }"#;

        let fingerprint: ResultFingerprint = serde_json::from_str(raw).unwrap();

        assert_eq!(fingerprint.summary.security_status.to_string(), "stabil");
        assert_eq!(fingerprint.hours["hour0"].h2_soc_gwh, 9.0);
        assert_eq!(GOLDEN_HOUR_SAMPLES[8], 8759);
    }
}

impl std::fmt::Display for SecurityStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SecurityStatus::Stabil => f.write_str("stabil"),
            SecurityStatus::Angespannt => f.write_str("angespannt"),
            SecurityStatus::Kritisch => f.write_str("kritisch"),
        }
    }
}
