# 20 · Status Quo 2025 (Kein Ausbau, kein Verbrauchszuwachs)

## Kurzbeschreibung
Referenz: heutige 2025-Konfiguration, keine Elektrifizierung, keine Speicher-Erweiterung. Sollte die reale 2025-Bilanz ungefähr abbilden. Als Sanity-Check und Diskussionsanker.

## Quellen
- AGEB Jahresauswertung 2024
- Energy-Charts Live 2025
- BDEW Strommix Schaubilder

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
    "pvInstalledGW": 102.5,
    "windOnInstalledGW": 62.8,
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
    "h2ChargePowerGW": 0.1,
    "h2DischargePowerGW": 0,
    "h2EnergyGWh": 0.1
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
- `totalDemandTWh` ≈ 466 (historischer Wert)
- `renewableSharePct` 50-70 % (heutiger Strom-Mix)
- `co2GperKWh` 300-400 (~363 laut UBA 2024)
- `loadSheddingTWh` ~ 0 (System gesund)
- Sanity-Check: stimmt heute mit Realdaten?
