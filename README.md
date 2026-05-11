# Stromlabor Deutschland

KISS-Stromsimulation für Deutschland: **statisch hostbar**, keine Accounts, keine Datenbank, keine Laufzeit-API.

## Start

```bash
npm install
npm run dev
```

## Build für eigenen Webserver

```bash
npm run build
```

Danach den Ordner `dist/` per Nginx/Caddy/Apache ausliefern.

## Struktur

```txt
public/data/          # normalisierte Quelldaten + Quellenliste
src/data/             # Datentypen und Loader
src/scenarios/        # Szenarien und Presets
src/simulation/       # reine Simulationslogik, ohne UI
src/ui/               # React-Oberfläche, Charts, Styling
src/__tests__/        # Vitest-Tests für den Simulationskern
```

## Quellen / Plausibilität

Die 8760-Stunden-Daten wurden aus `MTGermany/energy-simulation-de` normalisiert. Größenordnungen wurden gegen Energy-Charts/Fraunhofer ISE, Bundesnetzagentur, UBA, SMARD, DWD und ERA5 eingeordnet; siehe `public/data/sources.json`.

## Ziel

Schnelles öffentliches Stromlabor: Szenario einstellen, Jahresbilanz sehen, Dunkelflaute/Abregelung/CO₂ bewerten, Link teilen.
