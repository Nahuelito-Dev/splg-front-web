import { describe, expect, it } from 'vitest';
import { daysAgo, isFutureMoment, toIsoDay } from './dates';

describe('dates', () => {
  it('formatea en fecha local, sin correrse por la zona horaria', () => {
    expect(toIsoDay(new Date(2026, 8, 26, 23, 30))).toBe('2026-09-26');
  });

  it('resta días cruzando meses', () => {
    expect(daysAgo(29, new Date(2026, 8, 26))).toBe('2026-08-28');
    expect(daysAgo(0, new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});

describe('isFutureMoment', () => {
  const now = new Date('2026-10-21T15:00:00Z');

  it('un día se interpreta como el back: medianoche UTC', () => {
    expect(isFutureMoment('2026-10-21', 0, now)).toBe(false);
    expect(isFutureMoment('2026-10-22', 0, now)).toBe(true);
    expect(isFutureMoment('2026-10-20', 0, now)).toBe(false);
  });

  it('un instante deja la tolerancia del reloj', () => {
    expect(isFutureMoment('2026-10-21T15:00:30Z', 60_000, now)).toBe(false);
    expect(isFutureMoment('2026-10-21T15:05:00Z', 60_000, now)).toBe(true);
  });

  it('vacío o inválido no es futuro', () => {
    expect(isFutureMoment('', 0, now)).toBe(false);
    expect(isFutureMoment('abc', 0, now)).toBe(false);
  });
});
