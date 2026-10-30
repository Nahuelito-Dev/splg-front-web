import { describe, expect, it } from 'vitest';
import {
  argentinaToday,
  defaultGroupBy,
  isGroupBy,
  periodLabel,
  periodRange,
  rangeProblem,
  sharePercent,
} from './incomeStatementPeriod';

// 12:00 en Argentina.
const NOW = new Date('2026-10-30T15:00:00Z');

describe('periodRange', () => {
  it('arma los atajos contra el día de hoy', () => {
    const none = { from: '', to: '' };
    expect(periodRange('thisMonth', none, NOW)).toEqual({ from: '2026-10-01', to: '2026-10-30' });
    expect(periodRange('lastMonth', none, NOW)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(periodRange('last30', none, NOW)).toEqual({ from: '2026-10-01', to: '2026-10-30' });
    expect(periodRange('last90', none, NOW)).toEqual({ from: '2026-08-02', to: '2026-10-30' });
    expect(periodRange('thisYear', none, NOW)).toEqual({ from: '2026-01-01', to: '2026-10-30' });
  });

  it('usa el día de Argentina aunque en UTC ya sea el siguiente', () => {
    const lateAtNight = new Date('2026-11-01T02:30:00Z');
    expect(argentinaToday(lateAtNight)).toBe('2026-10-31');
    expect(periodRange('thisMonth', { from: '', to: '' }, lateAtNight)).toEqual({
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('mes pasado en enero cae en diciembre del año anterior', () => {
    expect(periodRange('lastMonth', { from: '', to: '' }, new Date('2027-01-15T15:00:00Z'))).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    });
  });

  it('el rango propio se usa tal cual', () => {
    expect(periodRange('custom', { from: '2026-03-01', to: '2026-03-15' }, NOW)).toEqual({
      from: '2026-03-01',
      to: '2026-03-15',
    });
  });
});

describe('rangeProblem', () => {
  it('acepta un rango válido de hasta 366 días', () => {
    expect(rangeProblem({ from: '2026-01-01', to: '2027-01-01' })).toBeNull();
  });

  it('rechaza el que falta, el invertido y el de más de 366 días', () => {
    expect(rangeProblem({ from: '', to: '2026-10-01' })).toMatch(/Elegí/);
    expect(rangeProblem({ from: '2026-10-05', to: '2026-10-01' })).toMatch(/posterior/);
    expect(rangeProblem({ from: '2026-01-01', to: '2027-01-02' })).toMatch(/366/);
  });
});

describe('defaultGroupBy', () => {
  it('días hasta 31, semanas hasta 120 y meses el resto', () => {
    expect(defaultGroupBy({ from: '2026-10-01', to: '2026-10-31' })).toBe('day');
    expect(defaultGroupBy({ from: '2026-09-01', to: '2026-10-30' })).toBe('week');
    expect(defaultGroupBy({ from: '2026-01-01', to: '2026-10-30' })).toBe('month');
  });
});

describe('isGroupBy', () => {
  it('sólo acepta día, semana o mes', () => {
    expect(['day', 'week', 'month'].every(isGroupBy)).toBe(true);
    expect(isGroupBy('year')).toBe(false);
    expect(isGroupBy('')).toBe(false);
  });
});

describe('etiquetas', () => {
  it('formatea el período del eje', () => {
    expect(periodLabel('2026-10-05', 'day')).toBe('05/10');
    expect(periodLabel('2026-10-05', 'week')).toBe('Sem 05/10');
    expect(periodLabel('2026-10-01', 'month')).toBe('oct 26');
  });

  it('el porcentaje es sobre el total y sin total no hay porcentaje', () => {
    expect(sharePercent(25, 200)).toBe('12,5 %');
    expect(sharePercent(10, 0)).toBe('—');
  });
});
