use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiView {
    pub start: Option<String>,
    pub end: Option<String>,
    pub max_points: Option<usize>,
}
