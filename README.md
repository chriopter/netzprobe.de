# Netzprobe

Kompakte Stromsystem-Simulation für Deutschland. Die React-App konfiguriert Last, Erzeugung, Speicher und Außenhandel; die Rust-API rechnet die stündliche Bilanz, Speicherstände, Abregelung, Import/Export und CO₂-Kennzahlen.

Live: https://netzprobe.de/

Die Zahlen sind dokumentierte Modellannahmen aus öffentlichen Quellen. Sie sind als Orientierung gedacht, nicht als Prognose.

## Struktur

```txt
app/      React/Vite-UI
server/   Rust-API
model/    Modellpakete und Datensätze
test/     Vitest, Golden-Fälle, Szenario-Runner
bin/      lokale Kommandos
deploy/   Server-Deploy bleibt stabil
```

## Entwicklung

```bash
npm install
bin/dev       # Rust-API + Vite
bin/test      # Vitest + Rust-Tests + Szenario-Runner + Build
bin/update    # latest-Abhängigkeiten frisch auflösen und prüfen
```

Einzelne Gates:

```bash
npm test
npm run build
cargo test --manifest-path server/Cargo.toml
```

## Modellpakete

Pakete liegen unter `model/<domäne>/<id>/`:

- `last/` — historische Last und Sektor-Elektrifizierung
- `erzeugung/` — Erzeuger, historische Erzeugung, Einspeisefaktoren
- `speicher/` — Batterie, Pumpspeicher, H₂
- `aussenhandel/` — Strom- und H₂-Handel
- `presets/` — vorkonfigurierte Kombinationen
- `kern/` — Dispatch-Modell

Ein Paket enthält typischerweise `package.json` für Wiki/Metadaten/Daten, `model.rs` für Rust-Typen oder Paketlogik und bei großen Reihen `hours.json` oder `data.json`. Generatoren liegen kolokiert im jeweiligen Paket.

## Deploy

`deploy/` bleibt top-level, damit bestehende Serverpfade, Webhook, systemd und Caddy-Konfiguration stabil bleiben.
