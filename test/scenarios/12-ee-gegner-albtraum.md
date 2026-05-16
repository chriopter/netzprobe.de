# 12 · EE-Gegner-Albtraum (Kohle weg, kein PV/Wind-Ausbau, kein Import)

## Kurzbeschreibung
„Wenn ihr EE wegmacht und nichts dazubaut": Kohle bleibt heutigem Bestand, PV/Wind auf 2025-Stand, kein H2-Import, Strom-Import auf 0 → komplette Inland-Versorgung mit dem heutigen Mix. Sollte zeigen dass aktuelles System ohne EE-Ausbau zusammenbricht.

## Quellen
- Agora Analyse "Energy Transition: What if we stopped" (Hypothetisches)
- Heute-Stand: ~150 GW PV + ~70 GW Wind, Bestand Kohle 18 GW

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
    "kohleInstalledGW": 18
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
    "stromGW": 0,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 25
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ≈ 466
- `renewableSharePct` 30-45 % (heute-Niveau)
- `loadSheddingTWh` ≥ 0 (Bestand sollte gerade reichen mit Gas+Kohle)
- `co2GperKWh` 250-400 (typisch heute-Mix)
- `peakLoadGW` ~ 80
