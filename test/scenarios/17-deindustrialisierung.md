# 17 · Deindustrialisierung (alle Industrie-Sektoren weg)

## Kurzbeschreibung
Extremszenario: Stahl/Chemie/Industrie-Wärme wandern komplett aus DE ab (chinesische/maghreb-Pfad). Verbleibende Last: Haushalte + Verkehr + Wärme + GHD. Realistisch in einem deindustrialisierten DE-Pfad.

## Quellen
- BDI-Warnung "Deindustrialisierungsrisiko" 2024
- Carbon Leakage Studien Fraunhofer ISI

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
    "windOnInstalledGW": 130,
    "windOffInstalledGW": 50,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 15,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 50,
    "batterieEnergyGWh": 200,
    "pumpspeicherPowerGW": 12,
    "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 30,
    "h2DischargePowerGW": 20,
    "h2EnergyGWh": 30000
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
- `totalDemandTWh` ~ 750-850 (deutlich weniger ohne Industrie)
- `renewableSharePct` ≥ 70 %
- `loadSheddingTWh` < 50
- Vergleich gegen 05 zeigt: Industrie ist Hauptverbrauchssäule in Vollelektrifizierung
