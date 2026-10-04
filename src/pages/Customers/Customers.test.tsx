import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../services/api/types';

const server = vi.hoisted(() => vi.fn());

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canManageCustomerAccounts: false }),
}));
vi.mock('../../services/queries/customers', () => ({
  useCustomers: (...args: unknown[]) => server(...args) as unknown,
  useCustomerStatusCounts: () => ({ all: 3, active: 2, blocked: 1 }),
  useDeleteCustomer: () => ({ mutate: vi.fn() }),
}));
vi.mock('./components/CustomerFormModal', () => ({ CustomerFormModal: () => null }));
vi.mock('./components/FindCustomerByUserModal', () => ({ FindCustomerByUserModal: () => null }));

import { Customers } from './Customers';

afterEach(cleanup);

const customer = (id: string, name: string, blocked: boolean): Customer =>
  ({
    customer_id: id,
    user_id: `u-${id}`,
    createdAt: '2026-06-01T10:00:00Z',
    user: { full_name: name, email: `${id}@mail.com`, phone_number: `37640${id}`, blocked, addresses: [] },
  }) as unknown as Customer;

const ROWS = [customer('1', 'Ana Pérez', false), customer('2', 'Beto Gómez', true), customer('3', 'Carla Ruiz', false)];

const Search = () => <output data-testid="search">{useLocation().search}</output>;
const renderPage = (url = '/customers') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Customers />
      <Search />
    </MemoryRouter>,
  );

describe('Customers: pestañas con contador', () => {
  it('muestra Todos / Activos / Bloqueados con los totales reales de la API', () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activos 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bloqueados 1' })).toBeInTheDocument();
  });

  it('la pestaña Bloqueados pide ?status=blocked al servidor y queda en la URL con su chip', () => {
    server.mockReturnValue({ data: { rows: [ROWS[1]], total: 1 }, isFetching: false });
    renderPage();
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', undefined);
    fireEvent.click(screen.getByRole('tab', { name: 'Bloqueados 1' }));
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', 'blocked');
    expect(screen.getByTestId('search')).toHaveTextContent('?status=blocked');
    expect(screen.getByText('Beto Gómez')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('1 resultado');
  });

  it('con más de 100 clientes sigue habiendo pestañas: el segmento lo resuelve la API', () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 250 }, isFetching: false });
    renderPage('/customers?status=active');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', 'active');
  });

  it('el chip de la búsqueda se limpia', () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage('/customers?q=carla');
    fireEvent.click(screen.getByRole('button', { name: /Quitar filtro/ }));
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('una ?page= fuera de rango vuelve a la primera página', () => {
    server.mockReturnValue({ data: { rows: [], total: 3 }, isFetching: false });
    renderPage('/customers?page=9');
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });
});
