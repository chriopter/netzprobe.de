# 07 · Vollelektrifizierung + 250 TWh H2-Import

## Kurzbeschreibung
Volle Industrie-Targets (kein Industrie-Schrumpfen) — aber 250 TWh H2 werden importiert (Pipeline NL/NO/Maghreb). Das reduziert den Elektrolyse-Strombedarf der H2-konsumierenden Sektoren proportional. Realistischer 2045-Modus laut BMWK.

## Quellen
- BMWK H2-Importstrategie 2024: 2045 Importanteil ~50-70 %
- Agora KND 2045: 60-250 TWh H2-Import + 100-130 TWh E-Fuels-Import
- IEA "Hydrogen Outlook" 2023: Pipeline-Imports aus NL/NO

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
    "pvInstalledGW": 300,
    "windOnInstalledGW": 140,
    "windOffInstalledGW": 60,
    "kernkraftInstalledGW": 0,
    "biomasseInstalledGW": 8,
    "laufwasserInstalledGW": 4.8,
    "gasInstalledGW": 30,
    "kohleInstalledGW": 0
  },
  "storage": {
    "batteriePowerGW": 60,
    "batterieEnergyGWh": 200,
    "pumpspeicherPowerGW": 12,
    "pumpspeicherEnergyGWh": 80,
    "h2ChargePowerGW": 50,
    "h2DischargePowerGW": 30,
    "h2EnergyGWh": 50000
  },
  "import": {
    "h2TWh": 250,
    "stromGW": 30,
    "stromEmissionGperKWh": 300
  },
  "export": {
    "stromGW": 30
  }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` ≈ 1250-1320 (volle Targets - 250 TWh H2-Import pfadspezifisch gewichtet: PtL η=0.38 spart am stärksten ein → ~540 TWh Strom-Einsparung)
- `renewableSharePct` ≥ 45 %
- `loadSheddingTWh` 150-300
- `peakLoadGW` 200-260

## Bekannte Modell-Limits
- H2-Import wird flat über 8760 h verteilt und proportional zum Sektor-Strom-Aufwand auf Stahl/Chemie/Schiff/Flug verteilt.
- Pro Sektor wird die Strom-Einsparung mit pfadspezifischem η (Stahl 0.62, Chemie 0.55, Schiff 0.50, Flug 0.38) berechnet — d.h. importierter H2 für PtL-Pfade ersetzt deutlich mehr Strom als für Stahl.

## Bekannte Modell-Limits
- H2-Import wird flat (8760 h/a) verteilt. Realistisch wäre stündliche Pipeline-Profile, aber das ist eine kleine Vereinfachung gegenüber dem zentralen Effekt (Reduktion Strombedarf).
- Die Industrie-Wertschöpfung (Mio. t Stahl, TWh Chemie) bleibt voll erhalten — wir importieren nur den ENERGIETRÄGER H2, nicht die Endprodukte.
