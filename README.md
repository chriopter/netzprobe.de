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

| Baustein | Rolle | Wofür konkret | Läuft in Produktion? |
| --- | --- | --- | --- |
| React | UI-Library | Sidebar, Slider, Tabs, Wiki, Status, Chart-Flächen und UI-State. | Ja, als gebündeltes Browser-JS. |
| TypeScript | Typgeprüfter Browser-Code | URL-State, `Scenario`, API-Antworten, Chart-Datenformen und UI-Logik prüfen. | Ja, nach Build als JavaScript. |
| Vite | Build- und Dev-Werkzeug | Dev-Server mit `/api`-Proxy, React/TS-Bundling, `__BUILD_COMMIT__`, Changelog-Daten und Kopieren von `model/` nach `dist/`. | Nein, nur Build/Dev; ausgeliefert werden statische Dateien. |
| ECharts | Chart-Library | Polar- und Liniencharts rendern. | Ja, im Browser-Bundle. |
| Tailwind CSS | Styling | Kompakte Utility-Klassen für Layout, Farben, Abstände und Zustände. | Ja, als generierte CSS-Datei. |
| Rust | Simulation und API | Stündliche Systembilanz, Speicherdispatch, Preset-Auflösung, KPI-Berechnung. | Ja, als `netzprobe-api`-Binary. |
| Axum | Rust HTTP-Server | `/api/simulate`, `/api/resolve`, `/api/status`, `/api/health`. | Ja, im API-Binary. |
| Serde/JSON | Datenformat | Modellpakete lesen, API-Requests/-Responses serialisieren. | Ja, im API-Binary. |
| Tokio | Async-Runtime | Netzwerkbetrieb für Axum. | Ja, im API-Binary. |
| Caddy | Reverse Proxy | TLS, SPA-Fallback, `/api/*` zur Rust-API weiterleiten. | Ja, auf dem Server. |
| systemd | Prozessverwaltung | Rust-API und Deploy-Job starten/restarten. | Ja, auf dem Server. |
| Vitest/Rust-Tests | Qualitätssicherung | UI-/Manifest-Tests, Rust-Parity, Golden-Fälle. | Nein, nur lokal/Deploy-Gate. |

Kurz: Vite baut und serviert lokal, React rendert die Browser-App, TypeScript typisiert den Browser-Code. In Produktion laufen statische JS/CSS-Dateien im Browser, die Rust-API hinter Caddy und systemd.
