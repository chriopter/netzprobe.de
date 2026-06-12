# Arbeitspakete Szenario-Prüfung — Panel-Runde 1 (2026-06-12)

**Panel:** 8 Fable-Experten · zufrieden: 3/8 · Synthese-Urteil: nicht zufrieden

## Gesamturteil

Das Panel ist gespalten: 4 von 8 Experten (speicher, ressourcen, studien/wiki, optimum) sind nicht zufrieden, 4 (kosten, flaeche, last, ressourcen-intern) bestätigen. Einhellig positiv: Die interne Konsistenz ist exzellent — praktisch alle Kosten-, Kapazitäts-, Flächen- und Rohstoffzahlen aller 5 Szenarien reproduzieren sich aus den Wiki-Parametern auf <1%, die Stresstest-Natur der Extremszenarien ist dokumentiert. Die harten Befunde liegen fast ausschließlich im Produkt (MODELL), nicht in der Prüfung: (1) der H2-Pool verwirft PtL-Verluste und unterschlägt ~159 TWh/a Strombedarf in beiden 100ee-Szenarien, (2) Brennstoffmengen werden aus fixen VLH statt simuliertem Dispatch gerechnet — die Headline '>100% der Welt-Uranförderung' ist ein Artefakt (real ~84%) und Erdgas in 2025-skaliert um 51% unterschätzt, (3) die Netzkosten-Heuristik kennt keinen lastgetriebenen Ausbau und verzerrt den Vergleich um 10-40 Mrd €/a zugunsten 100kern, (4) das noimport-Speicher-Preset bindet ~190 Mrd €/a in massiv überdimensionierter Kapazität. Der einzige echte REPORT-Fehler ist die MC-Kostenoptimierung: deren publizierter 'optimaler Mix' verletzt den eigenen 70-GW-Offshore-Cap, besteht den Windjahr-Stresstest nicht und braucht einen Re-Run — die Richtung (weniger PV, mehr Wind onshore, Einsparung eher 15-22% statt 23%) bleibt aber belastbar. Der Rest sind Caveat- und Doku-Nachzieher.

## Panel-Runde 2 (Nachprüfung)

Alle 5 in Runde 1 unzufriedenen Experten sind nach MC v2 + Arbeitspaket-Gruppierung **zufrieden (8/8)**. Verbleibende Nachzieher sind unten eingearbeitet. **Headline-Vorbehalt:** Einsparung 132 Mrd EUR/a (−24 %); davon 37.5 Mrd aus der (über 700 GW extrapolierten) Netzpauschale für 536 GW weniger EE-Zubau — ohne dieses Netz-Delta verbleiben 94 Mrd (−17 %). Beide Mixe liegen über der Eichgrenze; die Headline ist als Spanne −17 bis −24 % zu kommunizieren.

## Arbeitspakete

### AP01 [HOCH] (MODELL) H2-Pool verwirft PtL-/Synthese-Verluste — Strombedarf der 100ee-Szenarien ~9% zu klein
*Szenarien: 100ee-noimport, 100ee-import*

Die Engine rechnet den Sektor-Elektrolysestrom (740,4 TWh) in Final-Fuel-LHV (360 TWh) um und produziert diesen mit reiner Elektrolyse-Effizienz 0,62 — die in den eigenen Sektorpaketen dokumentierten PtL-Ketten (Flug ptlEfficiency 0,38, Schiff 0,50, Chemie 0,55, Stahl 0,64) werden ignoriert. Effektiv bedient das System nur 1.649 statt 1.808 TWh (−159 TWh, −8,8%); EE-Flotten und Kosten beider 100ee-Szenarien sind systematisch ~9-10% zu klein. Zusätzlich ersetzt der H2-Import (130 €/MWh, grüner H2) de facto Kerosin/Methanol mit PtL-Importpreisen von eher 180-250 €/MWh — die 46,8 Mrd €/a Importkosten sind unterschätzt.

