import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FROM_LIST_STATE } from '../../../hooks';
import { Lock, LockOpen } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { User } from '../../../services/api/types';
import { roleLabel } from '../roleLabel';
import { isDistributorStaff } from '../userScope';

interface Props {
  rows: User[];
  total: number;
  loading: boolean;
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** La cuenta de un cliente la administra sólo el administrador general. */
  canManageCustomerAccounts: boolean;
  /** Administrador general sin distribuidora elegida: la cuenta de un chofer o admin de empresa no se puede tocar. */
  needsDistributor?: boolean;
  onEdit: (user: User) => void;
  onToggleBlock: (user: User) => void;
  onDelete: (user: User) => void;
}

export const UsersTable = ({
  rows,
  total,
  loading,
  filtered = false,
  pagination,
  onPaginationChange,
  canManageCustomerAccounts,
  needsDistributor = false,
  onEdit,
  onToggleBlock,
  onDelete,
}: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<User>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Usuario',
        flex: 1.4,
        minWidth: 220,
        valueGetter: ({ row }) => row.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.full_name ?? 'Sin nombre'}
            subtitle={row.email ?? undefined}
            avatarName={row.full_name ?? '?'}
            photo={{ kind: 'user', id: row.user_id, url: row.photoUrl }}
          />
        ),
      },
      {
        field: 'phone_number',
        headerName: 'Teléfono',
        flex: 1,
        minWidth: 150,
        valueGetter: ({ row }) => row.phone_number ?? '—',
      },
      {
        field: 'role',
        headerName: 'Rol',
        width: 180,
        valueGetter: ({ row }) => row.role?.type ?? '',
        renderCell: ({ row }) => <Badge label={roleLabel(row.role?.type)} />,
      },
      {
        field: 'blocked',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => (
          <Badge label={row.blocked ? { text: 'Bloqueado', tone: 'danger' } : { text: 'Activo', tone: 'success' }} />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 168,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => {
          // La cuenta de un cliente sólo la administra el administrador general.
          const canManage =
            (canManageCustomerAccounts || !row.customer) && !(needsDistributor && isDistributorStaff(row));
          return (
            <RowActions
              rowLabel={row.full_name ?? 'usuario'}
              onView={() => navigate(`/users/details/${row.user_id}`, { state: FROM_LIST_STATE })}
              onEdit={canManage ? () => onEdit(row) : undefined}
              onDelete={canManage ? () => onDelete(row) : undefined}
              deleteLabel="Dar de baja"
              actions={
                canManage
                  ? [
                      {
                        label: row.blocked ? 'Desbloquear' : 'Bloquear',
                        icon: row.blocked ? LockOpen : Lock,
                        tone: row.blocked ? 'neutral' : 'danger',
                        onClick: () => onToggleBlock(row),
                      },
                    ]
                  : []
              }
            />
          );
        },
      },
    ],
    [navigate, canManageCustomerAccounts, needsDistributor, onEdit, onToggleBlock, onDelete],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.user_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={(row) => navigate(`/users/details/${row.user_id}`, { state: FROM_LIST_STATE })}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún usuario coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState title="No hay usuarios" description="Todavía no hay usuarios registrados." />
        )
      }
    />
  );
};
