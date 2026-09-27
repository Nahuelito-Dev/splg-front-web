import { describe, expect, it } from 'vitest';
import { carSchema } from './carSchema';

const valid = {
  user_id: 'a2f4645a-1005-49b8-b86c-14f44d34475e',
  type_car: 'Moto',
  car_patent: 'ab104ej',
  car_brand: 'Honda',
  car_model: 'Titan 150',
  car_color: 'Rojo',
  car_year: 2022,
  car_capacity: 50,
};

describe('carSchema', () => {
  it('acepta un vehículo válido y pasa la patente a mayúsculas', () => {
    const result = carSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.car_patent).toBe('AB104EJ');
  });

  it('los campos numéricos son opcionales: vacíos no rompen', () => {
    const result = carSchema.safeParse({ ...valid, car_year: '', car_capacity: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.car_year).toBeUndefined();
      expect(result.data.car_capacity).toBeUndefined();
    }
  });

  it.each([
    ['sin chofer', { user_id: '' }],
    ['sin tipo de vehículo', { type_car: '' }],
    ['sin patente', { car_patent: '' }],
    ['sin marca', { car_brand: '' }],
    ['sin modelo', { car_model: '' }],
    ['año inválido', { car_year: 1900 }],
    ['capacidad negativa', { car_capacity: -5 }],
  ])('rechaza %s', (_, cambio) => {
    expect(carSchema.safeParse({ ...valid, ...cambio }).success).toBe(false);
  });
});
