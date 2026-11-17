import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useMemo } from 'react';
import { UserRoundCog } from 'lucide-react';
import { Badge, DataTable, EmptyState, IdentityCell, PersonAvatar, RowActions } from '../../../common/components/ui';
import { usePermissions } from '../../../hooks';
import type { Order } from '../../../services/api/types';
import { formatCurrency, formatDateTime, formatNumber, formatShortId } from '../../../utils/format';
import { useOrderPaymentStates } from '../../../services/queries/orders';
import { labelOf, mercadoPagoPaymentLabel, ORDER_STATUS, paymentStatusLabel } from '../../../utils/statusLabels';
import { orderEditBlockedReason } from './orderEdit';
import { isClosed, assignPaymentBlock } from './orderStatus';

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
  /** Sin él no se ofrece «Asignar chofer» (p. ej. sin distribuidora elegida: la API rechaza la escritura). */
  onAssign?: (order: Order) => void;
  /** Sin él no se dibuja «Editar» (p. ej. sin distribuidora elegida). */
  onEdit?: (order: Order) => void;
  /** La baja del pedido: se cancela, no se borra (devuelve el stock). Sin él no se dibuja «Cancelar». */
  onCancel?: (order: Order) => void;
  /** Selección múltiple para las acciones en lote; sin esto la tabla no dibuja casillas. */
  /** Hay filtros activos: un vacío significa "sin resultados". */
  filtered?: boolean;
  selection?: { ids: string[]; onChange: (ids: string[]) => void };
}

/** Pedidos: quién, adónde, quién lo lleva, en qué estado (con su cobro) y cuánto. Ítems, pago y tiempos van en el detalle. */
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
  // El pago de Mercado Pago de la página, en una sola consulta: el chip dice en qué quedó (y por qué). El administrador
  // general sin «Ver como» no lo puede pedir (la API exige la distribuidora): se queda con el estado de cobro del pedido.
  const { needsDistributor } = usePermissions();
  const mercadoPagoIds = useMemo(
    () => rows.filter((row) => row.paymentMethodDetail === 'mercadopago').map((row) => row.order_id),
    [rows],
  );
  const { data: mercadoPago } = useOrderPaymentStates(mercadoPagoIds, !needsDistributor);

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
            person={{ userId: row.customer?.user_id }}
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
              {zone && (
                <span className="mt-0.5 inline-flex max-w-full truncate rounded-md border border-outline-soft bg-bg px-1.5 py-px text-[11.5px] font-medium text-primary-strong">
                  {zone}
                </span>
              )}
              {row.delivery_name ? (
                <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted" title={row.delivery_name}>
                  <PersonAvatar name={row.delivery_name} deliveryId={row.delivery_id} size="sm" />
                  <span className="truncate">{row.delivery_name}</span>
                </span>
              ) : (
                !isClosed(row.status) && (
                  <span className="mt-0.5 block truncate text-[11.5px] font-medium text-warn">Sin asignar</span>
                )
              )}
            </div>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Estado',
        width: 200,
        renderCell: ({ row }) => (
          <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
            <Badge label={labelOf(ORDER_STATUS, row.status)} />
            {row.paymentStatus && <Badge label={paymentStatusLabel(row.paymentStatus, row.paymentMethodDetail)} />}
            {(() => {
              const detail = mercadoPagoPaymentLabel(mercadoPago?.get(row.order_id));
              return detail ? <Badge label={detail} /> : null;
            })()}
          </div>
        ),
      },
      {
        field: 'total_amount',
        headerName: 'Total',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: ({ row }) => (
          <span className="tabular-nums font-semibold text-ink">{formatCurrency(row.total_amount)}</span>
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 176,
        sortable: false,
        align: 'right',
        renderCell: ({ row }) => (
          <RowActions
            rowLabel={`pedido ${formatShortId(row.order_id)}`}
            onView={() => onView(row)}
            onEdit={onEdit && (() => onEdit(row))}
            editBlockedReason={onEdit ? (orderEditBlockedReason(row) ?? undefined) : undefined}
            onDelete={onCancel && !isClosed(row.status) ? () => onCancel(row) : undefined}
            deleteLabel="Cancelar"
            actions={
              onAssign && !isClosed(row.status)
                ? [
                    {
                      label: 'Asignar chofer',
                      icon: UserRoundCog,
                      blockedReason: assignPaymentBlock(row),
                      onClick: () => onAssign(row),
                    },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [onView, onAssign, onEdit, onCancel, mercadoPago],
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
