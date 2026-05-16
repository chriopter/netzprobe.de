# 04 · PV XL + saisonaler H2-Speicher (Sommer→Winter)

## Kurzbeschreibung
Wie 03, aber statt Batterie der H2-Speicher als Sommer-Winter-Shift. Sommerlicher PV-Überschuss wird via Elektrolyse zu H2, im Winter rückverstromt. Klassischer "P2H2P-Sommer-Winter-Shift"-Pfad.

## Quellen
- Fraunhofer IEE "Roadmap H2": Sommer-zu-Winter-Shift braucht 60-120 TWh H2-Speicher
- Reverion-Konsortium 2024: 75 % Roundtrip-Effizienz mit SOEC + Brennstoffzelle (besser als unser 34 %)
- IEA Hydrogen Outlook 2023: P2H2P-Roundtrip 30-42 %

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
    "batteriePowerGW": 10,
    "batterieEnergyGWh": 25,
    "pumpspeicherPowerGW": 9.4,
    "pumpspeicherEnergyGWh": 45,
    "h2ChargePowerGW": 100,
    "h2DischargePowerGW": 50,
    "h2EnergyGWh": 80000
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
- `renewableSharePct` ≥ 85 %
- `curtailmentTWh` < 50 (H2-Elektrolyse fängt einen Teil ab, aber 34 % roundtrip frisst viel)
- `loadSheddingTWh` < 10
- `h2SocGWh` zeigt klare Saisonalität: Maximum Ende Sommer, Minimum Ende Winter
- Batterie+PSP haben minimalen Impact (Tagesgang kaum bei PV-Logik)
