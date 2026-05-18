# Netzprobe

Kompakte Stromsystem-Simulation für Deutschland. Die React-App konfiguriert Last, Erzeugung, Speicher und Außenhandel; die Rust-API rechnet die stündliche Bilanz, Speicherstände, Abregelung, Import/Export und CO₂-Kennzahlen.

Live: https://netzprobe.de/

Die Zahlen sind dokumentierte Modellannahmen aus öffentlichen Quellen. Sie sind als Orientierung gedacht, nicht als Prognose.

## Modelle

Modelle liegen unter `model/<domäne>/<id>/`:

- `last/` — historische Last und Sektor-Elektrifizierung
- `erzeugung/` — Erzeuger, historische Erzeugung, Einspeisefaktoren
- `speicher/` — Batterie, Pumpspeicher, H₂
- `aussenhandel/` — Strom- und H₂-Handel
- `presets/` — vorkonfigurierte Kombinationen
- `kern/` — Dispatch-Modell

Ein Modell enthält typischerweise `package.json` für Wiki/Metadaten/Daten, `model.rs` für Rust-Typen oder Modelllogik und bei großen Reihen `hours.json` oder `data.json`. Generatoren liegen kolokiert im jeweiligen Modell.

## Struktur

```txt
app/      React/Vite-UI
server/   Rust-API
model/    Modelle und Datensätze
test/     Vitest, Golden-Fälle, Szenario-Runner
bin/      lokale Kommandos
deploy/   Server-Deploy bleibt stabil
```

## Stack

- Frontend: React, TypeScript, Vite
- Simulation/API: Rust, Axum
- Tests: Vitest, Rust-Tests, Golden-Fälle, Szenario-Runner
- Daten: JSON-Modelle unter `model/`, lazy im Wiki und per Rust-Server eingebunden
