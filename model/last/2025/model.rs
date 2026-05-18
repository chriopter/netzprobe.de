use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadHour {
    pub time: String,
    #[serde(rename = "loadMW")]
    pub load_mw: f64,
}

pub fn hours() -> Vec<LoadHour> {
    serde_json::from_str(include_str!("hours.json")).expect("model/last/2025/hours.json is valid")
}
