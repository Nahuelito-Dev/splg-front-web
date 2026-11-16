import { describe, expect, it } from 'vitest';
import { formatRelative } from './relativeTime';

const NOW = Date.UTC(2026, 9, 1, 12);

describe('hora relativa', () => {
  it('pasado y futuro', () => {
    expect(formatRelative(NOW - 5 * 60_000, NOW)).toBe('hace 5 minutos');
    expect(formatRelative(NOW - 2 * 3_600_000, NOW)).toBe('hace 2 horas');
    expect(formatRelative(NOW + 3 * 86_400_000, NOW)).toBe('dentro de 3 días');
    expect(formatRelative(NOW - 10_000, NOW)).toBe('hace instantes');
  });
});
