import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../services/api/types';

const server = vi.hoisted(() => vi.fn());
const removed = vi.hoisted(() => vi.fn());
const perms = vi.hoisted(() => ({
  value: { canManageCustomerAccounts: false } as Record<string, unknown>,
}));
const restore = vi.hoisted(() => ({ confirm: vi.fn(), mutate: vi.fn() }));
const manageCustomers = vi.hoisted(() => ({ allowed: true }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => perms.value,
  usePermiso: (code: string) => ({ allowed: code !== 'clientes.gestionar' || manageCustomers.allowed, known: true }),
}));
vi.mock('../../services/queries/customers', () => ({
  useCustomers: (...args: unknown[]) => server(...args) as unknown,
  useCustomerStatusCounts: () => ({ all: 3, active: 2, blocked: 1 }),
  useRemoveCustomer: () => ({ mutate: vi.fn() }),
  useRestoreCustomer: () => ({ mutate: restore.mutate }),
  useRemovedCustomers: (...args: unknown[]) => removed(...args) as unknown,
  useRemovedCustomerCount: () => 4,
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: restore.confirm,
}));
// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns, empty }: { rows: Customer[]; columns: GridColDef<Customer>[]; empty: ReactNode }) =>
    rows.length === 0 ? (
      empty
    ) : (
      <div>
        {rows.map((row) => (
          <div key={row.customer_id}>
            {columns.map((column) => (
              <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<Customer>)}</div>
            ))}
          </div>
        ))}
      </div>
    ),
}));
vi.mock('./components/CustomerFormModal', () => ({ CustomerFormModal: () => null }));
vi.mock('./components/FindCustomerByUserModal', () => ({ FindCustomerByUserModal: () => null }));

import { Customers } from './Customers';

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  removed.mockReturnValue({ data: undefined, isFetching: false });
});

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
  it('muestra Todos / Activos / Bloqueados / Dados de baja con los totales reales de la API', () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    renderPage();
    expect(screen.getByRole('tab', { name: 'Todos 3' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activos 2' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Bloqueados 1' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dados de baja 4' })).toBeInTheDocument();
  });

  it('la pestaña Bloqueados pide ?status=blocked al servidor y queda en la URL con su chip', () => {
    server.mockReturnValue({ data: { rows: [ROWS[1]], total: 1 }, isFetching: false });
    renderPage();
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', undefined, true);
    fireEvent.click(screen.getByRole('tab', { name: 'Bloqueados 1' }));
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', 'blocked', true);
    expect(screen.getByTestId('search')).toHaveTextContent('?status=blocked');
    expect(screen.getByText('Beto Gómez')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Filtros activos' })).toBeInTheDocument();
    expect(screen.getByText('1', { selector: 'b' }).parentElement).toHaveTextContent('1 cliente');
  });

  it('con más de 100 clientes sigue habiendo pestañas: el segmento lo resuelve la API', () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 250 }, isFetching: false });
    renderPage('/customers?status=active');
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', 'active', true);
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

describe('Customers: dados de baja', () => {
  const REMOVED = [customer('9', 'Dora Baja', false)];
  const openRemoved = () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    removed.mockReturnValue({ data: { rows: REMOVED, total: 1 }, isFetching: false });
    renderPage('/customers?status=removed');
  };

  it('sin «Ver como» no pide los dados de baja y muestra el motivo, no un vacío', () => {
    perms.value = {
      canManageCustomerAccounts: true,
      needsDistributor: true,
      operateHint: 'Elegí una distribuidora en «Ver como» para operar',
    };
    openRemoved();
    expect(removed).toHaveBeenLastCalledWith(expect.anything(), '', false);
    expect(screen.getByText('Elegí una distribuidora en «Ver como» para operar')).toBeInTheDocument();
    expect(screen.queryByText('Dora Baja')).not.toBeInTheDocument();
    perms.value = { canManageCustomerAccounts: false };
  });

  it('lista los clientes dados de baja del back y no muestra el listado normal', () => {
    openRemoved();
    expect(screen.getByText('Dora Baja')).toBeInTheDocument();
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(server).toHaveBeenLastCalledWith(expect.anything(), '', undefined, false);
    expect(removed).toHaveBeenLastCalledWith(expect.anything(), '', true);
  });

  it('Reactivar pide confirmación y reactiva al confirmar', async () => {
    restore.confirm.mockResolvedValue(true);
    openRemoved();
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar Dora Baja' }));
    await waitFor(() => expect(restore.mutate).toHaveBeenCalledWith('9', expect.anything()));
    expect(restore.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: 'Reactivar' }));
  });

  it('si se cancela no reactiva', async () => {
    restore.confirm.mockResolvedValue(false);
    openRemoved();
    fireEvent.click(screen.getByRole('button', { name: 'Reactivar Dora Baja' }));
    await waitFor(() => expect(restore.confirm).toHaveBeenCalled());
    expect(restore.mutate).not.toHaveBeenCalled();
  });

  it('sin dados de baja dice que no diste de baja a ningún cliente', () => {
    server.mockReturnValue({ data: { rows: ROWS, total: 3 }, isFetching: false });
    removed.mockReturnValue({ data: { rows: [], total: 0 }, isFetching: false });
    renderPage('/customers?status=removed');
    expect(screen.getByText('No diste de baja a ningún cliente')).toBeInTheDocument();
  });
});

describe('Customers: modo soporte (sólo lectura)', () => {
  it('«Nuevo cliente» queda apagado con el aviso', () => {
    perms.value = {
      canManageCustomerAccounts: false,
      canWrite: false,
      writeHint: 'Modo soporte: sólo lectura',
      operateHint: 'Modo soporte: sólo lectura',
    };
    renderPage();
    const button = screen.getByRole('button', { name: /Nuevo cliente/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Modo soporte: sólo lectura');
    perms.value = { canManageCustomerAccounts: false };
  });

  it('sin «Gestionar los clientes», «Nuevo cliente» queda apagado con el permiso que falta', () => {
    manageCustomers.allowed = false;
    perms.value = { canManageCustomerAccounts: false, canWrite: true };
    renderPage();
    const button = screen.getByRole('button', { name: /Nuevo cliente/ });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Hace falta el permiso «Gestionar los clientes»');
    manageCustomers.allowed = true;
    perms.value = { canManageCustomerAccounts: false };
  });
});
