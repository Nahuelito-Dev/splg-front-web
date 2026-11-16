import { describe, expect, it } from 'vitest';
import type { Order } from '../../../../services/api/types';
import { orderCoordinates } from './orderLocation';

const withAddress = (latitude: string | null, longitude: string | null): Pick<Order, 'delivery_address'> => ({
  delivery_address: {
    address_id: 'a',
    street: 'Calle 1',
    city: 'Posadas',
    postal_code: null,
    latitude,
    longitude,
    formatted_address: null,
    additional_instructions: null,
  },
});

describe('orderCoordinates', () => {
  it('lee las coordenadas que la API manda como texto', () => {
    expect(orderCoordinates(withAddress('-27.3671', '-55.8961'))).toEqual([-27.3671, -55.8961]);
  });

  it('sin coordenadas, con texto inválido o fuera de rango devuelve null', () => {
    expect(orderCoordinates(withAddress(null, null))).toBeNull();
    expect(orderCoordinates(withAddress('x', '-55'))).toBeNull();
    expect(orderCoordinates(withAddress('120', '-55'))).toBeNull();
    expect(orderCoordinates({ delivery_address: null })).toBeNull();
  });
});
