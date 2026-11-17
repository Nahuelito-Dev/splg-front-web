import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Admin, MyPermissions, StaffRole } from '../../../services/api/types';

const state = vi.hoisted(() => ({
  mine: undefined as MyPermissions | undefined,
  rolesEnabled: [] as boolean[],
  assign: vi.fn(),
  info: vi.fn(),
}));
const role = (over: Partial<StaffRole>): StaffRole => ({
  staffRoleId: '00000000-0000-4000-8000-000000000001',
  name: 'Administrador',
  description: null,
  isSystem: false,
  permissions: [],
  adminCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const roles = [
  role({ staffRoleId: '00000000-0000-4000-8000-000000000001', name: 'Administrador', isSystem: true }),
  role({ staffRoleId: '00000000-0000-4000-8000-000000000002', name: 'Depósito', permissions: ['stock.gestionar'] }),
  role({ staffRoleId: '00000000-0000-4000-8000-000000000003', name: 'Caja', permissions: ['caja.gestionar'] }),
];

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAppSelector: () => 'encargado@splg.com',
}));
vi.mock('../../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: state.mine }) }));
vi.mock('../../../services/queries/staffRoles', () => ({
  useStaffRoles: (enabled: boolean) => {
    state.rolesEnabled.push(enabled);
    return { data: roles, isLoading: false, error: null };
  },
  useAssignStaffRole: () => ({ mutate: state.assign, isPending: false }),
}));
vi.mock('../../../utils/notifications', () => ({ notify: { info: state.info, success: vi.fn(), error: vi.fn() } }));

import { AssignStaffRoleModal } from './AssignStaffRoleModal';

const admin = { admin_id: 'a2', user: { full_name: 'Ana' }, staffRole: null } as unknown as Admin;
const option = (name: string) => screen.getByRole<HTMLOptionElement>('option', { name: new RegExp(`^${name}`) });

afterEach(cleanup);
beforeEach(() => {
  state.mine = undefined;
  state.rolesEnabled = [];
  state.assign.mockReset();
  state.info.mockReset();
});

describe('AssignStaffRoleModal', () => {
  it('los roles se piden recién al abrir «Cambiar rol»', () => {
    const { rerender } = render(<AssignStaffRoleModal admin={null} onClose={vi.fn()} />);
    expect(state.rolesEnabled).not.toContain(true);
    rerender(<AssignStaffRoleModal admin={admin} onClose={vi.fn()} />);
    expect(state.rolesEnabled.at(-1)).toBe(true);
  });

  it('nadie asigna un rol con permisos que no tiene, ni el de sistema si no lo tiene', () => {
    state.mine = {
      role: 'admin',
      allPermissions: false,
      staffRole: null,
      permissions: ['stock.ver', 'stock.gestionar'],
    };
    render(<AssignStaffRoleModal admin={admin} onClose={vi.fn()} />);
    expect(option('Depósito').disabled).toBe(false);
    expect(option('Caja').disabled).toBe(true);
    expect(option('Caja').textContent).toContain('Tiene permisos que vos no tenés');
    expect(option('Administrador').disabled).toBe(true);
  });

  it('con todos los permisos se puede asignar cualquiera', () => {
    state.mine = { role: 'admin', allPermissions: true, staffRole: null, permissions: [] };
    render(<AssignStaffRoleModal admin={admin} onClose={vi.fn()} />);
    expect(roles.map((r) => option(r.name).disabled)).toEqual([false, false, false]);
  });

  it('guardar con el mismo rol que ya tiene no manda nada', async () => {
    const onClose = vi.fn();
    const current = { ...admin, staffRole: { staffRoleId: roles[1].staffRoleId, name: 'Depósito', isSystem: false } };
    render(<AssignStaffRoleModal admin={current} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(state.info).toHaveBeenCalledWith('Sin cambios');
    expect(state.assign).not.toHaveBeenCalled();
  });

  it('con otro rol, lo asigna', async () => {
    const current = { ...admin, staffRole: { staffRoleId: roles[1].staffRoleId, name: 'Depósito', isSystem: false } };
    render(<AssignStaffRoleModal admin={current} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Rol/), { target: { value: roles[2].staffRoleId } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(state.assign).toHaveBeenCalled());
    expect(state.assign).toHaveBeenCalledWith(
      { adminId: 'a2', body: { staffRoleId: roles[2].staffRoleId } },
      expect.anything(),
    );
  });
});
