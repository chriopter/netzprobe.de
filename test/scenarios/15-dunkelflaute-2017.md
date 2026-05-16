# 15 · Dunkelflaute 2017 (loadYear=2017 als Stresstest)

## Kurzbeschreibung
Nutzt historisches 2017-Lastprofil (statistisch schlechter Winter mit längeren Wind-Flauten) gegen modernen EE-Mix. Maxiumum-Stress für EE-Speicher-System.

## Quellen
- Wuppertal Institut Dunkelflauten-Analyse 2017
- TenneT Bericht "Wind drought January 2017"
- DWD Klimadaten 2017

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2017,
  "demand": {
    "last-2025": true,
    "e100-pkw": true,
    "e100-pkw-million-km": 472200,
    "e100-heiz": true,
    "e100-heiz-target-heat-twh": 530,
    "e100-lkw": true,
    "e100-lkw-target-bn-km": 117,
    "e100-bahn": true,
    "e100-bahn-target-twh": 10,
    "e100-schiff": false,
    "e100-flug": false,
    "e100-ghd": true,
    "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": false,
    "e100-stahl": false,
    "e100-chemie": false
  },
  "generation": {
    "pvInstalledGW": 300,
    "windOnInstalledGW": 160,
    "windOffInstalledGW": 70,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 30,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 80,
    "batterieEnergyGWh": 250,
    "pumpspeicherPowerGW": 12,
    "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 80,
    "h2DischargePowerGW": 40,
    "h2EnergyGWh": 80000
  },
  "import": {
    "h2TWh": 100,
    "stromGW": 30,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 30
  }
}
```

## Erwartete Ergebnisse
- 2017-Wetterjahr hat reduzierte Wind-Volllaststunden vs 2025
- `loadSheddingTWh` höher als äquivalentes 2025-Szenario
- Demonstriert Wetterjahr-Sensitivität