- [ ] In model/kern/kern/model.rs (preset_100ee_*): Pool-Bedarf als H2-Zwischenprodukt rechnen (z.B. Kerosin 114 TWh → ~150 TWh H2 + DAC/Synthese-Strom als Direktlast) oder die sektorspezifischen strom_per_h2-Hebel auch beim Pool-Charging anwenden
- [ ] h2ImportEurPerMWh nach Produkt (H2 vs. PtL-Fuels) differenzieren oder als Caveat ausweisen
- [ ] Wiki-Pakete kern und 100ee-noimport/-import nachziehen
- [ ] Anschließend EE-Flotten, Speicher-Sizing und Kosten beider 100ee-Szenarien neu kalibrieren (hängt mit Speicher- und MC-Paketen zusammen)

### AP02 [HOCH] (MODELL) Brennstoffmengen aus fixen Volllaststunden statt simuliertem Dispatch (Uran-Headline kippt, Erdgas −51%)
*Szenarien: 100kern-lastfolgend, 2025-skaliert*

app/src/ui/ressourcen.ts rechnet Brennstoffmassen mit fixen VLH (Kohle 3000, Gas 1500, Kernkraft 7500), die nur das Referenzszenario kalibrieren. Folge 1: Uran im Kernkraft-Szenario 62.438 t/a (Nameplate 333 GW × 7,5 TWh/GW) statt dispatch-basiert ~50.700 t/a (+23%) — die symbolträchtige Aussage '103,7% der Welt-Uranförderung' ist ein Artefakt (real ~84%) und widerspricht dem eigenen Wiki-Caveat sowie den Brennstoffkosten (46,6 Mrd / 22,9 €/MWh ≈ 2.035 TWh). Folge 2: Erdgas in 2025-skaliert 31,5 statt ~64,5 Mt/a (−51%), weil die Simulation 430,2 statt 210 TWh Gas dispatcht.

- [ ] Brennstoffmassen aus der simulierten Erzeugung (Σ TWh je Tech aus result.hours) statt fixer VLH rechnen — die Kalibrierung des Referenzszenarios bleibt dabei automatisch erhalten
- [ ] Uran konsumbasiert auf dispatchte Erzeugung (Last + Export ≈ 2.027 TWh) umstellen; VLH-Inkonsistenz 7,5 vs. referenceYield 7,6 bereinigen
- [ ] Erstkern-Beladungen beim Flottenaufbau (~8-13 kt/a über 20a) als Caveat im Kernkraft-Wiki dokumentieren

### AP03 [HOCH] (MODELL) Netzkosten-Heuristik: lastgetriebener Ausbau fehlt, technologie-flache Pauschale, Extrapolation
*Szenarien: 100kern-lastfolgend, 2025-skaliert, 100ee-noimport, 100ee-import*

Die Netzformel (1200 €/kW × EE-Zubau über 174,7 GW) ist rein EE-getrieben: 100kern bekommt netz=0 Mrd €/a, obwohl die Peak-Last von 75,6 auf 302,4 GW vervierfacht — die Eich-Anker (IMK ~651 Mrd, DIHK ~1,2 Bio) enthalten aber lastgetriebenen Verteilnetzausbau (E-Mobilität, Wärmepumpen), der in jedem e100-Szenario anfällt. Das verzerrt den Vergleich um grob 10-40 Mrd €/a zugunsten Kernkraft. Zudem bepreist die Flatrate PV (~100 €/MWh Netzaufschlag bei 702 VLh) und Wind (~44 €/MWh) identisch pro kW, und beide 100ee-Szenarien liegen mit 1.890 bzw. 1.060 GW weit über der 700-GW-Eichgrenze (korrekt geflaggt, implizit 2,27 Bio € Netz-Capex im noimport-Fall).

- [ ] Lastgetriebenen Netz-Term (€/kW Peak-Last-Zuwachs) ergänzen — oder in Caveats/UI explizit ausweisen, dass netz=0 im Kernkraft-Szenario den Vergleich verzerrt
- [ ] Netz-Heuristik mittelfristig nach Technologie differenzieren (PV+Batterie verteilnetznah vs. Nord-Süd-Wind)
- [ ] Im UI bei netzExtrapoliert=true die implizite Gesamtsumme (Bio €) neben dem Flag anzeigen

