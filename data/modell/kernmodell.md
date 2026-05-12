# Kernmodell

- Verwendung: stündliche Bilanz der Simulation.
- Zeitschritt: 1 Stunde.
- Last: historische Last plus aktive Zusatzlasten.
- Erzeugung: historische Energy-Charts-Erzeugung bleibt fix.
- Ausgleich: kein Dispatch, kein Speicher, kein zusätzlicher Import.
- Defizit: wird als Unterdeckung gezählt.
- Überschuss: wird als Abregelung gezählt.
- Code: `src/simulation/engine.ts`.

## Felder

- `id` — technische Kennung.
- `title` — Name des Modellbausteins.
- `source` — Ursprung der Modelllogik.
- `code` — zentrale Implementierung.
- `timeStep` — zeitliche Auflösung.
- `generationMode` — Behandlung der Erzeugung.
- `balanceMode` — Behandlung von Defizit und Überschuss.
- `notes` — Kurznotizen zur Rechenlogik.
