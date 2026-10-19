import { describe, expect, it } from 'vitest';
import { summarizeFleetCosts } from './fleetCostSummary';

describe('summarizeFleetCosts', () => {
  it('el costo por km deja afuera a los vehículos sin km, y el total los incluye', () => {
    const summary = summarizeFleetCosts([
      { total: 1000, km: 100 },
      { total: 5000, km: 0 },
      { total: 1000, km: 100 },
    ]);
    expect(summary.totalCost).toBe(7000);
    expect(summary.costPerKm).toBe(10);
    expect(summary.withoutKm).toBe(1);
  });

  it('sin ningún vehículo con km no hay costo por km', () => {
    expect(summarizeFleetCosts([{ total: 50, km: 0 }]).costPerKm).toBeNull();
    expect(summarizeFleetCosts([]).costPerKm).toBeNull();
  });
});
