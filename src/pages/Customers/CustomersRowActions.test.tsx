import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Customer } from '../../services/api/types';

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), mutate: vi.fn() }));

vi.mock('../../hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  usePermissions: () => ({ canManageCustomerAccounts: true, operateHint: undefined }),
}));
vi.mock('../../utils/notifications', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  confirm: mocks.confirm,
}));
vi.mock('../../services/queries/customers', () => ({
  useCustomers: () => ({ data: { rows: [CUSTOMER], total: 1 }, isFetching: false }),
  useCustomerStatusCounts: () => ({ all: 1, active: 1, blocked: 0 }),
  useRemoveCustomer: () => ({ mutate: mocks.mutate }),
  useRestoreCustomer: () => ({ mutate: vi.fn() }),
  useRemovedCustomers: () => ({ data: undefined, isFetching: false }),
  useRemovedCustomerCount: () => null,
}));
// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: Customer[]; columns: GridColDef<Customer>[] }) => (
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

const CUSTOMER = {
  customer_id: '1',
  user_id: 'u-1',
  createdAt: '2026-06-01T10:00:00Z',
  user: { full_name: 'Ana Pérez', email: 'ana@mail.com', phone_number: '3764000', blocked: false, addresses: [] },
} as unknown as Customer;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <Customers />
    </MemoryRouter>,
  );

describe('Clientes: fila de acciones', () => {
  it('muestra Ver y Editar con ícono y Dar de baja en el ⋯', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Ver Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar Ana Pérez' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Ana Pérez' }));
    expect(screen.getByRole('menuitem', { name: 'Dar de baja' })).toBeInTheDocument();
  });

  it('Dar de baja pide confirmación: si se cancela no se da de baja, si se acepta sí', async () => {
    const answer = { resolve: (_value: boolean) => {} };
    mocks.confirm.mockImplementation(() => new Promise<boolean>((resolve) => (answer.resolve = resolve)));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Ana Pérez' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmText: 'Dar de baja',
        danger: true,
        text: expect.stringContaining('de esta distribuidora') as string,
      }),
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
    await act(() => Promise.resolve(answer.resolve(false)));
    expect(mocks.mutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de Ana Pérez' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    await act(() => Promise.resolve(answer.resolve(true)));
    expect(mocks.mutate).toHaveBeenCalledWith('1', expect.anything());
  });
});
