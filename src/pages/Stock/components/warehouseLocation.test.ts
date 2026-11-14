import { describe, expect, it } from 'vitest';
import {
  locationOf,
  parseCoordinate,
  warehouseCreateBody,
  warehouseSchema,
  warehouseUpdateBody,
  type WarehouseFormValues,
} from './warehouseSchema';

const base: WarehouseFormValues = {
  name: 'Central',
  code: 'CEN',
  kind: 'depot',
  address: '',
  isDefault: false,
  latitude: '',
  longitude: '',
};
const POSADAS = { latitude: '-27.367100', longitude: '-55.896100' };

const errorsOf = (values: Partial<WarehouseFormValues>) => {
  const result = warehouseSchema.safeParse({ ...base, ...values });
  return result.success ? {} : result.error.flatten().fieldErrors;
};

describe('ubicación del galpón: validación (UbicacionDeDepositoDto)', () => {
  it('sin ubicación y con las dos coordenadas es válido', () => {
    expect(errorsOf({})).toEqual({});
    expect(errorsOf(POSADAS)).toEqual({});
  });

  it('las dos o ninguna: sólo la latitud marca la longitud, y al revés', () => {
    expect(errorsOf({ latitude: '-27.3' })).toEqual({
      longitude: ['Va junto con la latitud: completá las dos o ninguna'],
    });
    expect(errorsOf({ longitude: '-55.9' })).toEqual({
      latitude: ['Va junto con la longitud: completá las dos o ninguna'],
    });
  });

  it('los bordes del rango entran; un paso afuera no', () => {
    expect(errorsOf({ latitude: '-90', longitude: '180' })).toEqual({});
    expect(errorsOf({ latitude: '90', longitude: '-180' })).toEqual({});
    expect(errorsOf({ latitude: '90.000001', longitude: '0' })).toEqual({ latitude: ['La latitud va de -90 a 90'] });
    expect(errorsOf({ latitude: '-90.5', longitude: '0' })).toEqual({ latitude: ['La latitud va de -90 a 90'] });
    expect(errorsOf({ latitude: '0', longitude: '180.1' })).toEqual({
      longitude: ['La longitud va de -180 a 180'],
    });
    expect(errorsOf({ latitude: '0', longitude: '-181' })).toEqual({
      longitude: ['La longitud va de -180 a 180'],
    });
  });

  it('un texto que no es número se rechaza; la coma decimal se acepta', () => {
    expect(errorsOf({ latitude: 'abc', longitude: '1' })).toEqual({ latitude: ['La latitud tiene que ser un número'] });
    expect(errorsOf({ latitude: '1', longitude: 'Infinity' })).toEqual({
      longitude: ['La longitud tiene que ser un número'],
    });
    expect(parseCoordinate(' -27,5 ')).toBe(-27.5);
    expect(parseCoordinate('   ')).toBeNull();
  });
});

describe('ubicación del galpón: cuerpo para la API v2', () => {
  it('el alta manda las coordenadas como número, o ninguna', () => {
    expect(warehouseCreateBody({ ...base, ...POSADAS })).toMatchObject({ latitude: -27.3671, longitude: -55.8961 });
    const sin = warehouseCreateBody(base);
    expect(sin).not.toHaveProperty('latitude');
    expect(sin).not.toHaveProperty('longitude');
  });

  it('la edición fija la ubicación de un galpón sin ubicar', () => {
    const body = warehouseUpdateBody({ ...base, ...POSADAS }, { isDefault: false, latitude: null, longitude: null });
    expect(body).toMatchObject({ latitude: -27.3671, longitude: -55.8961 });
  });

  it('la edición sin cambios en la ubicación no la manda', () => {
    const current = { isDefault: false, latitude: -27.3671, longitude: -55.8961 };
    expect(warehouseUpdateBody({ ...base, ...POSADAS }, current)).not.toHaveProperty('latitude');
    expect(warehouseUpdateBody(base, { isDefault: false, latitude: null, longitude: null })).not.toHaveProperty(
      'latitude',
    );
  });

  it('la edición que mueve el punto manda el nuevo', () => {
    const current = { isDefault: false, latitude: -27.3671, longitude: -55.8961 };
    const body = warehouseUpdateBody({ ...base, latitude: '-27.4', longitude: '-55.8961' }, current);
    expect(body).toMatchObject({ latitude: -27.4, longitude: -55.8961 });
  });

  it('vaciar las dos coordenadas manda las dos en null (borra la ubicación)', () => {
    const current = { isDefault: false, latitude: -27.3671, longitude: -55.8961 };
    const body = warehouseUpdateBody(base, current);
    expect(body).toHaveProperty('latitude', null);
    expect(body).toHaveProperty('longitude', null);
  });

  it('locationOf sólo da un punto con las dos coordenadas', () => {
    expect(locationOf({ latitude: '-27', longitude: '' })).toBeNull();
    expect(locationOf(POSADAS)).toEqual({ latitude: -27.3671, longitude: -55.8961 });
  });
});
