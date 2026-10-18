import { describe, expect, it } from 'vitest';
import type { ExpressConfig } from '../../services/api/types';
import { expressSchema, toExpressBody, valuesOf } from './expressRules';

const config: ExpressConfig = {
  enabled: true,
  surchargeAmount: 1500,
  maxRadiusKm: 5,
  offerTtlSeconds: 20,
  serviceFrom: '08:00',
  serviceTo: '20:00',
  estimatedMinutes: 45,
  standardEstimatedMinutes: 180,
  isDefault: false,
  updatedAt: null,
  updatedByUserId: null,
};

const messages = (values: ReturnType<typeof valuesOf>) => {
  const result = expressSchema.safeParse(values);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe('expressRules', () => {
  it('lo que viene de la API es válido y vuelve idéntico en el cuerpo del PUT', () => {
    const values = valuesOf(config);
    expect(messages(values)).toEqual({});
    expect(toExpressBody(values)).toEqual({
      enabled: true,
      surchargeAmount: 1500,
      maxRadiusKm: 5,
      offerTtlSeconds: 20,
      serviceFrom: '08:00',
      serviceTo: '20:00',
      estimatedMinutes: 45,
      standardEstimatedMinutes: 180,
    });
  });

  it('marca cada campo fuera de los límites del back', () => {
    const m = messages({
      ...valuesOf(config),
      surcharge: '-1',
      radius: '51',
      ttl: '5',
      estimated: '1',
      standardEstimated: '2000',
    });
    expect(Object.keys(m).sort()).toEqual(['estimated', 'radius', 'standardEstimated', 'surcharge', 'ttl']);
  });

  it('pide números, enteros donde corresponde y hasta 2 decimales', () => {
    expect(messages({ ...valuesOf(config), surcharge: '' }).surcharge).toMatch(/importe/);
    expect(messages({ ...valuesOf(config), surcharge: '10.123' }).surcharge).toMatch(/decimales/);
    expect(messages({ ...valuesOf(config), ttl: '20.5' }).ttl).toMatch(/entero/);
  });

  it('el horario tiene formato HH:mm y empieza antes de terminar', () => {
    expect(messages({ ...valuesOf(config), from: '8' }).from).toMatch(/HH:mm/);
    expect(messages({ ...valuesOf(config), from: '20:00', to: '08:00' }).to).toMatch(/posterior/);
    expect(messages({ ...valuesOf(config), from: '08:00', to: '08:00' }).to).toMatch(/posterior/);
  });
});
