import { describe, expect, it } from 'vitest';
import {
  ringSelfIntersects,
  withoutRepeatedVertices,
  zoneSaveError,
  countVertices,
  formatSurcharge,
  formatValidity,
  geoJsonRingToLatLngs,
  hasEnoughVertices,
  isValidHexColor,
  latLngsToGeoJsonRing,
  toDateInputValue,
  vigenciaChanges,
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

describe('vigencia de una zona con el día argentino', () => {
  it('lo que guarda el back para «2 al 10 de nov» se ve del 2 al 10, no un día antes', () => {
    expect(formatValidity('2026-11-02T03:00:00.000Z', '2026-11-11T02:59:59.999Z')).toBe(
      'Del 2 nov 2026 al 10 nov 2026',
    );
  });

  it('el formulario recibe el mismo día para editar', () => {
    expect(toDateInputValue('2026-11-02T03:00:00.000Z')).toBe('2026-11-02');
    expect(toDateInputValue('2026-11-11T02:59:59.999Z')).toBe('2026-11-10');
  });
});

describe('vigenciaChanges', () => {
  const original = { validFrom: '2026-11-02T03:00:00.000Z', validUntil: '2026-11-11T02:59:59.999Z' };

  it('en el alta manda el día elegido, o nada si está vacío', () => {
    expect(vigenciaChanges(null, { validFrom: '2026-11-02', validUntil: '' })).toEqual({
      validFrom: '2026-11-02',
      validUntil: undefined,
    });
  });

  it('en la edición no manda lo que no cambió (así no pisa la hora guardada)', () => {
    expect(vigenciaChanges(original, { validFrom: '2026-11-02', validUntil: '2026-11-10' })).toEqual({
      validFrom: undefined,
      validUntil: undefined,
    });
  });

  it('manda sólo lo que cambió', () => {
    expect(vigenciaChanges(original, { validFrom: '2026-11-03', validUntil: '2026-11-10' })).toEqual({
      validFrom: '2026-11-03',
      validUntil: undefined,
    });
  });

  it('vaciar un campo con fecha manda null para quitar el límite', () => {
    expect(vigenciaChanges(original, { validFrom: '', validUntil: '2026-11-10' })).toEqual({
      validFrom: null,
      validUntil: undefined,
    });
  });

  it('vaciar un campo que ya estaba vacío no manda nada', () => {
    expect(vigenciaChanges({ validFrom: null, validUntil: null }, { validFrom: '', validUntil: '' })).toEqual({
      validFrom: undefined,
      validUntil: undefined,
    });
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
  it('da el día argentino de un date-time ISO en YYYY-MM-DD', () => {
    expect(toDateInputValue('2026-10-01T03:00:00.000Z')).toBe('2026-10-01');
  });

  it('sin fecha, cadena vacía', () => {
    expect(toDateInputValue(null)).toBe('');
  });
});

describe('countVertices', () => {
  it('no cuenta el punto de cierre del anillo', () => {
    expect(
      countVertices([
        [0, 0],
        [1, 0],
        [0, 1],
        [0, 0],
      ]),
    ).toBe(3);
  });

  it('un anillo sin cerrar cuenta todos sus puntos y uno vacío, cero', () => {
    expect(
      countVertices([
        [0, 0],
        [1, 0],
        [0, 1],
      ]),
    ).toBe(3);
    expect(countVertices([])).toBe(0);
    expect(countVertices(undefined)).toBe(0);
  });
});

describe('vértices al cerrar un trazo', () => {
  const at = (lat: number, lng: number) => ({ lat, lng });
  it('saca los vértices a menos de 1 m del anterior (el doble clic) y el último si cae sobre el primero', () => {
    const points = [
      at(-27.4, -55.9),
      at(-27.41, -55.9),
      at(-27.410001, -55.900001),
      at(-27.41, -55.89),
      at(-27.400003, -55.9),
    ];
    expect(withoutRepeatedVertices(points)).toEqual([at(-27.4, -55.9), at(-27.41, -55.9), at(-27.41, -55.89)]);
  });
  it('deja los que están a más de 1 m', () => {
    const points = [at(-27.4, -55.9), at(-27.40002, -55.9), at(-27.41, -55.89)];
    expect(withoutRepeatedVertices(points)).toHaveLength(3);
  });
});

describe('ringSelfIntersects', () => {
  it('un moño se corta; un cuadrado (abierto o cerrado) y un triángulo no', () => {
    expect(
      ringSelfIntersects([
        [0, 0],
        [1, 1],
        [1, 0],
        [0, 1],
      ]),
    ).toBe(true);
    expect(
      ringSelfIntersects([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]),
    ).toBe(false);
    expect(
      ringSelfIntersects([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ]),
    ).toBe(false);
    expect(
      ringSelfIntersects([
        [0, 0],
        [1, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(ringSelfIntersects(null)).toBe(false);
  });
  it('un lado que toca a otro no vecino también cuenta', () => {
    expect(
      ringSelfIntersects([
        [0, 0],
        [2, 0],
        [2, 2],
        [1, 0],
        [0, 2],
      ]),
    ).toBe(true);
  });
});

describe('zoneSaveError', () => {
  it('traduce el error de PostGIS y deja pasar los demás', () => {
    const postgis = new Error('El polígono no es válido: Self-intersection at or near point 1 2');
    expect((zoneSaveError(postgis) as Error).message).toMatch(/^Los lados de la zona se cruzan/);
    expect((zoneSaveError(new Error('El polígono no es válido: Too few points')) as Error).message).toMatch(
      /^El borde de la zona no es válido/,
    );
    const other = new Error('Ya existe una zona con ese nombre');
    expect(zoneSaveError(other)).toBe(other);
  });
});
