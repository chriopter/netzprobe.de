# 21 · Kernkraft-Vergleich: 40 GW Kern + Vollelektrifizierung (kein H2-Import)

## Kurzbeschreibung
Direkter Vergleich zu Szenario 06 (100 % EE, 753 TWh Load-Shedding): hier zusätzlich 40 GW Kernkraft. Sollte zeigen ob Kern den Versorgungs-Stress signifikant entschärft.

## Quellen
- FR-Flotte als Referenz (63 GW historisch, 56 GW heute)
- DOE SMR Roadmap 2024
- IPCC AR6: Kernkraft als CO2-arme Option

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
    "pvInstalledGW": 500,
    "windOnInstalledGW": 200,
    "windOffInstalledGW": 80,
    "kernkraftInstalledGW": 40,
    "biomasseInstalledGW": 10,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 0,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 150,
    "batterieEnergyGWh": 500,
    "pumpspeicherPowerGW": 15,
    "pumpspeicherEnergyGWh": 100,
    "h2ChargePowerGW": 150,
    "h2DischargePowerGW": 100,
    "h2EnergyGWh": 150000
  },
  "import": {
    "stromGW": 0,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 200
  }
}
```

## Erwartete Ergebnisse
- Direkter Vergleich zu 06: Demand und Speicher identisch, nur +40 GW Kern
- 40 GW × 0.9 × 8760 = 315 TWh Kernkraft-Bandlast garantiert
- `loadSheddingTWh` deutlich unter 06 (753) — Reduktion um ~300-400 TWh erwartet
- `co2GperKWh` < 30 (EE + Kern beide CO2-arm)
