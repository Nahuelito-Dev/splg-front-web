import { describe, expect, it } from 'vitest';
import { currentMonth, formatMonth, healthEntries, shiftMonth } from './platformRules';

describe('meses', () => {
  it('el mes en curso es el de Argentina, no el de UTC', () => {
    // 1 de diciembre 01:00 UTC = 30 de noviembre 22:00 en Buenos Aires.
    expect(currentMonth(new Date('2026-12-01T01:00:00Z'))).toBe('2026-11');
  });

  it('se muestra en castellano', () => {
    expect(formatMonth('2026-11')).toBe('noviembre de 2026');
    expect(formatMonth('basura')).toBe('basura');
  });

  it('se corre de año en enero y diciembre', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-11', -1)).toBe('2026-10');
  });
});

describe('healthEntries', () => {
  it('primero lo que pide atención, sin los ceros, con la etiqueta de cada salud', () => {
    const entries = healthEntries({ ok: 8, failed: 1, never: 0, late: 2 });
    expect(entries.map((e) => [e.key, e.count])).toEqual([
      ['failed', 1],
      ['late', 2],
      ['ok', 8],
    ]);
    expect(entries[0].label.text).toBe('Falló');
  });

  it('una salud que el panel no conoce se muestra igual', () => {
    expect(healthEntries({ nueva: 1 })[0].label).toEqual({ text: 'nueva', tone: 'neutral' });
  });
});
