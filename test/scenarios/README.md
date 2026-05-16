# Szenario-Test-Suite

Jede `.md`-Datei in diesem Ordner beschreibt ein vollständiges Szenario in
einem strukturierten Format, das vom Test-Runner `run.mjs` geladen und gegen
das Netzprobe-Kernmodell gerechnet wird.

## Format

Jede Datei hat genau diese Abschnitte:

```markdown
# Titel (Pflicht)

## Kurzbeschreibung
1-2 Sätze worum es geht.

## Quellen
- Studie 1 (Link)
- Studie 2 (Link)

## Szenario-Definition
```json
{
  "supplyPreset": "custom",
  "loadYear": 2025,
  "demand": { ... },
  "generation": { ... },
  "storage": { ... }
}
```

## Erwartete Ergebnisse
- `totalDemandTWh` zwischen X und Y (Begründung)
- `renewableSharePct` ≥ Z %
- `loadSheddingTWh` ≤ W
- usw.

## Bekannte Modell-Limits
Optional: bekannte Vereinfachungen.
```

## Ausführung

```bash
node test/scenarios/run.mjs                    # alle Szenarien
node test/scenarios/run.mjs 01-                # nur Szenario 01
```

Der Runner gibt für jedes Szenario alle Summary-KPIs aus und vergleicht mit
den `Erwartete Ergebnisse`-Werten (best-effort string-matching).
