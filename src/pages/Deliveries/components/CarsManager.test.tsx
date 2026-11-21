import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Car } from '../../../services/api/types';

const state = vi.hoisted(() => ({ cars: [] as unknown[] }));
vi.mock('../../../services/queries/cars', () => ({
  useCarsByUser: () => ({ data: state.cars, isPending: false }),
  useDeleteCar: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../hooks', () => ({
  usePermissions: () => ({ canWrite: true, writeHint: undefined, needsDistributor: false }),
}));
vi.mock('../../Cars/components/CarFormModal', () => ({ CarFormModal: () => null }));

import { CarsManager } from './CarsManager';

afterEach(cleanup);

const car = (photoUrl: string | null) =>
  ({
    car_id: 'car-1',
    car_brand: 'Ford',
    car_model: 'Cargo',
    car_patent: 'AB123CD',
    type_car: 'Camión',
    car_color: 'blanco',
    photoUrl,
  }) as unknown as Car;

describe('CarsManager: foto del vehículo', () => {
  it('muestra la foto del vehículo cuando la tiene', () => {
    state.cars = [car('https://fotos.test/cargo.jpg')];
    const { container } = render(<CarsManager userId="u-1" />);
    expect(container.querySelector('img[src="https://fotos.test/cargo.jpg"]')).not.toBeNull();
  });

  it('sin foto queda el ícono del tipo de vehículo', () => {
    state.cars = [car(null)];
    const { container } = render(<CarsManager userId="u-1" />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-testid="LocalShippingIcon"]')).not.toBeNull();
  });
});
