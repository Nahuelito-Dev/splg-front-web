import { describe, expect, it } from 'vitest';
import { daysAgo, toIsoDay } from './dates';

describe('dates', () => {
  it('formatea en fecha local, sin correrse por la zona horaria', () => {
    expect(toIsoDay(new Date(2026, 8, 26, 23, 30))).toBe('2026-09-26');
  });

  it('resta días cruzando meses', () => {
    expect(daysAgo(29, new Date(2026, 8, 26))).toBe('2026-08-28');
    expect(daysAgo(0, new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
