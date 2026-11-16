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

const user = (id: string, name: string, customer: boolean, role = customer ? 'customer' : 'delivery') =>
  ({
    user_id: id,
    full_name: name,
    email: `${id}@mail.com`,
    blocked: false,
    role: { type: role },
    customer: customer ? { id } : null,
  }) as unknown as User;

const renderTable = (canManageCustomerAccounts: boolean, readOnly = false) =>
  render(
    <MemoryRouter>
      <UsersTable
        rows={[user('1', 'Ana Cliente', true), user('2', 'Beto Admin', false)]}
        total={2}
        loading={false}
        pagination={{ page: 0, pageSize: 10 }}
        onPaginationChange={vi.fn()}
        canManageCustomerAccounts={canManageCustomerAccounts}
        readOnly={readOnly}
        onEdit={vi.fn()}
        onToggleBlock={vi.fn()}
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  );

describe('UsersTable: permisos en la fila de acciones', () => {
  it('en modo soporte (sólo lectura) ninguna fila tiene editar, bloquear ni dar de baja', () => {
    renderTable(false, true);
    expect(screen.getByRole('button', { name: 'Ver Beto Admin' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar Beto Admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Dar de baja Beto Admin' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Más acciones de Beto Admin' })).toBeNull();
  });

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

describe('UsersTable: administrador general sin distribuidora elegida', () => {
  const renderWithoutDistributor = () =>
    render(
      <MemoryRouter>
        <UsersTable
          rows={[
            user('1', 'Ana Cliente', true),
            user('2', 'Beto Chofer', false, 'delivery'),
            user('3', 'Carla Admin', false, 'admin'),
            user('4', 'Dora General', false, 'super_admin'),
          ]}
          total={4}
          loading={false}
          pagination={{ page: 0, pageSize: 10 }}
          onPaginationChange={vi.fn()}
          canManageCustomerAccounts
          needsDistributor
          onEdit={vi.fn()}
          onToggleBlock={vi.fn()}
          onDelete={vi.fn()}
        />
      </MemoryRouter>,
    );

  it('un chofer o un admin de empresa sólo se ven; clientes y otros generales se administran', () => {
    renderWithoutDistributor();
    for (const name of ['Beto Chofer', 'Carla Admin']) {
      expect(screen.getByRole('button', { name: `Ver ${name}` })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: `Editar ${name}` })).toBeNull();
      expect(screen.queryByRole('button', { name: `Dar de baja ${name}` })).toBeNull();
      expect(screen.queryByRole('button', { name: `Más acciones de ${name}` })).toBeNull();
    }
    for (const name of ['Ana Cliente', 'Dora General']) {
      expect(screen.getByRole('button', { name: `Editar ${name}` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Más acciones de ${name}` })).toBeInTheDocument();
    }
  });
});
