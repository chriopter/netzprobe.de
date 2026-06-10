use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedInFactorHour {
    pub time: String,
    #[serde(rename = "solarIrradiance")]
    pub solar_irradiance: Vec<f64>,
    #[serde(rename = "windOn100m")]
    pub wind_on_100m: Vec<f64>,
    #[serde(rename = "windOff100m")]
    pub wind_off_100m: Vec<f64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedInFactors2025 {
    pub generated_at: String,
    pub year: u16,
    pub source: String,
    pub source_urls: Vec<String>,
    pub notes: Vec<String>,
    pub hours: Vec<FeedInFactorHour>,
}

pub fn data() -> FeedInFactors2025 {
    serde_json::from_str(include_str!("data.json"))
        .expect("model/erzeugung/einspeisefaktoren-2025/data.json is valid")
}
