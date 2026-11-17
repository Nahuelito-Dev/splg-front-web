import { describe, expect, it } from 'vitest';
import { formatPercent, formatRatio, formatSeconds } from './dispatchMetricsFormat';

describe('formatos de las métricas del despacho', () => {
  it('los segundos se leen como una persona', () => {
    expect(formatSeconds(null)).toBe('—');
    expect(formatSeconds(14.4)).toBe('14 s');
    expect(formatSeconds(120)).toBe('2 min');
    expect(formatSeconds(125)).toBe('2 min 5 s');
    expect(formatSeconds(3780)).toBe('1 h 3 min');
  });
  it('porcentajes y promedios con coma', () => {
    expect(formatPercent(62.5)).toBe('62,5 %');
    expect(formatPercent(null)).toBe('—');
    expect(formatRatio(1.7)).toBe('1,7');
  });
});
