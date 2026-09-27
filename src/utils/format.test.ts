import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, formatDay, formatElapsed, formatNumber, formatShortId } from './format';

describe('format', () => {
  it('moneda en pesos, sin decimales', () => {
    expect(formatCurrency(22600).replace(/\s/g, ' ')).toBe('$ 22.600');
    expect(formatCurrency('48900')).toContain('48.900');
  });

  it('valores ausentes o inválidos se muestran como guion', () => {
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency('')).toBe('—');
    expect(formatCurrency('abc')).toBe('—');
    expect(formatNumber(undefined)).toBe('—');
    expect(formatDate('no es fecha')).toBe('—');
  });

  it('una fecha sin hora no se corre un día por la zona horaria', () => {
    expect(formatDay('2026-09-26')).toMatch(/26/);
    expect(formatDay(null)).toBe('—');
  });
});

describe('formatShortId y formatElapsed', () => {
  it('el id del pedido son los últimos 6 en mayúscula', () => {
    expect(formatShortId('c59bc7cd-932f-413a-b7f7-794d51cbc4e7')).toBe('#CBC4E7');
  });

  it('el tiempo transcurrido', () => {
    const now = Date.parse('2026-09-26T20:00:00Z');
    expect(formatElapsed('2026-09-26T19:59:58Z', now)).toBe('hace instantes');
    expect(formatElapsed('2026-09-26T19:59:30Z', now)).toBe('hace 30s');
    expect(formatElapsed('2026-09-26T19:55:00Z', now)).toBe('hace 5m');
    expect(formatElapsed('2026-09-26T17:00:00Z', now)).toBe('hace 3h');
    expect(formatElapsed('no es fecha', now)).toBe('hace instantes');
  });
});
