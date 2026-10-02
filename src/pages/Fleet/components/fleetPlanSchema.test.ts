import { describe, expect, it } from 'vitest';
import { fleetPlanSchema } from './fleetPlanSchema';

const base = {
  name: 'Seguro del vehículo',
  subject: 'vehicle' as const,
  trigger: 'by_time' as const,
  intervalMonths: 6,
  leadTimeDays: 30,
  criticality: 'blocking' as const,
  carType: '',
  isActive: true,
};

describe('fleetPlanSchema', () => {
  it('acepta un plan por tiempo con su intervalo en meses', () => {
    expect(fleetPlanSchema.safeParse(base).success).toBe(true);
  });

  it('acepta un plan por km con su intervalo en kilómetros', () => {
    const result = fleetPlanSchema.safeParse({
      ...base,
      trigger: 'by_km',
      intervalMonths: undefined,
      intervalKm: 10000,
    });
    expect(result.success).toBe(true);
  });

  it('acepta fecha fija sin ningún intervalo', () => {
    const result = fleetPlanSchema.safeParse({ ...base, trigger: 'by_fixed_date', intervalMonths: undefined });
    expect(result.success).toBe(true);
  });

  it('rechaza "por km" sin el intervalo en km', () => {
    const result = fleetPlanSchema.safeParse({ ...base, trigger: 'by_km', intervalMonths: undefined });
    expect(result.success).toBe(false);
  });

  it('rechaza "por tiempo" sin el intervalo en meses', () => {
    const result = fleetPlanSchema.safeParse({ ...base, intervalMonths: undefined });
    expect(result.success).toBe(false);
  });

  it('rechaza sin nombre', () => {
    expect(fleetPlanSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });

  it('rechaza un aviso previo negativo', () => {
    expect(fleetPlanSchema.safeParse({ ...base, leadTimeDays: -1 }).success).toBe(false);
  });
});
