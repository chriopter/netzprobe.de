use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationHour {
    pub time: String,
    #[serde(rename = "pvMW")]
    pub pv_mw: f64,
    #[serde(rename = "windOnMW")]
    pub wind_on_mw: f64,
    #[serde(rename = "windOffMW")]
    pub wind_off_mw: f64,
    #[serde(rename = "gasMW")]
    pub gas_mw: f64,
    #[serde(rename = "coalMW")]
    pub coal_mw: f64,
    #[serde(rename = "hydroMW")]
    pub hydro_mw: Option<f64>,
    #[serde(rename = "biomassMW")]
    pub biomass_mw: Option<f64>,
    #[serde(rename = "wasteMW")]
    pub waste_mw: Option<f64>,
    #[serde(rename = "oilMW")]
    pub oil_mw: Option<f64>,
    #[serde(rename = "geothermalMW")]
    pub geothermal_mw: Option<f64>,
    #[serde(rename = "otherMW")]
    pub other_mw: Option<f64>,
    #[serde(rename = "nuclearMW")]
    pub nuclear_mw: Option<f64>,
    #[serde(rename = "importExportMW")]
    pub import_export_mw: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerationData {
    pub year: u16,
    #[serde(rename = "sumTWh")]
    pub sum_twh: f64,
}

pub fn data() -> GenerationData {
    serde_json::from_str(include_str!("data.json"))
        .expect("model/erzeugung/2017/data.json is valid")
}

pub fn hours() -> Vec<GenerationHour> {
    serde_json::from_str(include_str!("hours.json"))
        .expect("model/erzeugung/2017/hours.json is valid")
}
