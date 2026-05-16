# 10 · EE + hohe Cross-Border-Import-Caps

## Kurzbeschreibung
Wie Szenario 05, aber mit hohen Import-Caps (60 GW) als Buffer-Quelle für Dunkelflauten. Mimik europäische Vernetzung 2045 (Nordsee-Offshore-Hub + Pipeline-H2 als Strom-Backup).

## Quellen
- TenneT/50Hertz/Amprion NEP 2023: Geplante NTC-Erweiterungen ~25 GW zusätzlich bis 2045
- ENTSO-E TYNDP 2024: 60-80 GW DE-Cross-Border ist Zielwert
- North Sea Wind Power Hub (Tennet/Gasunie/Energinet)

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2025,
  "demand": {
    "last-2025": true,
    "e100-pkw": true, "e100-pkw-million-km": 472200,
    "e100-heiz": true, "e100-heiz-target-heat-twh": 530,
    "e100-lkw": true, "e100-lkw-target-bn-km": 117,
    "e100-bahn": true, "e100-bahn-target-twh": 10,
    "e100-schiff": true, "e100-schiff-target-twh": 80,
    "e100-flug": true, "e100-flug-target-twh": 300,
    "e100-ghd": true, "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": true, "e100-industrie-waerme-target-heat-twh": 220,
    "e100-stahl": true, "e100-stahl-target-mio-ton": 28,
    "e100-chemie": true, "e100-chemie-target-twh": 440,
    "h2-import-twh": 200
  },
  "generation": {
    "pvInstalledGW": 350,
    "windOnInstalledGW": 150,
    "windOffInstalledGW": 60,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 20,
    "kohleInstalledGW": 0,
    "importMaxGW": 60,
    "exportMaxGW": 60,
    "importEmissionGperKWh": 200
  },
  "storage": {
    "batteriePowerGW": 60,
    "batterieEnergyGWh": 200,
    "pumpspeicherPowerGW": 12,
    "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 50,
    "h2DischargePowerGW": 30,
    "h2EnergyGWh": 50000
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ≈ 1370-1450 (volle Targets - 200 TWh H2-Import pfadspezifisch ~ -440 TWh Strom)
- `renewableSharePct` ≥ 40 %
- `importTWh` ≥ 200
- `loadSheddingTWh` 100-300
- `co2GperKWh` 100-130
- `curtailmentTWh` ähnlich wie 05
