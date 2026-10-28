import { describe, expect, it } from 'vitest';
import { parseScanAmount, prefillFromScan, scanPaidAtToLocal } from './scanPrefill';

describe('parseScanAmount', () => {
  it('entiende el formato argentino y el de punto decimal', () => {
    expect(parseScanAmount('29.958,50')).toBe(29958.5);
    expect(parseScanAmount('$ 29958.50')).toBe(29958.5);
    expect(parseScanAmount('29.958')).toBe(29958);
    expect(parseScanAmount('1,234.56')).toBe(1234.56);
    expect(parseScanAmount('15000,5')).toBe(15000.5);
  });

  it('lo que no es un importe da null', () => {
    expect(parseScanAmount(null)).toBeNull();
    expect(parseScanAmount('abc')).toBeNull();
    expect(parseScanAmount('0')).toBeNull();
  });
});

describe('scanPaidAtToLocal', () => {
  it('una fecha sin hora queda al mediodía', () => {
    expect(scanPaidAtToLocal('2026-10-20')).toBe('2026-10-20T12:00');
    expect(scanPaidAtToLocal(null)).toBe('');
  });
});

describe('prefillFromScan', () => {
  const fallback = { paidAt: '2026-10-28T09:00', amount: 29958, operationNumber: '' };

  it('usa lo leído y deja el valor por defecto en lo que no leyó', () => {
    const result = prefillFromScan(
      {
        amount: '30.000,00',
        paidAt: null,
        operationNumber: 'OP-9',
        payee: null,
        payeeTaxId: null,
        period: null,
        confidence: 'high',
        warnings: [],
      },
      fallback,
    );
    expect(result).toEqual({ paidAt: '2026-10-28T09:00', amount: 30000, operationNumber: 'OP-9' });
  });
});
