export const uiManifest = {
  "source": "Energy-Charts 2025: Last, Erzeugung und Einspeisefaktoren. 2017-Daten werden bei Bedarf nachgeladen.",
  "load2025": {
    "sumTWh": 465.8
  },
  "load2017": {
    "sumTWh": 506.8
  },
  "generation2025": {
    "sumTWh": 424.6,
    "sumImportTWh": 34.1,
    "sumSharesPct": {
      "generationPct": 92.6,
      "importPct": 7.4
    },
    "sumPartsTWh": {
      "pvTWh": 70.1,
      "windOnTWh": 105.1,
      "windOffTWh": 26.1,
      "gasTWh": 49.5,
      "coalTWh": 97.4,
      "hydroTWh": 26.6,
      "biomassTWh": 36.1,
      "wasteTWh": 8.9,
      "oilTWh": 2.8,
      "geothermalTWh": 0.2,
      "otherTWh": 1.8
    }
  },
  "generation2017": {
    "sumTWh": 553.8
  },
  "e100": {
    "pkw": {
      "referenceMillionKm": 472200,
      "alreadyElectricMillionKm": 20000,
      "kwhPer100Km": 20,
      "defaultTargetMillionKm": 472200,
      "maxTargetMillionKm": 708300,
      "stepMillionKm": 1000,
      "summary": "20 kWh/100 km",
      "referenceScales": {
        "activity": {
          "value": 11000,
          "unit": "Mio. km/a",
          "label": "Mio. Pkw"
        }
      }
    },
    "heiz": {
      "referenceHeatDemandTWh": 530,
      "alreadyElectricHeatTWh": 50,
      "defaultTargetHeatTWh": 530,
      "maxTargetHeatTWh": 700,
      "stepHeatTWh": 5,
      "seasonalCop": 3.3,
      "summary": "JAZ 3,3",
      "referenceScales": {
        "activity": {
          "value": 12.5,
          "unit": "TWh",
          "label": "Mio. Haushalte (à 12.500 kWh/a)"
        }
      }
    },
    "lkw": {
      "referenceBnKm": 93,
      "kwhPerKm": 0.6,
      "defaultTargetBnKm": 117,
      "maxTargetBnKm": 170,
      "stepBnKm": 1,
      "summary": "0,6 kWh/km",
      "referenceScales": {
        "activity": {
          "value": 33.3,
          "unit": "Mrd. km/a",
          "label": "Mio. Lkw (à 78.000 km/a, BAG 2022)"
        }
      }
    },
    "bahn": {
      "defaultTargetTWh": 10,
      "maxTargetTWh": 25,
      "stepTWh": 0.5,
      "summary": "Diesel + Modal Shift",
      "referenceScales": {
        "activity": {
          "value": 11,
          "unit": "TWh",
          "label": "DB-Netz-Bahnstrom 2024"
        }
      }
    },
    "schiff": {
      "alreadyElectricTWh": 0.3,
      "defaultTargetTWh": 80,
      "maxTargetTWh": 120,
      "stepTWh": 1,
      "summary": "e-Methanol + Cold Ironing",
      "referenceScales": {
        "activity": {
          "value": 3,
          "unit": "TWh",
          "label": "DE-Hafen-Bunkermenge 2023 (AGEB)"
        }
      }
    },
    "flug": {
      "alreadyElectricTWh": 0,
      "defaultTargetTWh": 300,
      "maxTargetTWh": 380,
      "stepTWh": 5,
      "summary": "PtL · η 38 %",
      "referenceScales": {
        "activity": {
          "value": 114,
          "unit": "TWh",
          "label": "DE-Kerosin-Inlandsbedarf 2022"
        }
      }
    },
    "ghd": {
      "referenceHeatDemandTWh": 163,
      "alreadyElectricHeatTWh": 7,
      "defaultTargetHeatTWh": 163,
      "maxTargetHeatTWh": 220,
      "stepHeatTWh": 1,
      "summary": "JAZ 2,8",
      "referenceScales": {
        "activity": {
          "value": 10,
          "unit": "TWh",
          "label": "GHD-Wärme einer Großstadt (~1 Mio. Einw.)"
        }
      }
    },
    "industrie-waerme": {
      "referenceHeatTWh": 220,
      "defaultTargetHeatTWh": 220,
      "maxTargetHeatTWh": 320,
      "stepHeatTWh": 5,
      "temperatureMix": {
        "ntShare": 0.3,
        "mtShare": 0.45,
        "htShare": 0.25,
        "ntCop": 3.5,
        "mtElectricFactor": 0.75,
        "htEfficiency": 0.95
      },
      "summary": "Strom/Wärme 0,55",
      "referenceScales": {
        "activity": {
          "value": 10,
          "unit": "TWh",
          "label": "große Industriestandorte (10 TWh/a)"
        }
      }
    },
    "stahl": {
      "primarySteelMioTon": 25.6,
      "defaultTargetMioTon": 28,
      "maxTargetMioTon": 35,
      "stepMioTon": 0.5,
      "hydrogenKgPerTonSteel": 60,
      "electrolyzerKwhPerKgH2": 52,
      "eafMwhPerTon": 0.6,
      "summary": "DRI-H2 + EAF · 3,72 MWh/t",
      "referenceScales": {
        "activity": {
          "value": 5.7,
          "unit": "Mio. t",
          "label": "Salzgitter-Stahlwerk Jahresoutput"
        }
      }
    },
    "chemie": {
      "alreadyElectricTWh": 55,
      "defaultTargetTotalTWh": 685,
      "maxTargetTotalTWh": 700,
      "stepTWh": 10,
      "currentElectricityTWh": 55,
      "processHeatSubstitutionTWh": 75,
      "hydrogenAmmoniaTWh": 35,
      "hydrogenMethanolTWh": 60,
      "eOlefinsViaH2TWh": 180,
      "additionalDirectElectricityTWh": 30,
      "h2SystemEfficiency": 0.55,
      "summary": "VCI C4C 2024 · H2-max-Mix",
      "referenceScales": {
        "activity": {
          "value": 22,
          "unit": "TWh",
          "label": "BASF-Ludwigshafen-Stromverbrauch"
        }
      }
    }
  },
  "generation": {
    "pv": {
      "defaultInstalledGW": 102.5,
      "installed2025GW": 102.5,
      "minInstalledGW": 0,
      "maxInstalledGW": 2000,
      "stepGW": 10,
      "emissions": {
        "co2eGperKWh": 35
      },
      "referenceScales": {
        "power": {
          "value": 0.5,
          "unit": "GW",
          "label": "Solarpark Witznitz (500 MW)"
        }
      }
    },
    "windon": {
      "defaultInstalledGW": 62.8,
      "installed2025GW": 62.8,
      "minInstalledGW": 0,
      "maxInstalledGW": 1200,
      "stepGW": 5,
      "emissions": {
        "co2eGperKWh": 13
      },
      "referenceScales": {
        "power": {
          "value": 0.004,
          "unit": "GW",
          "label": "Onshore-Turbinen (4 MW)"
        }
      }
    },
    "windoff": {
      "defaultInstalledGW": 9.4,
      "installed2025GW": 9.4,
      "minInstalledGW": 0,
      "maxInstalledGW": 400,
      "stepGW": 2,
      "emissions": {
        "co2eGperKWh": 13
      },
      "referenceScales": {
        "power": {
          "value": 0.014,
          "unit": "GW",
          "label": "Offshore-Turbinen (14 MW)"
        }
      }
    },
    "kernkraft": {
      "defaultInstalledGW": 0,
      "installed2025GW": 0,
      "minInstalledGW": 0,
      "maxInstalledGW": 500,
      "stepGW": 0.5,
      "emissions": {
        "co2eGperKWh": 12
      },
      "referenceScales": {
        "power": {
          "value": 1.4,
          "unit": "GW",
          "label": "Isar-2-Blöcke"
        }
      }
    },
    "biomasse": {
      "defaultInstalledGW": 4.8,
      "installed2025GW": 4.8,
      "minInstalledGW": 0,
      "maxInstalledGW": 50,
      "stepGW": 1,
      "emissions": {
        "co2eGperKWh": 230
      },
      "referenceScales": {
        "power": {
          "value": 0.005,
          "unit": "GW",
          "label": "5-MW-Biomasse-HKW"
        }
      }
    },
    "laufwasser": {
      "defaultInstalledGW": 4.8,
      "installed2025GW": 4.8,
      "minInstalledGW": 0,
      "maxInstalledGW": 48,
      "stepGW": 0.5,
      "emissions": {
        "co2eGperKWh": 11
      },
      "referenceScales": {
        "power": {
          "value": 0.1,
          "unit": "GW",
          "label": "Laufwasser-Kraftwerke (100 MW)"
        }
      }
    },
    "gas": {
      "defaultInstalledGW": 35.5,
      "installed2025GW": 35.5,
      "minInstalledGW": 0,
      "maxInstalledGW": 360,
      "stepGW": 5,
      "emissions": {
        "co2eGperKWh": 494
      },
      "referenceScales": {
        "power": {
          "value": 0.4,
          "unit": "GW",
          "label": "Gasturbinen-Blöcke (400 MW)"
        }
      }
    },
    "kohle": {
      "defaultInstalledGW": 31,
      "installed2025GW": 31,
      "minInstalledGW": 0,
      "maxInstalledGW": 310,
      "stepGW": 5,
      "emissions": {
        "co2eGperKWh": 1170
      },
      "referenceScales": {
        "power": {
          "value": 0.8,
          "unit": "GW",
          "label": "Kohleblöcke (800 MW)"
        }
      }
    }
  },
  "storage": {
    "batterie": {
      "defaultPowerGW": 10,
      "minPowerGW": 0,
      "maxPowerGW": 500,
      "stepPowerGW": 10,
      "defaultEnergyGWh": 25,
      "minEnergyGWh": 0,
      "maxEnergyGWh": 5000,
      "stepEnergyGWh": 50,
      "referenceScales": {
        "energy": {
          "value": 0.004,
          "unit": "GWh",
          "label": "Tesla Megapacks (4 MWh)"
        }
      }
    },
    "pumpspeicher": {
      "defaultPowerGW": 9.4,
      "minPowerGW": 0,
      "maxPowerGW": 15,
      "stepPowerGW": 1,
      "defaultEnergyGWh": 45,
      "minEnergyGWh": 0,
      "maxEnergyGWh": 100,
      "stepEnergyGWh": 10,
      "referenceScales": {
        "energy": {
          "value": 8.5,
          "unit": "GWh",
          "label": "Pumpspeicher Goldisthal (8,5 GWh)"
        }
      }
    },
    "h2": {
      "defaultChargePowerGW": 0.1,
      "minChargePowerGW": 0,
      "maxChargePowerGW": 300,
      "stepChargePowerGW": 5,
      "defaultDischargePowerGW": 0,
      "minDischargePowerGW": 0,
      "maxDischargePowerGW": 300,
      "stepDischargePowerGW": 5,
      "defaultEnergyGWh": 0.1,
      "minEnergyGWh": 0,
      "maxEnergyGWh": 500000,
      "stepEnergyGWh": 5000,
      "referenceScales": {
        "energy": {
          "value": 200,
          "unit": "GWh",
          "label": "Salzkavernen-Speicher (200 GWh)"
        }
      }
    }
  },
  "trade": {
    "strom": {
      "import": {
        "default2025GW": 13,
        "defaultMaxGW": 13,
        "minGW": 0,
        "maxGW": 200,
        "stepGW": 5,
        "emissionGperKWh": 300
      },
      "export": {
        "default2025GW": 25,
        "defaultMaxGW": 25,
        "minGW": 0,
        "maxGW": 200,
        "stepGW": 5
      },
      "referenceScales": {
        "power": {
          "value": 2,
          "unit": "GW",
          "label": "HGÜ-Trassen (2 GW)"
        }
      }
    },
    "h2": {
      "import": {
        "default2025TWh": 0,
        "defaultTWh": 0,
        "minTWh": 0,
        "maxTWh": 600,
        "stepTWh": 10
      },
      "referenceScales": {
        "activity": {
          "value": 50,
          "unit": "TWh/a",
          "label": "BMWK-H₂-Importziel 2030"
        }
      }
    }
  },
  "kern": {
    "dispatchOrder": {
      "curtailmentPriority": [
        "windOff",
        "windOn",
        "pv",
        "kernkraft"
      ],
      "rampUpPriority": [
        "gas",
        "kohle"
      ],
      "rampUpRatio": {
        "gas": 2,
        "kohle": 1
      }
    }
  }
} as const;

export type UiManifest = typeof uiManifest;
