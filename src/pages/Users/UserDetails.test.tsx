import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/api/types';

const user = vi.hoisted(() => ({ current: null as unknown as User }));
const permissions = vi.hoisted(() => ({ canManageCustomerAccounts: false }));

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

afterEach(cleanup);

const makeUser = (customer: boolean): User =>
  ({
    user_id: 'u-1',
    full_name: 'Ana Pérez',
    email: 'ana@mail.com',
    photoUrl: 'https://splg.s3.amazonaws.com/users/u-1.jpg?X-Amz-Signature=abc',
    blocked: false,
    phone_verified: true,
    email_verified: true,
    createdAt: '2026-06-01T10:00:00Z',
    role: { type: customer ? 'customer' : 'delivery' },
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
