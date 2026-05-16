# 02 · Wind XL + großer H2-Saisonalspeicher

## Kurzbeschreibung
Gleiche Wind-Kapazität wie 01 + großer H2-Speicher (Elektrolyse, Rückverstromung, 100 TWh Kavernen). Soll Sturm-Überschüsse aufnehmen und in Flaute zurückspeisen.

## Quellen
- DEEP.KBB Studie: deutsches Kavernen-Potenzial ~600 TWh H2-Speicherkapazität
- Fraunhofer IEE "Wasserstoff im zukünftigen Energiesystem" 2024: 100-150 TWh H2-Speicher 2045 plausibel
- Agora 2023 "Klimaneutrales Stromsystem 2035": H2-Rückverstromung 30-50 GW

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2025,
  "demand": {
    "last-2025": true,
    "e100-pkw": false, "e100-heiz": false, "e100-lkw": false, "e100-bahn": false,
    "e100-schiff": false, "e100-flug": false, "e100-ghd": false,
    "e100-industrie-waerme": false, "e100-stahl": false, "e100-chemie": false
  },
  "generation": {
    "pvInstalledGW": 0,
    "windOnInstalledGW": 200,
    "windOffInstalledGW": 70,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 4.8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 0,
    "kohleInstalledGW": 0,
    "importMaxGW": 13,
    "exportMaxGW": 25,
    "importEmissionGperKWh": 300
  },
  "storage": {
    "batteriePowerGW": 10,
    "batterieEnergyGWh": 25,
    "pumpspeicherPowerGW": 9.4,
    "pumpspeicherEnergyGWh": 45,
    "h2ChargePowerGW": 50,
    "h2DischargePowerGW": 30,
    "h2EnergyGWh": 100000
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ≈ 466
- `renewableSharePct` ≥ 95 %
- `curtailmentTWh` < 30 (deutlich weniger als 01, weil Speicher aufnimmt)
- `loadSheddingTWh` < 2 (H2-Rückverstromung schließt Flaute-Lücken)
- `h2SocGWh` muss zyklen zwischen ≥ 20 % und < 80 % Befüllung — saisonaler Zyklus erkennbar
- `co2GperKWh` < 50

## Bekannte Modell-Limits
- Speicher-H2 ist Power-to-Power; das gespeicherte H2 ist KEINE Quelle für Stahl/Chemie/eFuels in diesem Modell.
