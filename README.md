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

| Baustein | Zweck |
| --- | --- |
| React + TypeScript | Browser-UI, URL-State, Typen für Szenarien/API/Charts. |
| Vite | Dev-Server, Build, `/api`-Proxy, Build-Commit, Kopieren von `model/` nach `dist/`. Läuft nicht in Produktion. |
| ECharts + Tailwind | Charts und Styling. |
| Rust + Axum | Simulation und HTTP-API (`/api/simulate`, `/api/status`). |
| Serde + Tokio | JSON und async Netzwerkbetrieb im Rust-Server. |
| Caddy + systemd | TLS/Reverse Proxy und Prozessverwaltung auf dem Server. |
| Vitest + Rust-Tests | Lokale Tests und Deploy-Gate. |

Produktion: statische JS/CSS-Dateien im Browser, Rust-API hinter Caddy/systemd.
