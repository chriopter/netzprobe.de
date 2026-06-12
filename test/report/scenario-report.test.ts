import { describe, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { computeHaushalt, computeKosten } from '../../app/src/ui/kosten';
import { annualByMaterial, fuelTWhFromResult, groupSums } from '../../app/src/ui/ressourcen';
import { e100ElectricTWh, householdElectrificationTWh } from '../../app/src/ui/ScenarioSidebar';
import { flaecheRows } from '../../app/src/ui/sections/FlaecheSection';
import type { Scenario } from '../../app/src/types/scenario';
import type { SimulationResult } from '../../app/src/types/simulation';
import type { DataSet } from '../../app/src/types/data';
import { e100Bahn, e100Ghd, e100Heiz, e100Lkw, e100Pkw } from '../unit/modelTestData';

// Einmal-Generator: rechnet die Pruef-Szenarien (CLI-Ergebnisse aus DIR) durch
// die ECHTEN App-Funktionen (Kosten/Ressourcen/Flaeche/Haushalt) und schreibt
// report.json (fuer die Experten-Agenten) + report.html (fuer Menschen).
const DIR = '/tmp/claude-1000/np/report';
const HORIZON_YEARS = 20; // heute bis 2045

const SCENARIOS = [
  { id: 'referenz-2025', label: 'Referenz 2025 (ohne e100)' },
  { id: '100ee-noimport', label: 'e100 + 100% EE lokal' },
  { id: '100ee-import', label: 'e100 + 100% EE + Import' },
  { id: '2025-skaliert', label: 'e100 + 2025 hochskaliert' },
  { id: '100kern-lastfolgend', label: 'e100 + 100% Kernkraft' },
] as const;

const data = {
  'e100-pkw': e100Pkw,
  'e100-heiz': e100Heiz,
  'e100-lkw': e100Lkw,
  'e100-ghd': e100Ghd,
  'e100-bahn': e100Bahn,
} as unknown as DataSet;

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;

function speicherStats(result: SimulationResult, resolved: Scenario) {
  const hours = result.hours;
  const series = (key: string) => hours.map(h => (h as unknown as Record<string, number>)[key] ?? 0);
  const stat = (socKey: string, dischargeKey: string, capGWh: number, powerGW: number) => {
    const soc = series(socKey);
    const max = Math.max(...soc);
    const min = Math.min(...soc);
    const dischargeGWh = series(dischargeKey).reduce((a, b) => a + b, 0);
    return {
      capGWh: r1(capGWh),
      powerGW: r1(powerGW),
      socMaxGWh: r1(max),
      socMinGWh: r1(min),
      hubPct: capGWh > 0 ? r1((max - min) / capGWh * 100) : 0,
      vollzyklenProJahr: capGWh > 0 ? r1(dischargeGWh / capGWh) : 0,
      entladenTWh: r2(dischargeGWh / 1000),
    };
  };
  return {
    batterie: stat('batterieSocGWh', 'batterieDischargeGW', resolved.storage.batterieEnergyGWh, resolved.storage.batteriePowerGW),
    pumpspeicher: stat('pumpspeicherSocGWh', 'pumpspeicherDischargeGW', resolved.storage.pumpspeicherEnergyGWh, resolved.storage.pumpspeicherPowerGW),
    h2: stat('h2SocGWh', 'h2DischargeGW', resolved.storage.h2EnergyGWh, Math.max(resolved.storage.h2ChargePowerGW, resolved.storage.h2DischargePowerGW)),
  };
}

describe('Szenario-Prüfbericht', () => {
  it('generiert report.json und report.html', () => {
    const out: Record<string, unknown>[] = [];
    for (const scen of SCENARIOS) {
      const raw = JSON.parse(readFileSync(`${DIR}/szen-${scen.id}.json`, 'utf-8')) as Scenario;
      const resolved = JSON.parse(readFileSync(`${DIR}/resolved-${scen.id}.json`, 'utf-8')) as Scenario;
      const result = JSON.parse(readFileSync(`${DIR}/result-${scen.id}.json`, 'utf-8')) as SimulationResult;
      const s = result.summary;

      const k = computeKosten(resolved, result);
      const { pkwTWh, heizTWh } = householdElectrificationTWh(raw, data);
      const hh = computeHaushalt(k, pkwTWh, heizTWh);

      const e100TWh = e100ElectricTWh(resolved, data);
      const annual = annualByMaterial(resolved, HORIZON_YEARS, e100TWh, fuelTWhFromResult(result));
      const groups = groupSums(annual);

      const rows = flaecheRows(resolved);
      const offshoreWirkung = rows.find(r => r.id === 'windoff')?.wirkungKm2 ?? 0;
      const sumAnlage = rows.reduce((acc, r) => acc + r.anlageKm2, 0);
      const sumWirkung = rows.reduce((acc, r) => acc + r.wirkungKm2, 0);
      const sumVor = rows.reduce((acc, r) => acc + (r.vorFlaecheKm2 ?? 0), 0);

      out.push({
        id: scen.id,
        label: scen.label,
        erzeugungGW: Object.fromEntries(Object.entries(resolved.generation).filter(([key]) => key.endsWith('GW')).map(([key, value]) => [key, r1(value as number)])),
        speicherAuslegung: resolved.storage,
        importExport: { h2ImportTWh: r1(resolved.import.h2TWh), stromImportCapGW: r1(resolved.import.stromGW), stromExportCapGW: r1(resolved.export.stromGW) },
        system: {
          stromlastTWh: r1(s.totalDemandTWh),
          sektorNachfrageTWh: r1(s.totalDemandTWh + (s.h2PoolStromReductionTWh ?? 0)),
          h2PoolTWh: r1(s.h2PoolStromReductionTWh ?? 0),
          peakLoadGW: r1(s.peakLoadGW),
          fehlendTWh: r2(s.loadSheddingTWh),
          fehlendStunden: s.hoursWithLoadShedding,
          importTWh: r1(s.importTWh),
          exportTWh: r1(s.exportTWh),
          eeAnteilPct: r1(s.renewableSharePct),
          abregelungTWh: r1(s.curtailmentTWh),
          co2GproKWh: r1(s.co2GperKWh),
          co2MtProJahr: r1(s.co2MtPerYear),
        },
        kosten: {
          gesamtMrdEurProJahr: r1(k.total / 1e9),
          gesamtBis2045MrdEur: r1(k.total * HORIZON_YEARS / 1e9),
          eurProMWh: r1(k.perMWh),
          breakdownMrdEurProJahr: Object.fromEntries(Object.entries(k.breakdown).map(([key, value]) => [key, r1(value / 1e9)])),
          netzExtrapoliert: k.netzExtrapolated,
          eeZubauUeberBasisGW: r1(k.addedReGW),
          peakZuwachsUeberBasisGW: r1(k.addedPeakLoadGW),
          perTechMrdEurProJahr: k.perTech.map(t => ({ key: t.key, total: r1(t.total / 1e9), eurPerMWh: t.eurPerMWh == null ? null : r1(t.eurPerMWh) })),
        },
        musterhaushalt: {
          kwhProJahr: Math.round(hh.kwh),
          systemkostenEurProMonat: r1(hh.abWerkEurPerMonth),
          endkundeEurProMonat: r1(hh.endkundeEurPerMonth),
          endkundeCtProKWh: r1(hh.endkundeCt),
        },
        ressourcenJahresbedarfT: Object.fromEntries(Object.entries(annual).map(([key, value]) => [key, Math.round(value)])),
        ressourcenGruppenT: { bulk: Math.round(groups.bulk), spezial: Math.round(groups.spezial), brennstoff: Math.round(groups.brennstoff) },
        flaeche: {
          anlageKm2: r1(sumAnlage),
          wirkungInlandKm2: r1(Math.max(0, sumWirkung - offshoreWirkung)),
          wirkungOffshoreKm2: r1(offshoreWirkung),
          vorflaecheInlandKm2: r1(sumVor),
          summeKm2: r1(sumAnlage + sumWirkung + sumVor),
        },
        speicherBetrieb: speicherStats(result, resolved),
      });
    }

    writeFileSync(`${DIR}/report.json`, JSON.stringify(out, null, 1));

    // Kompaktes HTML: ein Block je Themenfeld, Szenarien als Spalten.
    const esc = (value: unknown) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const cols = out.map(o => o.label as string);
    const section = (title: string, rows: Array<[string, (o: Record<string, any>) => unknown]>) => `
      <h2>${title}</h2>
      <table><thead><tr><th></th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
      ${rows.map(([name, fn]) => `<tr><td>${esc(name)}</td>${out.map(o => `<td>${esc(fn(o as Record<string, any>) ?? '–')}</td>`).join('')}</tr>`).join('\n')}
      </tbody></table>`;

    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>netzprobe Szenario-Prüfung</title>
      <style>body{font:14px/1.45 system-ui;margin:2rem;max-width:1280px}table{border-collapse:collapse;width:100%;margin:.5rem 0 1.5rem}
      th,td{border:1px solid #ddd;padding:4px 8px;text-align:right;font-variant-numeric:tabular-nums}th:first-child,td:first-child{text-align:left}
      h1{font-size:1.4rem}h2{font-size:1.05rem;margin-top:1.6rem}</style></head><body>
      <h1>netzprobe Szenario-Prüfung — ${new Date().toISOString().slice(0, 10)}</h1>
      <p>Aufbauzeitraum 20 Jahre (bis 2045). Quelle: simulate-CLI + App-Funktionen (computeKosten, annualByMaterial, flaecheRows, computeHaushalt).</p>
      ${section('Erzeugung (GW, aufgelöst)', [
        ['PV', o => o.erzeugungGW.pvInstalledGW], ['Wind Onshore', o => o.erzeugungGW.windOnInstalledGW], ['Wind Offshore', o => o.erzeugungGW.windOffInstalledGW],
        ['Biomasse', o => o.erzeugungGW.biomasseInstalledGW], ['Laufwasser', o => o.erzeugungGW.laufwasserInstalledGW], ['Kernkraft', o => o.erzeugungGW.kernkraftInstalledGW],
        ['Gas', o => o.erzeugungGW.gasInstalledGW], ['Kohle', o => o.erzeugungGW.kohleInstalledGW],
      ])}
      ${section('System', [
        ['Stromlast TWh', o => o.system.stromlastTWh], ['Sektor-Nachfrage TWh', o => o.system.sektorNachfrageTWh], ['davon H₂-Pool TWh', o => o.system.h2PoolTWh],
        ['Peak GW', o => o.system.peakLoadGW], ['Fehlend TWh / h', o => `${o.system.fehlendTWh} / ${o.system.fehlendStunden}`],
        ['Import / Export TWh', o => `${o.system.importTWh} / ${o.system.exportTWh}`], ['H₂-Import TWh', o => o.importExport.h2ImportTWh],
        ['EE-Anteil %', o => o.system.eeAnteilPct], ['Abregelung TWh', o => o.system.abregelungTWh],
        ['CO₂ g/kWh (Lebenszyklus) · Mt/a', o => `${o.system.co2GproKWh} · ${o.system.co2MtProJahr}`],
      ])}
      ${section('Kosten', [
        ['Mrd €/a', o => o.kosten.gesamtMrdEurProJahr], ['Gesamt bis 2045 Mrd €', o => o.kosten.gesamtBis2045MrdEur], ['€/MWh (System)', o => o.kosten.eurProMWh],
        ['Kapital Mrd €/a', o => o.kosten.breakdownMrdEurProJahr.capex], ['Betrieb Mrd €/a', o => o.kosten.breakdownMrdEurProJahr.om],
        ['Brennstoff Mrd €/a', o => o.kosten.breakdownMrdEurProJahr.fuel], ['H₂-Import Mrd €/a', o => o.kosten.breakdownMrdEurProJahr.h2Import],
        ['Strom-Saldo Mrd €/a', o => o.kosten.breakdownMrdEurProJahr.importNet], ['Netzausbau Mrd €/a', o => o.kosten.breakdownMrdEurProJahr.netz],
        ['Netz extrapoliert?', o => o.kosten.netzExtrapoliert ? `ja (EE ${o.kosten.eeZubauUeberBasisGW} / Peak ${o.kosten.peakZuwachsUeberBasisGW} GW)` : 'nein'],
        ['Musterhaushalt kWh/a', o => o.musterhaushalt.kwhProJahr], ['Musterhaushalt €/Monat (Endkunde)', o => o.musterhaushalt.endkundeEurProMonat],
      ])}
      ${section('Speicher (Betrieb)', [
        ['Batterie GW · GWh', o => `${o.speicherBetrieb.batterie.powerGW} · ${o.speicherBetrieb.batterie.capGWh}`],
        ['Batterie Vollzyklen/a · Hub %', o => `${o.speicherBetrieb.batterie.vollzyklenProJahr} · ${o.speicherBetrieb.batterie.hubPct}`],
        ['Pumpspeicher Vollzyklen/a · Hub %', o => `${o.speicherBetrieb.pumpspeicher.vollzyklenProJahr} · ${o.speicherBetrieb.pumpspeicher.hubPct}`],
        ['H₂ GW · GWh', o => `${o.speicherBetrieb.h2.powerGW} · ${o.speicherBetrieb.h2.capGWh}`],
        ['H₂ Vollzyklen/a · Hub %', o => `${o.speicherBetrieb.h2.vollzyklenProJahr} · ${o.speicherBetrieb.h2.hubPct}`],
        ['H₂ entladen TWh/a', o => o.speicherBetrieb.h2.entladenTWh],
      ])}
      ${section('Ressourcen (Jahresbedarf t/a)', [
        ['Bulk (Beton/Stahl/Alu)', o => o.ressourcenGruppenT.bulk.toLocaleString('de-DE')],
        ['Spezialmaterialien', o => o.ressourcenGruppenT.spezial.toLocaleString('de-DE')],
        ['Brennstoffe', o => o.ressourcenGruppenT.brennstoff.toLocaleString('de-DE')],
        ['Lithium t/a', o => (o.ressourcenJahresbedarfT.Lithium ?? 0).toLocaleString('de-DE')],
        ['Kupfer t/a', o => (o.ressourcenJahresbedarfT.Kupfer ?? 0).toLocaleString('de-DE')],
        ['Silizium t/a', o => (o.ressourcenJahresbedarfT.Silizium ?? 0).toLocaleString('de-DE')],
        ['Uran t/a', o => (o.ressourcenJahresbedarfT.Uran ?? 0).toLocaleString('de-DE')],
        ['Wasserstoff (Import) t/a', o => (o.ressourcenJahresbedarfT.Wasserstoff ?? 0).toLocaleString('de-DE')],
      ])}
      ${section('Fläche (km²)', [
        ['Anlagenfläche', o => o.flaeche.anlageKm2], ['Wirkfläche Inland', o => o.flaeche.wirkungInlandKm2],
        ['Wirkfläche Offshore', o => o.flaeche.wirkungOffshoreKm2], ['Vorfläche Inland', o => o.flaeche.vorflaecheInlandKm2],
        ['Summe', o => o.flaeche.summeKm2],
      ])}
      </body></html>`;
    writeFileSync(`${DIR}/report.html`, html);
  });
});
