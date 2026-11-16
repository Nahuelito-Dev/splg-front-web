import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const RO = 'Modo soporte: sólo lectura';
const perms = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => perms.value,
  useDebounce: <T,>(v: T) => v,
}));
vi.mock('../../../services/queries/cars', () => ({
  useCarsByUser: () => ({
    data: [{ car_id: 'c-1', brand: 'Ford', model: 'Ranger', license_plate: 'AA123BB' }],
    isPending: false,
  }),
  useDeleteCar: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../Cars/components/CarFormModal', () => ({ CarFormModal: () => null }));
vi.mock('../../../services/queries/admins', () => ({
  useAdmins: () => ({ data: [], isPending: false, isFetching: false, error: null, refetch: vi.fn() }),
  useFindAdminByTerm: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('../../Admins/useAdminManagement', () => ({
  useAdminManagement: () => ({
    manageable: () => ({ edit: 'hidden', remove: 'hidden' }),
    remove: vi.fn(),
    toggleBlock: vi.fn(),
  }),
}));
vi.mock('../../Admins/components/CreateAdminModal', () => ({ CreateAdminModal: () => null }));
vi.mock('../../Admins/components/EditAdminModal', () => ({ EditAdminModal: () => null }));

import { CarsManager } from './CarsManager';
import { Admins } from '../../Admins/Admins';

afterEach(cleanup);

describe('altas apagadas en modo soporte', () => {
  it('ficha del chofer: «Nuevo vehículo», editar y dar de baja quedan apagados', () => {
    perms.value = { canWrite: false, writeHint: RO };
    render(<CarsManager userId="u-1" />);
    expect(screen.getByRole('button', { name: /Nuevo vehículo/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Editar vehículo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dar de baja el vehículo' })).toBeDisabled();
  });

  it('con permiso de escritura se pueden usar', () => {
    perms.value = { canWrite: true };
    render(<CarsManager userId="u-1" />);
    expect(screen.getByRole('button', { name: /Nuevo vehículo/ })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', { name: 'Editar vehículo' })).toBeEnabled();
  });

  it('Administradores: «Nuevo admin» apagado en soporte, habilitado en la plataforma', () => {
    perms.value = { isSuperAdmin: false, readOnly: true, writeHint: RO };
    render(
      <MemoryRouter>
        <Admins />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Nuevo admin/ })).toHaveAttribute('title', RO);
    cleanup();
    perms.value = {
      isSuperAdmin: true,
      readOnly: false,
      canWrite: false,
      writeHint: 'Para ver una empresa, entrá en modo soporte',
    };
    render(
      <MemoryRouter>
        <Admins />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Nuevo admin/ })).not.toHaveAttribute('aria-disabled');
  });
});
