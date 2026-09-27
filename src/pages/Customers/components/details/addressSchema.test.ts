import { describe, expect, it } from 'vitest';
import { addressSchema } from './addressSchema';

const valid = {
  street: 'Corrientes 3171',
  city: 'Posadas',
  postalCode: '3300',
  floor: '2',
  apartment: 'A',
  formattedAddress: 'Corrientes 3171, Posadas, Misiones',
  additionalInstructions: 'Portón negro',
  geocodePrecision: 'approximate' as const,
  latitude: -27.3671,
  longitude: -55.8961,
  isDefault: false,
};

describe('addressSchema', () => {
  it('acepta una dirección válida', () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it('lo opcional puede faltar', () => {
    const { postalCode, floor, apartment, formattedAddress, additionalInstructions, ...minimo } = valid;
    void postalCode;
    void floor;
    void apartment;
    void formattedAddress;
    void additionalInstructions;
    expect(addressSchema.safeParse(minimo).success).toBe(true);
  });

  it.each([
    ['sin calle', { street: '' }],
    ['sin ciudad', { city: '' }],
    ['piso demasiado largo', { floor: '12345678901' }],
    ['depto demasiado largo', { apartment: '12345678901' }],
    ['precisión inválida', { geocodePrecision: 'inventada' }],
    ['latitud fuera de rango', { latitude: 200 }],
    ['longitud fuera de rango', { longitude: -200 }],
  ])('rechaza %s', (_, cambio) => {
    expect(addressSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });

  it('sin punto en el mapa no valida (no son number)', () => {
    const { latitude, longitude, ...resto } = valid;
    void latitude;
    void longitude;
    expect(addressSchema.safeParse(resto).success).toBe(false);
  });
});
