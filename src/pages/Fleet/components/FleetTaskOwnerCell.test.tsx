import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FleetTask } from '../../../services/api/types';
import { usePersonPhoto } from '../../../services/queries/peoplePhotos';
import { FleetTaskOwnerCell } from './FleetTaskOwnerCell';

vi.mock('../../../services/queries/employees', () => ({
  useEmployee: () => ({ data: { firstName: 'Eva', lastName: 'Luna', fileNumber: '0007' } }),
}));

afterEach(cleanup);

const owners = { carMap: new Map(), driverMap: new Map() } as unknown as Parameters<typeof FleetTaskOwnerCell>[0];

describe('FleetTaskOwnerCell: fotos', () => {
  const withCar = (photoUrl: string | null) => {
    const carMap = new Map([
      ['car-1', { car_id: 'car-1', car_brand: 'Ford', car_model: 'Cargo', car_patent: 'AB123CD', photoUrl }],
    ]);
    return render(
      <FleetTaskOwnerCell
        {...owners}
        carMap={carMap as unknown as typeof owners.carMap}
        task={{ carId: 'car-1' } as FleetTask}
      />,
    );
  };

  it('el vehículo de una tarea muestra su foto', () => {
    const { container } = withCar('https://fotos.test/cargo.jpg');
    expect(container.querySelector('img[src="https://fotos.test/cargo.jpg"]')).not.toBeNull();
  });

  it('el vehículo sin foto muestra el ícono de auto', () => {
    const { container } = withCar(null);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.lucide-car')).not.toBeNull();
  });

  it('el legajo de una tarea de personal pide su foto por employeeId', () => {
    vi.mocked(usePersonPhoto).mockClear();
    render(<FleetTaskOwnerCell {...owners} task={{ employeeId: 'emp-1' } as FleetTask} />);
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'employee', id: 'emp-1' });
  });

  it('el chofer de una tarea pide su foto por el user_id de su cuenta', () => {
    vi.mocked(usePersonPhoto).mockClear();
    const driverMap = new Map([['deliv-1', { user_id: 'user-9', user: { full_name: 'Beto' } }]]);
    render(
      <FleetTaskOwnerCell
        {...owners}
        driverMap={driverMap as unknown as typeof owners.driverMap}
        task={{ deliveryId: 'deliv-1' } as FleetTask}
      />,
    );
    expect(usePersonPhoto).toHaveBeenCalledWith({ kind: 'user', id: 'user-9' });
  });
});
