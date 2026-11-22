import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ vehicle: null as unknown }));
vi.mock('../../../services/queries/fleet', () => ({
  useVehicleInUse: () => ({ data: state.vehicle, isPending: false }),
  useReleaseVehicle: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../../hooks', () => ({
  usePermissions: () => ({ needsDistributor: false }),
}));
vi.mock('./AssignVehicleModal', () => ({ AssignVehicleModal: () => null }));

import { VehicleInUseCard } from './VehicleInUseCard';

afterEach(cleanup);

const vehicle = (photoUrl: string | null) => ({
  carId: 'car-1',
  carBrand: 'Ford',
  carModel: 'Cargo',
  carPatent: 'AB123CD',
  carTypeCar: 'Camión',
  assignedAt: '2026-11-01T10:00:00.000Z',
  note: null,
  isLocked: false,
  photoUrl,
});

describe('VehicleInUseCard: foto del vehículo', () => {
  it('muestra la foto del vehículo en uso', () => {
    state.vehicle = vehicle('https://fotos.test/cargo.jpg');
    const { container } = render(<VehicleInUseCard deliveryId="d-1" canWrite />);
    expect(container.querySelector('img[src="https://fotos.test/cargo.jpg"]')).not.toBeNull();
  });

  it('sin foto queda el círculo con el ícono del tipo', () => {
    state.vehicle = vehicle(null);
    const { container } = render(<VehicleInUseCard deliveryId="d-1" canWrite />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('span.rounded-full svg')).not.toBeNull();
  });
});
