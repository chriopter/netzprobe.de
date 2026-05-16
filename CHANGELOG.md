# Änderungsverlauf

User-sichtbare Änderungen, händisch zusammengefasst. Neueste Einträge oben. Pflegehinweise in [AGENTS.md](AGENTS.md#changelog).

## 2026-05-16

- **Neue Sidebar-Sektion „Außenhandel":** Strom-Import-Cap, Strom-Export-Cap und H₂-Import sitzen jetzt zusammen in einem eigenen Bereich zwischen Erzeugung und Modell — vorher saß Strom unter Erzeugung und H₂ unter Last. URL-Parameter: `impGW`, `expGW`, `impEmis`, `h2ImpTWh`.
- **Wiki neu aufgebaut:** Aus dem Datenhandbuch wird das Wiki, mit klappbaren Domain-Sections (Last / Erzeugung / Speicher / Außenhandel / Presets / Modell), Icons pro Domäne, Eintrags-Counts und automatischem Auf-Klappen der aktiven Sektion. Übersichtsseite zeigt jetzt sechs Domain-Karten statt einer langen Liste.
- **Szenarien-Anpassungen:**
  - Neuer H2-Import-Schieberegler: importierter Wasserstoff reduziert proportional den inländischen Strombedarf der H2-konsumierenden Sektoren. Allokation nach Priorität — Flug (η 0,38) zuerst, dann Schiff (0,50), Chemie (0,55), Stahl (0,64); Quellen BMWK H2-Importstrategie und Ariadne.
  - Stahl: Schrott-EAF (4,9 TWh, AGEB 2023) wird jetzt vom Bruttobedarf abgezogen; vorher Doppelzählung mit `last-2025`.
  - Chemie/Schiff: System-Wirkungsgrade als Pflichtfelder `h2SystemEfficiency` (0,55) bzw. `eFuelSystemEfficiency` (0,50) — Strom→NH₃/MeOH/Olefine bzw. Strom→e-MeOH/e-NH₃.
  - Drei Neubau-CapacityFactor-Multiplikatoren (PV, Wind onshore, Wind offshore) korrigieren den auf `einspeisefaktoren-2025` gemittelten Bestandsfaktor auf reale 2045er-Anlagen — Default `1.0 / 1.0 / 1.8` (Offshore-VLH-Korrektur 15-MW-Nordsee-Klasse).
- Slider akzeptieren direkte Zahleneingabe statt nur Drag.
- Chart-Rendering im OffscreenCanvas-Worker — UI bleibt während der Simulation responsiv, kein Freeze mehr.
- Speicher-Füllstand mit Jahres-Warm-up kalibriert; Phantom-Spike am Jahresende behoben.
- Speicher- und CO₂-Szenarien gegen aktuelle Quellen neu validiert.
- `data/` nach Domänen gruppiert (`erzeugung/`, `last/`, `speicher/`, `aussenhandel/`, `presets/`, `kern/`); IDs ohne Prefix.

## 2026-05-15

- Echtes 2017er Bezugsjahr ergänzt; Last- und Erzeugungs-Jahr getrennt wählbar, historische Pills synchronisieren beide Jahre.
- Bausteine- und Preset-System für Erzeugung und Last, CO₂-Bilanz, Pill-basierte Szenario-Auswahl.
- e100-lkw um Transit/Kabotage und Nutzlast-Uplift erweitert; e100-heiz-JAZ-Spanne dokumentiert.
- Chart: Polar-Achse mit GW-Beschriftung, neue Legend-Toggles für Import/Last/Fehlend, Modus „Polar" umbenannt.
- Chart-Zeitraumfilter bei `loadYear = 2017` korrigiert.
- Deployment via Direkt-Webhook (statt GitHub Pages); Build-Info in der Sidebar.

<!-- last: e4bb6be -->
