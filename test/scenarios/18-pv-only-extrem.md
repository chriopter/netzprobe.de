# 18 · PV-Only Extrem (1000 GW PV, kein Wind)

## Kurzbeschreibung
Extremszenario "Solarstaat": 1000 GW PV (etwa 6x heute), null Wind. Provokant: zeigt warum Wind-Anteil essentiell ist.

## Quellen
- Saudi Arabien PV-Strategie als Vergleich
- Hypothetisches "Sonnen-Maximum" für DE

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
    "pvInstalledGW": 1000, "windOnInstalledGW": 0, "windOffInstalledGW": 0,
    "kernkraftInstalledGW": 0, "biomasseInstalledGW": 8, "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 5, "kohleInstalledGW": 0,
    "importMaxGW": 30, "exportMaxGW": 100, "importEmissionGperKWh": 300,
    "pvCapacityFactorMultiplier": 1.5,
    "windOnCapacityFactorMultiplier": 1.0,
    "windOffCapacityFactorMultiplier": 1.8
  },
  "storage": {
    "batteriePowerGW": 200, "batterieEnergyGWh": 800,
    "pumpspeicherPowerGW": 12, "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 150, "h2DischargePowerGW": 100, "h2EnergyGWh": 100000
  }
}
```

## Erwartete Ergebnisse
- `curtailmentTWh` MASSIV ≥ 200 (Sommer-Mittag riesiger Überschuss)
- `loadSheddingTWh` ≥ 50 (Winter-Wochen ohne PV)
- `exportTWh` ≥ 100 (Maximum Export wann immer möglich)
- Zeigt: PV-Monokultur energiebilanziell unsinnig in DE

## Multiplier-Begründung
- `pvCapacityFactorMultiplier: 1.5` — moderne bifaziale Module mit Tracker für faire Neubau-Modellierung (sonst würde 1000 GW PV nur 702 kWh/kWp/a × 1000 = 702 TWh liefern, mit Faktor 1.5 entsprechend ~1050 TWh — passt zu heutiger Neubau-Reality)
