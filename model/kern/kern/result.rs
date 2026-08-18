use crate::fingerprint::{
    GOLDEN_HOUR_SAMPLES, HourFingerprint, ResultFingerprint, SecurityStatus, SummaryFingerprint,
};
use crate::ApiView;
use serde_json::{Value, json};
use std::collections::BTreeMap;

use super::{EPS, SimHour, SimulationResult};

impl SimulationResult {
    pub fn to_api_value(&self, view: Option<&ApiView>) -> Value {
        let demand_twh = sum(&self.hours, |hour| hour.load_gw);
        let renewable_twh = sum(&self.hours, |hour| {
            hour.pv_gw + hour.wind_on_gw + hour.wind_off_gw + hour.biomasse_gw + hour.laufwasser_gw
        });
        let load_shedding_twh = sum(&self.hours, |hour| hour.load_shedding_gw);
        let total_co2_t: f64 = self.hours.iter().map(|hour| hour.co2_tph).sum();
        // CO₂-Intensität je kWh VERSORGTER Nachfrage: Stromlast − Lastabwurf +
        // strom-äquivalent vom H₂-Pool gedeckte Sektoren + Export. So tragen alle
        // Szenarien denselben Service im Nenner — Erzeugung+Import würde den
        // internen Speicher-Ladestrom mitzählen und Elektrolyse-schwere Szenarien
        // künstlich verdünnen; nie gelieferte kWh dürfen nicht verdünnen.
        let served_twh = demand_twh - load_shedding_twh
            + sum(&self.hours, |hour| hour.h2_pool_reduction_gw)
            + sum(&self.hours, |hour| hour.export_gw);
        let served_kwh = served_twh * 1e9;
        let mut monthly_supply_twh = vec![0.0; 12];
        for hour in &self.hours {
            let month = hour
                .time
                .get(5..7)
                .and_then(|value| value.parse::<usize>().ok())
                .unwrap_or(0);
            if (1..=12).contains(&month) {
                monthly_supply_twh[month - 1] +=
                    (hour.supply_gw + hour.import_gw + hour.storage_discharge_gw) / 1000.0;
            }
        }
        let security_status = if load_shedding_twh > 1.0 {
            "kritisch"
        } else if load_shedding_twh > 0.01 {
            "angespannt"
        } else {
            "stabil"
        };

        json!({
            "hours": api_hours(&self.hours, view),
            "summary": {
                "totalDemandTWh": demand_twh,
                "renewableSharePct": if demand_twh > 0.0 { 100.0 * renewable_twh / demand_twh } else { 0.0 },
                "renewableTWh": renewable_twh,
                "curtailmentTWh": sum(&self.hours, |hour| hour.curtailment_gw),
                "importTWh": sum(&self.hours, |hour| hour.import_gw),
                "exportTWh": sum(&self.hours, |hour| hour.export_gw),
                "loadSheddingTWh": load_shedding_twh,
                // Strom-äquivalent vom H₂-Pool gedeckte Sektor-Nachfrage — Teil
                // der versorgten Gesamtnachfrage, aber nicht der Stromlast.
                "h2PoolStromReductionTWh": sum(&self.hours, |hour| hour.h2_pool_reduction_gw),
                "hoursWithLoadShedding": self.hours.iter().filter(|hour| hour.load_shedding_gw > EPS).count(),
                "hoursWithCurtailmentOver50pct": self.hours.iter().filter(|hour| {
                    let re = hour.pv_gw + hour.wind_on_gw + hour.wind_off_gw + hour.pv_curtailed_gw + hour.wind_on_curtailed_gw + hour.wind_off_curtailed_gw;
                    re > EPS && hour.curtailment_gw > 0.5 * re
                }).count(),
                "co2MtPerYear": total_co2_t / 1_000_000.0,
                "co2GperKWh": if served_kwh > 0.0 { (total_co2_t * 1_000_000.0) / served_kwh } else { 0.0 },
                "peakLoadGW": self.hours.iter().map(|hour| hour.load_gw).fold(0.0, f64::max),
                "monthlySupplyTWh": monthly_supply_twh,
                "securityStatus": security_status,
            }
        })
    }

