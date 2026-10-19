import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FROM_LIST_STATE } from '../../../hooks';
import { DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Customer } from '../../../services/api/types';
import { formatDate } from '../../../utils/format';

interface Props {
  rows: Customer[];
  total: number;
  loading: boolean;
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Sin permiso para administrar cuentas (admin de empresa) no se muestran. */
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  /** Selección múltiple para exportar lo marcado; sin esto la tabla no dibuja casillas. */
  selection?: { ids: string[]; onChange: (ids: string[]) => void };
  /** Avisa que se cambió de página, p. ej. para soltar la selección. */
  onPageChange?: () => void;
}

export const CustomersTable = ({
  rows,
  total,
  loading,
  filtered = false,
  pagination,
  onPaginationChange,
  onEdit,
  onDelete,
  selection,
  onPageChange,
}: Props) => {
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
        width: 136,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={row.user?.full_name ?? 'cliente'}
            onView={() => navigate(`/customers/details/${row.customer_id}`, { state: FROM_LIST_STATE })}
            onEdit={onEdit && (() => onEdit(row))}
            onDelete={onDelete && (() => onDelete(row))}
            deleteLabel="Dar de baja"
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
      selection={selection}
      onPageChange={onPageChange}
      onRowClick={(row) => navigate(`/customers/details/${row.customer_id}`, { state: FROM_LIST_STATE })}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún cliente coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState
            title="No hay clientes"
            description="Los clientes aparecen cuando se registran en la app o cuando los das de alta."
          />
        )
      }
    />
  );
};
