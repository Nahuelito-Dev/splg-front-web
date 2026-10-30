import { describe, expect, it } from 'vitest';
import { expectedFineAmount } from './finePayment';

const fine = { amount: 85000, voluntaryPaymentAmount: 59500, dueDate: '2026-11-02' };

describe('expectedFineAmount', () => {
  it('el voluntario vale hasta el vencimiento inclusive', () => {
    expect(expectedFineAmount(fine, '2026-11-02')).toBe(59500);
    expect(expectedFineAmount(fine, '2026-10-01')).toBe(59500);
  });

  it('vencido, se espera el importe de la multa', () => {
    expect(expectedFineAmount(fine, '2026-11-03')).toBe(85000);
  });

  it('sin vencimiento el voluntario sigue valiendo; sin voluntario, el de la multa', () => {
    expect(expectedFineAmount({ ...fine, dueDate: null }, '2030-01-01')).toBe(59500);
    expect(expectedFineAmount({ ...fine, voluntaryPaymentAmount: null }, '2026-10-01')).toBe(85000);
  });
});