    pub fn fingerprint(&self) -> ResultFingerprint {
        let demand_twh = sum(&self.hours, |hour| hour.load_gw);
        let renewable_twh = sum(&self.hours, |hour| {
            hour.pv_gw + hour.wind_on_gw + hour.wind_off_gw + hour.biomasse_gw + hour.laufwasser_gw
        });
        let load_shedding_twh = sum(&self.hours, |hour| hour.load_shedding_gw);
        let total_co2_t: f64 = self.hours.iter().map(|hour| hour.co2_tph).sum();
        let co2_mt_per_year = total_co2_t / 1_000_000.0;
        // Gleicher Nenner wie to_api_value: versorgte Nachfrage statt Erzeugung+Import.
        let served_twh = demand_twh - load_shedding_twh
            + sum(&self.hours, |hour| hour.h2_pool_reduction_gw)
            + sum(&self.hours, |hour| hour.export_gw);
        let served_kwh = served_twh * 1e9;
        let co2_gper_kwh = if served_kwh > 0.0 {
            total_co2_t * 1_000_000.0 / served_kwh
        } else {
            0.0
        };
        let peak_load_gw = self
            .hours
            .iter()
            .map(|hour| hour.load_gw)
            .fold(0.0, f64::max);
        let hours_with_load_shedding = self
            .hours
            .iter()
            .filter(|hour| hour.load_shedding_gw > EPS)
            .count() as u32;
        let security_status = if load_shedding_twh > 1.0 {
            SecurityStatus::Kritisch
        } else if load_shedding_twh > 0.01 {
            SecurityStatus::Angespannt
        } else {
            SecurityStatus::Stabil
        };

        let mut hours = BTreeMap::new();
        for index in GOLDEN_HOUR_SAMPLES {
            let hour = &self.hours[index];
            hours.insert(
                format!("hour{index}"),
                HourFingerprint {
                    load_gw: round(hour.load_gw, 3),
                    supply_gw: round(hour.supply_gw, 3),
                    import_gw: round(hour.import_gw, 3),
                    export_gw: round(hour.export_gw, 3),
                    storage_charge_gw: round(hour.storage_charge_gw, 3),
                    storage_discharge_gw: round(hour.storage_discharge_gw, 3),
                    batterie_soc_gwh: round(hour.batterie_soc_gwh, 3),
                    pumpspeicher_soc_gwh: round(hour.pumpspeicher_soc_gwh, 3),
                    h2_soc_gwh: round(hour.h2_soc_gwh, 3),
                    load_shedding_gw: round(hour.load_shedding_gw, 3),
                    curtailment_gw: round(hour.curtailment_gw, 3),
                    co2_tph: round(hour.co2_tph, 2),
                },
            );
        }

        ResultFingerprint {
            summary: SummaryFingerprint {
                total_demand_twh: round(demand_twh, 3),
                renewable_share_pct: round(
                    if demand_twh > 0.0 {
                        100.0 * renewable_twh / demand_twh
                    } else {
                        0.0
                    },
                    2,
                ),
                renewable_twh: round(renewable_twh, 3),
                curtailment_twh: round(sum(&self.hours, |hour| hour.curtailment_gw), 3),
                import_twh: round(sum(&self.hours, |hour| hour.import_gw), 3),
                export_twh: round(sum(&self.hours, |hour| hour.export_gw), 3),
                load_shedding_twh: round(load_shedding_twh, 3),
                hours_with_load_shedding,
                co2_mt_per_year: round(co2_mt_per_year, 3),
                co2_gper_kwh: round(co2_gper_kwh, 2),
                peak_load_gw: round(peak_load_gw, 2),
                security_status,
            },
            hours,
        }
    }
}

