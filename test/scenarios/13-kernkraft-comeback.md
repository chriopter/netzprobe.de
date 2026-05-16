# 13 · Kernkraft-Comeback (40 GW SMR + Bestand-Rückbau)

## Kurzbeschreibung
Hypothetisches Szenario mit massivem Kernkraft-Comeback (40 GW SMR, etwa Verdoppelung des Bestands vor 2011). Ergänzt durch EE auf BMWK-Niveau und H2-Import.

## Quellen
- IPCC AR6: Kernkraft als kohlenstoffarme Option
- DOE 2024 SMR-Roadmap
- Roland Berger Studie 2024: SMR-Wirtschaftlichkeit

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
    "e100-bahn": true, "e100-bahn-target-twh": 10,
    "e100-schiff": true, "e100-schiff-target-twh": 80,
    "e100-flug": true, "e100-flug-target-twh": 300,
    "e100-ghd": true, "e100-ghd-target-heat-twh": 163,
    "e100-industrie-waerme": true, "e100-industrie-waerme-target-heat-twh": 220,
    "e100-stahl": true, "e100-stahl-target-mio-ton": 28,
    "e100-chemie": true, "e100-chemie-target-twh": 440,
    "h2-import-twh": 200
  },
  "generation": {
    "pvInstalledGW": 250, "windOnInstalledGW": 150, "windOffInstalledGW": 60,
    "kernkraftInstalledGW": 40, "biomasseInstalledGW": 8, "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 10, "kohleInstalledGW": 0,
    "importMaxGW": 30, "exportMaxGW": 30, "importEmissionGperKWh": 300
  },
  "storage": {
    "batteriePowerGW": 50, "batterieEnergyGWh": 200,
    "pumpspeicherPowerGW": 12, "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 30, "h2DischargePowerGW": 20, "h2EnergyGWh": 30000
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ~ 1370-1440
- `renewableSharePct` 60-70 % (EE + Kern als CO2-frei)
- `loadSheddingTWh` < 100 (40 GW Kern liefert 315 TWh/a stabil)
- `co2GperKWh` 30-80 (Kern bei 12 g/kWh, EE klein, Gas nur backup)
