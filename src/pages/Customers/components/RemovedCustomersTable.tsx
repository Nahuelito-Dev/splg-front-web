import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, DataTable, EmptyState, IdentityCell } from '../../../common/components/ui';
import type { Customer } from '../../../services/api/types';
import { formatDate } from '../../../utils/format';

interface Props {
  rows: Customer[];
  total: number;
  loading: boolean;
  /** Hay una búsqueda activa: un vacío significa "sin resultados". */
  filtered?: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  onRestore: (customer: Customer) => void;
  /** Por qué reactivar no se puede hoy (administrador general sin distribuidora elegida). */
  restoreBlockedReason?: string;
}

export const RemovedCustomersTable = ({
  rows,
  total,
  loading,
  filtered = false,
  pagination,
  onPaginationChange,
  onRestore,
  restoreBlockedReason,
}: Props) => {
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
        field: 'createdAt',
        headerName: 'Alta',
        width: 140,
        valueGetter: ({ row }) => formatDate(row.createdAt),
      },
      {
        field: 'actions',
        headerName: '',
        width: 150,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw />}
            aria-label={`Reactivar ${row.user?.full_name ?? 'cliente'}`}
            blockedReason={restoreBlockedReason}
            onClick={() => onRestore(row)}
          >
            Reactivar
          </Button>
        ),
      },
    ],
    [onRestore, restoreBlockedReason],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.customer_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún cliente dado de baja coincide con la búsqueda."
          />
        ) : (
          <EmptyState title="No diste de baja a ningún cliente" />
        )
      }
    />
  );
};
