import { describe, expect, it } from 'vitest';
import { greetingFor, sparkPath } from './dashboard';
import { formatLongDay, percentChange } from '../../../utils/format';

describe('tablero', () => {
  it('saluda según la hora', () => {
    expect(greetingFor(new Date(2026, 8, 26, 9))).toBe('Buen día');
    expect(greetingFor(new Date(2026, 8, 26, 15))).toBe('Buenas tardes');
    expect(greetingFor(new Date(2026, 8, 26, 21))).toBe('Buenas noches');
  });

  it('el sparkline arranca en el primer punto y termina en el último', () => {
    const path = sparkPath([0, 10, 5], 100, 30);
    expect(path?.line.startsWith('M0.0 27.0')).toBe(true);
    expect(path?.last).toEqual({ x: 100, y: 15 });
  });

  it('una serie plana queda en el medio y una de un punto no se dibuja', () => {
    expect(sparkPath([4, 4, 4], 100, 30)?.last.y).toBe(15);
    expect(sparkPath([4], 100, 30)).toBeNull();
  });

  it('variación porcentual con un decimal, sin base no hay variación', () => {
    expect(percentChange(112, 100)).toBe(12);
    expect(percentChange(90400, 203400)).toBe(-55.6);
    expect(percentChange(5, 0)).toBeNull();
  });

  it('fecha larga con mayúscula inicial', () => {
    // Un instante (mediodía en Buenos Aires): el día que se muestra es el argentino, corra donde corra el test.
    expect(formatLongDay(new Date('2026-09-26T15:00:00.000Z'))).toBe('Sábado, 26 de septiembre');
  });
});
