import { describe, expect, it } from 'vitest';
import { buildInspectionBody, daysLabel, inspectionSchema, todayDay } from './inspection';

const valid = { inspectedAt: '2026-10-01', result: 'approved', nextDueAt: '2031-10-01', notes: '' } as const;

describe('inspectionSchema', () => {
  it('acepta una revisión aprobada con vencimiento posterior', () => {
    expect(inspectionSchema.safeParse(valid).success).toBe(true);
  });

  it('exige el vencimiento salvo en un rechazo', () => {
    const sinVencimiento = inspectionSchema.safeParse({ ...valid, nextDueAt: '' });
    expect(sinVencimiento.success).toBe(false);
    expect(inspectionSchema.safeParse({ ...valid, result: 'rejected', nextDueAt: '' }).success).toBe(true);
  });

  it('el vencimiento tiene que ser posterior a la revisión', () => {
    expect(inspectionSchema.safeParse({ ...valid, nextDueAt: '2026-10-01' }).success).toBe(false);
    expect(inspectionSchema.safeParse({ ...valid, nextDueAt: '2026-09-01' }).success).toBe(false);
  });

  it('rechaza una revisión futura', () => {
    expect(inspectionSchema.safeParse({ ...valid, inspectedAt: '2999-01-01', nextDueAt: '3000-01-01' }).success).toBe(
      false,
    );
    expect(inspectionSchema.safeParse({ ...valid, inspectedAt: todayDay(), nextDueAt: '2999-01-01' }).success).toBe(
      true,
    );
  });
});

describe('buildInspectionBody', () => {
  it('manda las fechas como día, sin hora y omite las notas vacías', () => {
    expect(buildInspectionBody({ ...valid })).toEqual({
      inspectedAt: '2026-10-01',
      result: 'approved',
      nextDueAt: '2031-10-01',
    });
  });

  it('un rechazo no manda próximo vencimiento', () => {
    const body = buildInspectionBody({ ...valid, result: 'rejected', notes: ' fisura ' });
    expect(body).toEqual({ inspectedAt: '2026-10-01', result: 'rejected', notes: 'fisura' });
  });
});

describe('todayDay', () => {
  it('es el día de Buenos Aires, no el de UTC: a las 22:00 argentinas sigue siendo hoy', () => {
    expect(todayDay(new Date('2026-10-18T01:00:00.000Z'))).toBe('2026-10-17');
    expect(todayDay(new Date('2026-10-17T02:59:00.000Z'))).toBe('2026-10-16');
    expect(todayDay(new Date('2026-10-17T03:00:00.000Z'))).toBe('2026-10-17');
  });
});

describe('daysLabel', () => {
  it.each([
    ['unverified', null, 'Sin fecha de vencimiento'],
    ['valid', 0, 'Vence hoy'],
    ['expired', 0, 'Venció hoy'],
    ['valid', 1, 'Vence en 1 día'],
    ['valid', 12, 'Vence en 12 días'],
    ['expired', -1, 'Venció hace 1 día'],
    ['expired', -30, 'Venció hace 30 días'],
  ] as const)('%s %s → %s', (status, days, text) => {
    expect(daysLabel(status, days)).toBe(text);
  });
});
