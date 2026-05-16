# 11 · EE-Befürworter-Traum (Vollausbau + saisonaler H2)

## Kurzbeschreibung
Maximum-EE: 600 GW PV, 250 GW Wind onshore, 100 GW Wind offshore. Riesiger H2-Saisonalspeicher 150 TWh + 250 TWh H2-Import. Vollelektrifizierung. Klassisches "Energiewende-Triumph"-Szenario.

## Quellen
- Greenpeace Energie 2045 (2023): 700 GW PV + 350 GW Wind als optimistischer Pfad
- DLR "Energiesystem 2050" optimistisch-Pfad
- Agora "Klimaneutrales Deutschland 2045" oberer Korridor

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2025,
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
    "e100-schiff": true,
    "e100-schiff-target-twh": 80,
    "e100-flug": true,
    "e100-flug-target-twh": 300,
    "e100-ghd": true,
    "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": true,
    "e100-industrie-waerme-target-heat-twh": 220,
    "e100-stahl": true,
    "e100-stahl-target-mio-ton": 28,
    "e100-chemie": true,
    "e100-chemie-target-twh": 440
  },
  "generation": {
    "pvInstalledGW": 600,
    "windOnInstalledGW": 250,
    "windOffInstalledGW": 100,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 10,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 5,
    "kohleInstalledGW": 0,
    "pvCapacityFactorMultiplier": 1.5,
    "windOnCapacityFactorMultiplier": 1.4,
    "windOffCapacityFactorMultiplier": 1.8
  },
  "storage": {
    "batteriePowerGW": 200,
    "batterieEnergyGWh": 800,
    "pumpspeicherPowerGW": 15,
    "pumpspeicherEnergyGWh": 100,
    "h2ChargePowerGW": 200,
    "h2DischargePowerGW": 100,
    "h2EnergyGWh": 150000
  },
  "import": {
    "h2TWh": 250,
    "stromGW": 30,
    "stromEmissionGperKWh": 200
  },
  "export": {
    "stromGW": 60
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ~ 1250-1320 (250 TWh H2-Import sparen ~540 TWh)
- `renewableSharePct` ≥ 90 %
- `curtailmentTWh` ≥ 50
- `loadSheddingTWh` < 30
- `co2GperKWh` < 50

## Multiplier-Begründung
Annahme moderner Neubau-Flotte 2045:
- `pvCapacityFactorMultiplier: 1.5` — bifaziale Module mit Tracker liefern ~1100 kWh/kWp/a statt heute gemittelt 702 (BSW Solar, Fraunhofer ISE PV-Atlas)
- `windOnCapacityFactorMultiplier: 1.4` — 4-6 MW Neubau erreicht ~2400 VLH statt heute gemittelt 1745 (BWE Statistik 2024)
- `windOffCapacityFactorMultiplier: 1.8` — Default, Offshore-Vorteil aus heutigem Gemittelt-Faktor herausrechnen (15 MW-Klasse Nordsee ~4000 VLH)
