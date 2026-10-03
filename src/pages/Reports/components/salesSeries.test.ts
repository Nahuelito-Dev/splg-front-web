import { describe, expect, it } from 'vitest';
import { bucketStarts, buildTrend, salesByBucket, trendPreviousRange } from './salesSeries';

const row = (period: string, totalSales: number) => ({ period, totalOrders: 1, totalSales });

describe('salesSeries', () => {
  it('un tramo por día, ambos extremos incluidos', () => {
    expect(bucketStarts({ from: '2026-10-01', to: '2026-10-03' }, 'day')).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('las semanas arrancan el lunes', () => {
    // 2026-10-01 es jueves: la semana empieza el lunes 28/9.
    expect(bucketStarts({ from: '2026-10-01', to: '2026-10-14' }, 'week')).toEqual([
      '2026-09-28',
      '2026-10-05',
      '2026-10-12',
    ]);
  });

  it('los meses van del 1º de cada uno', () => {
    expect(bucketStarts({ from: '2026-08-15', to: '2026-10-02' }, 'month')).toEqual([
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ]);
  });

  it('rellena con cero los días sin ventas', () => {
    const range = { from: '2026-10-01', to: '2026-10-03' };
    const rows = [row(new Date(2026, 9, 1).toISOString(), 100), row(new Date(2026, 9, 3).toISOString(), 50)];
    expect(salesByBucket(rows, range, 'day')).toEqual([100, 0, 50]);
  });

  it('alinea el período anterior punto a punto', () => {
    const range = { from: '2026-10-03', to: '2026-10-04' };
    const prevRange = { from: '2026-10-01', to: '2026-10-02' };
    const trend = buildTrend(
      [row(new Date(2026, 9, 4).toISOString(), 80)],
      [row(new Date(2026, 9, 1).toISOString(), 30)],
      range,
      prevRange,
      'day',
    );
    expect(trend.map((p) => [p.value, p.previous])).toEqual([
      [0, 30],
      [80, 0],
    ]);
  });

  it('sin período anterior no hay serie de comparación', () => {
    const trend = buildTrend(
      [],
      undefined,
      { from: '2026-10-01', to: '2026-10-01' },
      { from: '2026-09-30', to: '2026-09-30' },
      'day',
    );
    expect(trend[0].previous).toBeUndefined();
  });

  it('por mes compara contra los meses completos anteriores, tantos como tramos', () => {
    // 15/8 al 2/10 toca tres meses: el anterior son mayo, junio y julio enteros.
    expect(trendPreviousRange({ from: '2026-08-15', to: '2026-10-02' }, 'month')).toEqual({
      from: '2026-05-01',
      to: '2026-07-31',
    });
  });

  it('por semana compara contra las semanas completas anteriores (desde el lunes)', () => {
    // 1/10 es jueves: tramos 28/9, 5/10 y 12/10; el anterior arranca el 7/9 y termina el domingo 27/9.
    expect(trendPreviousRange({ from: '2026-10-01', to: '2026-10-14' }, 'week')).toEqual({
      from: '2026-09-07',
      to: '2026-09-27',
    });
  });

  it('por día sigue siendo el rango anterior de igual largo', () => {
    expect(trendPreviousRange({ from: '2026-10-03', to: '2026-10-04' }, 'day')).toEqual({
      from: '2026-10-01',
      to: '2026-10-02',
    });
  });

  it('el primer tramo parcial lleva la fecha real desde la que cuenta', () => {
    const range = { from: '2026-08-15', to: '2026-10-02' };
    const trend = buildTrend([], undefined, range, trendPreviousRange(range, 'month'), 'month');
    expect(trend.map((p) => p.label)).toEqual([
      expect.stringMatching(/^Desde 15/),
      expect.any(String),
      expect.any(String),
    ]);
  });
});
