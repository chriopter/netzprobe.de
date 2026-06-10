import { describe, expect, it } from 'vitest';
import type { HourlyInput } from '../../app/src/types/data';
import { e100Heiz as e100HeizData, e100Pkw as e100PkwData } from './modelTestData';

const e100PkwAdditionalTWh = (targetMillionKm: number) =>
  Math.max(0, targetMillionKm - e100PkwData.alreadyElectricMillionKm) * e100PkwData.kwhPer100Km / 100_000;
const e100PkwHourlyLoadGW = (hour: HourlyInput, targetMillionKm: number) =>
  e100PkwAdditionalTWh(targetMillionKm) * 1000 * e100PkwData.hourlyProfile.multipliers[hour.hourOfDayBerlin] / 8760;
const e100HeizAdditionalElectricityTWh = (targetHeatTWh: number) =>
  Math.max(0, targetHeatTWh - e100HeizData.alreadyElectricHeatTWh) / e100HeizData.seasonalCop;
const e100HeizHourlyLoadGW = (hour: HourlyInput, targetHeatTWh: number) =>
  e100HeizAdditionalElectricityTWh(targetHeatTWh) * 1000 * hour.heatingDegreeDayWeight * e100HeizData.hourlyProfile.multipliers[hour.hourOfDayBerlin] / 24;

function emptyHour(hourOfDayBerlin: number, heatingDegreeDayWeight = 0, time = '2025-01-01T00:00:00Z'): HourlyInput {
  return {
    time,
    loadMW: 0,
    solarIrradiance: [0],
    windOn100m: [0],
    windOff100m: [0],
    heatingDegreeDayWeight,
    hourOfDayBerlin,
    observed: { pvMW: 0, windOnMW: 0, windOffMW: 0, gasMW: 0, coalMW: 0, importExportMW: 0 },
  };
}

describe('data scenario modules', () => {
  it('integrates e100-pkw to the configured annual default demand', () => {
    const targetTWh = e100PkwAdditionalTWh(e100PkwData.defaultTargetMillionKm);
    const hours = Array.from({ length: 8760 }, (_, index) => emptyHour(index % 24));
    const actualTWh = hours.reduce((sum, hour) => sum + e100PkwHourlyLoadGW(hour, e100PkwData.defaultTargetMillionKm), 0) / 1000;

    expect(targetTWh).toBeCloseTo(90.44, 6);
    expect(actualTWh).toBeCloseTo(targetTWh, 6);
  });

  it('integrates e100-heiz to the configured annual default demand and keeps summer heating small', () => {
    const targetTWh = e100HeizAdditionalElectricityTWh(e100HeizData.defaultTargetHeatTWh);
    const hours = e100HeizData.degreeDayProfile.days.flatMap(day =>
      Array.from({ length: 24 }, (_, hour) => emptyHour(hour, day.weight, `${day.date}T${String(hour).padStart(2, '0')}:00:00Z`)),
    );
    const actualTWh = hours.reduce((sum, hour) => sum + e100HeizHourlyLoadGW(hour, e100HeizData.defaultTargetHeatTWh), 0) / 1000;
    const summerTWh = hours
      .filter(hour => /2025-(06|07|08)-/.test(hour.time))
      .reduce((sum, hour) => sum + e100HeizHourlyLoadGW(hour, e100HeizData.defaultTargetHeatTWh), 0) / 1000;

    expect(targetTWh).toBeCloseTo((530 - 50) / 3.3, 6);
    expect(actualTWh).toBeCloseTo(targetTWh, 6);
    expect(summerTWh).toBeLessThan(targetTWh * 0.05);
  });
});