### AP04 [HOCH] (MODELL) Speicher-Preset 100ee-noimport massiv überdimensioniert (~190 Mrd €/a gebunden)
*Szenarien: 100ee-noimport*

Drei Komponenten gleichzeitig über Bedarf: Die 180-TWh-Kaverne wird zu 57% nie angefasst (SoC-Minimum 102,8 TWh, genutzter Hub ~77 TWh = exakt der Studienkorridor 70-80 TWh; ~50 Mrd € toter Invest); 245 GW Rückverstromung übersteigen die Spitzenlast (217,9 GW) bei nur 94 VLh (~270 Mrd € Invest) — der Wiki-Claim '500-1.500 VLh' wird um Faktor 5-16 verfehlt; 3.300 GWh Batterie erreichen nur 31,5 Vollzyklen (~975 €/MWh durchgeleitete Energie, 101,2 Mrd €/a). Zusammen ~190 Mrd €/a Speicherkosten, die den Kostenvergleich des Szenarios verzerren; zum Vergleich ist 100ee-import speicherseitig gesund (94,2 Zyklen, 80% Hub).

- [ ] h2EnergyGWh von 180.000 auf ~80.000-100.000 senken; Rückverstromung auf die maximale Residuallast-Lücke nach Batterie-Dispatch dimensionieren (~80-150 GW); Batterie Richtung 1.000-1.500 GWh prüfen
- [ ] Wiki korrigieren: VLh-Claim im reasoning streichen/anpassen, 'Lasttest-validiert' als 'reicht aus' (Obergrenze mit Wetterjahr-Reserve), nicht 'nötig' kennzeichnen
- [ ] Final erst nach Entscheidung der Chemie-Default-Frage (440 vs. 685 TWh, Rollback auf 440 empfohlen) und nach der PtL-Korrektur kalibrieren — beide ändern den H2-Pool-Bedarf
- [ ] Alternativ im Bericht ausweisen, dass das noimport-Preset bewusst nicht kostenoptimiert ist
- [ ] Zielkorridor aus MC v2 (schwachwind-robust) übernehmen: H₂ ~110–115 TWh, Rückverstromung ~190–200 GW, Batterie ~1.600 GWh — die statischen Runde-1-Ranges (80–100 TWh / 80–150 GW) fallen beim ×0,85-Test durch.


### AP05 [HOCH] (REPORT) MC-Kostenoptimierung: Offshore-Cap verletzt, Windjahr-Stresstest fehlt, Export-Bug im Harness
*Szenarien: 100ee-noimport*

Der publizierte 'optimale Mix' (23% Einsparung) ist so nicht übernehmbar: Das Sampling erlaubt WindOff×[1,0-1,6] und der Headline-Mix nutzt 100 GW Offshore — +43% über dem im Wiki dokumentierten Hard Cap von 70 GW (BSH FEP). Der Robustheits-Constraint 'Windjahr ×0,85' fehlt: Zwei der drei billigsten Mixe fallen bereits bei ×0,90 mit 80-110 TWh Fehlstrom durch. Zudem greift der Export-Erlös in 0 von 260 Samples (export.stromGW=0 statt 25 im Harness), und ~36% der Einsparung (44,9 von 125,5 Mrd €/a) stammen aus der weit über den Eichbereich extrapolierten Netzpauschale. Die Richtung (weniger PV, mehr Wind onshore — stellt das eigene Heide-70/30-Ziel wieder her) ist belastbar; realistisch sind ~100-120 Mrd €/a (18-22%), ohne Netz-Delta ~80 Mrd (15%).

