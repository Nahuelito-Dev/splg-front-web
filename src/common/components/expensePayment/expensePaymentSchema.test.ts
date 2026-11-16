import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { expensePaymentSchema } from './expensePaymentSchema';

const NOW = new Date('2026-10-30T15:00:00.000Z');
const ok = { cashBoxId: 'caja-1', paidAt: '2026-10-29T10:00', amount: '' };

describe('expensePaymentSchema', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const issues = (rules: Parameters<typeof expensePaymentSchema>[0], values: object) => {
    const result = expensePaymentSchema(rules).safeParse({ ...ok, ...values });
    return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  };

  it('sin importe, pide la caja y la fecha', () => {
    expect(issues({ withAmount: false }, {})).toEqual([]);
    expect(issues({ withAmount: false }, { cashBoxId: '' })).toEqual(['cashBoxId: Elegí la caja']);
    expect(issues({ withAmount: false }, { paidAt: '' })).toEqual(['paidAt: Ingresá la fecha']);
  });

  it('la fecha no puede ser futura', () => {
    expect(issues({ withAmount: false }, { paidAt: '2026-11-02T10:00' })).toEqual([
      'paidAt: La fecha no puede ser futura',
    ]);
  });

  it('la fecha no puede ser anterior al gasto (día argentino) y dice su mensaje', () => {
    const rules = { withAmount: false, notBefore: '2026-10-28T15:00:00.000Z', dateMessage: 'Antes del siniestro' };
    expect(issues(rules, { paidAt: '2026-10-27T10:00' })).toEqual(['paidAt: Antes del siniestro']);
    expect(issues(rules, { paidAt: '2026-10-28T10:00' })).toEqual([]);
  });

  it('el importe es obligatorio, positivo, con hasta 2 decimales y sin pasar el tope', () => {
    const rules = { withAmount: true, maxAmount: 1000 };
    expect(issues(rules, { amount: '' })).toEqual(['amount: Ingresá el importe']);
    expect(issues(rules, { amount: '0' })).toEqual(['amount: El importe tiene que ser mayor a 0']);
    expect(issues(rules, { amount: '10.123' })).toEqual(['amount: Hasta 2 decimales']);
    expect(issues(rules, { amount: '1000.01' })).toEqual(['amount: No puede superar lo cargado al cerrar']);
    expect(issues(rules, { amount: '1000' })).toEqual([]);
  });

  it('un texto que no es número se trata como vacío; los decimales se cuentan sin errores de coma flotante', () => {
    const rules = { withAmount: true, maxAmount: 1000 };
    expect(issues(rules, { amount: 'abc' })).toEqual(['amount: Ingresá el importe']);
    expect(issues(rules, { amount: '0.29' })).toEqual([]);
    expect(issues(rules, { amount: '1.005' })).toEqual(['amount: Hasta 2 decimales']);
  });

  it('sin tope el importe sólo tiene que ser válido', () => {
    expect(issues({ withAmount: true, maxAmount: null }, { amount: '99999999' })).toEqual([]);
  });
});
