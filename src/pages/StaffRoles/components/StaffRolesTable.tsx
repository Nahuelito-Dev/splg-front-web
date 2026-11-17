import { useMemo } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import { KeyRound } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { StaffRole } from '../../../services/api/types';
import { STAFF_ROLE_KIND } from '../../../utils/statusLabels';
import { staffRoleActions, type StaffRoleViewer } from '../staffRoleAccess';

interface Props {
  rows: StaffRole[];
  loading: boolean;
  /** Hay una búsqueda activa: el vacío es «Sin resultados», no el del recurso. */
  filtered: boolean;
  viewer: StaffRoleViewer;
  onEdit: (role: StaffRole) => void;
  onDelete: (role: StaffRole) => void;
}

/** Roles del personal: el de sistema primero; editar y dar de baja según las reglas de la API. */
export const StaffRolesTable = ({ rows, loading, filtered, viewer, onEdit, onDelete }: Props) => {
  const columns = useMemo<GridColDef<StaffRole>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Rol',
        flex: 1.4,
        minWidth: 190,
        renderCell: ({ row }) => (
          <IdentityCell title={row.name} subtitle={row.description ?? undefined} icon={KeyRound} />
        ),
      },
      {
        field: 'permissions',
        headerName: 'Permisos',
        width: 125,
        valueGetter: ({ row }) => (row.isSystem ? 'Todos' : row.permissions.length),
      },
      { field: 'adminCount', headerName: 'Admins', width: 110 },
      {
        field: 'system',
        headerName: 'Tipo',
        width: 135,
        valueGetter: ({ row }) => STAFF_ROLE_KIND[row.isSystem ? 'system' : 'custom'].text,
        renderCell: ({ row }) => <Badge label={STAFF_ROLE_KIND[row.isSystem ? 'system' : 'custom']} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 105,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => {
          const { edit, remove } = staffRoleActions(row, viewer);
          return (
            <RowActions
              rowLabel={`rol ${row.name}`}
              onEdit={edit ? () => onEdit(row) : undefined}
              editBlockedReason={edit?.blockedReason}
              onDelete={remove ? () => onDelete(row) : undefined}
              deleteBlockedReason={remove?.blockedReason}
              deleteLabel="Dar de baja"
            />
          );
        },
      },
    ],
    [viewer, onDelete, onEdit],
  );
  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.staffRoleId}
      loading={loading}
      empty={
        filtered ? (
          <EmptyState illustration="search" title="Sin resultados" description="Ningún rol coincide con la búsqueda." />
        ) : (
          <EmptyState title="Sin roles" description="Creá el primer rol para el personal." />
        )
      }
    />
  );
};
