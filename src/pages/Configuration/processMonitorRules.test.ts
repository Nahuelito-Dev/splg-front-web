import { describe, expect, it } from 'vitest';
import { counterEntries, formatDuration, formatPeriod, needsAttention, sortByAttention } from './processMonitorRules';

describe('formatDuration', () => {
  it.each([
    [null, 'en curso'],
    [850, '850 ms'],
    [1800, '1,8 s'],
    [59_000, '59,0 s'],
    [120_000, '2 min'],
    [125_000, '2 min 5 s'],
  ])('%s → %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text);
  });
});

describe('formatPeriod', () => {
  it.each([
    [15, 'cada 15 s'],
    [300, 'cada 5 min'],
    [3600, 'cada hora'],
    [7200, 'cada 2 h'],
    [86400, 'cada día'],
    [172800, 'cada 2 días'],
  ])('%s s → %s', (s, text) => {
    expect(formatPeriod(s)).toBe(text);
  });
});

describe('counterEntries', () => {
  it('traduce los contadores conocidos y hace legible el resto', () => {
    expect(counterEntries({ processed: 3, anticipationDays: 5 })).toEqual([
      { key: 'processed', label: 'Procesados', value: 3 },
      { key: 'anticipationDays', label: 'Anticipation days', value: 5 },
    ]);
  });
  it('sin contadores devuelve una lista vacía', () => {
    expect(counterEntries(undefined)).toEqual([]);
  });
});

describe('atención', () => {
  it('atrasado, fallido y colgado piden atención; el resto no', () => {
    expect(['late', 'failed', 'stuck'].every((health) => needsAttention({ health: health as 'late' }))).toBe(true);
    expect(['ok', 'partial', 'running', 'never'].some((h) => needsAttention({ health: h as 'ok' }))).toBe(false);
  });
  it('ordena primero lo que pide atención sin alterar el resto', () => {
    const items = [
      { health: 'ok' as const, n: 1 },
      { health: 'failed' as const, n: 2 },
      { health: 'never' as const, n: 3 },
      { health: 'late' as const, n: 4 },
    ];
    expect(sortByAttention(items).map((i) => i.n)).toEqual([2, 4, 1, 3]);
  });
});
