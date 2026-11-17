import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { describe, expect, it, vi } from 'vitest';
import type { StaffRole } from '../../../services/api/types';

vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns, empty }: { rows: StaffRole[]; columns: GridColDef<StaffRole>[]; empty: ReactNode }) => (
    <div>
      {rows.length === 0 && empty}
      {rows.map((row) => (
        <div key={row.staffRoleId}>
          {columns.map((column) => (
            <div key={column.field}>{column.renderCell?.({ row } as GridRenderCellParams<StaffRole>)}</div>
          ))}
        </div>
      ))}
    </div>
  ),
  IdentityCell: ({ title }: { title: ReactNode }) => <span>{title}</span>,
  Badge: ({ label }: { label: { text: string } }) => <span>{label.text}</span>,
}));

import { StaffRolesTable } from './StaffRolesTable';

const systemRole = {
  staffRoleId: 'r1',
  name: 'Administrador',
  description: null,
  isSystem: true,
  permissions: ['roles.gestionar'],
  adminCount: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
} satisfies StaffRole;
const custom = { ...systemRole, staffRoleId: 'r2', name: 'Depósito', isSystem: false, adminCount: 0 };
const viewer = { canManage: true, writeHint: undefined, ownRoleId: 'r1' };

describe('StaffRolesTable', () => {
  it('el rol de sistema se ve sin edición ni baja, con el motivo', () => {
    const onEdit = vi.fn();
    render(
      <StaffRolesTable
        rows={[systemRole]}
        loading={false}
        filtered={false}
        viewer={viewer}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: /Editar rol Administrador \(no disponible: El rol de sistema/ }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de rol Administrador' }));
    expect(
      screen.getByRole('menuitem', { name: 'Dar de baja (no disponible: El rol de sistema no se da de baja)' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('ofrece editar y dar de baja un rol propio de la distribuidora', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(
      <StaffRolesTable
        rows={[custom]}
        loading={false}
        filtered={false}
        viewer={viewer}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Editar rol Depósito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Más acciones de rol Depósito' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dar de baja' }));
    expect(onEdit).toHaveBeenCalledWith(custom);
    expect(onDelete).toHaveBeenCalledWith(custom);
  });

  it('en modo soporte todo queda en sólo lectura', () => {
    const onEdit = vi.fn();
    render(
      <StaffRolesTable
        rows={[custom]}
        loading={false}
        filtered={false}
        viewer={{ ...viewer, writeHint: 'Modo soporte: sólo lectura' }}
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Editar rol Depósito \(no disponible: Modo soporte/ }));
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('sin roles por la búsqueda dice «Sin resultados», no el vacío del recurso', () => {
    const props = { rows: [], loading: false, viewer, onEdit: vi.fn(), onDelete: vi.fn() };
    const { rerender } = render(<StaffRolesTable {...props} filtered />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByText('Sin roles')).not.toBeInTheDocument();
    rerender(<StaffRolesTable {...props} filtered={false} />);
    expect(screen.getByText('Sin roles')).toBeInTheDocument();
  });
});
