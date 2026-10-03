import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../services/api/types';

const scan = vi.hoisted(() => vi.fn());
const server = vi.hoisted(() => vi.fn());

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canManageCustomerAccounts: false }),
}));
vi.mock('../../services/queries/customers', () => ({
  SEGMENT_SCAN_LIMIT: 100,
  useCustomerScan: () => scan() as unknown,
  useCustomers: () => server() as unknown,
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
  it('con pocos clientes segmenta en Todos / Activos / Bloqueados con su cantidad', () => {
    scan.mockReturnValue({ data: { rows: ROWS, total: 3 } });
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activos 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bloqueados 1' })).toBeInTheDocument();
  });

  it('la pestaña Bloqueados filtra la lista y queda en la URL con su chip', () => {
    scan.mockReturnValue({ data: { rows: ROWS, total: 3 } });
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Bloqueados 1' }));
    expect(screen.getByTestId('search')).toHaveTextContent('?status=blocked');
    expect(screen.getByText('Beto Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toHaveTextContent('1 resultado');
  });

  it('con más de 100 clientes no segmenta: sólo "Todos" con el total del servidor', () => {
    scan.mockReturnValue({ data: { rows: ROWS, total: 250 } });
    server.mockReturnValue({ data: { rows: ROWS, total: 250 }, isFetching: false });
    renderPage('/customers?status=blocked');
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('tab', { name: 'Todos 250' })).toBeInTheDocument();
    // El segmento de la URL se ignora: se ven los de la página del servidor.
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
  });

  it('la búsqueda se hace en el panel cuando hay segmentos y se limpia con el chip', () => {
    scan.mockReturnValue({ data: { rows: ROWS, total: 3 } });
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage('/customers?q=carla');
    expect(screen.getByText('Carla Ruiz')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Quitar filtro/ }));
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
  });

  it('una ?page= fuera de rango vuelve a la primera página', () => {
    scan.mockReturnValue({ data: { rows: ROWS, total: 3 } });
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage('/customers?page=9');
    expect(screen.getByTestId('search')).toBeEmptyDOMElement();
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
  });
});
