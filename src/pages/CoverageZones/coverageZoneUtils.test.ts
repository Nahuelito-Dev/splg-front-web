import { describe, expect, it } from 'vitest';
import {
  formatSurcharge,
  formatValidity,
  geoJsonRingToLatLngs,
  hasEnoughVertices,
  isValidHexColor,
  latLngsToGeoJsonRing,
  toDateInputValue,
} from './coverageZoneUtils';

describe('geoJsonRingToLatLngs / latLngsToGeoJsonRing', () => {
  it('invierte [lng,lat] a [lat,lng] y viceversa sin perder precisión', () => {
    const ring = [
      [-55.9, -27.36],
      [-55.88, -27.36],
      [-55.88, -27.38],
    ];
    const latLngs = geoJsonRingToLatLngs(ring);
    expect(latLngs).toEqual([
      [-27.36, -55.9],
      [-27.36, -55.88],
      [-27.38, -55.88],
    ]);
    expect(latLngsToGeoJsonRing(latLngs)).toEqual(ring);
  });
});

describe('isValidHexColor', () => {
  it('acepta un hex de 6 dígitos con #', () => {
    expect(isValidHexColor('#FF7A00')).toBe(true);
    expect(isValidHexColor('#ff7a00')).toBe(true);
  });

  it('rechaza formatos cortos, sin # o con letras inválidas', () => {
    expect(isValidHexColor('#FFF')).toBe(false);
    expect(isValidHexColor('FF7A00')).toBe(false);
    expect(isValidHexColor('#GG7A00')).toBe(false);
  });
});

describe('formatSurcharge', () => {
  it('un recargo porcentual se muestra con %', () => {
    expect(formatSurcharge('percentage', 10)).toBe('+10 %');
  });

  it('un recargo fijo se muestra en moneda', () => {
    expect(formatSurcharge('fixed', 1500).replace(/\s/g, ' ')).toBe('+$ 1.500');
  });
});

describe('formatValidity', () => {
  it('sin fechas, no hay vigencia que mostrar', () => {
    expect(formatValidity(null, null)).toBeNull();
  });

  it('con las dos fechas arma un rango', () => {
    expect(formatValidity('2026-10-01T00:00:00.000Z', '2026-12-31T00:00:00.000Z')).toMatch(/^Del .+ al .+$/);
  });

  it('sólo con validFrom', () => {
    expect(formatValidity('2026-10-01T00:00:00.000Z', null)).toMatch(/^Desde el /);
  });

  it('sólo con validUntil', () => {
    expect(formatValidity(null, '2026-12-31T00:00:00.000Z')).toMatch(/^Hasta el /);
  });
});

describe('hasEnoughVertices', () => {
  it('menos de 3 vértices no alcanza', () => {
    expect(hasEnoughVertices([[0, 0]])).toBe(false);
    expect(hasEnoughVertices(null)).toBe(false);
    expect(hasEnoughVertices(undefined)).toBe(false);
  });

  it('3 o más vértices alcanza', () => {
    expect(
      hasEnoughVertices([
        [0, 0],
        [1, 0],
        [1, 1],
      ]),
    ).toBe(true);
  });
});

describe('toDateInputValue', () => {
  it('recorta un date-time ISO a YYYY-MM-DD', () => {
    expect(toDateInputValue('2026-10-01T00:00:00.000Z')).toBe('2026-10-01');
  });

  it('sin fecha, cadena vacía', () => {
    expect(toDateInputValue(null)).toBe('');
  });
});
