# 09 · EE + Mega-Batterieflotte (200 GW / 1 TWh)

## Kurzbeschreibung
Extrem-Szenario: 200 GW Batterieleistung, 1 TWh Energie. Übersteigt heutige Kapazitäten ~100x. Soll zeigen, wann Batterien an die saisonale Grenze stoßen vs. wo sie dominieren.

## Quellen
- Tesla Megapack Production Roadmap 2030: theoretisch 100 GWh/Jahr Output global
- BSW Solar 2024: Heimspeicher-Trend extrapoliert 2045: 50 GW / 150 GWh
- DLR 2021: Batterieoptimum DE 2045 ~80-150 GW

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
    "e100-bahn": false, "e100-schiff": false, "e100-flug": false,
    "e100-ghd": true, "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": false, "e100-stahl": false, "e100-chemie": false
  },
  "generation": {
    "pvInstalledGW": 350,
    "windOnInstalledGW": 130,
    "windOffInstalledGW": 50,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 10,
    "kohleInstalledGW": 0,
    "importMaxGW": 13,
    "exportMaxGW": 25,
    "importEmissionGperKWh": 300
  },
  "storage": {
    "batteriePowerGW": 200,
    "batterieEnergyGWh": 1000,
    "pumpspeicherPowerGW": 9.4,
    "pumpspeicherEnergyGWh": 45,
    "h2ChargePowerGW": 0,
    "h2DischargePowerGW": 0,
    "h2EnergyGWh": 0
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ~ 700-900
- `renewableSharePct` ≥ 80 %
- `batterieSocGWh` zyklt täglich nahezu komplett 0-1000
- `loadSheddingTWh` 5-20 (Winter-Dunkelflaute trotz Batterie nicht voll zu decken)
- Vergleich mit 04 (H2-Saisonal): Batterien sind besser bei Tagesgang, H2 bei Saisonal — beide Szenarien wegen Limits unzureichend
