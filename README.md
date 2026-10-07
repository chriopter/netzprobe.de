# Netzprobe

Kompakte Stromsystem-Simulation für Deutschland. Die React-App konfiguriert Last, Erzeugung, Speicher und Außenhandel; die Rust-API rechnet die stündliche Bilanz, Speicherstände, Abregelung, Import/Export und CO₂-Kennzahlen.

Live: https://netzprobe.de/

<img width="900" alt="image" src="https://github.com/user-attachments/assets/eff492eb-a29d-4d09-9619-3aca9ade93ac" />

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
```

## Stack

| Baustein | Zweck |
| --- | --- |
| React + TypeScript | Browser-UI, URL-State, Typen für Szenarien/API/Charts. |
| ECharts + Tailwind | Charts und Styling. |
| Rust + Axum | Simulation und HTTP-API (`/api/simulate`, `/api/status`), inkl. Serde/JSON und Tokio-Runtime. |
| Vite | Dev-Server, Build, `/api`-Proxy, Build-Commit, Kopieren von `model/` nach `dist/`. Läuft nicht in Produktion. |

Produktion: statische JS/CSS-Dateien im Browser und Rust-API.

## Webserver und Git

Arbeitskopie: `/home/web/sites/chriopter/netzprobe.de`, Branch `main`.
Änderungen entstehen auf dem Webserver und werden manuell zu GitHub gepusht:

```bash
cd /home/web/sites/chriopter/netzprobe.de
git status
git add <geänderte-dateien>
git commit
git push origin main
```

Vor einem Commit `npm test` und `npm run build` ausführen. Ohne lokale Node-/Rust-
Installation kann ein temporärer Docker-Builder verwendet werden. Zum bewussten
Bauen und Veröffentlichen lokaler Änderungen:

```bash
cd /home/web
./docker build-netzprobe
```

Dieser Befehl startet einen temporären Builder, führt Tests und Frontend-/Rust-Build
aus und startet die API neu. Er zieht oder pusht keine Git-Änderungen. Die
laufenden Webcontainer enthalten keine Build-Werkzeuge, Git-Schlüssel oder
Deployment-Worker. Jeder Git-Schlüssel liegt ausschließlich auf dem Host und hat
Schreibzugriff auf genau ein Repository.

Docker-Stack und Betriebsbefehle: `/home/web/compose.yaml` und `/home/web/docker`.
Die GitHub-CI prüft Tests und Builds; sie veröffentlicht nichts auf dem Webserver.
