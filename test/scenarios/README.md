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
```

Der Runner gibt für jedes Szenario alle Summary-KPIs aus und vergleicht mit
den `Erwartete Ergebnisse`-Werten (best-effort string-matching).


## Stand-Hinweis (Juni 2026)

Die Erwartungsbereiche der 20 Szenario-Dateien stammen vom Mai 2026. Ein
beschriebener Runner (`run.mjs`) wurde nie gebaut — die Dateien sind reine
Planungs-/Erwartungsnotizen, kein CI-Test. Das Juni-2026-Audit hat mehrere
Definitionen geändert, auf die sich die Bereiche beziehen:

- `co2GperKWh` teilt jetzt durch die **versorgte Nachfrage** (Stromlast −
  Lastabwurf + H₂-Pool-Äquivalent + Export) statt Erzeugung+Import — Werte
  verschieben sich um bis zu ±30 %.
- Der Netzkosten-Posten hat einen zweiten, **lastgetriebenen Term**
  (1.000 €/kW EE-Zubau + 1.200 €/kW Peak-Zuwachs statt 1.200 €/kW EE-only).
- Der H₂-Pool führt echtes **H₂-Zwischenprodukt** (Synthese-Verluste
  H₂-seitig) — die 100ee-Presets sind ~10 % größer als bei Erstellung.
- 100ee-noimport wurde **MC-rekalibriert** (PV 980 / WindOn 885 / WindOff 70
  GW; Kaverne 115 TWh, Batterie 1.800 GWh / 210 GW, Rückverstromung 210 GW).
- Laufwasser liefert mit korrigierter availability **0,457** (~19 TWh/a)
  statt fälschlich 0,63 (~26 TWh/a).

Die ausführbaren Checks (`netz-check.mjs`, `abregelung-check.mjs`) sind auf
dem aktuellen Stand; die Markdown-Erwartungen bis zur nächsten inhaltlichen
Überarbeitung nur als historische Richtwerte lesen.
