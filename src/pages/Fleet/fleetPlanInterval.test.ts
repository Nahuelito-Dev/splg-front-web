import { describe, expect, it } from 'vitest';
import { intervalText } from './fleetPlanInterval';

describe('intervalText', () => {
  it('por kilometraje muestra el intervalo', () => {
    expect(intervalText({ trigger: 'by_km', intervalKm: 10000, intervalMonths: null })).toBe(
      'Por kilometraje · cada 10000 km',
    );
  });

  it('por tiempo muestra los meses', () => {
    expect(intervalText({ trigger: 'by_time', intervalKm: null, intervalMonths: 6 })).toBe('Por tiempo · cada 6 meses');
  });

  it('sin intervalo o con fecha fija queda sólo el disparador', () => {
    expect(intervalText({ trigger: 'by_km', intervalKm: null, intervalMonths: null })).toBe('Por kilometraje');
    expect(intervalText({ trigger: 'by_fixed_date', intervalKm: null, intervalMonths: null })).toBe('Fecha fija');
  });
});
