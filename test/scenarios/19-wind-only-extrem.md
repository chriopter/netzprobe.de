# 19 · Wind-Only Extrem (500 GW Wind, kein PV)

## Kurzbeschreibung
Gegen-Extrem zu 18: 500 GW Wind onshore + offshore, kein PV. Provokant: würde Dänemark/UK-Pfad auf DE übertragen.

## Quellen
- Energinet (Dänemark) Wind-Strategie
- ScotWind 100 GW Offshore
- Hypothetisches "Wind-Maximum" für DE

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2025,
  "demand": {
    "last-2025": true,
    "e100-pkw": true, "e100-pkw-million-km": 472200,
    "e100-heiz": true, "e100-heiz-target-heat-twh": 530,
    "e100-lkw": false, "e100-bahn": false, "e100-schiff": false, "e100-flug": false,
    "e100-ghd": true, "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": false, "e100-stahl": false, "e100-chemie": false
  },
  "generation": {
    "pvInstalledGW": 0, "windOnInstalledGW": 350, "windOffInstalledGW": 150,
    "kernkraftInstalledGW": 0, "biomasseInstalledGW": 8, "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 5, "kohleInstalledGW": 0,
    "importMaxGW": 30, "exportMaxGW": 100, "importEmissionGperKWh": 300,
    "pvCapacityFactorMultiplier": 1.0,
    "windOnCapacityFactorMultiplier": 1.4,
    "windOffCapacityFactorMultiplier": 1.8
  },
  "storage": {
    "batteriePowerGW": 100, "batterieEnergyGWh": 400,
    "pumpspeicherPowerGW": 12, "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 200, "h2DischargePowerGW": 100, "h2EnergyGWh": 150000
  }
}
```

## Erwartete Ergebnisse
- `renewableSharePct` ≥ 110 % (Wind-Output >> Demand)
- `curtailmentTWh` 100-300 (Sturm-Episoden)
- `loadSheddingTWh` < 30 (Flaute kompensierbar mit Batterie+H2)
- Zeigt: Wind ist weniger anfällig für Tagesgang als PV

## Multiplier-Begründung
- `windOnCapacityFactorMultiplier: 1.4` — 4-6 MW Neubau mit ~2400 VLH (BWE 2024)
- `windOffCapacityFactorMultiplier: 1.8` — 15 MW Offshore-Klasse mit ~4000 VLH (Default; korrigiert den heute gemittelten Faktor aus einspeisefaktoren-2025)
