import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil, UserX } from 'lucide-react';
import { DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Customer } from '../../../services/api/types';
import { formatDate } from '../../../utils/format';

interface Props {
  rows: Customer[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin permiso para administrar cuentas (admin de empresa) no se muestran. */
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
}

export const CustomersTable = ({ rows, total, loading, pagination, onPaginationChange, onEdit, onDelete }: Props) => {
  const navigate = useNavigate();
  const columns = useMemo<GridColDef<Customer>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Cliente',
        flex: 1.4,
        minWidth: 220,
        valueGetter: ({ row }) => row.user?.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.user?.full_name ?? 'Sin nombre'}
            subtitle={row.user?.email ?? undefined}
            avatarName={row.user?.full_name ?? '?'}
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
        field: 'addresses',
        headerName: 'Direcciones',
        width: 120,
        valueGetter: ({ row }) => row.user?.addresses?.length ?? 0,
        cellClassName: 'font-mono',
      },
      {
        field: 'createdAt',
        headerName: 'Alta',
        width: 140,
        valueGetter: ({ row }) => formatDate(row.createdAt),
      },
      {
        field: 'actions',
        headerName: '',
        width: 96,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.user?.full_name ?? 'cliente'}
            onView={() => navigate(`/customers/details/${row.customer_id}`)}
            actions={[
              ...(onEdit ? [{ label: 'Editar cuenta', icon: Pencil, onClick: () => onEdit(row) }] : []),
              ...(onDelete
                ? [{ label: 'Dar de baja', icon: UserX, tone: 'danger' as const, onClick: () => onDelete(row) }]
                : []),
            ]}
          />
        ),
      },
    ],
    [navigate, onEdit, onDelete],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.customer_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={(row) => navigate(`/customers/details/${row.customer_id}`)}
      empty={
        <EmptyState
          title="No hay clientes"
          description="Los clientes aparecen cuando se registran en la app o cuando los das de alta."
        />
      }
    />
  );
};
