// Einmal-CLI fuer Szenario-Checks: liest {"scenario":..., "view":...} oder ein
// nacktes Szenario von stdin und schreibt das API-Ergebnis als JSON auf stdout.
use netzprobe_api::simulation::{ApiView, SimulationHarness};
use serde_json::Value;
use std::io::Read;

fn main() {
    let mut raw = String::new();
    std::io::stdin()
        .read_to_string(&mut raw)
        .expect("failed to read stdin");
    let input: Value = serde_json::from_str(&raw).expect("stdin must be JSON");

    let (scenario, view) = if input.get("scenario").is_some() {
        let view = input
            .get("view")
            .cloned()
            .and_then(|v| serde_json::from_value::<ApiView>(v).ok());
        (input.get("scenario").cloned().unwrap(), view)
    } else {
        (input, None)
    };

    let summary_only = std::env::args().any(|a| a == "--summary");
    let harness = SimulationHarness::new();
    if std::env::args().any(|a| a == "--resolve") {
        let resolved = harness
            .resolve_scenario(&scenario)
            .unwrap_or_else(|err| serde_json::json!({"ok": false, "error": err.to_string()}));
        println!("{}", serde_json::to_string(&resolved).expect("serialize resolved"));
        return;
    }
    let mut result = harness
        .run_api_result_with_view(&scenario, view)
        .unwrap_or_else(|err| serde_json::json!({"ok": false, "error": err.to_string()}));
    if summary_only {
        if let Some(map) = result.as_object_mut() {
            map.remove("hours");
        }
    }
    println!("{}", serde_json::to_string(&result).expect("serialize result"));
}
