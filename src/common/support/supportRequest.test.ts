import { describe, expect, it } from 'vitest';
import { formatRemaining } from './countdown';
import { emptySupportRequest, supportRequestSchema, toSupportRequest } from './supportRequest';

const valid = {
  ...emptySupportRequest('3f2b6c1e-8a1d-4c55-9a0e-5b8f1f7f2a10'),
  reason: 'El tablero de despacho no muestra los pedidos de hoy',
};

describe('pedido de acceso de soporte', () => {
  it('60 minutos por omisión, sin alcance extra ni emergencia', () => {
    expect(emptySupportRequest()).toMatchObject({ minutes: 60, emergency: false, personal_data: false });
  });

  it('pide empresa y un motivo de al menos 20 caracteres (como la API)', () => {
    const result = supportRequestSchema.safeParse({ ...valid, distributorId: '', reason: 'corto' });
    expect(result.success).toBe(false);
    const fields = result.success ? [] : result.error.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['distributorId', 'reason']));
  });

  it('sólo 15, 30, 60 o 120 minutos; en emergencia hasta 60', () => {
    expect(supportRequestSchema.safeParse({ ...valid, minutes: 45 }).success).toBe(false);
    expect(supportRequestSchema.safeParse({ ...valid, minutes: 120 }).success).toBe(true);
    expect(supportRequestSchema.safeParse({ ...valid, minutes: 120, emergency: true }).success).toBe(false);
    expect(supportRequestSchema.safeParse({ ...valid, minutes: 60, emergency: true }).success).toBe(true);
  });

  it('arma el cuerpo de la API con el alcance marcado y sin referencia vacía', () => {
    expect(toSupportRequest({ ...valid, files: true, personal_data: true, ticketRef: '  ' })).toEqual({
      distributorId: valid.distributorId,
      reason: valid.reason,
      ticketRef: undefined,
      minutes: 60,
      scope: ['personal_data', 'files'],
      emergency: false,
    });
  });
});

describe('formatRemaining', () => {
  it('mm:ss, h:mm:ss y nunca negativo', () => {
    expect(formatRemaining(42 * 60_000 + 13_000)).toBe('42:13');
    expect(formatRemaining(2 * 3600_000)).toBe('2:00:00');
    expect(formatRemaining(-5000)).toBe('00:00');
  });
});
