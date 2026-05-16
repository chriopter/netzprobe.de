# 06 · Vollelektrifizierung + 100 % EE + Stress-Maximum

## Kurzbeschreibung
Hartes 100-%-EE-Szenario ohne fossile Backup, ohne Import-Reserve. Hartes Worst-Case-Test ob das System mit reinen EE + Speicher trägt.

## Quellen
- Agora 2021 "Klimaneutrales Deutschland 2045": EE-Anteil 100 % erfordert ~250 GW Wind + 400 GW PV
- Wuppertal Institut 2020 "CO2-neutrales Deutschland 2035": Massive Speicher nötig
- ESYS-Stellungnahme acatech 2021

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
    "e100-chemie": true, "e100-chemie-target-twh": 440
  },
  "generation": {
    "pvInstalledGW": 500,
    "windOnInstalledGW": 250,
    "windOffInstalledGW": 100,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 10,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 0,
    "kohleInstalledGW": 0,
    "importMaxGW": 0,
    "exportMaxGW": 200,
    "importEmissionGperKWh": 300
  },
  "storage": {
    "batteriePowerGW": 150,
    "batterieEnergyGWh": 500,
    "pumpspeicherPowerGW": 15,
    "pumpspeicherEnergyGWh": 100,
    "h2ChargePowerGW": 150,
    "h2DischargePowerGW": 100,
    "h2EnergyGWh": 150000
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ~ 1750-1850 (alle e100 maxed, kein H2-Import = "everything domestic")
- `renewableSharePct` ≥ 55 %
- `curtailmentTWh` 0-50
- `loadSheddingTWh` ≥ 500 (zeigt mathematisch: 100% Inland bei diesen Mengen ist ohne Industrie-DSM kaum machbar)
- `co2MtPerYear` < 50 (kein fossil → CO2 nur aus EE-Vorketten)

## Bekannte Modell-Limits
- Negativ-Befund: Vollelektrifizierung OHNE H2-Import zeigt klar, dass die strukturelle Demand-Last (Industrie/PtL flat 24/7) ohne DSM-Flex und/oder H2-Import-Pfad nicht abgedeckt werden kann.
- Bestätigt die Annahme aus BMWK/Wuppertal/Agora, dass massive H2-Importanteile (60-250 TWh) ein integraler Pfeiler jedes plausiblen 2045-Zielbilds sind.
