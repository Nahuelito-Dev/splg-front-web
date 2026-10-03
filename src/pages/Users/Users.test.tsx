import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../services/api/types';

const byRole = vi.hoisted(() => vi.fn());

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canManageCustomerAccounts: true }),
}));
vi.mock('../../services/queries/users', () => ({
  useUsersByRole: (tab: string) => byRole(tab) as unknown,
  useUserRoleCounts: () => ({ all: 31, customer: 25, delivery: 5, admin: 1 }),
  useBlockUser: () => ({ mutate: vi.fn() }),
  useDeleteUser: () => ({ mutate: vi.fn() }),
}));
vi.mock('./components/UserEditModal', () => ({ UserEditModal: () => null }));
vi.mock('./components/FindUserByPhoneModal', () => ({ FindUserByPhoneModal: () => null }));

import { Users } from './Users';

afterEach(cleanup);

const user = (id: string, name: string): User =>
  ({
    user_id: id,
    full_name: name,
    email: `${id}@mail.com`,
    phone_number: '3764',
    blocked: false,
    role: { type: 'customer' },
  }) as unknown as User;

const Search = () => <output data-testid="search">{useLocation().search}</output>;

describe('Users: pestañas por rol', () => {
  it('muestra la cantidad de cada rol y pide la lista del rol elegido', () => {
    byRole.mockReturnValue({
      data: { rows: [user('u1', 'Ana Pérez')], total: 25 },
      isLoading: false,
      isFetching: false,
    });
    render(
      <MemoryRouter initialEntries={['/users']}>
        <Users />
        <Search />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: 'Todos 31' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Clientes 25' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Choferes 5' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Administradores 1' })).toBeInTheDocument();
    expect(byRole).toHaveBeenLastCalledWith('all');

    fireEvent.click(screen.getByRole('tab', { name: 'Choferes 5' }));
    expect(byRole).toHaveBeenLastCalledWith('delivery');
    expect(screen.getByTestId('search')).toHaveTextContent('?role=delivery');
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('Choferes');
  });

  it('un rol desconocido en la URL cae en "Todos"', () => {
    byRole.mockReturnValue({ data: { rows: [], total: 0 }, isLoading: false, isFetching: false });
    render(
      <MemoryRouter initialEntries={['/users?role=cualquiera']}>
        <Users />
      </MemoryRouter>,
    );
    expect(byRole).toHaveBeenLastCalledWith('all');
  });

  it('mientras carga muestra el esqueleto del listado', () => {
    byRole.mockReturnValue({ data: undefined, isLoading: true, isFetching: true });
    render(
      <MemoryRouter>
        <Users />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status', { name: 'Cargando listado' })).toBeInTheDocument();
  });

  it('la página vive en la URL y una fuera de rango vuelve a la primera', () => {
    byRole.mockReturnValue({ data: { rows: [], total: 25 }, isLoading: false, isFetching: false });
    render(
      <MemoryRouter initialEntries={['/users?page=7']}>
        <Users />
        <Search />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });
});
