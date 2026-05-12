# Datenregeln

- Jede öffentliche `.json`-Datendatei liegt in einem Fachordner (`last/`, `erzeugung/`, `modell/`).
- Jede Datendatei braucht eine gleichnamige `.description.json` im selben Ordner.
- `manifest.json` listet alle öffentlichen Datensätze in der gewünschten Reihenfolge und verweist auf die jeweilige Description-Datei.
- Dokumentiere immer: Zweck, Quelle, Zeitraum, Auflösung, Einheit, Felder und bekannte Grenzen.
- Ändere keine Feldnamen oder Pfade ohne Anpassung von App, Tests und Dokumentation.
- Texte bleiben deutsch, kurz und sachlich.
