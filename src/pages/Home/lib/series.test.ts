import { describe, expect, it } from 'vitest';
import { dayKey, dayRange, fillDays, fillMonths, shiftDay, splitWindows, totalOf } from './series';

const row = (period: string, totalSales: number, totalOrders = 1) => ({ period, totalSales, totalOrders });

describe('series de ventas', () => {
  it('cuenta el día en hora de Buenos Aires', () => {
    expect(dayKey('2026-09-01T03:00:00.000Z')).toBe('2026-09-01');
    expect(dayKey('2026-09-01T02:59:00.000Z')).toBe('2026-08-31');
  });

  it('corre días de calendario cruzando meses y años', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(dayRange('2026-10-01', 7)).toEqual({ from: '2026-09-25', to: '2026-10-01' });
  });

  it('completa con ceros los días sin ventas y conserva el orden', () => {
    const points = fillDays([row('2026-09-29T03:00:00.000Z', 100, 2)], '2026-10-01', 3);
    expect(points.map((p) => [p.key, p.sales, p.orders])).toEqual([
      ['2026-09-29', 100, 2],
      ['2026-09-30', 0, 0],
      ['2026-10-01', 0, 0],
    ]);
    expect(points[2].label).toBe('1/10');
  });

  it('agrupa por mes y completa los meses vacíos', () => {
    const points = fillMonths([row('2026-08-01T03:00:00.000Z', 50)], '2026-10-15', 3);
    expect(points.map((p) => [p.key, p.sales])).toEqual([
      ['2026-08', 50],
      ['2026-09', 0],
      ['2026-10', 0],
    ]);
  });

  it('parte la serie en el período actual y el anterior', () => {
    const points = fillDays([row('2026-09-30T03:00:00.000Z', 10), row('2026-09-28T03:00:00.000Z', 4)], '2026-10-01', 4);
    const { current, previous } = splitWindows(points, 2);
    expect(totalOf(current, 'sales')).toBe(10);
    expect(totalOf(previous, 'sales')).toBe(4);
    expect(totalOf(current, 'orders')).toBe(1);
  });
});
