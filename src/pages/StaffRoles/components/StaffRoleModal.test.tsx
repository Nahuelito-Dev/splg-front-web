import { AxiosError, AxiosHeaders } from 'axios';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyPermissions, PermissionModule } from '../../../services/api/types';

const state = vi.hoisted(() => ({
  mine: undefined as MyPermissions | undefined,
  create: vi.fn(),
  update: vi.fn(),
  catalogEnabled: [] as boolean[],
}));
const catalog: PermissionModule[] = [
  {
    key: 'stock',
    label: 'Stock',
    permissions: [
      { key: 'stock.ver', label: 'ver el stock', description: 'Ver', implies: [] },
      { key: 'stock.gestionar', label: 'gestionar el stock', description: 'Gestionar', implies: ['stock.ver'] },
    ],
  },
  {
    key: 'roles',
    label: 'Roles',
    permissions: [{ key: 'roles.gestionar', label: 'gestionar los roles', description: 'Roles', implies: [] }],
  },
];

vi.mock('../../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAppSelector: () => 'admin@splg.com',
}));
vi.mock('../../../services/queries/permissions', () => ({
  usePermissionCatalog: (enabled: boolean) => {
    state.catalogEnabled.push(enabled);
    return { data: catalog, isLoading: false, isError: false };
  },
  useMyPermissions: () => ({ data: state.mine }),
}));
vi.mock('../../../services/queries/staffRoles', () => ({
  useCreateStaffRole: () => ({ mutate: state.create, isPending: false }),
  useUpdateStaffRole: () => ({ mutate: state.update, isPending: false }),
}));

import { StaffRoleModal } from './StaffRoleModal';

const existing = {
  staffRoleId: 'r9',
  name: 'Depósito',
  description: null,
  isSystem: false,
  permissions: ['roles.gestionar'],
  adminCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

afterEach(cleanup);
beforeEach(() => {
  state.mine = undefined;
  state.create.mockReset();
  state.update.mockReset();
  state.catalogEnabled = [];
});

describe('StaffRoleModal', () => {
  it('el catálogo de permisos se pide recién con el formulario abierto', () => {
    const { rerender } = render(<StaffRoleModal open={false} role={null} onClose={vi.fn()} />);
    expect(state.catalogEnabled).not.toContain(true);
    rerender(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    expect(state.catalogEnabled.at(-1)).toBe(true);
  });

  it('«gestionar» trae «ver»: queda tildado y apagado, y no se manda aparte', async () => {
    render(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^gestionar el stock/i));
    const ver = screen.getByLabelText(/ver el stock/i);
    expect(ver).toBeChecked();
    expect(ver).toBeDisabled();
    expect(screen.getByText('Incluido en «gestionar el stock»')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Depósito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      { name: 'Depósito', description: null, permissions: ['stock.gestionar'] },
      expect.anything(),
    );
  });

  it('nadie da un permiso que no tiene', () => {
    state.mine = {
      role: 'admin',
      allPermissions: false,
      staffRole: null,
      permissions: ['stock.ver', 'stock.gestionar'],
    };
    render(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/gestionar los roles/i)).toBeDisabled();
    expect(screen.getByText('No lo tenés: no podés darlo')).toBeInTheDocument();
    expect(screen.getByLabelText(/^gestionar el stock/i)).toBeEnabled();
  });

  it('«Todos los permisos del módulo» no manda los que vienen incluidos', async () => {
    render(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    fireEvent.click(screen.getAllByLabelText('Todos los permisos del módulo')[0]);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Depósito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      { name: 'Depósito', description: null, permissions: ['stock.gestionar'] },
      expect.anything(),
    );
  });

  it('si sólo cambian nombre o descripción, no manda los permisos', async () => {
    state.mine = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['stock.ver'] };
    render(<StaffRoleModal open role={existing} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Depósito norte' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(state.update).toHaveBeenCalled());
    expect(state.update).toHaveBeenCalledWith(
      { id: 'r9', body: { name: 'Depósito norte', description: null } },
      expect.anything(),
    );
  });

  it('cambiar los permisos de un rol que tiene alguno que no tenés avisa antes de guardar', async () => {
    state.mine = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['stock.ver'] };
    render(<StaffRoleModal open role={existing} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^ver el stock/i));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText(/Tiene permisos que vos no tenés \(gestionar los roles\)/)).toBeInTheDocument();
    expect(state.update).not.toHaveBeenCalled();
  });

  it('los nombres de los permisos se ven con mayúscula inicial', () => {
    render(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/^Ver el stock/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Gestionar los roles/)).toBeInTheDocument();
  });

  it('al destildar «gestionar» queda «ver» (bajar a sólo lectura)', async () => {
    render(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^gestionar el stock/i));
    fireEvent.click(screen.getByLabelText(/^gestionar el stock/i));
    const ver = screen.getByLabelText(/^ver el stock/i);
    expect(ver).toBeChecked();
    expect(ver).toBeEnabled();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Depósito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      { name: 'Depósito', description: null, permissions: ['stock.ver'] },
      expect.anything(),
    );
  });

  it('«Todos los permisos del módulo» mira sólo los que podés dar, y destildarlo saca lo que puso', async () => {
    state.mine = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['stock.ver'] };
    render(<StaffRoleModal open role={null} onClose={vi.fn()} />);
    const all = screen.getAllByLabelText('Todos los permisos del módulo')[0];
    fireEvent.click(screen.getByLabelText(/^ver el stock/i));
    expect(all).toBeChecked();
    fireEvent.click(all);
    expect(all).not.toBeChecked();
    expect(screen.getByLabelText(/^ver el stock/i)).not.toBeChecked();
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Depósito' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await vi.waitFor(() => expect(state.create).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledWith(
      { name: 'Depósito', description: null, permissions: [] },
      expect.anything(),
    );
  });

  it('el 403 STAFF_ROLE_TARGET_OUTRANKS al editar se muestra junto a los permisos, con el mensaje del back', async () => {
    const message = 'No podés sacarle permisos que vos no tenés a un rol con administradores';
    state.update.mockImplementation((_vars: unknown, options: { onError: (error: unknown) => void }) => {
      const error = new AxiosError('fallo');
      error.response = {
        status: 403,
        data: { message, code: 'STAFF_ROLE_TARGET_OUTRANKS' },
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
      };
      options.onError(error);
    });
    render(<StaffRoleModal open role={{ ...existing, adminCount: 2 }} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(/^gestionar los roles/i));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});
