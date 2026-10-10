import type { GridColDef } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Claim } from '../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { CLAIM_STATUS, labelOf } from '../../../utils/statusLabels';

interface Props {
  rows: Claim[];
  loading: boolean;
  /** Hay filtros activos: un vacío significa "sin resultados", no "todo en orden". */
  filtered?: boolean;
  onManage: (claim: Claim) => void;
  /** Sólo en un reclamo pendiente: la API no deja editar uno que ya se tomó. */
  onEdit?: (claim: Claim) => void;
  /** «Rechazar» es la baja del reclamo (queda rechazado con su nota, no se borra). */
  onReject?: (claim: Claim) => void;
}

export const ClaimsTable = ({ rows, loading, filtered = false, onManage, onEdit, onReject }: Props) => {
  const columns = useMemo<GridColDef<Claim>[]>(
    () => [
      {
        field: 'customer',
        headerName: 'Cliente',
        flex: 1.3,
        minWidth: 200,
        valueGetter: ({ row }) => row.customer?.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.customer?.full_name ?? 'Cliente sin nombre'}
            subtitle={`Pedido ${formatShortId(row.order_id)}`}
            avatarName={row.customer?.full_name ?? '?'}
          />
        ),
      },
      {
        field: 'reason',
        headerName: 'Motivo',
        flex: 1.4,
        minWidth: 220,
        renderCell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{row.reason}</p>
            <p className="truncate text-xs text-muted">{row.description}</p>
          </div>
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Fecha',
        width: 170,
        valueFormatter: ({ value }: { value: string }) => formatDateTime(value),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 130,
        renderCell: ({ row }) => <Badge label={labelOf(CLAIM_STATUS, row.status)} />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 128,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`reclamo de ${row.customer?.full_name ?? 'cliente'}`}
            onView={() => onManage(row)}
            onEdit={onEdit && row.status === 'pending' ? () => onEdit(row) : undefined}
            onDelete={
              onReject && (row.status === 'pending' || row.status === 'in_process') ? () => onReject(row) : undefined
            }
            deleteLabel="Rechazar"
          />
        ),
      },
    ],
    [onManage, onEdit, onReject],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.claim_id}
      loading={loading}
      onRowClick={onManage}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún reclamo coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState
            illustration="done"
            title="¡Todo en orden!"
            description="No hay reclamos pendientes de atención."
          />
        )
      }
    />
  );
};
