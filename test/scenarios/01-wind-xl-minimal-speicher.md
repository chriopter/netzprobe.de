# 01 · Wind XL ohne nennenswerten Speicher

## Kurzbeschreibung
EE-Strom ist verfügbar wenn Wind weht — Speicher fast Null. Erwartung: viel Curtailment bei Sturm-Episoden, viel Defizit bei Flaute. Stresstest für "Wind allein reicht nicht ohne Speicher".

## Quellen
- BMWK Langfristszenarien T45-Strom (Fraunhofer ISI 2022): 2045 Wind-Onshore 160 GW, Wind-Offshore 70 GW
- Agora Energiewende "Klimaneutrales Deutschland 2045" (2021): Wind als Rückgrat
- BNetzA Szenariorahmen 2025: 245 GW Wind insgesamt für 2045

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
    "pvInstalledGW": 0,
    "windOnInstalledGW": 200,
    "windOffInstalledGW": 70,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 4.8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 0,
    "kohleInstalledGW": 0
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
- `totalDemandTWh` ≈ 466 (DE-Standardjahr 2025)
- `renewableSharePct` ≥ 90 % (überwiegend Wind decken Last)
- `curtailmentTWh` ≥ 50 (massive Abregelung bei Sturm-Tagen)
- `loadSheddingTWh` ≥ 5 (Flaute-Defizit, weil kaum Speicher)
- `hoursWithLoadShedding` ≥ 200 h
- `peakLoadGW` ~ 80 (typisches Winter-Maximum DE)
- `co2GperKWh` < 100 (fast nur Import erzeugt CO2)
