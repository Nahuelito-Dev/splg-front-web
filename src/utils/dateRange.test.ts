import { describe, expect, it } from 'vitest';
import { addDays, isValidDay, matchPreset, presetRange, previousRange, rangeLength, resolvePreset } from './dateRange';

const NOW = new Date(2026, 9, 15, 14, 30); // 15 oct 2026

describe('dateRange', () => {
  it('arma cada atajo a partir de hoy', () => {
    expect(presetRange('today', NOW)).toEqual({ from: '2026-10-15', to: '2026-10-15' });
    expect(presetRange('last7', NOW)).toEqual({ from: '2026-10-09', to: '2026-10-15' });
    expect(presetRange('thisMonth', NOW)).toEqual({ from: '2026-10-01', to: '2026-10-15' });
    expect(presetRange('lastMonth', NOW)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(presetRange('thisYear', NOW)).toEqual({ from: '2026-01-01', to: '2026-10-15' });
  });

  it('el mes anterior de enero es diciembre del año previo', () => {
    expect(presetRange('lastMonth', new Date(2026, 0, 10))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it('el período anterior tiene el mismo largo y termina un día antes', () => {
    const range = { from: '2026-10-09', to: '2026-10-15' };
    expect(rangeLength(range)).toBe(7);
    expect(previousRange(range)).toEqual({ from: '2026-10-02', to: '2026-10-08' });
    expect(previousRange({ from: '2026-03-01', to: '2026-03-31' })).toEqual({ from: '2026-01-29', to: '2026-02-28' });
  });

  it('reconoce el atajo, o null si es personalizado', () => {
    expect(matchPreset({ from: '2026-10-01', to: '2026-10-15' }, NOW)).toBe('thisMonth');
    expect(matchPreset({ from: '2026-10-03', to: '2026-10-04' }, NOW)).toBeNull();
  });

  it('valida días de calendario', () => {
    expect(isValidDay('2026-02-28')).toBe(true);
    expect(isValidDay('2026-02-30')).toBe(false);
    expect(isValidDay('hoy')).toBe(false);
    expect(isValidDay(null)).toBe(false);
  });

  it('suma días cruzando de mes', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('resolvePreset', () => {
  it('el atajo guardado gana aunque otro tenga las mismas fechas', () => {
    const first = new Date(2026, 9, 1);
    const range = { from: '2026-10-01', to: '2026-10-01' };
    expect(matchPreset(range, first)).toBe('today');
    expect(resolvePreset('thisMonth', range, first)).toBe('thisMonth');
  });

  it('un atajo que ya no coincide con las fechas, o desconocido, no vale', () => {
    const now = new Date(2026, 9, 15);
    expect(resolvePreset('last7', { from: '2026-10-01', to: '2026-10-07' }, now)).toBeNull();
    expect(resolvePreset('nada', presetRange('today', now), now)).toBeNull();
    expect(resolvePreset(null, presetRange('today', now), now)).toBeNull();
  });
});
