# 05 · Ausgewogener Mix nach BMWK T45-Strom-Zielbild 2045

## Kurzbeschreibung
Annäherung an das BMWK-Langfristszenario T45-Strom 2045: 400 GW PV, 160 GW Wind onshore, 70 GW Wind offshore. Mit "realistischer" Speicher-Ausstattung. Volle Elektrifizierung der Endverbrauchssektoren aktiv.

## Quellen
- BMWK Langfristszenarien T45 (Fraunhofer ISI 2022): https://langfristszenarien.de/
- BNetzA Szenariorahmen 2025 NEP
- Agora "Klimaneutrales Deutschland 2045" (Prognos/Wuppertal/Öko-Institut)

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
    "pvInstalledGW": 400,
    "windOnInstalledGW": 160,
    "windOffInstalledGW": 70,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 30,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 80,
    "batterieEnergyGWh": 250,
    "pumpspeicherPowerGW": 12,
    "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 80,
    "h2DischargePowerGW": 40,
    "h2EnergyGWh": 80000
  },
  "import": {
    "h2TWh": 150,
    "stromGW": 30,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 30
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` 1450-1550 (volle Industrie-Targets - 150 TWh H2-Import, pfadspezifisch gewichtet ~ -330 TWh Strom)
- `renewableSharePct` ≥ 45 %
- `loadSheddingTWh` 200-450
- `co2GperKWh` 100-150
- `peakLoadGW` 200-280

## Bekannte Modell-Limits
- e100-Targets manuell reduziert um H2-Import (BMWK 2030 50-70 % Importrate) zu approximieren. Sektor-Mengen entsprechen damit T45-Strom-Annahmen statt Modell-Defaults.
