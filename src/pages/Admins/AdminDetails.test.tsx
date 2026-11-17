import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyPermissions, StaffRole } from '../../services/api/types';
import { ok, renderPage } from '../../test/pageTest';

const RO = 'Modo soporte: sólo lectura';
const state = vi.hoisted(() => ({
  admin: {} as Record<string, unknown>,
  edit: 'allowed' as 'allowed' | 'hidden' | 'needs-distributor',
  perms: { canWrite: true, readOnly: false, writeHint: undefined as string | undefined },
  manageAdmins: true,
  mine: undefined as MyPermissions | undefined,
  roles: undefined as StaffRole[] | undefined,
}));

vi.mock('../../common/components', () => ({ useCrumbLeaf: () => undefined }));
vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ ...state.perms, canViewAudit: false }),
  usePermiso: () => ({ allowed: state.manageAdmins, known: true }),
  useBackToList: () => () => undefined,
  useAppSelector: () => 'yo@splg.com',
}));
vi.mock('../../services/queries/permissions', () => ({ useMyPermissions: () => ({ data: state.mine }) }));
vi.mock('../../services/queries/staffRoles', () => ({ useStaffRoles: () => ({ data: state.roles }) }));
vi.mock('../../services/queries/admins', () => ({ useAdmin: () => ok(state.admin) }));
vi.mock('./useAdminManagement', () => ({
  useAdminManagement: () => ({
    stateOf: () => ({ edit: state.edit, remove: state.edit }),
    remove: vi.fn(),
    blockedReason: 'Elegí una empresa',
  }),
}));
vi.mock('./components/EditAdminModal', () => ({ EditAdminModal: () => null }));
vi.mock('./components/AssignStaffRoleModal', () => ({
  AssignStaffRoleModal: ({ admin }: { admin: { user?: { full_name?: string } } | null }) =>
    admin ? <p>Cambiando el rol de {admin.user?.full_name}</p> : null,
}));

import { AdminDetails } from './AdminDetails';

const companyAdmin = () => ({
  admin_id: 'a2',
  user_id: 'u2',
  distributor_id: 'd1',
  createdAt: '2026-01-01T00:00:00Z',
  user: { full_name: 'Ana Pérez', email: 'ana@splg.com', role: { type: 'admin' } },
  distributor: { name: 'Distribuidora Demo' },
  staffRole: { staffRoleId: 'r2', name: 'Depósito' },
});

const renderDetails = () => renderPage(<AdminDetails />, { url: '/admins/a2', path: '/admins/:id' });
const openMenu = () => fireEvent.click(screen.getByRole('button', { name: 'Más acciones' }));

afterEach(cleanup);
beforeEach(() => {
  state.admin = companyAdmin();
  state.edit = 'allowed';
  state.perms = { canWrite: true, readOnly: false, writeHint: undefined };
  state.manageAdmins = true;
  state.mine = undefined;
  state.roles = undefined;
});

describe('AdminDetails: rol del personal', () => {
  it('muestra el rol del personal y «Cambiar rol» abre el modal', () => {
    renderDetails();
    expect(screen.getByText('Rol del personal')).toBeInTheDocument();
    expect(screen.getAllByText('Depósito').length).toBeGreaterThan(0);
    openMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Cambiar rol/ }));
    expect(screen.getByText('Cambiando el rol de Ana Pérez')).toBeInTheDocument();
  });

  it('un admin de empresa sin rol asignado se ve así', () => {
    state.admin = { ...companyAdmin(), staffRole: null };
    renderDetails();
    expect(screen.getByText('Sin rol asignado')).toBeInTheDocument();
  });

  it('en la ficha propia no se ofrece (nadie cambia su rol)', () => {
    state.edit = 'hidden';
    renderDetails();
    expect(screen.queryByText(/Cambiar rol/)).not.toBeInTheDocument();
  });

  it('sin «administradores.gestionar» no se ofrece', () => {
    state.manageAdmins = false;
    renderDetails();
    openMenu();
    expect(screen.queryByRole('menuitem', { name: /Cambiar rol/ })).not.toBeInTheDocument();
  });

  it('en modo soporte se ve apagado con el motivo', () => {
    state.perms = { canWrite: false, readOnly: true, writeHint: RO };
    renderDetails();
    openMenu();
    const item = screen.getByRole('menuitem', { name: /Cambiar rol/ });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('title', RO);
    fireEvent.click(item);
    expect(screen.queryByText(/Cambiando el rol/)).not.toBeInTheDocument();
  });

  it('al administrador general (sin empresa) no se le ofrece ni muestra rol del personal', () => {
    state.admin = {
      ...companyAdmin(),
      distributor_id: null,
      distributor: null,
      staffRole: null,
      user: { full_name: 'Root', role: { type: 'super_admin' } },
    };
    renderDetails();
    expect(screen.queryByText('Rol del personal')).not.toBeInTheDocument();
    expect(screen.queryByText(/Cambiar rol/)).not.toBeInTheDocument();
  });

  it('a quien tiene más permisos no se le cambia el rol: apagado con el motivo', () => {
    state.mine = { role: 'admin', allPermissions: false, staffRole: null, permissions: ['stock.ver'] };
    state.roles = [
      {
        staffRoleId: 'r2',
        name: 'Depósito',
        description: null,
        isSystem: false,
        permissions: ['stock.gestionar'],
        adminCount: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    renderDetails();
    openMenu();
    const item = screen.getByRole('menuitem', { name: /Cambiar rol/ });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAttribute('title', 'No podés cambiarle el rol: tiene permisos que vos no tenés');
  });
});