- [ ] Re-Run: WindOff fix 70 GW (keine Sampling-Dimension), scen['export']={'stromGW':25} setzen, Constraint 0 h Fehlstrom bei Windjahr ×1,0 UND ×0,85; Kandidaten mit Abregelung ≈ 0 als Auf-Kante-Artefakte verwerfen
- [ ] Einsparpotenzial als Spanne mit/ohne Netz-Delta kommunizieren
- [ ] Preset nicht 1:1 auf den MC-Mix setzen, sondern die Kompensationsregel ändern (Offshore-Cap-Shortfall über WindOn statt PV decken) und danach Cushion/Speicher neu lasttest-kalibrieren
- [ ] Bei Verschiebung auf ~900 GW WindOn die Folgewirkungen ausweisen (Vorrangfläche ~2,8% statt 1,6% DE-Fläche, ~43 GW/a Baurate)
- [ ] Abhängigkeit von AP01 explizit: PtL-Korrektur (+159 TWh) verschiebt das Optimum — danach Re-Run.
- [ ] Folgewirkung Rohstoffe bei Wind-Shift ausweisen (weniger Si/Ag, mehr Nd/Cu/Stahl).
- [ ] H₂-Lade-/Entladeleistung entkoppelt sampeln (E/P-Kopplung in v2 fix).


### AP06 [HOCH] (MODELL) Wind-Onshore-Flächen: 'Vorrangfläche'-Label falsch, Potenzial-Caveat fehlt
*Szenarien: 100ee-noimport, 100ee-import*

windon trägt wirkungKm2PerGW=1 mit kategorie='Vorrangfläche' — das ist aber eine Direktflächen-Konvention (Fundament, Kranstellfläche); echte Vorrang-/Eignungsgebietsdichte liegt bei 20-25 MW/km² (~45-62 km²/GW). 515 GW erscheinen so als 515 km², unter Vorrangflächen-Accounting wären es ~20.000-26.000 km² (5,8-7,2% der Landesfläche) — das würde die Szenariosumme verdoppeln und das Flächen-Ranking gegen 2025-skaliert (31.581 km²) umkehren. Zudem überschreiten 515 GW das 2%-Flächenpotenzial (~200-250 GW) deutlich; das Wiki diskutiert nur die PV-Fläche, nicht die Onshore-Machbarkeit.

- [ ] kategorie in 'direkte Inanspruchnahme' umbenennen und im Wiki/UI klarstellen, dass Wind-Vorrangfläche bewusst nicht gezählt wird (landwirtschaftlich weiter nutzbar) — oder zusätzliche Kennzahl 'Planungsfläche' ausweisen
- [ ] Onshore-Flächen-/Machbarkeits-Caveat analog zum PV-Caveat in den 100ee-Preset-Wikis ergänzen

### AP07 [MITTEL] (MODELL) Renewal-Faktor fehlt bei e100-Beständen (EV-Rohstoffe 30-50% unterschätzt)
*Szenarien: 100ee-noimport, 100ee-import, 100kern-lastfolgend, 2025-skaliert*

Inkonsistente Erneuerungslogik in ressourcen.ts: Grid-Batterien erhalten den Renewal-Faktor max(1, 20a/15a)=1,33, die e100-Sektorbestände (Pkw/Lkw/Wärmepumpen) werden ohne Faktor als Bestand/20a annualisiert, obwohl EV-Batterien nur ~12-15a halten. Pkw-getriebene Mengen (Li 12,7, Co 12,7, Ni 58, Cu 129 kt/a im noimport-Fall) sind dadurch ~30-50% unterschätzt; Lithium gesamt läge bei ~42-44 statt 36,7 kt/a (~18% statt 15,3% der Weltförderung).

- [ ] Renewal-Faktor auch auf E100_SECTORS anwenden (app/src/ui/ressourcen.ts Z. 86-95; Pkw/Lkw ~13-15a, WP ~18-20a) — oder die Auslassung als Caveat dokumentieren

### AP08 [MITTEL] (MODELL) H2-Pool-Flexibilität asymmetrisch: Nicht-EE-Szenarien tragen starre 84,5-GW-Flachlast
*Szenarien: 100kern-lastfolgend, 2025-skaliert*

Die 740,4 TWh Sektor-Elektrolysestrom laufen nur in den EE-Szenarien als flexibler H2-Pool (Peak 217,9 GW); in 100kern und 2025-skaliert als starre Flachlast von 84,5 GW (Peak 302,4 GW). Im Kern-Szenario treibt das die Auslegung auf 333 GW und 597,5 TWh Lastfolge-Drosselung — mit flexibler Elektrolyse wäre die nötige Kapazität deutlich kleiner. Das Kern-Wiki dokumentiert 'kein H2-Speicher' als Setzung, benennt aber die methodische Benachteiligung gegenüber den EE-Varianten nicht. Wirkt gegenläufig zur Netz-Verzerrung (Paket Netzkosten), hebt sie aber nicht sauber auf.

