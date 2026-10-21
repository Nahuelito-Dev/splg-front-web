import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { argentinaDay } from '../../utils/format';
import { day, insufficientCashMessage, nonNegativeMoney, parseMoney, pastDay, positiveMoney } from './financeSchemas';

/** Reloj fijo: las reglas de «no futuro» y «no pasado» dependen de la hora de ejecución. */
const NOW = new Date('2026-10-21T15:00:00.000Z');
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('financeSchemas', () => {
  it('parseMoney acepta coma decimal', () => {
    expect(parseMoney('1234,5')).toBe(1234.5);
    expect(parseMoney(' 10.25 ')).toBe(10.25);
  });

  it.each(['0', '-1', '1.234', 'abc', ''])('positiveMoney rechaza %p', (value) => {
    expect(positiveMoney().safeParse(value).success).toBe(false);
  });

  it.each(['0.01', '100', '2500,5'])('positiveMoney acepta %p', (value) => {
    expect(positiveMoney().safeParse(value).success).toBe(true);
  });

  it('nonNegativeMoney acepta cero y rechaza negativos', () => {
    expect(nonNegativeMoney().safeParse('0').success).toBe(true);
    expect(nonNegativeMoney().safeParse('-5').success).toBe(false);
  });

  it('day exige una fecha real', () => {
    expect(day().safeParse('2026-10-17').success).toBe(true);
    expect(day().safeParse('2026-13-45').success).toBe(false);
    expect(day().safeParse('').success).toBe(false);
  });

  it('los importes tienen tope, como el back (9.999.999.999,99)', () => {
    expect(positiveMoney().safeParse('9999999999.99').success).toBe(true);
    expect(positiveMoney().safeParse('10000000000').success).toBe(false);
    expect(nonNegativeMoney().safeParse('9999999999.99').success).toBe(true);
    expect(nonNegativeMoney().safeParse('10000000000').success).toBe(false);
  });

  it('pastDay rechaza un día futuro y acepta hoy y el pasado', () => {
    const future = argentinaDay(new Date(Date.now() + 3 * 86_400_000));
    expect(pastDay().safeParse(future).success).toBe(false);
    expect(pastDay().safeParse('2020-01-01').success).toBe(true);
    expect(pastDay().safeParse(argentinaDay(new Date())).success).toBe(true);
  });

  describe('insufficientCashMessage', () => {
    it('una caja de efectivo no puede quedar en negativo', () => {
      expect(insufficientCashMessage({ kind: 'cash', balance: 100 }, 100.01)).toMatch(/Saldo insuficiente/);
      expect(insufficientCashMessage({ kind: 'cash', balance: 100 }, 100)).toBeUndefined();
    });

    it('banco y billetera sí pueden', () => {
      expect(insufficientCashMessage({ kind: 'bank', balance: 0 }, 500)).toBeUndefined();
      expect(insufficientCashMessage({ kind: 'wallet', balance: 0 }, 500)).toBeUndefined();
    });
  });
});
