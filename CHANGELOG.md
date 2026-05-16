# Änderungsverlauf

User-sichtbare Änderungen, händisch zusammengefasst. Neueste Einträge oben. Pflegehinweise in [AGENTS.md](AGENTS.md#changelog).

## 2026-05-16

- H2-Import als eigener Slider, Allokation nach Wirkungsgrad (Flug→Schiff→Chemie→Stahl); neue Kategorie Außenhandel.
- Stahl-Schrott-Einschmelzung wird nicht mehr doppelt mit der Bestandslast verrechnet.
- Chemie- und Schiff-H2-Wirkungsgrad als eigene Felder korrigiert (0,55 / 0,50).
- Wind- und PV-Neubau mit eigenem Capacity-Faktor; Bestandsdurchschnitt deckte 2045er-Anlagen nicht.
- Charts laufen im OffscreenCanvas-Worker; UI bleibt responsiv, Slider akzeptieren Zahleneingabe.

## 2026-05-15

- Echtes 2017er Bezugsjahr; Last- und Erzeugungs-Jahr getrennt wählbar, historische Pills synchron.
- Bausteine- und Preset-System für Erzeugung und Last; CO₂-Bilanz, Pill-basierte Szenario-Auswahl.
- e100-lkw um Transit/Kabotage und Nutzlast-Uplift erweitert; e100-heiz-JAZ-Spanne dokumentiert.
- Chart: Polar-Achse mit GW-Beschriftung, neue Legend-Toggles, Modus „Polar" umbenannt; Zeitraumfilter `loadYear=2017` gefixt.
- Deployment via Direkt-Webhook (statt GitHub Pages); Build-Info in der Sidebar.

<!-- last: e4bb6be -->
