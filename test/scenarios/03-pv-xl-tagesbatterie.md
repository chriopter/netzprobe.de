# 03 · PV XL + Tagesbatterie (kurzfristig)

## Kurzbeschreibung
Solar-dominiertes System mit großer Batterie für Tag-Nacht-Verschiebung. Klassisches südeuropäisches Modell auf DE übertragen. Sommerlicher Überschuss massiv, Winter problematisch.

## Quellen
- BSW Solar 2024: 2045 ~400 GW PV plausibel (Frauenhofer ISE Phänomenologie)
- Tesla Megapack-Studie: 100 GW / 400 GWh Batterie für DE bei 100 % PV-Mittagslast
- DLR "Energiesystem 2045" (2022): PV-Maximum 500 GW

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
    "pvInstalledGW": 400,
    "windOnInstalledGW": 0,
    "windOffInstalledGW": 0,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 4.8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 0,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 100,
    "batterieEnergyGWh": 400,
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
- `renewableSharePct` ≥ 80 %
- `curtailmentTWh` ≥ 50 (Sommer-Mittag-Überproduktion ohne Wegnehmer)
- `loadSheddingTWh` ≥ 30 (Winter ohne PV, keine Wind, keine fossile Rückfallquelle)
- Batterie zyklt täglich: `batterieSocGWh`-Range nahezu volle Spannweite 0-400 in 365 Zyklen
- `co2GperKWh` 50-100 (Import füllt Winter-Lücke)
