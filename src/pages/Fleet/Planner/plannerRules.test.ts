import { describe, expect, it } from 'vitest';
import type { ProcessConfig } from '../../../services/api/types';
import {
  WORKSHOP_DAYS,
  buildSettingsSchema,
  buildWindowSchema,
  hasWorkshopDay,
  toConfirmBody,
  toForceBody,
  toWindow,
  toggleWorkshopDay,
} from './plannerRules';

const TODAY = '2026-10-30';
const schema = (requireWindow: boolean) => buildWindowSchema(requireWindow, () => TODAY);
const base = { day: '2026-11-03', startTime: '08:00', endTime: '13:00', provider: '', cost: '', notes: '' };

describe('buildWindowSchema', () => {
  it('acepta una ventana a futuro y deja vacíos el proveedor y el gasto', () => {
    const r = schema(true).safeParse(base);
    expect(r.success).toBe(true);
    expect(r.success && r.data.provider).toBeUndefined();
    expect(r.success && r.data.cost).toBeUndefined();
  });

  it('pide el día, y que no sea pasado', () => {
    expect(schema(true).safeParse({ ...base, day: '' }).success).toBe(false);
    const pasado = schema(true).safeParse({ ...base, day: '2026-10-29' });
    expect(pasado.success).toBe(false);
    expect(!pasado.success && pasado.error.issues[0].message).toBe('La ventana tiene que ser a futuro');
    expect(schema(true).safeParse({ ...base, day: TODAY }).success).toBe(true);
  });

  it('el fin tiene que ser posterior al inicio', () => {
    const r = schema(true).safeParse({ ...base, startTime: '13:00', endTime: '08:00' });
    expect(r.success).toBe(false);
    expect(!r.success && r.error.issues[0].path).toEqual(['endTime']);
    expect(schema(true).safeParse({ ...base, endTime: '08:00' }).success).toBe(false);
  });

  it('pide las dos horas', () => {
    expect(schema(true).safeParse({ ...base, startTime: '' }).success).toBe(false);
    expect(schema(true).safeParse({ ...base, endTime: '25:00' }).success).toBe(false);
  });

  it('al confirmar la ventana acordada no pide día ni horas', () => {
    expect(schema(false).safeParse({ ...base, day: '', startTime: '', endTime: '' }).success).toBe(true);
  });

  it.each([
    ['gasto negativo', { cost: '-1' }],
    ['gasto con tres decimales', { cost: '10.123' }],
    ['gasto desmedido', { cost: '99999999' }],
    ['taller de más de 120 caracteres', { provider: 'x'.repeat(121) }],
    ['notas de más de 500 caracteres', { notes: 'x'.repeat(501) }],
  ])('rechaza %s', (_name, over) => {
    expect(schema(true).safeParse({ ...base, ...over }).success).toBe(false);
  });

  it('acepta un gasto con dos decimales', () => {
    const r = schema(true).safeParse({ ...base, cost: '85000.50', provider: ' Taller Los Pinos ' });
    expect(r.success && r.data.cost).toBe(85000.5);
    expect(r.success && r.data.provider).toBe('Taller Los Pinos');
  });
});

describe('cuerpos', () => {
  const parsed = {
    day: '2026-11-03',
    startTime: '08:00',
    endTime: '13:00',
    provider: 'Taller',
    cost: 100,
    notes: undefined,
  };

  it('la ventana viaja en hora argentina', () => {
    expect(toWindow(parsed)).toEqual({
      windowStart: '2026-11-03T08:00:00-03:00',
      windowEnd: '2026-11-03T13:00:00-03:00',
    });
    expect(new Date(toWindow(parsed).windowStart).toISOString()).toBe('2026-11-03T11:00:00.000Z');
  });

  it('confirmar la ventana acordada no manda ventana', () => {
    expect(toConfirmBody(parsed, false)).toEqual({ provider: 'Taller', cost: 100 });
  });

  it('confirmar eligiendo otra manda la ventana, y fijar siempre la manda', () => {
    expect(toConfirmBody(parsed, true)).toMatchObject({ windowStart: '2026-11-03T08:00:00-03:00' });
    expect(toForceBody({ ...parsed, provider: undefined, cost: undefined })).toEqual({
      windowStart: '2026-11-03T08:00:00-03:00',
      windowEnd: '2026-11-03T13:00:00-03:00',
    });
  });
});

describe('días de taller', () => {
  it('la máscara marca cada día: bit n = día n (0 domingo)', () => {
    expect(hasWorkshopDay(126, 1)).toBe(true); // lunes
    expect(hasWorkshopDay(126, 0)).toBe(false); // domingo
    expect(toggleWorkshopDay(126, 0, true)).toBe(127);
    expect(toggleWorkshopDay(127, 6, false)).toBe(63);
    expect(WORKSHOP_DAYS).toHaveLength(7);
    expect(WORKSHOP_DAYS[0].label).toBe('Lunes');
  });

  it('la ventana confirmada ignorando la cobertura lo manda; sin eso no', () => {
    const base = { day: '2026-11-03', startTime: '08:00', endTime: '13:00' };
    expect(toForceBody({ ...base, ignoreCoverage: true })).toMatchObject({ ignoreCoverage: true });
    expect(toForceBody({ ...base, ignoreCoverage: false })).not.toHaveProperty('ignoreCoverage');
    expect(toConfirmBody({ ...base, ignoreCoverage: true }, false)).toEqual({ ignoreCoverage: true });
  });
});

describe('buildSettingsSchema', () => {
  const field = (key: string, min: number, max: number) => ({
    key,
    type: 'integer' as const,
    min,
    max,
    default: min,
    unit: null,
    description: key,
  });
  const config = {
    process: 'fleet_planner',
    title: 'Planificador',
    description: '',
    fields: [field('workshopStartHour', 0, 23), field('workshopEndHour', 1, 24), field('workshopDays', 1, 127)],
    params: {},
    isDefault: true,
    updatedAt: null,
    updatedByUserId: null,
  } as ProcessConfig;

  it('acepta un horario de taller que empieza antes de terminar', () => {
    expect(
      buildSettingsSchema(config).safeParse({ workshopStartHour: '8', workshopEndHour: '13', workshopDays: '126' })
        .success,
    ).toBe(true);
  });

  it('rechaza un taller que termina antes de empezar o a la misma hora', () => {
    for (const [start, end] of [
      ['14', '12'],
      ['9', '9'],
    ]) {
      const r = buildSettingsSchema(config).safeParse({
        workshopStartHour: start,
        workshopEndHour: end,
        workshopDays: '126',
      });
      expect(r.success).toBe(false);
      expect(!r.success && r.error.issues[0].path).toEqual(['workshopEndHour']);
    }
  });

  it('pide al menos un día de taller', () => {
    const r = buildSettingsSchema(config).safeParse({
      workshopStartHour: '8',
      workshopEndHour: '13',
      workshopDays: '0',
    });
    expect(r.success).toBe(false);
  });

  it('mantiene los rangos del esquema del back', () => {
    expect(
      buildSettingsSchema(config).safeParse({ workshopStartHour: '24', workshopEndHour: '24', workshopDays: '126' })
        .success,
    ).toBe(false);
  });
});
