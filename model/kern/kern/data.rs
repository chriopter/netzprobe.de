use chrono::{DateTime, Timelike};
use chrono_tz::Europe::Berlin;
use serde::Deserialize;
use serde_json::Value;

use crate::ModelError;

pub(super) fn berlin_date_and_hour(iso: &str) -> Result<(String, usize), ModelError> {
    let utc: DateTime<chrono::Utc> = iso
        .parse()
        .map_err(|err| data_error(format!("invalid time {iso}: {err}")))?;
    let berlin = utc.with_timezone(&Berlin);
    Ok((
        berlin.format("%Y-%m-%d").to_string(),
        berlin.hour() as usize,
    ))
}

pub(super) fn package_data(raw: &str) -> Result<Value, ModelError> {
    let package: Value = parse_json(raw)?;
    package
        .get("data")
        .cloned()
        .ok_or_else(|| data_error("package.data fehlt"))
}

pub(super) fn value_field(raw: &str, key: &str) -> Result<String, ModelError> {
    let value: Value = parse_json(raw)?;
    value
        .get(key)
        .map(Value::to_string)
        .ok_or_else(|| data_error(format!("{key} fehlt")))
}

pub(super) fn parse_json<T: for<'de> Deserialize<'de>>(raw: &str) -> Result<T, ModelError> {
    serde_json::from_str(raw).map_err(|err| data_error(err.to_string()))
}

pub(super) fn s_bool(value: &Value, path: &[&str]) -> Result<bool, ModelError> {
    walk(value, path)
        .and_then(Value::as_bool)
        .ok_or_else(|| data_error(format!("missing bool {}", path.join("."))))
}

pub(super) fn s_number(value: &Value, path: &[&str]) -> Result<f64, ModelError> {
    walk(value, path)
        .and_then(Value::as_f64)
        .ok_or_else(|| data_error(format!("missing number {}", path.join("."))))
}

pub(super) fn path_number(value: &Value, path: &[&str]) -> Result<f64, ModelError> {
    walk(value, path)
        .and_then(Value::as_f64)
        .ok_or_else(|| data_error(format!("missing number {}", path.join("."))))
}

pub(super) fn number(value: &Value, key: &str) -> Result<f64, ModelError> {
    value
        .get(key)
        .and_then(Value::as_f64)
        .ok_or_else(|| data_error(format!("missing number {key}")))
}

pub(super) fn number_or(value: &Value, key: &str, fallback: f64) -> f64 {
    value.get(key).and_then(Value::as_f64).unwrap_or(fallback)
}

pub(super) fn gen_number(package_id: &str, key: &str) -> Result<f64, ModelError> {
    number(&generation_package(package_id)?, key)
}

pub(super) fn storage_number(package_id: &str, key: &str) -> Result<f64, ModelError> {
    number(&storage_package(package_id)?, key)
}

pub(super) fn trade_number(package_id: &str, path: &[&str]) -> Result<f64, ModelError> {
    path_number(&trade_package(package_id)?, path)
}

pub(super) fn snap_gen(package_id: &str, value: f64) -> Result<f64, ModelError> {
    let data = generation_package(package_id)?;
    Ok(snap(
        value,
        number(&data, "minInstalledGW")?,
        number(&data, "maxInstalledGW")?,
        number(&data, "stepGW")?,
    ))
}

pub(super) fn snap_storage(
    package_id: &str,
    suffix: &str,
    value: f64,
) -> Result<f64, ModelError> {
    let data = storage_package(package_id)?;
    Ok(snap(
        value,
        number(&data, &format!("min{suffix}"))?,
        number(&data, &format!("max{suffix}"))?,
        number(&data, &format!("step{suffix}"))?,
    ))
}

pub(super) fn snap_trade(
    package_id: &str,
    path: &[&str],
    value: f64,
) -> Result<f64, ModelError> {
    let data = trade_package(package_id)?;
    let base = walk(&data, path)
        .ok_or_else(|| data_error(format!("missing trade path {}", path.join("."))))?;
    Ok(snap(
        value,
        number(base, "minGW")?,
        number(base, "maxGW")?,
        number(base, "stepGW")?,
    ))
}

fn snap(value: f64, min: f64, max: f64, step: f64) -> f64 {
    let clamped = value.max(min).min(max);
    if step <= 0.0 {
        return clamped;
    }
    let stepped = ((clamped - min) / step).round() * step + min;
    stepped.max(min).min(max)
}

pub(super) fn generation_package(package_id: &str) -> Result<Value, ModelError> {
    package_data(match package_id {
        "pv" => include_str!("../../erzeugung/pv/package.json"),
        "windon" => include_str!("../../erzeugung/windon/package.json"),
        "windoff" => include_str!("../../erzeugung/windoff/package.json"),
        "kernkraft" => include_str!("../../erzeugung/kernkraft/package.json"),
        "biomasse" => include_str!("../../erzeugung/biomasse/package.json"),
        "laufwasser" => include_str!("../../erzeugung/laufwasser/package.json"),
        "gas" => include_str!("../../erzeugung/gas/package.json"),
        "kohle" => include_str!("../../erzeugung/kohle/package.json"),
        _ => {
            return Err(data_error(format!(
                "unknown generation package {package_id}"
            )));
        }
    })
}

pub(super) fn storage_package(package_id: &str) -> Result<Value, ModelError> {
    package_data(match package_id {
        "batterie" => include_str!("../../speicher/batterie/package.json"),
        "pumpspeicher" => include_str!("../../speicher/pumpspeicher/package.json"),
        "h2" => include_str!("../../speicher/h2/package.json"),
        _ => return Err(data_error(format!("unknown storage package {package_id}"))),
    })
}

pub(super) fn trade_package(package_id: &str) -> Result<Value, ModelError> {
    package_data(match package_id {
        "strom-handel" => include_str!("../../aussenhandel/strom-handel/package.json"),
        "h2-handel" => include_str!("../../aussenhandel/h2-handel/package.json"),
        _ => return Err(data_error(format!("unknown trade package {package_id}"))),
    })
}

pub(super) fn walk<'a>(value: &'a Value, path: &[&str]) -> Option<&'a Value> {
    let mut current = value;
    for key in path {
        current = current.get(*key)?;
    }
    Some(current)
}

pub(super) fn data_error(message: impl Into<String>) -> ModelError {
    ModelError::Data {
        message: message.into(),
    }
}
