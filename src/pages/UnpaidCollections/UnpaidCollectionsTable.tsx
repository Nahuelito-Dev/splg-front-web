import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMediaQuery } from '@mui/material';
import { HandCoins } from 'lucide-react';
import { useMemo } from 'react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  IdentityCell,
  RowActions,
  TableSkeleton,
} from '../../common/components/ui';
import type { Incident, Order } from '../../services/api/types';
import { formatCurrency, formatDateTime, formatShortId } from '../../utils/format';
import { INCIDENT_STATUS, labelOf } from '../../utils/statusLabels';

interface Props {
  rows: Order[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  /** La incidencia `unpaid_collection` de cada pedido, por id de pedido. */
  incidentByOrder: Map<string, Incident>;
  /** No se pudieron cargar las incidencias: se avisa en vez de mostrar «Sin incidencia». */
  incidentsError?: boolean;
  onView: (order: Order) => void;
  /** Sin él no se dibuja «Resolver impago» (administrador general sin distribuidora elegida). */
  onResolve?: (order: Order) => void;
}

/** Pedidos con el cobro en efectivo informado como impago, con la incidencia que abrió el chofer. */
export const UnpaidCollectionsTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  incidentByOrder,
  incidentsError = false,
  onView,
  onResolve,
}: Props) => {
  const columns = useMemo<GridColDef<Order>[]>(
    () => [
      {
        field: 'customer',
        headerName: 'Pedido',
        flex: 1.4,
        minWidth: 240,
        sortable: false,
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.customer?.full_name ?? 'Cliente sin nombre'}
            subtitle={`${formatShortId(row.order_id)} · ${formatDateTime(row.created_at)}`}
            avatarName={row.customer?.full_name ?? '?'}
            person={{ userId: row.customer?.user_id }}
          />
        ),
      },
      {
        field: 'delivery_name',
        headerName: 'Chofer',
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: ({ row }) => <span className="truncate text-ink">{row.delivery_name ?? '—'}</span>,
      },
      {
        field: 'incident',
        headerName: 'Incidencia',
        flex: 1.2,
        minWidth: 200,
        sortable: false,
        renderCell: ({ row }) => {
          const incident = incidentByOrder.get(row.order_id);
          if (incidentsError) return <span className="text-danger">No se pudo cargar la incidencia</span>;
          if (!incident) return <span className="text-muted">Sin incidencia</span>;
          return (
            <div className="min-w-0 leading-tight">
              <Badge label={labelOf(INCIDENT_STATUS, incident.status)} />
              <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                Informado {formatDateTime(incident.createdAt)}
              </span>
            </div>
          );
        },
      },
      {
        field: 'total_amount',
        headerName: 'Importe',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        renderCell: ({ row }) => (
          <span className="tabular-nums font-semibold text-ink">{formatCurrency(row.total_amount)}</span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 230,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <div className="flex items-center justify-end gap-2" onClick={(event) => event.stopPropagation()}>
            {onResolve && (
              <Button size="sm" icon={<HandCoins />} onClick={() => onResolve(row)}>
                Resolver impago
              </Button>
            )}
            <RowActions rowLabel={`pedido ${formatShortId(row.order_id)}`} onView={() => onView(row)} />
          </div>
        ),
      },
    ],
    [incidentByOrder, incidentsError, onView, onResolve],
  );

  // En pantallas angostas la grilla se desplaza y las acciones quedan fuera de vista: se muestran como tarjetas.
  const narrow = useMediaQuery('(max-width:639px)');
  const lastPage = Math.max(0, Math.ceil(total / pagination.pageSize) - 1);

  if (narrow) {
    return (
      <div>
        {loading && rows.length === 0 ? (
          <div role="status" aria-label="Cargando cobros impagos" className="p-4">
            <TableSkeleton rows={3} columns={3} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            illustration="done"
            title="No hay cobros impagos"
            description="Cuando un chofer informe que no pudo cobrar un pedido en efectivo, aparece acá hasta que lo resuelvas."
          />
        ) : (
          <ul className="divide-y divide-outline" aria-busy={loading}>
            {rows.map((row) => {
              const incident = incidentByOrder.get(row.order_id);
              return (
                <li key={row.order_id} className="space-y-3 p-4">
                  <IdentityCell
                    title={row.customer?.full_name ?? 'Cliente sin nombre'}
                    subtitle={`${formatShortId(row.order_id)} · ${formatDateTime(row.created_at)}`}
                    avatarName={row.customer?.full_name ?? '?'}
                    person={{ userId: row.customer?.user_id }}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted">{row.delivery_name ?? 'Sin chofer'}</span>
                    <span className="tabular-nums font-semibold text-ink">{formatCurrency(row.total_amount)}</span>
                  </div>
                  {incidentsError ? (
                    <span className="text-xs text-danger">No se pudo cargar la incidencia</span>
                  ) : (
                    incident && <Badge label={labelOf(INCIDENT_STATUS, incident.status)} />
                  )}
                  <div className="flex flex-wrap gap-2">
                    {onResolve && (
                      <Button size="sm" icon={<HandCoins />} onClick={() => onResolve(row)}>
                        Resolver impago
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => onView(row)}>
                      Ver pedido
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {total > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-outline p-3 text-sm text-muted">
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page === 0}
              onClick={() => onPaginationChange({ ...pagination, page: pagination.page - 1 })}
            >
              Anterior
            </Button>
            <span>
              Página {pagination.page + 1} de {lastPage + 1}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.page >= lastPage}
              onClick={() => onPaginationChange({ ...pagination, page: pagination.page + 1 })}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.order_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      empty={
        <EmptyState
          illustration="done"
          title="No hay cobros impagos"
          description="Cuando un chofer informe que no pudo cobrar un pedido en efectivo, aparece acá hasta que lo resuelvas."
        />
      }
    />
  );
};
