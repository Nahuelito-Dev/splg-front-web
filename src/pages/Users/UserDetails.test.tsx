import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/api/types';

const user = vi.hoisted(() => ({ current: null as unknown as User }));
const HINT = 'Elegí una distribuidora en «Ver como» para operar';
const permissions = vi.hoisted(() => ({
  canManageCustomerAccounts: false,
  needsDistributor: false,
  operateHint: undefined as string | undefined,
}));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => permissions,
}));
vi.mock('../../services/queries/users', () => ({
  useUser: () => ({ data: user.current, isPending: false, error: null }),
  useBlockUser: () => ({ mutate: vi.fn() }),
  useDeleteUser: () => ({ mutate: vi.fn() }),
}));
vi.mock('../../services/queries/photos', () => ({
  useUploadPhoto: () => ({ mutate: vi.fn(), isPending: false }),
  useRemovePhoto: () => ({ mutate: vi.fn(), isPending: false }),
  isSignedPhotoUrl: (url: string | null | undefined) => Boolean(url?.includes('X-Amz-Signature=')),
  useRenewablePhoto: (_kind: string, _id: string, url: string | null | undefined) => ({
    src: url ?? null,
    failed: false,
    none: false,
    renewing: false,
    handleError: vi.fn(),
    renewIfExpired: vi.fn(),
    retry: vi.fn(),
  }),
}));
vi.mock('./components/UserEditModal', () => ({ UserEditModal: () => null }));
vi.mock('./components/details/UserAccountCard', () => ({ UserAccountCard: () => null }));
vi.mock('./components/details/UserRoleDetails', () => ({ UserRoleDetails: () => null }));

import { UserDetails } from './UserDetails';

afterEach(() => {
  cleanup();
  permissions.canManageCustomerAccounts = false;
  permissions.needsDistributor = false;
  permissions.operateHint = undefined;
});

const makeUser = (customer: boolean, role = customer ? 'customer' : 'delivery'): User =>
  ({
    user_id: 'u-1',
    full_name: 'Ana Pérez',
    email: 'ana@mail.com',
    photoUrl: 'https://splg.s3.amazonaws.com/users/u-1.jpg?X-Amz-Signature=abc',
    blocked: false,
    phone_verified: true,
    email_verified: true,
    createdAt: '2026-06-01T10:00:00Z',
    role: { type: role },
    customer: customer ? { customer_id: 'c-1' } : null,
  }) as unknown as User;

const renderDetails = () =>
  render(
    <MemoryRouter initialEntries={['/users/details/u-1']}>
      <Routes>
        <Route path="/users/details/:leadId" element={<UserDetails />} />
      </Routes>
    </MemoryRouter>,
  );

describe('UserDetails: foto de perfil', () => {
  it('el administrador de empresa no puede tocar la foto de un cliente (el back da 403): se ve, sin acciones', () => {
    user.current = makeUser(true);
    permissions.canManageCustomerAccounts = false;
    renderDetails();
    expect(screen.getByAltText('Foto de perfil')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reemplazar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Quitar' })).not.toBeInTheDocument();
  });

  it('el administrador general sí puede cambiar la de un cliente', () => {
    user.current = makeUser(true);
    permissions.canManageCustomerAccounts = true;
    renderDetails();
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeInTheDocument();
  });

  it('el administrador de empresa sí puede cambiar la de un chofer', () => {
    user.current = makeUser(false);
    permissions.canManageCustomerAccounts = false;
    renderDetails();
    expect(screen.getByRole('button', { name: 'Reemplazar' })).toBeInTheDocument();
  });
});

describe('UserDetails: administrador general sin distribuidora elegida', () => {
  const withoutDistributor = () => {
    permissions.canManageCustomerAccounts = true;
    permissions.needsDistributor = true;
    permissions.operateHint = HINT;
  };

  it.each(['delivery', 'admin'])('la cuenta de un %s no se toca sin «Ver como»: la API contesta 400', (role) => {
    withoutDistributor();
    user.current = makeUser(false, role);
    renderDetails();
    for (const name of ['Editar cuenta', 'Bloquear', 'Dar de baja', 'Reemplazar', 'Quitar']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('title', HINT);
    }
  });

  it.each(['customer', 'super_admin'])('la cuenta de un %s sí se administra sin distribuidora', (role) => {
    withoutDistributor();
    user.current = makeUser(role === 'customer', role);
    renderDetails();
    for (const name of ['Editar cuenta', 'Bloquear', 'Dar de baja']) {
      expect(screen.getByRole('button', { name })).not.toHaveAttribute('aria-disabled');
    }
  });

  it('con distribuidora elegida la cuenta de un chofer se administra', () => {
    permissions.canManageCustomerAccounts = true;
    user.current = makeUser(false, 'delivery');
    renderDetails();
    expect(screen.getByRole('button', { name: 'Bloquear' })).not.toHaveAttribute('aria-disabled');
  });
});
