import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { UserRoundCog } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, RowActions } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { formatCurrency, formatDateTime, formatNumber, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS, PAYMENT_STATUS } from '../../../utils/statusLabels';
import { orderEditBlockedReason } from './orderEdit';
import { isClosed } from './orderStatus';

/** "Villa Lanús +10 %" o "Garupá +$ 1.500": la zona que se cobró en ese pedido. */
const zoneText = (order: Order): string | null => {
  const zone = order.zone_surcharge;
  if (!zone) return null;
  const value = zone.type === 'percentage' ? `+${formatNumber(zone.value)} %` : `+${formatCurrency(zone.value)}`;
  return `${zone.name} ${value}`;
};

interface Props {
  rows: Order[];
  total: number;
  loading: boolean;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  onView: (order: Order) => void;
  onAssign: (order: Order) => void;
  /** Sin él no se dibuja «Editar» (p. ej. sin distribuidora elegida). */
  onEdit?: (order: Order) => void;
  /** La baja del pedido: se cancela, no se borra (devuelve el stock). */
  onCancel: (order: Order) => void;
  /** Selección múltiple para las acciones en lote; sin esto la tabla no dibuja casillas. */
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  selection?: { ids: string[]; onChange: (ids: string[]) => void };
}

/** Pedidos: quién, adónde, quién lo lleva, en qué estado y cuánto. Ítems, pago y tiempos van en el detalle. */
export const OrdersTable = ({
  rows,
  total,
  loading,
  pagination,
  onPaginationChange,
  onView,
  onAssign,
  onEdit,
  onCancel,
  selection,
  filtered = false,
}: Props) => {
  const columns = useMemo<GridColDef<Order>[]>(
    () => [
      {
        field: 'customer',
        headerName: 'Pedido',
        flex: 1.4,
        minWidth: 240,
        sortable: false,
        valueGetter: ({ row }) => row.customer?.full_name ?? '',
        renderCell: ({ row }) => (
          <IdentityCell
            title={row.customer?.full_name ?? 'Cliente sin nombre'}
            subtitle={`${formatShortId(row.order_id)} · ${formatDateTime(row.created_at)}`}
            avatarName={row.customer?.full_name ?? '?'}
          />
        ),
      },
      {
        field: 'delivery_address',
        headerName: 'Entrega',
        flex: 1.3,
        minWidth: 220,
        sortable: false,
        valueGetter: ({ row }) => row.delivery_address?.street ?? '',
        renderCell: ({ row }) => {
          const zone = zoneText(row);
          return (
            <div className="min-w-0 leading-tight">
              <span className="block truncate text-ink">{row.delivery_address?.street ?? 'Sin dirección'}</span>
              {zone ? (
                <span className="mt-0.5 inline-flex max-w-full truncate rounded-md border border-outline-soft bg-bg px-1.5 py-px text-[11.5px] font-medium text-primary-strong">
                  {zone}
                </span>
              ) : (
                <span className="block truncate text-[11.5px] text-muted">{row.delivery_address?.city ?? '—'}</span>
              )}
            </div>
          );
        },
      },
      {
        field: 'delivery_name',
        headerName: 'Chofer',
        flex: 1,
        minWidth: 150,
        valueGetter: ({ row }) => row.delivery_name ?? '',
        renderCell: ({ row }) =>
          row.delivery_name ? (
            <span className="truncate text-ink" title={row.delivery_name}>
              {row.delivery_name}
            </span>
          ) : (
            <span className="font-medium text-warn">Sin asignar</span>
          ),
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 140,
        renderCell: ({ row }) => <Badge label={labelOf(ORDER_STATUS, row.status)} />,
      },
      {
        field: 'paymentStatus',
        headerName: 'Cobro',
        width: 120,
        sortable: false,
        valueGetter: ({ row }) => row.paymentStatus ?? '',
        renderCell: ({ row }) =>
          row.paymentStatus ? <Badge label={labelOf(PAYMENT_STATUS, row.paymentStatus)} /> : <span>—</span>,
      },
      {
        field: 'total_amount',
        headerName: 'Total',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <span className="font-mono font-semibold text-ink">{formatCurrency(row.total_amount)}</span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 160,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`pedido ${formatShortId(row.order_id)}`}
            onView={() => onView(row)}
            onEdit={onEdit && (() => onEdit(row))}
            editBlockedReason={onEdit ? (orderEditBlockedReason(row) ?? undefined) : undefined}
            onDelete={isClosed(row.status) ? undefined : () => onCancel(row)}
            deleteLabel="Cancelar"
            actions={
              isClosed(row.status)
                ? []
                : [{ label: 'Asignar chofer', icon: UserRoundCog, onClick: () => onAssign(row) }]
            }
          />
        ),
      },
    ],
    [onView, onAssign, onEdit, onCancel],
  );

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowId={(row) => row.order_id}
      loading={loading}
      pagination={{ model: pagination, onChange: onPaginationChange, total }}
      onRowClick={onView}
      selection={selection && { ...selection, isSelectable: (order) => !isClosed(order.status) }}
      empty={
        filtered ? (
          <EmptyState
            illustration="search"
            title="Sin resultados"
            description="Ningún pedido coincide con los filtros elegidos."
          />
        ) : (
          <EmptyState
            title="No hay pedidos"
            description="Los pedidos aparecen cuando un cliente compra desde la app."
          />
        )
      }
    />
  );
};
