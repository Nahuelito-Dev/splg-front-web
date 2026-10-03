import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UserAddressConUsuario } from '../../services/api/types';

const permissions = vi.fn();
const addressesQuery = vi.fn<[unknown, { enabled: boolean }], unknown>();
vi.mock('../../hooks', () => ({ usePermissions: () => permissions() as unknown }));
vi.mock('../../services/queries/userAddresses', () => ({
  useAllUserAddresses: (page: unknown, options: { enabled: boolean }) => addressesQuery(page, options),
}));

import { Addresses } from './Addresses';

afterEach(() => {
  cleanup();
  addressesQuery.mockReset();
});

const ROW = {
  address_id: 'a-1',
  user_id: 'u-1',
  street: 'Corrientes 3171',
  city: 'Posadas',
  postalCode: '3300',
  floor: null,
  apartment: null,
  isDefault: true,
  geocodePrecision: 'approximate',
  user: { user_id: 'u-1', full_name: 'Lorenzo Fernández' },
} as unknown as UserAddressConUsuario;

const renderPage = () =>
  render(
    <MemoryRouter>
      <Addresses />
    </MemoryRouter>,
  );

describe('Addresses', () => {
  it('lista dirección, ciudad y cliente con enlace', () => {
    permissions.mockReturnValue({ isSuperAdmin: true });
    addressesQuery.mockReturnValue({ data: { rows: [ROW], total: 1 }, isFetching: false });
    renderPage();
    expect(screen.getByText('Corrientes 3171')).toBeInTheDocument();
    expect(screen.getByText('Posadas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lorenzo Fernández' })).toHaveAttribute('href', '/users/details/u-1');
    expect(screen.getByText('1 dirección')).toBeInTheDocument();
    expect(addressesQuery.mock.calls.at(-1)?.[1]).toEqual({ enabled: true });
  });

  it('un administrador de empresa no ve el listado (la API contesta 403)', () => {
    permissions.mockReturnValue({ isSuperAdmin: false });
    addressesQuery.mockReturnValue({ data: undefined, isFetching: false });
    renderPage();
    expect(screen.getByText('Sólo para el administrador general')).toBeInTheDocument();
    expect(screen.queryByText('Corrientes 3171')).not.toBeInTheDocument();
    // La consulta ni siquiera sale: lo recibido en `enabled` es falso.
    expect(addressesQuery).toHaveBeenCalled();
    for (const args of addressesQuery.mock.calls) expect(args[1]).toEqual({ enabled: false });
  });
});
