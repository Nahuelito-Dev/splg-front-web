import { describe, expect, it } from 'vitest';
import type { ProcessConfig } from '../../services/api/types';
import { buildProcessSchema, processValues, rangeHint, toProcessBody } from './processRules';

const field = (key: string, over: Record<string, unknown> = {}) => ({
  key,
  type: 'integer' as const,
  min: 1,
  max: 30,
  default: 3,
  unit: 'días',
  description: key,
  ...over,
});

const config = (over: Partial<ProcessConfig> = {}): ProcessConfig =>
  ({
    process: 'repurchase',
    title: 'Anticipación de recompra',
    description: '',
    fields: [field('anticipationDays'), field('minOrders', { min: 2, max: 50, default: 3, unit: null })],
    params: { anticipationDays: 3, minOrders: 3 },
    isDefault: true,
    updatedAt: null,
    updatedByUserId: null,
    ...over,
  }) as ProcessConfig;

describe('processValues', () => {
  it('lleva cada parámetro vigente como texto', () => {
    expect(processValues(config({ params: { anticipationDays: 5, minOrders: 4 } }))).toEqual({
      anticipationDays: '5',
      minOrders: '4',
    });
  });
});

describe('buildProcessSchema', () => {
  const schema = buildProcessSchema(config());

  it('acepta valores dentro del rango', () => {
    expect(schema.safeParse({ anticipationDays: '5', minOrders: '10' }).success).toBe(true);
  });

  it.each([
    ['vacío', ''],
    ['fuera de rango', '31'],
    ['por debajo', '0'],
    ['decimal en un entero', '2.5'],
    ['texto', 'abc'],
  ])('rechaza %s con el rango en el mensaje', (_caso, value) => {
    const result = schema.safeParse({ anticipationDays: value, minOrders: '10' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toBe('Un entero entre 1 y 30');
  });

  it('acepta decimales donde el campo es numérico', () => {
    const radio = buildProcessSchema(
      config({
        process: 'express_dispatch',
        fields: [field('maxRadiusKm', { type: 'number', min: 0.5, max: 50, default: 5 })],
        params: { maxRadiusKm: 5 },
      }),
    );
    expect(radio.safeParse({ maxRadiusKm: '2.5' }).success).toBe(true);
    expect(radio.safeParse({ maxRadiusKm: '0.1' }).success).toBe(false);
  });

  it('express: el fin del horario tiene que ser posterior al inicio', () => {
    const express = buildProcessSchema(
      config({
        process: 'express_dispatch',
        fields: [
          field('serviceStartHour', { min: 0, max: 23, default: 8 }),
          field('serviceEndHour', { min: 1, max: 24, default: 20 }),
        ],
        params: { serviceStartHour: 8, serviceEndHour: 20 },
      }),
    );
    const malo = express.safeParse({ serviceStartHour: '20', serviceEndHour: '10' });
    expect(malo.success).toBe(false);
    if (!malo.success) {
      expect(malo.error.issues[0]?.path).toEqual(['serviceEndHour']);
      expect(malo.error.issues[0]?.message).toBe('Tiene que ser posterior al inicio del servicio');
    }
    expect(express.safeParse({ serviceStartHour: '9', serviceEndHour: '18' }).success).toBe(true);
  });
});

describe('toProcessBody', () => {
  it('manda sólo lo que difiere del valor por omisión', () => {
    expect(toProcessBody(config(), { anticipationDays: '5', minOrders: '3' })).toEqual({ anticipationDays: 5 });
  });

  it('sin diferencias manda un cuerpo vacío (restablece todo)', () => {
    expect(toProcessBody(config(), { anticipationDays: '3', minOrders: '3' })).toEqual({});
  });
});

describe('rangeHint', () => {
  it('muestra el rango con su unidad', () => {
    expect(rangeHint(field('anticipationDays') as never)).toBe('1 a 30 días');
    expect(rangeHint(field('minOrders', { unit: null }) as never)).toBe('1 a 30');
  });
});
