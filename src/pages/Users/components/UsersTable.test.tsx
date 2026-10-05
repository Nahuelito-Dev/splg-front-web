import { cleanup, render, screen } from '@testing-library/react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../../../services/api/types';

// El DataGrid de MUI no maqueta columnas en jsdom: se renderiza cada celda tal cual.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: User[]; columns: GridColDef<User>[] }) => (
    <div>
      {rows.map((row) => (
        <div key={row.user_id}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<User>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
}));

import { UsersTable } from './UsersTable';

afterEach(cleanup);

const user = (id: string, name: string, customer: boolean) =>
  ({
    user_id: id,
    full_name: name,
    email: `${id}@mail.com`,
    blocked: false,
    customer: customer ? { id } : null,
  }) as unknown as User;

const renderTable = (canManageCustomerAccounts: boolean) =>
  render(
    <MemoryRouter>
      <UsersTable
        rows={[user('1', 'Ana Cliente', true), user('2', 'Beto Admin', false)]}
        total={2}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        canManageCustomerAccounts={canManageCustomerAccounts}
        onEdit={vi.fn()}
        onToggleBlock={vi.fn()}
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  );

describe('UsersTable: permisos en la fila de acciones', () => {
  it('sin permiso sobre cuentas de clientes, la fila de un cliente sólo tiene Ver', () => {
    renderTable(false);
    expect(screen.getByRole('button', { name: 'Ver Ana Cliente' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Ana Cliente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dar de baja Ana Cliente' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Más acciones de Ana Cliente' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Editar Beto Admin' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dar de baja Beto Admin' })).toBeInTheDocument();
  });

  it('con permiso, la fila del cliente tiene Editar y Dar de baja', () => {
    renderTable(true);
    expect(screen.getByRole('button', { name: 'Editar Ana Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dar de baja Ana Cliente' })).toBeInTheDocument();
  });
});
