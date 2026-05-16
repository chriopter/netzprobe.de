# 16 · Maximum Import-Buffer (200 GW Cross-Border)

## Kurzbeschreibung
Hypothetisch 200 GW Cross-Border-Kapazität (alle ENTSO-E-Korridore voll ausgebaut). Modell, was wenn Nordsee-Wind-Hub + Pipeline-H2 als Strom-Backup beliebig groß sein kann.

## Quellen
- TenneT North Sea Wind Power Hub Roadmap
- ENTSO-E TYNDP 2024 Maximum-Verbund-Szenario
- Studie "Europäisches Übertragungsnetz 2050"

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
    "pvInstalledGW": 200,
    "windOnInstalledGW": 100,
    "windOffInstalledGW": 50,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 10,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 30,
    "batterieEnergyGWh": 100,
    "pumpspeicherPowerGW": 12,
    "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 30,
    "h2DischargePowerGW": 20,
    "h2EnergyGWh": 30000
  },
  "import": {
    "h2TWh": 150,
    "stromGW": 200,
    "stromEmissionGperKWh": 100
  },
  "export": {
    "stromGW": 200
  }
}
```

## Erwartete Ergebnisse
- `importTWh` ≥ 500 (Massive Import-Nutzung)
- `loadSheddingTWh` < 10 (Import deckt fast alles)
- `co2GperKWh` < 80 (Import bei 100 g/kWh Annahme)
