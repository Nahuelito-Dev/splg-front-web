import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Admin } from '../../../services/api/types';
import { adminRoleLabel } from '../adminRoleLabel';
import { offersStaffRoleChange, type Manageable } from '../adminAccess';

interface Props {
  rows: Admin[];
  loading: boolean;
  stateOf: (admin: Admin) => Manageable;
  blockedReason: string;
  onEdit: (admin: Admin) => void;
  onDelete: (admin: Admin) => void;
  /** «Cambiar rol» (F37); sin esto no se ofrece. */
  onChangeStaffRole?: (admin: Admin) => void;
  /** Si se ofrece pero no se puede sobre ese administrador (modo soporte, tiene más permisos), el porqué. */
  changeStaffRoleBlockedReason?: (admin: Admin) => string | undefined;
}

/** Administradores: «Ver» abre su ficha; editar y dar de baja según lo que la sesión puede sobre cada uno. */
export const AdminsTable = ({
  rows,
  loading,
  stateOf,
  blockedReason,
  onEdit,
  onDelete,
  onChangeStaffRole,
  changeStaffRoleBlockedReason,
}: Props) => {
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
        valueGetter: ({ row }) => row.staffRole?.name ?? row.user?.role?.type ?? row.role?.type ?? '',
        renderCell: ({ row }) => <Badge label={adminRoleLabel(row)} />,
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
        width: 130,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => {
          const state = stateOf(row);
          return (
            <RowActions
              rowLabel={row.user?.full_name ?? 'administrador'}
              onView={() => navigate(`/admins/${row.admin_id}`)}
              onEdit={state.edit === 'hidden' ? undefined : () => onEdit(row)}
              editBlockedReason={state.edit === 'needs-distributor' ? blockedReason : undefined}
              onDelete={state.remove === 'hidden' ? undefined : () => onDelete(row)}
              deleteBlockedReason={state.remove === 'needs-distributor' ? blockedReason : undefined}
              deleteLabel="Dar de baja a"
              actions={
                onChangeStaffRole && offersStaffRoleChange(row, state)
                  ? [
                      {
                        label: 'Cambiar rol',
                        icon: UserCog,
                        onClick: () => onChangeStaffRole(row),
                        blockedReason: changeStaffRoleBlockedReason?.(row),
                      },
                    ]
                  : undefined
              }
            />
          );
        },
      },
    ],
    [navigate, stateOf, blockedReason, onEdit, onDelete, onChangeStaffRole, changeStaffRoleBlockedReason],
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
