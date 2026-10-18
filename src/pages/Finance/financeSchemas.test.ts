import { describe, expect, it } from 'vitest';
import { day, nonNegativeMoney, parseMoney, positiveMoney } from './financeSchemas';

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
});
