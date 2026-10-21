import { describe, expect, it } from 'vitest';
import { CANCEL_REASON_MAX, cancelReasonError } from './cancelReason';

describe('motivo de cancelación', () => {
  it('es obligatorio: vacío o en blanco se rechaza', () => {
    expect(cancelReasonError('')).toBe('Escribí el motivo de la cancelación');
    expect(cancelReasonError('    ')).toBe('Escribí el motivo de la cancelación');
  });

  it('con un carácter alcanza: el back sólo exige que no esté vacío', () => {
    expect(cancelReasonError('x')).toBeUndefined();
    expect(cancelReasonError('Sin stock')).toBeUndefined();
  });

  it('respeta el máximo del DTO (500)', () => {
    expect(cancelReasonError('a'.repeat(CANCEL_REASON_MAX))).toBeUndefined();
    expect(cancelReasonError('a'.repeat(CANCEL_REASON_MAX + 1))).toMatch(/500/);
  });
});