- [ ] H2-Pool szenarioübergreifend einheitlich aktivieren — oder im 100kern-Caveat ergänzen, dass flexible Sektor-Elektrolyse den Peak auf ~218 GW senken würde

### AP09 [MITTEL] (MODELL) PV-Ertragsbasis inkonsistent: 683 VLH (Flotte 2025) vs. 0,95 TWh/GWa (PV-Paket), Multiplier 1,0
*Szenarien: 100ee-noimport, 100ee-import, referenz-2025, 2025-skaliert*

Die Simulation nutzt ~683-702 VLH PV (Energy-Charts-Profil exkl. Eigenverbrauch, inkl. Abregelung), das PV-Paket dokumentiert aber referenceYield 0,95 TWh/GWa (+39%); reales Flottenmittel ~850-1000 kWh/kWp. Folge: PV-€/MWh um ~20-30% überzeichnet (121-146 statt ~85-110), propagiert in die 1.480-GW-Auslegung und die 548 Mrd des noimport-Szenarios. Zudem setzen die 2045-Presets capacityFactorMultiplier 1,0 (Bestand), obwohl das kern-Wiki 1,5/1,4/1,2 für Neubau empfiehlt — mit Neubau-Erträgen wären ~30% weniger GW nötig. Konservatives Design, aber nicht ausgewiesen.

- [ ] Diskrepanz zwischen model/erzeugung/einspeisefaktoren-2025 und model/erzeugung/pv auflösen (auf Bruttoerzeugung inkl. Eigenverbrauch normieren) oder im Kosten-Caveat nennen
- [ ] Die Multiplier-1,0-Entscheidung (Bestandsertrag statt 2045-Neubau) im Preset-Wiki dokumentieren

### AP10 [MITTEL] (MODELL) Flächenfaktor-Pauschalen: Kohle-Tagebau auf Mischflotte, PV-Flottenmix bei Extremausbau
*Szenarien: 2025-skaliert, 100ee-noimport*

vorFlaeche kohle (22 km²/GW, typ 'Tagebau Braunkohle', land DE) wird auf die gesamte Kohleflotte angewendet, obwohl nur ~half Braunkohle ist — DE-Inland um Faktor 1,5-2 überzeichnet (2.640 km² 'DE-Tagebau' für 120 GW Mischflotte in 2025-skaliert), Steinkohle-Vorfläche im Ausland fehlt dafür ganz. PV wirkungKm2PerGW=6 ('Flottenmix Aufdach+Freifläche') wird konstant bis 1.480 GW extrapoliert, obwohl das Aufdach-Potenzial (~300-1.000 GW) den Mix dann nicht mehr trägt — Unterschätzung ~25-35% (~11.800 statt 8.880 km²). Biomasse (22.800 km² bei 19 GW) ist dagegen konsistent und eher untere Kante.

- [ ] Kohle-vorFlaeche nach Braun-/Steinkohle splitten oder als flottengewichteten DE/Ausland-Mix dokumentieren
- [ ] PV-Caveat ergänzen: Flottenmix-Faktor gilt nur bis ~2× heutiger Aufdach-Ausschöpfung, darüber Freiflächen-Faktor (~12 km²/GW)

### AP11 [MITTEL] (MODELL) CO2-Kennzahl: Nenner zwischen Szenarien inkonsistent, Lifecycle-Anteil ungelabelt
*Szenarien: 100ee-noimport, 100ee-import, referenz-2025, 100kern-lastfolgend, 2025-skaliert*

Die dokumentierte Formel ('CO2 / Strom-Nachfrage') reproduziert nur 2 von 5 Szenarien: Die impliziten Nenner sind referenz 478,6 TWh (Last+Export), 100kern 2.025 TWh, 2025-skaliert 1.828 TWh — aber 100ee-noimport 1.767 TWh entspricht weder Stromlast (1.067,6 → erwartet 46,2 statt 27,9 g/kWh, Faktor 1,65) noch Sektornachfrage (1.807,9). g/kWh-Vergleiche zwischen Szenarien sind so irreführend. Zudem enthalten die Werte Lebenszyklus-Emissionen (Kernkraft 12 g/kWh, 100ee 37-49 Mt statt Studien-'0'), ohne dass dies gekennzeichnet ist.

