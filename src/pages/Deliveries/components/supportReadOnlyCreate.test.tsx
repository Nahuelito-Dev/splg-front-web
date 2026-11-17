import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const RO = 'Modo soporte: sólo lectura';
const perms = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const adminRows = vi.hoisted(() => ({ value: [] as unknown[] }));
const staffRoleData = vi.hoisted(() => ({
  mine: undefined as unknown,
  roles: undefined as unknown,
  manageAdmins: true,
}));
vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => perms.value,
  usePermiso: () => ({ allowed: staffRoleData.manageAdmins, known: true }),
  useDebounce: <T,>(v: T) => v,
  useAppSelector: () => 'yo@demo.com',
}));
vi.mock('../../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: staffRoleData.mine }) }));
vi.mock('../../../services/queries/staffRoles', () => ({ useStaffRoles: () => ({ data: staffRoleData.roles }) }));
// La grilla real virtualiza (en jsdom no pinta celdas): se pintan las filas con sus `renderCell`.
vi.mock('../../../common/components/ui', async (importOriginal) => {
  const ui = await importOriginal<Record<string, unknown>>();
  type Column = { field: string; renderCell?: (params: { row: unknown }) => ReactNode };
  return {
    ...ui,
    DataTable: ({ rows, columns }: { rows: { admin_id?: string }[]; columns: Column[] }) => (
      <div>
        {rows.map((row, i) => (
          <div key={row.admin_id ?? i}>
            {columns.map((column) => (
              <div key={column.field}>{column.renderCell?.({ row })}</div>
            ))}
          </div>
        ))}
      </div>
    ),
  };
});
vi.mock('../../../services/queries/cars', () => ({
  useCarsByUser: () => ({
    data: [{ car_id: 'c-1', brand: 'Ford', model: 'Ranger', license_plate: 'AA123BB' }],
    isPending: false,
  }),
  useDeleteCar: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../../Cars/components/CarFormModal', () => ({ CarFormModal: () => null }));
vi.mock('../../../services/queries/admins', () => ({
  useAdmins: () => ({ data: adminRows.value, isPending: false, isFetching: false, error: null, refetch: vi.fn() }),
  useFindAdminByTerm: () => ({ data: undefined, isFetching: false }),
}));
vi.mock('../../Admins/useAdminManagement', () => ({
  useAdminManagement: () => ({
    stateOf: () => ({ edit: 'allowed', remove: 'allowed' }),
    remove: vi.fn(),
    toggleBlock: vi.fn(),
  }),
}));
vi.mock('../../Admins/components/CreateAdminModal', () => ({ CreateAdminModal: () => null }));
vi.mock('../../Admins/components/EditAdminModal', () => ({ EditAdminModal: () => null }));
vi.mock('../../Admins/components/AssignStaffRoleModal', () => ({ AssignStaffRoleModal: () => null }));

import { CarsManager } from './CarsManager';
import { Admins } from '../../Admins/Admins';

afterEach(() => {
  cleanup();
  adminRows.value = [];
  staffRoleData.mine = undefined;
  staffRoleData.roles = undefined;
  staffRoleData.manageAdmins = true;
});

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

  it('Administradores: «Cambiar rol» apagado en soporte, con el motivo; usable para el admin de la empresa', () => {
    adminRows.value = [
      { admin_id: 'a2', user_id: 'u2', distributor_id: 'd1', user: { full_name: 'Ana Pérez', email: 'ana@demo.com' } },
    ];
    perms.value = { isSuperAdmin: false, readOnly: true, canWrite: false, writeHint: RO };
    render(
      <MemoryRouter>
        <Admins />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Ana Pérez' }));
    expect(screen.getByRole('menuitem', { name: `Cambiar rol (no disponible: ${RO})` })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    cleanup();
    perms.value = { isSuperAdmin: false, readOnly: false, canWrite: true };
    render(
      <MemoryRouter>
        <Admins />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Ana Pérez' }));
    expect(screen.getByRole('menuitem', { name: 'Cambiar rol' })).not.toHaveAttribute('aria-disabled');
  });

  it('Administradores: «Cambiar rol» apagado sobre quien tiene más permisos que la sesión', () => {
    adminRows.value = [
      {
        admin_id: 'a2',
        user_id: 'u2',
        distributor_id: 'd1',
        user: { full_name: 'Ana Pérez', email: 'ana@demo.com' },
        staffRole: { staffRoleId: 'r1', name: 'Administrador', isSystem: true },
      },
    ];
    staffRoleData.mine = {
      role: 'admin',
      allPermissions: false,
      staffRole: null,
      permissions: ['administradores.gestionar'],
    };
    perms.value = { isSuperAdmin: false, readOnly: false, canWrite: true };
    render(
      <MemoryRouter>
        <Admins />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Ana Pérez' }));
    expect(
      screen.getByRole('menuitem', {
        name: 'Cambiar rol (no disponible: No podés cambiarle el rol: tiene el rol de sistema y vos no tenés todos los permisos)',
      }),
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('Administradores: sin «Gestionar los administradores», «Nuevo admin» apagado con el permiso que falta', () => {
    staffRoleData.manageAdmins = false;
    perms.value = { isSuperAdmin: false, readOnly: false, canWrite: true };
    render(
      <MemoryRouter>
        <Admins />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /Nuevo admin/ })).toHaveAttribute(
      'title',
      'Hace falta el permiso «Gestionar los administradores»',
    );
  });
});
