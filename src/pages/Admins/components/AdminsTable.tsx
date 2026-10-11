import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Admin } from '../../../services/api/types';
import { roleLabel } from '../../Users/roleLabel';

interface Props {
  rows: Admin[];
  loading: boolean;
}

/** Administradores: «Ver» abre su ficha; la cuenta (editar, bloquear, dar de baja) se gestiona desde la ficha del usuario. */
export const AdminsTable = ({ rows, loading }: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<Admin>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Admin',
        flex: 1.4,
        minWidth: 220,
        valueGetter: ({ row }) => row.user?.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.user?.full_name ?? 'Sin nombre'}
            subtitle={row.user?.email ?? undefined}
            avatarName={row.user?.full_name ?? '?'}
            photo={{ kind: 'user', id: row.user_id, url: row.user?.photoUrl }}
          />
        ),
      },
      {
        field: 'phone',
        headerName: 'Teléfono',
        flex: 1,
        minWidth: 150,
        valueGetter: ({ row }) => row.user?.phone_number ?? '—',
      },
      {
        field: 'role',
        headerName: 'Rol',
        width: 190,
        valueGetter: ({ row }) => row.user?.role?.type ?? row.role?.type ?? '',
        renderCell: ({ row }) => <Badge label={roleLabel(row.user?.role?.type ?? row.role?.type)} />,
      },
      {
        field: 'distributor',
        headerName: 'Empresa',
        flex: 1,
        minWidth: 160,
        valueGetter: ({ row }) => row.distributor?.name ?? 'Plataforma',
      },
      {
        field: 'actions',
        headerName: '',
        width: 64,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.user?.full_name ?? 'administrador'}
            onView={() => navigate(`/admins/${row.admin_id}`)}
          />
        ),
      },
    ],
    [navigate],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.admin_id}
      loading={loading}
      onRowClick={(row) => navigate(`/admins/${row.admin_id}`)}
      empty={<EmptyState title="Sin admins" description="Todavía no hay administradores en esta vista." />}
    />
  );
};