- [ ] Nenner vereinheitlichen (konsequent Stromnachfrage oder Last+Export) und im kern-Wiki exakt dokumentieren
- [ ] CO2-Kennzahl im Report/UI als 'inkl. Lebenszyklus' labeln

### AP12 [MITTEL] (MODELL) Kostenparameter am Rand der Literaturspanne (Batterie-Capex, Kernbrennstoff, Laufwasser)
*Szenarien: 100ee-noimport, 100ee-import, 100kern-lastfolgend, referenz-2025*

Drei Preisannahmen verdienen Quellen-/Spannenarbeit: Batterie 280 €/kWh ohne Lernkurve über den 20a-Horizont ist obere Kante (heute ~200-300 €/kWh, stark fallend) — bei 101,2 Mrd €/a zweitgrößter Posten des noimport-Szenarios, Spielraum 20-40% nach unten. Kernbrennstoff 22,9 €/MWh_el liegt ~2× über der WNA/NEA-Spanne (9-13, nach Preisanstiegen oberes Ende 15-19 vertretbar) — wirkt mit ~+12 €/MWh auf die 120,4 €/MWh des Kern-Szenarios (fuel 46,6 Mrd €/a). Laufwasser impliziert 26,7 TWh bei 4,8 GW (63% CF) statt real ~17-19 TWh — €/MWh zu günstig ausgewiesen (52,5 statt ~70-80), Kostenwirkung minimal.

- [ ] Lernkurven-Caveat bzw. Spanne im Batterie-Paket ergänzen — der Parameter dominiert die Differenz zwischen den 100ee-Varianten
- [ ] Quellenherleitung für 22,9 €/MWh_el dokumentieren (inkl./exkl. Rückbau- und Endlagerprovision) oder Richtung 10-15 €/MWh korrigieren
- [ ] Laufwasser-Ertragsbasis auf reale ~17-19 TWh kalibrieren
- [ ] Elektrolyse-Capex prüfen: 1.500 €/kW im Modell vs. Studienpfade 2045 ~300–700 €/kW (vierter Spannen-Punkt).


### AP13 [MITTEL] (MODELL) Referenz-Dispatch ohne Marktarbitrage unterschätzt reale Speichernutzung drastisch
*Szenarien: referenz-2025*

Der Greedy-Residuallast-Dispatch kennt keine Spotmarkt-Arbitrage: Pumpspeicher entladen 0,09 statt real ~8-10 TWh/a (Faktor ~100, weil Batterie mit Priorität 1 den Tageshub schluckt), Batterien fahren 86,5 statt real ~250-350 äquivalente Vollzyklen. Im Modellrahmen konsistent und der Greedy-Dispatch ist dokumentiert, aber der Referenz-Bericht wirkt ohne Hinweis wie ein Bug.

- [ ] Caveat im pumpspeicher-Paket: 'Modell bildet keine Marktarbitrage ab; reale PSW-Erzeugung (~10 TWh/a) wird im Referenzszenario um Faktor ~100 unterschätzt'
- [ ] Analogen Hinweis im Batterie-Caveat ergänzen

### AP14 [MITTEL] (MODELL) Endkundenpreis-Brücke ~12% unter realem BDEW-Niveau
*Szenarien: referenz-2025, 100ee-noimport, 100ee-import, 100kern-lastfolgend, 2025-skaliert*

Der Referenz-Endkundenpreis (35,4 ct/kWh, 88,6 €/Monat) liegt ~12-13% unter BDEW (~40-41 ct, ~100-103 €/Monat bei 3.000 kWh) — außerhalb der ±10%-Toleranz. Die Brücke rechnet intern exakt; Ursache ist Energie+Vertrieb kostenbasiert ~12,5 ct vs. BDEW Beschaffung+Vertrieb 16,0 ct (Markt+Marge). Da alle Szenario-€/Monat-Werte aufsetzen, sind die absoluten Niveaus systematisch ~10% zu niedrig; die Szenario-Vergleiche untereinander bleiben gültig.

