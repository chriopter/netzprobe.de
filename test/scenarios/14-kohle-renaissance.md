# 14 · Kohle-Renaissance (Hypothetisches "Trump-Energy"-Szenario)

## Kurzbeschreibung
Provokativ: was wäre, wenn DE eine 180-Grad-Wende macht und Kohle zurückbringt? 60 GW Kohle, minimaler EE-Ausbau. Zeigt CO2-Impact extrem.

## Quellen
- US Trump Energy Policy 2024 als Beispiel (DE-Klima-Negativvorbild)
- BNetzA-Stillegungsplan (was wenn rückwärts?)

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2025,
  "demand": {
    "last-2025": true,
    "e100-pkw": false,
    "e100-heiz": false,
    "e100-lkw": false,
    "e100-bahn": false,
    "e100-schiff": false,
    "e100-flug": false,
    "e100-ghd": false,
    "e100-industrie-waerme": false,
    "e100-stahl": false,
    "e100-chemie": false
  },
  "generation": {
    "pvInstalledGW": 100,
    "windOnInstalledGW": 65,
    "windOffInstalledGW": 9.4,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 4.8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 30,
    "kohleInstalledGW": 60
  },
  "storage": {
    "batteriePowerGW": 10,
    "batterieEnergyGWh": 25,
    "pumpspeicherPowerGW": 9.4,
    "pumpspeicherEnergyGWh": 45,
    "h2ChargePowerGW": 0,
    "h2DischargePowerGW": 0,
    "h2EnergyGWh": 0
  },
  "import": {
    "stromGW": 13,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 25
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ≈ 466
- `renewableSharePct` 30-40 %
- `loadSheddingTWh` ~ 0 (60 GW Kohle haben massiv Reserve)
- `co2MtPerYear` ≥ 300 (Kohle massiv → CO2-Kollaps)
- `co2GperKWh` 600-900
