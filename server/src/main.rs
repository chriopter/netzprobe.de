use axum::{
    Json, Router,
    http::StatusCode,
    routing::{get, post},
};
use netzprobe_api::simulation::{ApiView, SimulationHarness};
use serde::Deserialize;
use serde::Serialize;
use serde_json::{Value, json};
use std::{
    env, fs,
    net::SocketAddr,
    sync::OnceLock,
    time::{Duration, Instant},
};
use tokio::net::TcpListener;

#[derive(Serialize)]
struct HealthResponse {
    ok: bool,
}

#[derive(Serialize)]
struct StatusResponse {
    ok: bool,
    uptime_seconds: u64,
    load_average: LoadAverage,
    memory: MemoryStatus,
    cpu: CpuStatus,
}

#[derive(Serialize)]
struct LoadAverage {
    one_minute: f32,
    five_minutes: f32,
    fifteen_minutes: f32,
}

#[derive(Serialize)]
struct MemoryStatus {
    used_mb: u64,
    total_mb: Option<u64>,
    available_mb: Option<u64>,
    source: &'static str,
}

#[derive(Serialize)]
struct CpuStatus {
    cores: f32,
    source: &'static str,
}

static STARTED_AT: OnceLock<Instant> = OnceLock::new();

fn app() -> Router {
    Router::new()
        .route("/api/health", get(health))
        .route("/api/status", get(status))
        .route("/api/resolve", post(resolve_scenario))
        .route("/api/simulate", post(simulate))
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { ok: true })
}

async fn status() -> Json<StatusResponse> {
    Json(StatusResponse {
        ok: true,
        uptime_seconds: STARTED_AT
            .get()
            .map(Instant::elapsed)
            .unwrap_or(Duration::ZERO)
            .as_secs(),
        load_average: read_load_average(),
        memory: read_memory_status(),
        cpu: read_cpu_status(),
    })
}

#[derive(Deserialize)]
struct SimulateRequest {
    scenario: Value,
    view: Option<ApiView>,
}

async fn simulate(
    Json(payload): Json<SimulateRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let harness = SimulationHarness::new();
    harness
        .run_api_result_with_view(&payload.scenario, payload.view)
        .map(Json)
        .map_err(|err| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "ok": false,
                    "error": err.to_string(),
                })),
            )
        })
}

async fn resolve_scenario(
    Json(payload): Json<SimulateRequest>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let harness = SimulationHarness::new();
    harness
        .resolve_scenario(&payload.scenario)
        .map(Json)
        .map_err(|err| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "ok": false,
                    "error": err.to_string(),
                })),
            )
        })
}

fn read_load_average() -> LoadAverage {
    let content = fs::read_to_string("/proc/loadavg").unwrap_or_default();
    let mut parts = content.split_whitespace();
    LoadAverage {
        one_minute: parts.next().and_then(|v| v.parse().ok()).unwrap_or(0.0),
        five_minutes: parts.next().and_then(|v| v.parse().ok()).unwrap_or(0.0),
        fifteen_minutes: parts.next().and_then(|v| v.parse().ok()).unwrap_or(0.0),
    }
}

fn read_memory_status() -> MemoryStatus {
    if let Some(status) = read_cgroup_memory_status() {
        return status;
    }
    let content = fs::read_to_string("/proc/meminfo").unwrap_or_default();
    let mut total_kb = 0;
    let mut available_kb = 0;
    for line in content.lines() {
        if let Some(value) = meminfo_value_kb(line, "MemTotal:") {
            total_kb = value;
        } else if let Some(value) = meminfo_value_kb(line, "MemAvailable:") {
            available_kb = value;
        }
    }
    MemoryStatus {
        used_mb: total_kb.saturating_sub(available_kb) / 1024,
        total_mb: Some(total_kb / 1024),
        available_mb: Some(available_kb / 1024),
        source: "proc",
    }
}

fn read_cgroup_memory_status() -> Option<MemoryStatus> {
    let current = fs::read_to_string("/sys/fs/cgroup/memory.current")
        .ok()?
        .trim()
        .parse::<u64>()
        .ok()?;
    let max_raw = fs::read_to_string("/sys/fs/cgroup/memory.max").ok()?;
    let max = parse_cgroup_max(max_raw.trim())?;
    Some(MemoryStatus {
        used_mb: bytes_to_mb(current),
        total_mb: Some(bytes_to_mb(max)),
        available_mb: Some(bytes_to_mb(max.saturating_sub(current))),
        source: "cgroup",
    })
}

fn read_cpu_status() -> CpuStatus {
    if let Some(cores) = read_cgroup_cpu_cores() {
        return CpuStatus {
            cores,
            source: "cgroup",
        };
    }
    CpuStatus {
        cores: std::thread::available_parallelism()
            .map(|value| value.get() as f32)
            .unwrap_or(1.0),
        source: "proc",
    }
}

fn read_cgroup_cpu_cores() -> Option<f32> {
    let content = fs::read_to_string("/sys/fs/cgroup/cpu.max").ok()?;
    let mut parts = content.split_whitespace();
    let quota = parse_cgroup_max(parts.next()?)?;
    let period = parts.next()?.parse::<u64>().ok()?;
    if period == 0 {
        return None;
    }
    Some((quota as f32 / period as f32).max(0.01))
}

fn parse_cgroup_max(value: &str) -> Option<u64> {
    if value == "max" {
        None
    } else {
        value.parse().ok()
    }
}

fn bytes_to_mb(value: u64) -> u64 {
    value / 1024 / 1024
}

fn meminfo_value_kb(line: &str, key: &str) -> Option<u64> {
    line.strip_prefix(key)
        .and_then(|rest| rest.split_whitespace().next())
        .and_then(|value| value.parse().ok())
}

#[tokio::main]
async fn main() {
    STARTED_AT.set(Instant::now()).ok();
    let addr = env::var("NETZPROBE_API_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:8080".to_string())
        .parse::<SocketAddr>()
        .expect("NETZPROBE_API_ADDR must be a socket address");
    let listener = TcpListener::bind(addr)
        .await
        .expect("failed to bind API listener");

    println!("netzprobe-api listening on http://{addr}");
    axum::serve(listener, app())
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("API server failed");
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

#[cfg(test)]
mod tests {
    use super::{meminfo_value_kb, read_load_average, read_memory_status};

    #[test]
    fn parses_meminfo_value() {
        assert_eq!(
            meminfo_value_kb("MemAvailable:    123456 kB", "MemAvailable:"),
            Some(123456),
        );
    }

    #[test]
    fn reads_public_system_status() {
        let load = read_load_average();
        let memory = read_memory_status();

        assert!(load.one_minute >= 0.0);
        assert!(memory.total_mb.unwrap_or(memory.used_mb) > 0);
    }
}
