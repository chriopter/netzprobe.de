// Auto-discovery der Erzeugung-Presets.
//
// Scannt model/erzeugung/*/package.json nach einem top-level "preset"-Block mit
// "id" UND einem Geschwister-`model.rs`, das `pub fn apply` enthält. Generiert
// daraus die `#[path] mod …;`-Deklarationen sowie eine `auto_dispatch`-Funktion,
// die per Preset-Id auf das jeweilige `apply` verzweigt.

use std::fs;
use std::path::{Path, PathBuf};

fn module_ident(dir_name: &str) -> String {
    let sanitized: String = dir_name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '_' })
        .collect();
    format!("preset_{sanitized}")
}

fn main() {
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let erzeugung_dir = manifest_dir
        .join("..")
        .join("..")
        .join("erzeugung")
        .canonicalize()
        .expect("erzeugung-Verzeichnis nicht gefunden");

    println!("cargo:rerun-if-changed={}", erzeugung_dir.display());

    // (id, absolute_model_rs_path, module_ident), sortiert für stabile Ausgabe.
    let mut presets: Vec<(String, PathBuf, String)> = Vec::new();

    let mut entries: Vec<PathBuf> = fs::read_dir(&erzeugung_dir)
        .expect("erzeugung lesbar")
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.is_dir())
        .collect();
    entries.sort();

    for dir in entries {
        let package_json = dir.join("package.json");
        let model_rs = dir.join("model.rs");
        if !package_json.is_file() || !model_rs.is_file() {
            continue;
        }

        let pkg_text = match fs::read_to_string(&package_json) {
            Ok(t) => t,
            Err(_) => continue,
        };
        let pkg: serde_json::Value = match serde_json::from_str(&pkg_text) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let id = match pkg
            .get("preset")
            .and_then(|p| p.get("id"))
            .and_then(|v| v.as_str())
        {
            Some(id) => id.to_string(),
            None => continue,
        };

        let model_text = fs::read_to_string(&model_rs).unwrap_or_default();
        if !model_text.contains("pub fn apply") {
            continue;
        }

        let dir_name = dir.file_name().unwrap().to_string_lossy().to_string();
        let abs_model = model_rs.canonicalize().expect("model.rs canonicalize");

        println!("cargo:rerun-if-changed={}", package_json.display());
        println!("cargo:rerun-if-changed={}", abs_model.display());

        presets.push((id, abs_model, module_ident(&dir_name)));
    }

    let mut out = String::new();
    for (_id, path, ident) in &presets {
        out.push_str(&format!(
            "#[allow(dead_code)]\n#[path = \"{}\"]\nmod {};\n",
            path.display(),
            ident
        ));
    }
    out.push('\n');
    out.push_str(
        "pub(crate) fn auto_dispatch(model: &StaticModel, preset: &str, demand_twh: f64, scenario: &Value) -> Option<Result<(Value, Value, Value, Value), ModelError>> {\n    match preset {\n",
    );
    for (id, _path, ident) in &presets {
        out.push_str(&format!(
            "        {:?} => Some({}::apply(model, demand_twh, scenario)),\n",
            id, ident
        ));
    }
    out.push_str("        _ => None,\n    }\n}\n");

    let out_dir = std::env::var("OUT_DIR").unwrap();
    let out_path = Path::new(&out_dir).join("presets_generated.rs");
    fs::write(&out_path, out).expect("presets_generated.rs schreiben");
}
