import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useState } from 'react';
import { Badge, Card, DataTable, EmptyState, CardHeader } from '../../../common/components/ui';
import type { Order } from '../../../services/api/types';
import { useDeliveryOrders } from '../../../services/queries/deliveries';
import { formatCurrency, formatDateTime, formatShortId } from '../../../utils/format';
import { labelOf, ORDER_STATUS } from '../../../utils/statusLabels';
import { OrderDetailsModal } from '../../Orders/components/OrderDetailsModal';

const COLUMNS: GridColDef<Order>[] = [
  {
    field: 'order_id',
    headerName: 'Pedido',
    flex: 1,
    minWidth: 200,
    renderCell: ({ row }) => (
      <div className="leading-tight">
        <span className="block font-mono font-semibold text-ink">{formatShortId(row.order_id)}</span>
        <span className="block text-[11.5px] text-muted">{formatDateTime(row.created_at)}</span>
      </div>
    ),
  },
  {
    field: 'customer',
    headerName: 'Cliente',
    flex: 1.2,
    minWidth: 180,
    valueGetter: ({ row }) => row.customer?.full_name ?? '—',
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
    field: 'status',
    headerName: 'Estado',
    width: 140,
    renderCell: ({ row }) => <Badge label={labelOf(ORDER_STATUS, row.status)} />,
  },
];

/** CU-081: los pedidos asignados al chofer, del más reciente al más antiguo. */
export const DeliveryOrders = ({ deliveryId }: { deliveryId: string }) => {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const { data, isFetching } = useDeliveryOrders(deliveryId, pagination);
  const [selected, setSelected] = useState<Order | null>(null);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-outline p-4">
        <CardHeader title="Pedidos asignados" className="" />
        {data && <span className="text-sm text-muted">{data.total} en total</span>}
      </div>
      <DataTable
        rows={data?.orders ?? []}
        columns={COLUMNS}
        getRowId={(row) => row.order_id}
        loading={isFetching}
        pagination={{ model: pagination, onChange: setPagination, total: data?.total ?? 0 }}
        onRowClick={setSelected}
        empty={<EmptyState title="Todavía no tiene pedidos asignados" />}
      />
      <OrderDetailsModal open={selected !== null} onClose={() => setSelected(null)} order={selected} />
    </Card>
  );
};
