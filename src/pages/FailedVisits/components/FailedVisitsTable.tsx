import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { FailedVisitOrder } from '../../../services/api/types';
import { formatDateTime, formatShortId } from '../../../utils/format';
import { FAILED_VISIT_REASON, labelOf } from '../../../utils/statusLabels';
import { distanceText, isClosedOrder, orderRevisitWhen, revisitBadge } from '../revisit';

interface Props {
  rows: FailedVisitOrder[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** Hay filtros activos: un vacío significa «sin resultados». */
  filtered: boolean;
  onView: (order: FailedVisitOrder) => void;
}

/** Un renglón por pedido con visitas fallidas; el resto (historial, punto, acciones) está en el detalle. */
export const FailedVisitsTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  filtered,
  onView,
}: Props) => {
  const columns = useMemo<GridColDef<FailedVisitOrder>[]>(
    () => [
      {
        field: 'customerName',
        headerName: 'Cliente',
        flex: 1.2,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.customerName ?? 'Cliente sin nombre'}
            subtitle={`Pedido ${formatShortId(row.orderId)}${row.deliveryMode === 'express' ? ' · Express' : ''}`}
            avatarName={row.customerName ?? '?'}
          />
        ),
      },
      {
        field: 'lastReason',
        headerName: 'Última visita',
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => (
          <div className="min-w-0 py-1">
            <p className="truncate text-sm text-ink">{labelOf(FAILED_VISIT_REASON, row.lastReason).text}</p>
            <p className="truncate text-xs text-muted">
              {formatDateTime(row.lastFailedAt)}
              {row.lastDistanceMeters !== null ? ` · ${distanceText(row.lastDistanceMeters)}` : ''}
            </p>
          </div>
        ),
      },
      {
        field: 'failedVisitCount',
        headerName: 'Visitas',
        width: 90,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
      },
      {
        field: 'revisitStatus',
        headerName: 'Nueva visita',
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        renderCell: ({ row }) => {
          const badge = revisitBadge(row);
          return badge ? (
            <div className="min-w-0 py-1">
              <Badge label={badge} />
              {!isClosedOrder(row) && (
                <p className="truncate text-xs text-muted">{orderRevisitWhen(row) ?? 'Sin fecha'}</p>
              )}
            </div>
          ) : (
            <span className="text-sm text-muted">—</span>
          );
        },
      },
      {
        field: 'actions',
        headerName: '',
        width: 72,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions rowLabel={`pedido ${formatShortId(row.orderId)}`} onView={() => onView(row)} />
        ),
      },
    ],
    [onView],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.orderId}
      loading={loading}
      label="visitas fallidas"
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún pedido con visitas fallidas coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState
            illustration="done"
            title="Sin visitas fallidas pendientes"
            description="No hay pedidos esperando una nueva visita."
          />
        )
      }
    />
  );
};
