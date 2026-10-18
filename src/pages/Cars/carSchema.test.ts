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
  fuel_type: '',
};

describe('carSchema', () => {
  it('acepta un vehículo válido y pasa la patente a mayúsculas', () => {
    const result = carSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.car_patent).toBe('AB104EJ');
  });

  it('normaliza la patente: sin espacios ni guiones', () => {
    const result = carSchema.safeParse({ ...valid, car_patent: ' ab 104-ej ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.car_patent).toBe('AB104EJ');
  });

  it('la patente tiene entre 4 y 20 letras o números, como pide el back', () => {
    expect(carSchema.safeParse({ ...valid, car_patent: 'ab1' }).success).toBe(false);
    expect(carSchema.safeParse({ ...valid, car_patent: 'a'.repeat(21) }).success).toBe(false);
    expect(carSchema.safeParse({ ...valid, car_patent: 'ab#104' }).success).toBe(false);
    expect(carSchema.safeParse({ ...valid, car_patent: 'ab12' }).success).toBe(true);
  });

  it('una patente de sólo guiones o espacios se rechaza', () => {
    expect(carSchema.safeParse({ ...valid, car_patent: ' - ' }).success).toBe(false);
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

  it('combustible y tanque: opcionales, con el tanque entre 1 y 9999 litros', () => {
    expect(carSchema.safeParse({ ...valid, fuel_type: 'diesel', tank_capacity_liters: '60' }).success).toBe(true);
    expect(carSchema.safeParse({ ...valid, fuel_type: 'agua' }).success).toBe(false);
    expect(carSchema.safeParse({ ...valid, tank_capacity_liters: '0' }).success).toBe(false);
    expect(carSchema.safeParse({ ...valid, tank_capacity_liters: '10000' }).success).toBe(false);
    expect(carSchema.safeParse({ ...valid, tank_capacity_liters: '' }).success).toBe(true);
  });
});