fn api_hour_value(hour: &SimHour) -> Value {
    let mut out = serde_json::Map::new();
    out.insert("time".to_string(), json!(hour.time));
    out.insert("loadGW".to_string(), json!(hour.load_gw));
    out.insert("pvGW".to_string(), json!(hour.pv_gw));
    out.insert("windOnGW".to_string(), json!(hour.wind_on_gw));
    out.insert("windOffGW".to_string(), json!(hour.wind_off_gw));
    out.insert("kernkraftGW".to_string(), json!(hour.kernkraft_gw));
    out.insert("biomasseGW".to_string(), json!(hour.biomasse_gw));
    out.insert("laufwasserGW".to_string(), json!(hour.laufwasser_gw));
    out.insert("gasGW".to_string(), json!(hour.gas_gw));
    out.insert("kohleGW".to_string(), json!(hour.kohle_gw));
    out.insert("pvCurtailedGW".to_string(), json!(hour.pv_curtailed_gw));
    out.insert(
        "windOnCurtailedGW".to_string(),
        json!(hour.wind_on_curtailed_gw),
    );
    out.insert(
        "windOffCurtailedGW".to_string(),
        json!(hour.wind_off_curtailed_gw),
    );
    out.insert(
        "kernkraftCurtailedGW".to_string(),
        json!(hour.kernkraft_curtailed_gw),
    );
    out.insert("importGW".to_string(), json!(hour.import_gw));
    out.insert("exportGW".to_string(), json!(hour.export_gw));
    out.insert("storageChargeGW".to_string(), json!(hour.storage_charge_gw));
    out.insert(
        "storageDischargeGW".to_string(),
        json!(hour.storage_discharge_gw),
    );
    out.insert(
        "batterieChargeGW".to_string(),
        json!(hour.batterie_charge_gw),
    );
    out.insert(
        "batterieDischargeGW".to_string(),
        json!(hour.batterie_discharge_gw),
    );
    out.insert(
        "pumpspeicherChargeGW".to_string(),
        json!(hour.pumpspeicher_charge_gw),
    );
    out.insert(
        "pumpspeicherDischargeGW".to_string(),
        json!(hour.pumpspeicher_discharge_gw),
    );
    out.insert("h2ChargeGW".to_string(), json!(hour.h2_charge_gw));
    out.insert("h2DischargeGW".to_string(), json!(hour.h2_discharge_gw));
    out.insert("batterieSocGWh".to_string(), json!(hour.batterie_soc_gwh));
    out.insert(
        "pumpspeicherSocGWh".to_string(),
        json!(hour.pumpspeicher_soc_gwh),
    );
    out.insert("h2SocGWh".to_string(), json!(hour.h2_soc_gwh));
    out.insert("curtailmentGW".to_string(), json!(hour.curtailment_gw));
    out.insert("loadSheddingGW".to_string(), json!(hour.load_shedding_gw));
    out.insert(
        "h2PoolReductionGW".to_string(),
        json!(hour.h2_pool_reduction_gw),
    );
    out.insert(
        "h2PoolImportGW".to_string(),
        json!(hour.h2_pool_import_gw),
    );
    out.insert("h2PoolLhvGW".to_string(), json!(hour.h2_pool_lhv_gw));
    out.insert(
        "h2PoolImportLhvGW".to_string(),
        json!(hour.h2_pool_import_lhv_gw),
    );
    out.insert("supplyGW".to_string(), json!(hour.supply_gw));
    out.insert("balanceGW".to_string(), json!(hour.balance_gw));
    out.insert("co2Tph".to_string(), json!(hour.co2_tph));
    out.insert("solarGW".to_string(), json!(hour.pv_gw));
    out.insert("biomassGW".to_string(), json!(hour.biomasse_gw));
    out.insert("hydroGW".to_string(), json!(hour.laufwasser_gw));
    out.insert("geothermalGW".to_string(), json!(hour.geothermal_gw));
    out.insert("wasteGW".to_string(), json!(hour.waste_gw));
    out.insert("oilGW".to_string(), json!(hour.oil_gw));
    out.insert("otherGW".to_string(), json!(hour.other_gw));
    out.insert("coalGW".to_string(), json!(hour.kohle_gw));
    out.insert("nuclearGW".to_string(), json!(hour.kernkraft_gw));
    out.insert("historicalImportGW".to_string(), json!(hour.import_gw));
    out.insert("historicalExportGW".to_string(), json!(hour.export_gw));
    out.insert("dataBoundaryResidualGW".to_string(), json!(0));
    out.insert("batteryGWh".to_string(), json!(hour.batterie_soc_gwh));
    out.insert("h2GWh".to_string(), json!(hour.h2_soc_gwh));
    Value::Object(out)
}

fn api_hours(hours: &[SimHour], view: Option<&ApiView>) -> Vec<Value> {
    let filtered: Vec<&SimHour> = match view {
        Some(view) => hours
            .iter()
            .filter(|hour| {
                let date = hour.time.get(0..10).unwrap_or("");
                view.start.as_deref().is_none_or(|start| date >= start)
                    && view.end.as_deref().is_none_or(|end| date <= end)
            })
            .collect(),
        None => hours.iter().collect(),
    };

    let max_points = view
        .and_then(|view| view.max_points)
        .unwrap_or(filtered.len());
    if max_points == 0 || filtered.len() <= max_points {
        return filtered.into_iter().map(api_hour_value).collect();
    }

    let step = filtered.len().div_ceil(max_points);
    filtered
        .chunks(step)
        .map(|bucket| average_api_bucket(bucket))
        .collect()
}

fn average_api_bucket(bucket: &[&SimHour]) -> Value {
    let count = bucket.len() as f64;
    let mut rows = bucket.iter().map(|hour| api_hour_value(hour));
    let Some(Value::Object(mut out)) = rows.next() else {
        return json!({});
    };

    for value in rows {
        if let Value::Object(row) = value {
            for (key, value) in row {
                if key == "time" {
                    continue;
                }
                let Some(next) = value.as_f64() else {
                    continue;
                };
                let current = out.get(&key).and_then(Value::as_f64).unwrap_or(0.0);
                out.insert(key, json!(current + next));
            }
        }
    }

    for (key, value) in out.iter_mut() {
        if key == "time" {
            continue;
        }
        if let Some(sum) = value.as_f64() {
            *value = json!(sum / count);
        }
    }

    Value::Object(out)
}

fn sum(hours: &[SimHour], f: impl Fn(&SimHour) -> f64) -> f64 {
    hours.iter().map(f).sum::<f64>() / 1000.0
}

fn round(value: f64, digits: i32) -> f64 {
    let factor = 10_f64.powi(digits);
    (value * factor).round() / factor
}
