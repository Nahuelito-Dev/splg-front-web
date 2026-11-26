import { AxiosError, AxiosHeaders } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyPermissions, StaffRole } from '../../../services/api/types';

const SYSTEM = '00000000-0000-4000-8000-000000000001';
const DEPOSITO = '00000000-0000-4000-8000-000000000002';
const state = vi.hoisted(() => ({
  mine: undefined as MyPermissions | undefined,
  create: vi.fn(),
  error: vi.fn(),
}));
const role = (over: Partial<StaffRole>): StaffRole => ({
  staffRoleId: SYSTEM,
  name: 'Administrador',
  description: null,
  isSystem: false,
  permissions: [],
  adminCount: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...over,
});
const roles = [
  role({ staffRoleId: SYSTEM, name: 'Administrador', isSystem: true }),
  role({ staffRoleId: DEPOSITO, name: 'Depósito', permissions: ['stock.gestionar'] }),
];

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAppSelector: () => 'encargado@splg.com',
}));
vi.mock('../../../common/forms/checkAccountFree', () => ({ checkAccountFree: () => Promise.resolve(true) }));
vi.mock('../../../services/queries/admins', () => ({
  useCreateAdmin: () => ({ mutate: state.create, isPending: false }),
}));
vi.mock('../../../services/queries/distributors', () => ({ useDistributors: () => ({ data: [] }) }));
vi.mock('../../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: state.mine }) }));
vi.mock('../../../services/queries/staffRoles', () => ({
  useStaffRoles: () => ({ data: roles, isLoading: false, isError: false }),
}));
vi.mock('../../../utils/notifications', () => ({ notify: { success: vi.fn(), error: state.error } }));

import { CreateAdminModal } from './CreateAdminModal';

const fill = () => {
  const type = (label: RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
  type(/Nombre completo/, 'Ana Pérez');
  type(/Teléfono/, '+5493764000000');
  type(/^Email/, 'ana@splg.com');
  type(/^Contraseña/, 'Secreta-2026x');
  type(/Repetir contraseña/, 'Secreta-2026x');
};
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Crear admin' }));
const staffRoleSelect = () => screen.getByLabelText<HTMLSelectElement>(/Rol del personal/);
const apiError = (status: number, code: string, message: string) => {
  const error = new AxiosError('fallo');
  error.response = {
    status,
    data: { message, code },
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
  return error;
};

afterEach(cleanup);
beforeEach(() => {
  state.mine = undefined;
  state.create.mockReset();
  state.error.mockReset();
});

describe('CreateAdminModal: rol del personal', () => {
  it('con todos los permisos arranca en el de sistema y lo manda', async () => {
    state.mine = { role: 'admin', allPermissions: true, staffRole: null, permissions: [] };
    render(<CreateAdminModal open onClose={vi.fn()} isSuperAdmin={false} />);
    expect(staffRoleSelect().value).toBe(SYSTEM);
    fill();
    submit();
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin', account: expect.objectContaining({ staffRoleId: SYSTEM }) as unknown }),
      expect.anything(),
    );
  });

  it('sin todos los permisos hay que elegirlo, y el de sistema no se puede dar', async () => {
    state.mine = {
      role: 'admin',
      allPermissions: false,
      staffRole: null,
      permissions: ['stock.ver', 'stock.gestionar'],
    };
    render(<CreateAdminModal open onClose={vi.fn()} isSuperAdmin={false} />);
    expect(staffRoleSelect().value).toBe('');
    expect(screen.getByRole<HTMLOptionElement>('option', { name: /^Administrador/ }).disabled).toBe(true);
    fill();
    submit();
    expect(await screen.findByText('Elegí el rol del personal del administrador nuevo')).toBeInTheDocument();
    expect(state.create).not.toHaveBeenCalled();
    fireEvent.change(staffRoleSelect(), { target: { value: DEPOSITO } });
    submit();
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ account: expect.objectContaining({ staffRoleId: DEPOSITO }) as unknown }),
      expect.anything(),
    );
  });

  it('el 403/400 del rol del personal se muestra junto al campo, con el mensaje del back', async () => {
    const message = 'No podés dar permisos que no tenés';
    state.create.mockImplementation((_vars: unknown, options: { onError: (error: unknown) => void }) =>
      options.onError(apiError(403, 'STAFF_ROLE_PERMISSION_NOT_HELD', message)),
    );
    render(<CreateAdminModal open onClose={vi.fn()} isSuperAdmin={false} />);
    fill();
    fireEvent.change(staffRoleSelect(), { target: { value: DEPOSITO } });
    submit();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(staffRoleSelect()).toHaveAttribute('aria-invalid', 'true');
    expect(state.error).not.toHaveBeenCalled();
  });

  it('el administrador general no elige rol del personal ni lo manda', async () => {
    render(<CreateAdminModal open onClose={vi.fn()} isSuperAdmin />);
    expect(screen.queryByLabelText(/Rol del personal/)).not.toBeInTheDocument();
    fill();
    fireEvent.change(screen.getByLabelText(/^Rol/), { target: { value: 'super_admin' } });
    submit();
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'super_admin',
        account: expect.objectContaining({ staffRoleId: undefined }) as unknown,
      }),
      expect.anything(),
    );
  });
});