- [ ] Vertriebs-/Beschaffungsmarge so kalibrieren, dass die Referenz bei ~100 €/Monat landet — oder die bewusste Abweichung (kostenbasiert ab Werk statt Marktpreis) als Caveat in der Haushalts-Box ausweisen

### AP15 [MITTEL] (MODELL) Wiki-/Anzeige-Nachzieher: veraltete Handelszahlen, EV/WP-Split, Export-am-Cap-Hinweis, hubPct
*Szenarien: referenz-2025, 100kern-lastfolgend*

Mehrere Text-/Anzeige-Inkonsistenzen ohne Rechenfehler dahinter: Das kern-Wiki nennt für den Default-Lauf 76 TWh Import / ~3 TWh Export, der Bericht zeigt 54 / 12,2 TWh (zudem Nettoimport 41,8 vs. real ~25-30 TWh als bekannter Kupferplatten-Bias). Der preise-Wiki-Text nennt +2.600/+2.900 kWh für EV/WP, aus den Parametern folgen 2.200/3.540. 100kern exportiert exakt 25 GW × 8.760 h = 218,9 TWh dauerhaft am Cap — die Erlösgutschrift von −13,1 Mrd €/a (Obergrenze laut eigenem Caveat, ohne sie ~245 statt 231,6 Mrd) ist im Bericht nicht sichtbar. Beim PSW in 100kern suggeriert hubPct 83,3% Nutzung, obwohl Vollzyklen=0 (einmalige Erstbefüllung).

- [ ] kern-Wiki-Kennzahlen auf 54/12,2 TWh aktualisieren und den Netto-Bias der Handelsbilanz als Caveat quantifizieren
- [ ] EV/WP-Beispielzahlen im preise-Wiki auf 2.200/3.540 korrigieren
- [ ] Bericht/UI: Hinweis-Flag analog netzExtrapoliert, wenn Export dauerhaft am Cap läuft
- [ ] hubPct bei Vollzyklen ≈ 0 ausblenden oder als 'Erstbefüllung' kennzeichnen

### AP16 [NIEDRIG] (MODELL) Einordnungs-Caveats: Polysilizium-Markt, grauer H2-Bestandsmarkt, gesamtBis2045-Label, Kernkraft-Standorte
*Szenarien: 100ee-noimport, 100ee-import, 100kern-lastfolgend*

Bündel korrekt gerechneter, aber missverständlich eingeordneter Kennzahlen: PV-Silizium wird mit veralteter Intensität (3.950 statt ~2.000-2.500 t/GW) gegen die Gesamt-Si-Produktion (8,5 Mt inkl. Ferrosilizium) gestellt — am relevanten Polysilizium-Markt (~1,6-2 Mt/a) wären es ~15-18% statt 3,4% (netto etwa neutral, aber undokumentiert). Die H2-Import-Einordnung '11,1% der Weltproduktion' nutzt 97 Mt grauen, captive Bestandsmarkt — ein handelbarer grüner Markt dieser Größe existiert nicht. gesamtBis2045 (z.B. 10.961 Mrd autark) sind Vollkosten × 20, nicht mit Studien-'Mehrinvestitionen' (1-2 Bio €) vergleichbar; die Referenz enthält zudem keine fossilen Endenergiekosten (~70-90 Mrd €/a). Bei 333 GW Kernkraft wäre Kühlwasser/Standortverfügbarkeit die bindende Restriktion, nicht Fläche.

- [ ] Caveats in pv-/weltfoerderung-Wiki (Polysilizium vs. Gesamt-Si, sinkender Intensitätstrend) und beim H2-Importvergleich ergänzen
- [ ] Im UI/Wiki klarstellen, dass gesamtBis2045 Systemvollkosten × Horizont sind und die Referenzbasis keine fossilen Kosten der nicht-elektrifizierten Sektoren enthält
- [ ] Optionaler Caveat zur Standort-/Kühlwasserfrage bei extremen Kernkraft-Kapazitäten
