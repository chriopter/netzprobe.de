import { describe, expect, it } from 'vitest';
import e100PkwDataJson from '../../data/last/e100-pkw/data.json';
import e100HeizDataJson from '../../data/last/e100-heiz/data.json';
import { additionalTWh as e100PkwAdditionalTWh, hourlyLoadGW as e100PkwHourlyLoadGW } from '../../data/last/e100-pkw/model';
import { additionalElectricityTWh as e100HeizAdditionalElectricityTWh, hourlyLoadGW as e100HeizHourlyLoadGW } from '../../data/last/e100-heiz/model';
import type { E100HeizData, E100PkwData, HourlyInput } from '../types/data';

const e100PkwData = e100PkwDataJson as E100PkwData;
const e100HeizData = e100HeizDataJson as E100HeizData;

function emptyHour(hourOfDayBerlin: number, heatingDegreeDayWeight = 0, time = '2025-01-01T00:00:00Z'): HourlyInput {
  return {
    time,
    loadMW: 0,
    solarIrradiance: [0],
    wind100m: [0],
    heatingDegreeDayWeight,
    hourOfDayBerlin,
    observed: { pvMW: 0, windOnMW: 0, windOffMW: 0, gasMW: 0, coalMW: 0, importExportMW: 0 },
  };
}

describe('data scenario modules', () => {
  it('integrates e100-pkw to the configured annual default demand', () => {
    const targetTWh = e100PkwAdditionalTWh(e100PkwData.defaultTargetMillionKm, e100PkwData);
    const hours = Array.from({ length: 8760 }, (_, index) => emptyHour(index % 24));
    const actualTWh = hours.reduce((sum, hour) => sum + e100PkwHourlyLoadGW(hour, e100PkwData.defaultTargetMillionKm, e100PkwData), 0) / 1000;

    expect(targetTWh).toBeCloseTo(90.44, 6);
    expect(actualTWh).toBeCloseTo(targetTWh, 6);
  });

  it('integrates e100-heiz to the configured annual default demand and keeps summer heating small', () => {
    const targetTWh = e100HeizAdditionalElectricityTWh(e100HeizData.defaultTargetHeatTWh, e100HeizData);
    const hours = e100HeizData.degreeDayProfile.days.flatMap(day =>
      Array.from({ length: 24 }, (_, hour) => emptyHour(hour, day.weight, `${day.date}T${String(hour).padStart(2, '0')}:00:00Z`)),
    );
    const actualTWh = hours.reduce((sum, hour) => sum + e100HeizHourlyLoadGW(hour, e100HeizData.defaultTargetHeatTWh, e100HeizData), 0) / 1000;
    const summerTWh = hours
      .filter(hour => /2025-(06|07|08)-/.test(hour.time))
      .reduce((sum, hour) => sum + e100HeizHourlyLoadGW(hour, e100HeizData.defaultTargetHeatTWh, e100HeizData), 0) / 1000;

    expect(targetTWh).toBeCloseTo((530 - 50) / 3.3, 6);
    expect(actualTWh).toBeCloseTo(targetTWh, 6);
    expect(summerTWh).toBeLessThan(targetTWh * 0.05);
  });
});
