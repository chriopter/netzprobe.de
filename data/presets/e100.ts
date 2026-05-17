import type { DatasetDoc } from '../../src/ui/dataCatalog';
import type { DemandScenarioModule } from '../../src/simulation/demandContext';
import { demandModule as e100PkwDemandModule } from '../last/e100-pkw';
import { demandModule as e100HeatDemandModule } from '../last/e100-heiz';
import { demandModule as e100LkwDemandModule } from '../last/e100-lkw';
import { demandModule as e100BahnDemandModule } from '../last/e100-bahn';
import { demandModule as e100SchiffDemandModule } from '../last/e100-schiff';
import { demandModule as e100FlugDemandModule } from '../last/e100-flug';
import { demandModule as e100GhdDemandModule } from '../last/e100-ghd';
import { demandModule as e100IndustrieWaermeDemandModule } from '../last/e100-industrie-waerme';
import { demandModule as e100StahlDemandModule } from '../last/e100-stahl';
import { demandModule as e100ChemieDemandModule } from '../last/e100-chemie';

export const description: DatasetDoc = {
  id: 'e100',
  domain: 'presets',
  kind: 'composition',
  title: 'E100',
  scripts: ['presets/e100/model.ts'],
  source: 'Komposition aus e100-pkw, e100-lkw, e100-bahn, e100-schiff, e100-flug, e100-heiz, e100-ghd, e100-industrie-waerme, e100-stahl, e100-chemie.',
  period: '2026',
  resolution: 'stündlich',
  unit: 'TWh Strom',
  short: 'Vollelektrifizierung von Verkehr, Wärme und Industrie additiv auf die 2025-Last.',
  description: [
    '**Komposition:** zehn Sektor-Module aus dem Lastkatalog werden gleichzeitig aktiviert und stundenscharf summiert. Die historische 2025-Last bleibt als Basis stehen; jeder Sektor wirkt als additiver Aufschlag mit eigenem Tagesprofil. Die Module bilden drei **Sektor-Cluster**: Verkehr (`e100-pkw`, `e100-lkw`, `e100-bahn`, `e100-schiff`, `e100-flug`), Gebäudewärme (`e100-heiz`, `e100-ghd`) und Industrie (`e100-industrie-waerme`, `e100-stahl`, `e100-chemie`).',
    '**Größenordnungen:** der **Verkehr** trägt rund `535 TWh/a` Zusatzlast, dominiert vom strombasierten Flug (`~300 TWh/a` über e-Kerosin); Pkw, Lkw/Bus, Schiff und Bahn bilden die Restmenge. Die **Gebäudewärme** liegt bei rund `200 TWh/a` (Wohngebäude und GHD zusammen), die **Industrie** bei rund `625 TWh/a` mit der Chemie als größtem Einzelblock (`~385 TWh/a` Zusatzlast über dem heutigen Stromsockel). In Summe ergeben sich rund `1.365 TWh/a` Zusatzlast; zusammen mit der 2025er Basis von `~466 TWh/a` entsteht ein **Voll-E-Deutschland** von rund `1.830 TWh/a`. Jeder Sektor-Slider lässt sich nach Master-Aktivierung einzeln verschieben.',
    '**Anwendungsfall:** Lese-Anker für die Größenordnung einer vollständig elektrifizierten Endenergie ohne Effizienzgewinne durch Verhaltensänderungen, ohne fossile Restmengen, ohne H₂-Importe als Endenergie. Im Vergleich zur 2025-Last zeigt das Szenario, wie weit Erzeugung, Netz und Speicher skalieren müssten und welche Sektoren den größten Hebel tragen.',
  ],
  overview: [
    {
      label: 'Verwendung',
      value: '**Master-Aktivierung:** schaltet alle zehn Teilszenarien gemeinsam ein. Danach lassen sich die Sektor-Slider (`Fahrleistung`, `TWh-Wärme`, `Stahlmenge`, `Chemiestrom`) einzeln nachjustieren.',
    },
    {
      label: 'Default-Effekt',
      value: '**Zusatzlast:** Verkehr `~535 TWh/a` (Pkw `90` + Lkw/Bus `55` + Bahn `10` + Schiff `80` + Flug `300`), Gebäudewärme `~200 TWh/a` (HH `145` + GHD `56`), Industrie `~625 TWh/a` (Wärme `135` + Stahl `104` + Chemie `385`) ≈ `1.365 TWh/a`. Plus historische `~466 TWh/a` ergibt `~1.830 TWh/a` Gesamt-Stromnachfrage.',
    },
    {
      label: 'Teilszenarien',
      value: '**Verkehr:** `e100-pkw`, `e100-lkw`, `e100-bahn`, `e100-schiff`, `e100-flug`. **Gebäudewärme:** `e100-heiz`, `e100-ghd`. **Industrie:** `e100-industrie-waerme`, `e100-stahl`, `e100-chemie`.',
    },
  ],
  method: [
    'Zusammensetzung: Zusatzlast = Summe aller aktivierten Sektor-Module, stundenweise gerechnet.',
    'Historische Last 2025 bleibt unverändert in der Basis; die Erzeugung bleibt historisch fix, Defizit wird vom Kernmodell als Import aufgefüllt.',
    'Modellierung der Teile in den jeweiligen Unterseiten dokumentiert.',
  ],
  caveats: [
    'Keine eigene data.json — Komposition aus zehn Sektor-Paketen.',
    'Sektorale Wechselwirkungen (Smart-Charging zur Verlagerung von BEV-Last in WP-Schwachlast, H2-Speicher zwischen Stahl und Chemie etc.) werden nicht modelliert.',
    'Sliderwerte gelten unabhängig; das Default ist Vollelektrifizierung aller Sektoren ohne Bedarfsreduktion.',
    'Importe von H2 oder strombasierten Brennstoffen (z. B. e-Kerosin aus MENA) sind im Default nicht abgebildet — bei Slider-Senken pro Sektor lassen sie sich rechnerisch berücksichtigen.',
  ],
};

export const e100DemandModules = [
  e100PkwDemandModule,
  e100LkwDemandModule,
  e100BahnDemandModule,
  e100SchiffDemandModule,
  e100FlugDemandModule,
  e100HeatDemandModule,
  e100GhdDemandModule,
  e100IndustrieWaermeDemandModule,
  e100StahlDemandModule,
  e100ChemieDemandModule,
] satisfies DemandScenarioModule[];
