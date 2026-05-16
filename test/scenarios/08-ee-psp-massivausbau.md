# 08 · EE + massiver Pumpspeicher-Ausbau

## Kurzbeschreibung
Hypothetisches Szenario mit PSP an der oberen Slider-Grenze (15 GW / 100 GWh). Realistisches DE-Maximum laut Studien plus Vianden-Lux. Vergleich gegen H2-Strategien.

## Quellen
- ENTSO-E Storage Mapping 2024: DE-LU Marktgebiet ~9,93 GW heute
- Goldisthal-Erweiterungsplan (gestrichen 2014)
- BMWK Pumpspeicher-Potenzial-Studie 2014: theoretisches Zubau ~3-5 GW realistisch

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
    "e100-bahn": false,
    "e100-schiff": false,
    "e100-flug": false,
    "e100-ghd": true,
    "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": false,
    "e100-stahl": false,
    "e100-chemie": false
  },
  "generation": {
    "pvInstalledGW": 250,
    "windOnInstalledGW": 140,
    "windOffInstalledGW": 50,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 20,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 30,
    "batterieEnergyGWh": 100,
    "pumpspeicherPowerGW": 15,
    "pumpspeicherEnergyGWh": 100,
    "h2ChargePowerGW": 20,
    "h2DischargePowerGW": 10,
    "h2EnergyGWh": 20000
  },
  "import": {
    "stromGW": 20,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 30
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ~ 700-900 (ohne Industrie/Schiff/Flug)
- `renewableSharePct` ≥ 75 %
- `pumpspeicherSocGWh`-Range zeigt 1-3 Tageszyklen pro Woche (PSP-typisch)
- `loadSheddingTWh` < 3
- `h2SocGWh`-Range klein (kleine Kavernen)
