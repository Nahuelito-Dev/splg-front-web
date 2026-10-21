import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fleetTaskCloseSchema, fleetTaskCreateSchema, fleetTaskDetailsSchema } from './fleetTaskSchema';

/** Reloj fijo: las reglas de «no futuro» y «no pasado» dependen de la hora de ejecución. */
const NOW = new Date('2026-10-21T15:00:00.000Z');
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('fleetTaskCreateSchema', () => {
  const planId = '8657d458-bb9e-4d4c-841d-6d936f7a4627';

  it('acepta un alta con fecha límite', () => {
    const result = fleetTaskCreateSchema.safeParse({ planId, dueAt: '2026-12-31', provider: 'La Segunda Seguros' });
    expect(result.success).toBe(true);
  });

  it('acepta un alta con kilometraje límite (service) sin fecha', () => {
    const result = fleetTaskCreateSchema.safeParse({ planId, dueKm: 45000 });
    expect(result.success).toBe(true);
  });

  it('rechaza sin plan', () => {
    expect(fleetTaskCreateSchema.safeParse({ planId: '', dueAt: '2026-12-31' }).success).toBe(false);
  });

  it('rechaza sin fecha y sin kilometraje: no hay cómo saber cuándo vence', () => {
    const result = fleetTaskCreateSchema.safeParse({ planId, provider: 'Taller Norte' });
    expect(result.success).toBe(false);
  });

  it('los campos opcionales vacíos no rompen', () => {
    const result = fleetTaskCreateSchema.safeParse({
      planId,
      dueAt: '2026-12-31',
      dueKm: '',
      provider: '',
      referenceNumber: '',
      category: '',
      notes: '',
      scheduledAt: '',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dueKm).toBeUndefined();
      expect(result.data.provider).toBeUndefined();
    }
  });
});

describe('fleetTaskDetailsSchema (edición)', () => {
  it('no exige nada: es una edición parcial', () => {
    expect(fleetTaskDetailsSchema.safeParse({}).success).toBe(true);
  });

  it('rechaza un kilometraje negativo', () => {
    expect(fleetTaskDetailsSchema.safeParse({ dueKm: -10 }).success).toBe(false);
  });

  it('el kilometraje tiene que ser entero, igual que en el back', () => {
    expect(fleetTaskDetailsSchema.safeParse({ dueKm: 45000.5 }).success).toBe(false);
    expect(fleetTaskDetailsSchema.safeParse({ dueKm: 45000 }).success).toBe(true);
  });

  it.each([
    ['proveedor', 'provider', 120],
    ['número de referencia', 'referenceNumber', 60],
    ['categoría', 'category', 10],
    ['notas', 'notes', 2000],
  ])('respeta el largo máximo del back en %s', (_, campo, max) => {
    expect(fleetTaskDetailsSchema.safeParse({ [campo]: 'a'.repeat(max) }).success).toBe(true);
    expect(fleetTaskDetailsSchema.safeParse({ [campo]: 'a'.repeat(max + 1) }).success).toBe(false);
  });
});

describe('fleetTaskCloseSchema (CU-141)', () => {
  it('exige cuándo se hizo', () => {
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '' }).success).toBe(false);
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-09-30' }).success).toBe(true);
  });

  it('rechaza un costo negativo', () => {
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-09-30', cost: -100 }).success).toBe(false);
  });

  it('el costo admite decimales; el kilometraje, no', () => {
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-09-30', cost: 45000.5 }).success).toBe(true);
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-09-30', odometerKm: 45000.5 }).success).toBe(false);
  });
});

describe('fleetTaskCloseSchema: fecha de cierre', () => {
  it('no puede ser futura, como en el back', () => {
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2099-01-01' }).success).toBe(false);
  });
});

describe('fleetTaskCloseSchema: tolerancia', () => {
  const performedAt = (offsetMs: number) => new Date(NOW.getTime() + offsetMs).toISOString();

  it('interpreta la fecha como el back (new Date): un día YYYY-MM-DD es la medianoche UTC', () => {
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-10-21' }).success).toBe(true);
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-10-22' }).success).toBe(false);
  });

  it('acepta hasta 5 minutos de adelanto y rechaza lo que pasa del límite', () => {
    expect(fleetTaskCloseSchema.safeParse({ performedAt: performedAt(120_000) }).success).toBe(true);
    expect(fleetTaskCloseSchema.safeParse({ performedAt: performedAt(5 * 60_000) }).success).toBe(true);
    expect(fleetTaskCloseSchema.safeParse({ performedAt: performedAt(5 * 60_000 + 1) }).success).toBe(false);
  });

  it('cerca de la medianoche UTC (21:57 en Argentina) el día siguiente entra en la tolerancia, igual que en el back', () => {
    vi.setSystemTime(new Date('2026-10-21T23:57:00.000Z'));
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-10-22' }).success).toBe(true);
    vi.setSystemTime(new Date('2026-10-21T23:54:00.000Z'));
    expect(fleetTaskCloseSchema.safeParse({ performedAt: '2026-10-22' }).success).toBe(false);
  });
});
