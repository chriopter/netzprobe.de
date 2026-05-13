# AGENTS.md

## Code

- Code, filenames, types, tests, and technical identifiers stay in English.
- User-facing UI text, README and dataset descriptions stay in German.
- Keep the app small: simple React/Vite structure, simulation logic separate from UI.
- Start development with `npm install`, then `npm run dev`.
- Before committing, run `npm test` and `npm run build`.
- Release by running `npm run build` and serving `dist/` as static files.

## Daten (`data/`)

- Jede öffentliche `.json`-Datendatei liegt in einem Fachordner (`data/last/`, `data/erzeugung/`, `data/modell/`).
- Jede Datendatei braucht eine gleichnamige `.description.json` im selben Ordner.
- `data/manifest.json` listet alle öffentlichen Datensätze in der gewünschten Reihenfolge und verweist auf die jeweilige Description-Datei.
- Dokumentiere immer: Zweck, Quelle (`sourceUrls`), Zeitraum, Auflösung, Einheit, Felder und bekannte Grenzen.
- Reproduzierbare Datensätze haben ein `generate-*.mjs`-Skript im selben Ordner; nach Parameter-Änderung das Skript ausführen und die JSON neu schreiben.
- Ändere keine Feldnamen oder Pfade ohne Anpassung von App, Tests und Dokumentation.
- Daten-Texte bleiben deutsch, kurz und sachlich.

## Dokumentation

- Nur eine `README.md` und eine `AGENTS.md` auf Top-Level. Keine geschachtelten Doku-Dateien in Unterordnern.
